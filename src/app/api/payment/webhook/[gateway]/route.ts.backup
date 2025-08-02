// /src/app/api/payment/webhook/[gateway]/route.ts - SCHEMA-FIXED VERSION

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
  context: { params: Promise<{ gateway: string }> }
) {
  const params = await context.params;
  const gateway = params.gateway;
  
  console.log(`🔔 Payment webhook received for gateway: ${gateway}`);
  
  try {
    const contentType = request.headers.get('content-type') || '';
    let webhookData: WebhookPayload;
    
    if (contentType.includes('application/json')) {
      webhookData = await request.json();
    } else {
      const text = await request.text();
      console.log('📥 Raw webhook data:', text.substring(0, 200) + '...');
      
      const formData = new URLSearchParams(text);
      webhookData = {
        id: formData.get('id') || '',
        collection_id: formData.get('collection_id') || '',
        paid: formData.get('paid') || 'false',
        state: formData.get('state') || '',
        amount: formData.get('amount') || '0',
        paid_amount: formData.get('paid_amount') || '0',
        due_at: formData.get('due_at') || '',
        email: formData.get('email') || '',
        mobile: formData.get('mobile') || '',
        name: formData.get('name') || '',
        url: formData.get('url') || '',
        paid_at: formData.get('paid_at') || '',
        x_signature: formData.get('x_signature') || '',
        reference_1: formData.get('reference_1') || '',
        reference_2: formData.get('reference_2') || '',
      };
    }

    console.log('📥 Parsed webhook data:', {
      id: webhookData.id,
      paid: webhookData.paid,
      state: webhookData.state,
      reference_1: webhookData.reference_1,
      hasSignature: !!webhookData.x_signature
    });
    
    if (gateway !== 'billplz') {
      console.error(`❌ Unsupported gateway: ${gateway}`);
      return NextResponse.json({ 
        message: 'Invalid payment gateway' 
      }, { status: 400 });
    }
    
    // Verify signature
    const BILLPLZ_X_SIGNATURE = process.env.BILLPLZ_X_SIGNATURE;
    if (BILLPLZ_X_SIGNATURE && webhookData.x_signature) {
      const isValidSignature = verifyBillplzSignature(webhookData, BILLPLZ_X_SIGNATURE);
      if (!isValidSignature) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json({ 
          message: 'Invalid signature' 
        }, { status: 401 });
      }
      console.log('✅ Webhook signature verified');
    } else {
      console.warn('⚠️ Signature verification skipped');
    }
    
    const paymentId = webhookData.reference_1;
    if (!paymentId) {
      console.error('❌ Missing payment reference');
      return NextResponse.json({ 
        message: 'Missing payment reference' 
      }, { status: 400 });
    }
    
    // 🔧 FIXED: Use correct schema fields
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
    
    if (payment.status === 'completed') {
      console.log(`ℹ️ Payment ${paymentId} already completed`);
      return NextResponse.json({ 
        success: true,
        message: 'Payment already processed'
      });
    }
    
    const isSuccessful = await verifyBillplzPayment(webhookData);
    const newStatus = isSuccessful ? 'completed' : 'failed';
    
    console.log(`📊 Payment verification: ${newStatus}`);
    
    // 🔧 FIXED: Update using correct schema fields
    await prisma.$transaction(async (tx) => {
      // Update payment - ONLY use fields that exist in schema
      await tx.payment.update({
        where: { id: paymentId },
        data: { 
          status: newStatus,
          gatewayPaymentId: webhookData.id, // ✅ This field exists
          updatedAt: new Date()
          // ❌ REMOVED: externalPaymentId (doesn't exist in schema)
        }
      });
      
      // Update assessment if successful
      if (isSuccessful && payment.assessment) {
        await tx.assessment.update({
          where: { id: payment.assessment.id },
          data: { 
            status: 'paid', // Changed from 'in_progress' to 'paid'
            updatedAt: new Date()
          }
        });
        console.log(`✅ Assessment ${payment.assessment.id} marked as paid`);
      }
    });
    
    if (isSuccessful) {
      console.log('🎉 Payment successful, processing extras...');
      
      // Process affiliate commission if applicable
      if (payment.user?.referredBy && payment.assessment) {
        try {
          await processAffiliateCommission(payment, payment.assessment);
        } catch (error) {
          console.error('⚠️ Commission processing failed:', error);
        }
      }
      
      // Send receipt email (async)
      sendPaymentReceipt(paymentId).catch(err => {
        console.error('⚠️ Receipt email failed:', err);
      });
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Payment ${isSuccessful ? 'successful' : 'failed'}`,
      paymentId: paymentId
    });
    
  } catch (error) {
    console.error('💥 Webhook processing error:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Webhook processing error'
    }, { status: 200 });
  }
}

async function processAffiliateCommission(payment: any, assessment: any) {
  try {
    console.log('💰 Processing affiliate commission...');
    
    if (!payment.user?.referredBy) {
      return;
    }
    
    const affiliate = await prisma.user.findUnique({
      where: { affiliateCode: payment.user.referredBy },
      select: { 
        id: true, 
        name: true,
        email: true,
        isAffiliate: true 
      }
    });
    
    if (!affiliate?.isAffiliate) {
      return;
    }
    
    const originalPrice = getTierPrice(assessment.tier);
    const commissionAmount = calculateCommission(originalPrice);
    
    if (commissionAmount <= 0) {
      return;
    }
    
    await prisma.$transaction(async (tx) => {
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
    
    console.log(`✅ Commission processed: RM${commissionAmount} for ${affiliate.name}`);
    
  } catch (error) {
    console.error('💥 Commission processing error:', error);
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gateway: string }> }
) {
  const params = await context.params;
  const gateway = params.gateway;
  
  return NextResponse.json({
    message: `${gateway} webhook endpoint active`,
    timestamp: new Date().toISOString()
  });
}