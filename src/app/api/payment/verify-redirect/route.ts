// /src/app/api/payment/verify-redirect/route.ts
// UPDATED: Secure redirect verification with proper X-signature validation

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyBillplzSignature, processBillplzRedirect } from '@/lib/payment/billplz';
import { sendPaymentReceipt } from '@/lib/email/sendReceipt';

interface RedirectParams {
  id?: string;
  paid?: string;
  paid_at?: string;
  x_signature?: string;
  transaction_id?: string;
  transaction_status?: string;
  [key: string]: any;
}

interface VerifyRedirectRequest {
  gateway: string;
  params: RedirectParams;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Payment redirect verification called');
    
    const body: VerifyRedirectRequest = await request.json();
    const { gateway, params } = body;
    
    if (!gateway || !params) {
      console.error('❌ Missing gateway or params');
      return NextResponse.json({ 
        success: false, 
        message: 'Missing gateway or params' 
      }, { status: 400 });
    }
    
    if (gateway !== 'billplz') {
      console.error(`❌ Unsupported gateway: ${gateway}`);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payment gateway' 
      }, { status: 400 });
    }
    
    return await handleBillplzRedirect(params);
    
  } catch (error) {
    console.error('💥 Error verifying payment redirect:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Error processing payment verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Handle Billplz redirect verification with proper security
 */
async function handleBillplzRedirect(params: RedirectParams) {
  const { id, paid, x_signature } = params;
  
  if (!id) {
    console.error('❌ Missing bill ID in redirect params');
    return NextResponse.json({ 
      success: false, 
      message: 'Missing bill ID' 
    }, { status: 400 });
  }
  
  console.log('🔍 Processing Billplz redirect:', {
    billId: id,
    paid: paid,
    hasSignature: !!x_signature
  });
  
  // ✅ SECURITY: Verify X-Signature if present
  const BILLPLZ_X_SIGNATURE = process.env.BILLPLZ_X_SIGNATURE;
  if (x_signature && BILLPLZ_X_SIGNATURE) {
    // Convert redirect params to format suitable for signature verification
    const signatureData: Record<string, any> = {};
    
    // Process billplz[key] format parameters
    Object.keys(params).forEach(key => {
      if (key.startsWith('billplz[') && key.endsWith(']')) {
        const newKey = key.replace('billplz[', 'billplz').replace(']', '');
        signatureData[newKey] = params[key];
      } else {
        signatureData[key] = params[key];
      }
    });
    
    // Add required fields with defaults for signature verification
    const webhookData = {
      id: signatureData.billplzid || id || '',
      collection_id: signatureData.collection_id || '',
      paid: signatureData.billplzpaid || paid || 'false',
      state: signatureData.state || (paid === 'true' ? 'paid' : 'due'),
      amount: signatureData.amount || '0',
      paid_amount: signatureData.paid_amount || '0',
      due_at: signatureData.due_at || '',
      email: signatureData.email || '',
      mobile: signatureData.mobile || '',
      name: signatureData.name || '',
      url: signatureData.url || '',
      paid_at: signatureData.billplzpaid_at || '',
      transaction_id: signatureData.billplztransaction_id || '',
      transaction_status: signatureData.billplztransaction_status || '',
      x_signature: x_signature,
      ...signatureData
    };
    
    const isValidSignature = verifyBillplzSignature(webhookData, BILLPLZ_X_SIGNATURE);
    
    if (!isValidSignature) {
      console.error('❌ Invalid redirect signature - possible tampering');
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid signature' 
      }, { status: 401 });
    }
    
    console.log('✅ Redirect signature verified successfully');
  } else if (process.env.NODE_ENV === 'production' && !x_signature) {
    console.warn('⚠️  No X-signature in production redirect');
  }
  
  // Find payment by gateway bill ID
  const payment = await prisma.payment.findFirst({
    where: { gatewayPaymentId: id },
    include: { 
      assessment: true, 
      user: true 
    }
  });
  
  if (!payment) {
    console.error(`❌ Payment not found for bill ID: ${id}`);
    return NextResponse.json({ 
      success: false, 
      message: 'Payment not found' 
    }, { status: 404 });
  }
  
  console.log('📄 Payment found:', {
    paymentId: payment.id,
    currentStatus: payment.status,
    assessmentId: payment.assessment?.id,
    assessmentType: payment.assessment?.type
  });
  
  // Determine payment success
  const isSuccessful = paid === 'true';
  const newStatus = isSuccessful ? 'completed' : 'failed';
  
  // Only update if status hasn't been updated by webhook already
  let wasUpdated = false;
  if (payment.status === 'pending') {
    console.log(`🔄 Updating payment status from ${payment.status} to ${newStatus}`);
    
    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          updatedAt: new Date()
        }
      });
      
      // Update assessment status if payment successful
      if (isSuccessful && payment.assessment && payment.assessment.status !== 'completed') {
        await tx.assessment.update({
          where: { id: payment.assessment.id },
          data: {
            status: 'in_progress', // Allow user to continue with questionnaire
            updatedAt: new Date()
          }
        });
      }
    });
    
    wasUpdated = true;
    
    // Send receipt email for successful payments (async)
    if (isSuccessful) {
      sendPaymentReceipt(payment.id).catch(err => {
        console.error('⚠️  Failed to send receipt email:', err);
      });
    }
  } else {
    console.log(`ℹ️  Payment already processed (status: ${payment.status}), webhook likely handled it first`);
  }
  
  // Prepare response
  const response = {
    success: true,
    status: isSuccessful ? 'completed' : 'failed',
    message: wasUpdated 
      ? `Payment ${isSuccessful ? 'verified successfully' : 'verification failed'}`
      : `Payment already processed (${payment.status})`,
    paymentId: payment.id,
    assessmentId: payment.assessment?.id,
    assessmentType: payment.assessment?.type,
    isManualProcessing: isManualProcessingTier(payment.assessment?.tier),
    redirectUrl: getRedirectUrl(payment.assessment, isSuccessful)
  };
  
  console.log('✅ Redirect verification completed:', {
    success: response.success,
    status: response.status,
    redirectUrl: response.redirectUrl
  });
  
  return NextResponse.json(response);
}

/**
 * Determine if tier requires manual processing
 */
function isManualProcessingTier(tier?: string): boolean {
  if (!tier) return false;
  const normalizedTier = tier.toLowerCase();
  return normalizedTier === 'standard' || normalizedTier === 'premium';
}

/**
 * Get appropriate redirect URL based on assessment and payment status
 */
function getRedirectUrl(assessment: any, isSuccessful: boolean): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  
  if (!isSuccessful) {
    return `${baseUrl}/payment/failed?id=${assessment?.id}`;
  }
  
  if (!assessment) {
    return `${baseUrl}/dashboard`;
  }
  
  // Always redirect to questionnaire page after successful payment
  return `${baseUrl}/assessment/${assessment.type}/${assessment.id}`;
}

/**
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Payment redirect verification endpoint active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasXSignatureKey: !!process.env.BILLPLZ_X_SIGNATURE
  });
}