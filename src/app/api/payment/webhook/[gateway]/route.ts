// /src/app/api/payment/webhook/[gateway]/route.ts
// UPDATED: Secure webhook handler with proper X-signature verification

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateCommission, getCommissionRate } from '@/lib/utils/commissionCalculation';
import { verifyBillplzPayment, verifyBillplzSignature } from '@/lib/payment/billplz';
import { sendPaymentReceipt } from '@/lib/email/sendReceipt';
import { getTierPrice } from '@/lib/utils/priceCalculation';

interface WebhookPayload {
  id: string;
  collection_id: string;
  paid: string | boolean;
  state: string;
  amount: string | number;
  paid_amount: string | number;
  due_at: string;
  email: string;
  mobile?: string;
  name: string;
  url: string;
  paid_at?: string;
  transaction_id?: string;
  transaction_status?: string;
  x_signature?: string;
  reference_1?: string;
  reference_2?: string;
  [key: string]: any;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { gateway: string } }
) {
  const gateway = params.gateway;
  console.log(`🔔 Payment webhook received for gateway: ${gateway}`);
  
  try {
    const webhookData: WebhookPayload = await request.json();
    console.log('📥 Webhook data received:', {
      id: webhookData.id,
      paid: webhookData.paid,
      state: webhookData.state,
      amount: webhookData.amount,
      reference_1: webhookData.reference_1,
      hasSignature: !!webhookData.x_signature
    });
    
    if (gateway !== 'billplz') {
      console.error(`❌ Unsupported gateway: ${gateway}`);
      return NextResponse.json({ 
        message: 'Invalid payment gateway' 
      }, { status: 400 });
    }
    
    // ✅ SECURITY: Verify X-Signature FIRST before processing
    const BILLPLZ_X_SIGNATURE = process.env.BILLPLZ_X_SIGNATURE;
    if (!BILLPLZ_X_SIGNATURE) {
      console.error('❌ BILLPLZ_X_SIGNATURE not configured');
      return NextResponse.json({ 
        message: 'Server configuration error' 
      }, { status: 500 });
    }
    
    // Verify signature
    const isValidSignature = verifyBillplzSignature(webhookData, BILLPLZ_X_SIGNATURE);
    if (!isValidSignature) {
      console.error('❌ Invalid webhook signature - possible tampering attempt');
      return NextResponse.json({ 
        message: 'Invalid signature' 
      }, { status: 401 });
    }
    
    console.log('✅ Webhook signature verified successfully');
    
    // Extract payment reference (this should be our payment ID)
    const paymentId = webhookData.reference_1;
    if (!paymentId) {
      console.error('❌ Missing payment reference in webhook');
      return NextResponse.json({ 
        message: 'Missing payment reference' 
      }, { status: 400 });
    }
    
    // Get payment with user and assessment data
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { 
        assessment: true,
        user: true
      }
    });
    
    if (!payment) {
      console.error(`❌ Payment not found: ${paymentId}`);
      return NextResponse.json({ 
        message: 'Payment not found' 
      }, { status: 404 });
    }
    
    // Check if already processed to prevent duplicate processing
    if (payment.status === 'completed') {
      console.log(`ℹ️  Payment ${paymentId} already completed, skipping processing`);
      return NextResponse.json({ 
        success: true,
        message: 'Payment already processed'
      });
    }
    
    // Determine if payment was successful
    const isSuccessful = await verifyBillplzPayment(webhookData);
    const newStatus = isSuccessful ? 'completed' : 'failed';
    
    console.log(`📊 Payment verification result: ${newStatus}`);
    
    // Update payment status in database transaction
    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: paymentId },
        data: { 
          status: newStatus,
          gatewayPaymentId: webhookData.id || payment.gatewayPaymentId,
          updatedAt: new Date()
        }
      });
      
      if (isSuccessful && payment.assessment) {
        // Update assessment status to allow questionnaire
        if (payment.assessment.status !== 'completed') {
          await tx.assessment.update({
            where: { id: payment.assessment.id },
            data: { 
              status: 'in_progress',
              updatedAt: new Date()
            }
          });
        }
        
        console.log(`✅ Assessment ${payment.assessment.id} updated to in_progress`);
      }
    });
    
    if (isSuccessful) {
      console.log('🎉 Payment successful, processing additional tasks...');
      
      // Process affiliate commission using ORIGINAL price
      if (payment.user?.referredBy && payment.assessment) {
        try {
          await processAffiliateCommission(payment, payment.assessment);
        } catch (commissionError) {
          console.error('⚠️  Affiliate commission processing failed:', commissionError);
          // Don't fail the payment if commission processing fails
        }
      }
      
      // Send receipt email (async)
      sendPaymentReceipt(paymentId).catch(err => {
        console.error('⚠️  Failed to send receipt email:', err);
      });
      
      console.log(`✅ Payment ${paymentId} processed successfully`);
    } else {
      console.log(`❌ Payment ${paymentId} failed verification`);
    }
    
    // Return success response (Billplz expects 200 status)
    return NextResponse.json({ 
      success: true,
      message: `Payment ${isSuccessful ? 'successful' : 'failed'}`,
      paymentId: paymentId
    });
    
  } catch (error) {
    console.error('💥 Error processing payment webhook:', error);
    
    // Return error but still with 200 status to prevent Billplz retries
    // The actual error is logged for investigation
    return NextResponse.json({ 
      success: false,
      message: 'Webhook processing error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 }); // Return 200 to prevent retries for system errors
  }
}

/**
 * Process affiliate commission with proper error handling
 * FIXED: Use original assessment price, not discounted payment amount
 */
async function processAffiliateCommission(payment: any, assessment: any) {
  try {
    console.log('💰 Processing affiliate commission...');
    
    if (!payment.user?.referredBy) {
      console.log('ℹ️  No referrer found, skipping commission');
      return;
    }
    
    // Find the affiliate (referrer)
    const affiliate = await prisma.user.findUnique({
      where: { affiliateCode: payment.user.referredBy },
      select: { 
        id: true, 
        name: true,
        email: true,
        isAffiliate: true,
        affiliateType: true 
      }
    });
    
    if (!affiliate?.isAffiliate) {
      console.log('ℹ️  Referrer is not an active affiliate, skipping commission');
      return;
    }
    
    // CRITICAL FIX: Calculate commission based on ORIGINAL tier price, not discounted amount
    const originalPrice = getTierPrice(assessment.tier);
    const commissionAmount = calculateCommission(originalPrice);
    const commissionRate = getCommissionRate(originalPrice);
    
    console.log('💡 Commission calculation:', {
      assessmentTier: assessment.tier,
      originalPrice,
      paymentAmount: payment.amount,
      commissionAmount,
      commissionRate: `${commissionRate}%`,
      affiliateId: affiliate.id
    });
    
    if (commissionAmount <= 0) {
      console.log('ℹ️  No commission for this price tier');
      return;
    }
    
    // Process commission in database transaction
    await prisma.$transaction(async (tx) => {
      // Create referral record (commission transaction)
      await tx.referral.create({
        data: {
          affiliateId: affiliate.id,
          userName: payment.user?.name || 'Anonymous',
          email: payment.user?.email || '',
          assessmentId: assessment.id,
          assessmentType: assessment.type,
          paymentId: payment.id,
          status: 'completed',
          commission: commissionAmount,
          paidOut: false
        },
      });
      
      // Update affiliate stats
      await tx.affiliateStats.upsert({
        where: { userId: affiliate.id },
        update: {
          totalReferrals: { increment: 1 },
          totalEarnings: { increment: commissionAmount },
          updatedAt: new Date()
        },
        create: {
          userId: affiliate.id,
          totalReferrals: 1,
          totalEarnings: commissionAmount,
          totalPaid: 0,
        },
      });
    });
    
    console.log(`✅ Commission of RM${commissionAmount} processed for affiliate ${affiliate.id} (${affiliate.name})`);
    
  } catch (error) {
    console.error('💥 Error processing affiliate commission:', error);
    throw error; // Re-throw to be caught by caller
  }
}

/**
 * Health check endpoint for webhook URL testing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { gateway: string } }
) {
  const gateway = params.gateway;
  
  if (gateway !== 'billplz') {
    return NextResponse.json({ 
      message: 'Invalid gateway' 
    }, { status: 400 });
  }
  
  // Validate Billplz configuration
  const { validateBillplzConfig } = await import('@/lib/payment/billplz');
  const configValidation = validateBillplzConfig();
  
  return NextResponse.json({
    message: 'Billplz webhook endpoint active',
    timestamp: new Date().toISOString(),
    gateway: gateway,
    configuration: {
      isValid: configValidation.isValid,
      errors: configValidation.errors
    }
  });
}