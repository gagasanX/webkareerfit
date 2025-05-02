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
          // CRITICAL FIX: Check if this assessment requires manual processing
          // based on tier explicitly, not just manualProcessing flag
          const isManualProcessing = payment.assessment?.tier === 'standard' || 
                                    payment.assessment?.tier === 'premium' || 
                                    payment.assessment?.price >= 100;
          
          // Update assessment status based on processing type
          if (payment.assessment && payment.assessment.status !== 'completed') {
            await prisma.assessment.update({
              where: { id: payment.assessment.id },
              data: {
                // For manual processing, set to pending_review; otherwise, set to in_progress
                status: isManualProcessing ? 'pending_review' : 'in_progress',
                manualProcessing: isManualProcessing // Ensure this flag is correctly set
              }
            });
          }
          
          // Send receipt email
          sendPaymentReceipt(paymentId).catch(err => {
            console.error('Failed to send receipt email:', err);
          });
          
          // Process affiliate commission if applicable
          await processAffiliateCommission(payment);
          
          // CRITICAL FIX: Determine the appropriate redirect URL based on tier with explicit checks
          let redirectUrl;
          
          // Explicit tier checks first
          if (payment.assessment?.tier === 'premium') {
            redirectUrl = `/assessment/${payment.assessment?.type}/premium-results/${payment.assessment?.id}`;
            console.log(`Premium tier - Redirecting to: ${redirectUrl}`);
          } 
          // Then standard tier
          else if (payment.assessment?.tier === 'standard') {
            redirectUrl = `/assessment/${payment.assessment?.type}/standard-results/${payment.assessment?.id}`;
            console.log(`Standard tier - Redirecting to: ${redirectUrl}`);
          }
          // Then fallback to price checks
          else if (payment.assessment?.price >= 250) {
            redirectUrl = `/assessment/${payment.assessment?.type}/premium-results/${payment.assessment?.id}`;
            console.log(`Premium price (RM${payment.assessment?.price}) - Redirecting to: ${redirectUrl}`);
          }
          else if (payment.assessment?.price >= 100) {
            redirectUrl = `/assessment/${payment.assessment?.type}/standard-results/${payment.assessment?.id}`;
            console.log(`Standard price (RM${payment.assessment?.price}) - Redirecting to: ${redirectUrl}`);
          }
          // Basic tier fallback
          else {
            redirectUrl = `/assessment/${payment.assessment?.type}/results/${payment.assessment?.id}`;
            console.log(`Basic tier - Redirecting to: ${redirectUrl}`);
          }

          // Include the processing type and appropriate redirect URL in the response
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
        // CRITICAL FIX: Determine redirect URL based on tier with explicit checks
        let redirectUrl;
        
        // Explicit tier checks first
        if (payment.assessment?.tier === 'premium') {
          redirectUrl = `/assessment/${payment.assessment?.type}/premium-results/${payment.assessment?.id}`;
        } 
        else if (payment.assessment?.tier === 'standard') {
          redirectUrl = `/assessment/${payment.assessment?.type}/standard-results/${payment.assessment?.id}`;
        }
        // Then fallback to price checks
        else if (payment.assessment?.price >= 250) {
          redirectUrl = `/assessment/${payment.assessment?.type}/premium-results/${payment.assessment?.id}`;
        }
        else if (payment.assessment?.price >= 100) {
          redirectUrl = `/assessment/${payment.assessment?.type}/standard-results/${payment.assessment?.id}`;
        }
        // Basic tier fallback
        else {
          redirectUrl = `/assessment/${payment.assessment?.type}/results/${payment.assessment?.id}`;
        }
        
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
      // Similar logic with same changes for manual processing
      // [Rest of toyyibpay implementation with the same tier-based fixes]
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