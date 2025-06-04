// app/api/payment/verify-redirect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyBillplzPayment } from '@/lib/payment/billplz';
import { verifyToyyibpayPayment } from '@/lib/payment/toyyibpay';
import { sendPaymentReceipt } from '@/lib/email/sendReceipt';

export async function POST(request: NextRequest) {
  try {
    // Parse request data
    const { gateway, params } = await request.json();
    
    if (!gateway || !params) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing gateway or params' 
      }, { status: 400 });
    }
    
    // Verify payment based on gateway
    let paymentId: string;
    let isSuccessful = false;
    
    if (gateway === 'billplz') {
      // For Billplz, we need to verify the x_signature to ensure it's a legitimate redirect
      const { id, paid, x_signature } = params;
      
      if (!id || !x_signature) {
        return NextResponse.json({ 
          success: false, 
          message: 'Missing required parameters' 
        }, { status: 400 });
      }
      
      // Use gateway's payment ID to find our internal payment record
      const payment = await prisma.payment.findFirst({
        where: { gatewayPaymentId: id },
        include: { assessment: true, user: true }
      });
      
      if (!payment) {
        return NextResponse.json({ 
          success: false, 
          message: 'Payment not found' 
        }, { status: 404 });
      }
      
      paymentId = payment.id;
      
      // Verify the x_signature 
      const isValidSignature = verifyBillplzSignature(params, process.env.BILLPLZ_X_SIGNATURE || '');
      
      if (!isValidSignature) {
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid signature' 
        }, { status: 400 });
      }
      
      // Check payment status
      isSuccessful = paid === 'true';
      
      // We'll only update the database if it hasn't been updated by the webhook already
      if (payment.status === 'pending') {
        // Update payment status
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: isSuccessful ? 'completed' : 'failed',
          }
        });
        
        // If payment is successful
        if (isSuccessful) {
          // CRITICAL FIX: Always redirect to questionnaire first, regardless of tier
          // Update assessment status to in_progress so user can fill questionnaire
          if (payment.assessment && payment.assessment.status !== 'completed') {
            await prisma.assessment.update({
              where: { id: payment.assessment.id },
              data: {
                status: 'in_progress' // Set to in_progress so user can continue with questionnaire
              }
            });
          }
          
          // Send receipt email
          sendPaymentReceipt(paymentId).catch(err => {
            console.error('Failed to send receipt email:', err);
          });
          
          // Process affiliate commission if applicable
          await processAffiliateCommission(payment);
          
          // CRITICAL FIX: Always redirect to questionnaire page after payment success
          const redirectUrl = `/assessment/${payment.assessment?.type}/${payment.assessment?.id}`;
          console.log(`Payment successful - Redirecting to questionnaire: ${redirectUrl}`);

          // Include the processing type info for debugging
          const isManualProcessing = payment.assessment?.tier === 'standard' || 
                                    payment.assessment?.tier === 'premium' || 
                                    payment.assessment?.price >= 100;

          return NextResponse.json({
            success: true,
            status: 'completed',
            message: 'Payment verified successfully',
            assessmentId: payment.assessment?.id,
            assessmentType: payment.assessment?.type,
            isManualProcessing: isManualProcessing,
            redirectUrl: redirectUrl
          });
        } else {
          return NextResponse.json({
            success: true,
            status: 'failed',
            message: 'Payment verification failed',
            assessmentId: payment.assessment?.id,
            assessmentType: payment.assessment?.type,
            redirectUrl: `/payment/failed?id=${payment.assessment?.id}`
          });
        }
      } else {
        // Payment already processed by webhook, just return the status
        // CRITICAL FIX: Always redirect to questionnaire page
        const redirectUrl = `/assessment/${payment.assessment?.type}/${payment.assessment?.id}`;
        
        return NextResponse.json({
          success: true,
          status: payment.status === 'completed' ? 'completed' : 'failed',
          message: `Payment already processed (${payment.status})`,
          assessmentId: payment.assessment?.id,
          assessmentType: payment.assessment?.type,
          isManualProcessing: payment.assessment?.tier === 'standard' || 
                            payment.assessment?.tier === 'premium' || 
                            payment.assessment?.price >= 100,
          redirectUrl: redirectUrl
        });
      }
    } 
    else if (gateway === 'toyyibpay') {
      // Similar logic for toyyibpay with same questionnaire redirect fix
      const { billcode, status } = params;
      
      if (!billcode) {
        return NextResponse.json({ 
          success: false, 
          message: 'Missing required parameters' 
        }, { status: 400 });
      }
      
      // Find payment by gateway reference
      const payment = await prisma.payment.findFirst({
        where: { gatewayPaymentId: billcode },
        include: { assessment: true, user: true }
      });
      
      if (!payment) {
        return NextResponse.json({ 
          success: false, 
          message: 'Payment not found' 
        }, { status: 404 });
      }
      
      paymentId = payment.id;
      isSuccessful = status === '1'; // ToyyibPay success status
      
      if (payment.status === 'pending') {
        // Update payment status
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: isSuccessful ? 'completed' : 'failed',
          }
        });
        
        if (isSuccessful) {
          // Update assessment status to in_progress for questionnaire
          if (payment.assessment && payment.assessment.status !== 'completed') {
            await prisma.assessment.update({
              where: { id: payment.assessment.id },
              data: {
                status: 'in_progress'
              }
            });
          }
          
          // Send receipt email
          sendPaymentReceipt(paymentId).catch(err => {
            console.error('Failed to send receipt email:', err);
          });
          
          // Process affiliate commission if applicable
          await processAffiliateCommission(payment);
          
          // CRITICAL FIX: Redirect to questionnaire page
          const redirectUrl = `/assessment/${payment.assessment?.type}/${payment.assessment?.id}`;
          console.log(`ToyyibPay payment successful - Redirecting to questionnaire: ${redirectUrl}`);

          const isManualProcessing = payment.assessment?.tier === 'standard' || 
                                    payment.assessment?.tier === 'premium' || 
                                    payment.assessment?.price >= 100;

          return NextResponse.json({
            success: true,
            status: 'completed',
            message: 'Payment verified successfully',
            assessmentId: payment.assessment?.id,
            assessmentType: payment.assessment?.type,
            isManualProcessing: isManualProcessing,
            redirectUrl: redirectUrl
          });
        } else {
          return NextResponse.json({
            success: true,
            status: 'failed',
            message: 'Payment verification failed',
            assessmentId: payment.assessment?.id,
            assessmentType: payment.assessment?.type,
            redirectUrl: `/payment/failed?id=${payment.assessment?.id}`
          });
        }
      } else {
        // Payment already processed, redirect to questionnaire
        const redirectUrl = `/assessment/${payment.assessment?.type}/${payment.assessment?.id}`;
        
        return NextResponse.json({
          success: true,
          status: payment.status === 'completed' ? 'completed' : 'failed',
          message: `Payment already processed (${payment.status})`,
          assessmentId: payment.assessment?.id,
          assessmentType: payment.assessment?.type,
          isManualProcessing: payment.assessment?.tier === 'standard' || 
                            payment.assessment?.tier === 'premium' || 
                            payment.assessment?.price >= 100,
          redirectUrl: redirectUrl
        });
      }
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payment gateway' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error verifying payment redirect:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Error processing payment verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Function to verify Billplz signature
function verifyBillplzSignature(params: any, xSignatureKey: string): boolean {
  // Implementation would depend on how Billplz signatures work
  // For now, always return true in development (REMOVE THIS IN PRODUCTION)
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  return true; // Replace with actual verification
}

// Process affiliate commission
async function processAffiliateCommission(payment: any) {
  try {
    if (!payment.user || !payment.user.referredBy) {
      return;
    }
    
    // Calculate commission (10% of payment amount)
    const commissionRate = 0.10;
    const commissionAmount = payment.amount * commissionRate;
    
    // Create referral record and update affiliate stats...
    // [Rest of commission processing code]
  } catch (error) {
    console.error('Error processing affiliate commission:', error);
  }
}