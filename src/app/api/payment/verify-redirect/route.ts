// /src/app/api/payment/verify-redirect/route.ts - SCHEMA-FIXED VERSION

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyBillplzSignature } from '@/lib/payment/billplz';
import { sendReceiptEmail } from '@/lib/email/brevoService';

interface VerifyRedirectRequest {
  gateway: string;
  params: {
    id?: string;
    paid?: string;
    x_signature?: string;
    [key: string]: any;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Payment redirect verification called');
    
    const body: VerifyRedirectRequest = await request.json();
    const { gateway, params } = body;
    
    console.log('📥 Verification request:', { gateway, params });
    
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
      message: 'Error processing payment verification'
    }, { status: 500 });
  }
}

async function handleBillplzRedirect(params: any) {
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
  
  // Verify signature if present
  const BILLPLZ_X_SIGNATURE = process.env.BILLPLZ_X_SIGNATURE;
  if (x_signature && BILLPLZ_X_SIGNATURE) {
    const webhookData = {
      id: id,
      paid: paid || 'false',
      x_signature: x_signature,
      ...params
    };
    
    const isValidSignature = verifyBillplzSignature(webhookData, BILLPLZ_X_SIGNATURE);
    
    if (!isValidSignature) {
      console.error('❌ Invalid redirect signature');
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid signature' 
      }, { status: 401 });
    }
    
    console.log('✅ Redirect signature verified');
  }
  
  // 🔧 FIXED: Find payment using correct schema field
  const payment = await prisma.payment.findFirst({
    where: { 
      gatewayPaymentId: id  // ✅ Only use field that exists in schema
      // ❌ REMOVED: externalPaymentId (doesn't exist)
    },
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
    method: payment.method, // ✅ Correct field name
    assessmentId: payment.assessment?.id,
    assessmentType: payment.assessment?.type
  });
  
  const isSuccessful = paid === 'true';
  const newStatus = isSuccessful ? 'completed' : 'failed';
  
  // Update payment if not already processed
  let wasUpdated = false;
  if (payment.status === 'pending' || payment.status === 'processing') {
    console.log(`🔄 Updating payment status to ${newStatus}`);
    
    await prisma.$transaction(async (tx) => {
      // 🔧 FIXED: Update using correct schema fields
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          gatewayPaymentId: id, // ✅ Store bill ID in correct field
          updatedAt: new Date()
          // ❌ REMOVED: externalPaymentId (doesn't exist in schema)
        }
      });
      
      if (isSuccessful && payment.assessment) {
        await tx.assessment.update({
          where: { id: payment.assessment.id },
          data: {
            status: 'paid', // Mark as paid for access
            updatedAt: new Date()
          }
        });
      }
    });
    
    wasUpdated = true;
    
    if (isSuccessful) {
      // Send receipt email
      if (payment.user?.name) {  // Only send if we have user name
        const receiptData = {
          userName: payment.user.name,
          email: payment.user.email,
          receiptNumber: `KF${new Date().getTime()}`,
          assessmentType: payment.assessment.type,
          assessmentName: `${payment.assessment.type.toUpperCase()} Assessment`,
          date: payment.createdAt,
          amount: payment.amount,
          gateway: payment.method,
          paymentId: payment.gatewayPaymentId || id,
        };
        
        sendReceiptEmail(receiptData).catch(err => {
          console.error('⚠️ Receipt email failed:', err);
        });
      }
    }
  } else {
    console.log(`ℹ️ Payment already processed (${payment.status})`);
  }
  
  const response = {
    success: true,
    status: isSuccessful ? 'completed' : 'failed',
    message: wasUpdated 
      ? `Payment ${isSuccessful ? 'verified' : 'failed'}`
      : `Payment already processed`,
    paymentId: payment.id,
    assessmentId: payment.assessment?.id,
    assessmentType: payment.assessment?.type,
    redirectUrl: getRedirectUrl(payment.assessment, isSuccessful)
  };
  
  console.log('✅ Redirect verification completed:', {
    success: response.success,
    status: response.status,
    redirectUrl: response.redirectUrl
  });
  
  return NextResponse.json(response);
}

function getRedirectUrl(assessment: any, isSuccessful: boolean): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  
  if (!isSuccessful) {
    return `${baseUrl}/dashboard?payment=failed`;
  }
  
  if (!assessment) {
    return `${baseUrl}/dashboard`;
  }
  
  return `${baseUrl}/assessment/${assessment.type}/${assessment.id}`;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Payment redirect verification endpoint active',
    timestamp: new Date().toISOString()
  });
}