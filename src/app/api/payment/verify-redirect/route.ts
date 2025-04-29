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
          // Check if this assessment requires manual processing
          const isManualProcessing = payment.assessment?.manualProcessing || 
                                    payment.assessment?.price === 100 || 
                                    payment.assessment?.price === 250;
          
          // Update assessment status based on processing type
          if (payment.assessment && payment.assessment.status !== 'completed') {
            await prisma.assessment.update({
              where: { id: payment.assessment.id },
              data: {
                // For manual processing, set to pending_review; otherwise, set to in_progress
                status: isManualProcessing ? 'pending_review' : 'in_progress',
              }
            });
          }
          
          // Send receipt email
          sendPaymentReceipt(paymentId).catch(err => {
            console.error('Failed to send receipt email:', err);
          });
          
          // Process affiliate commission if applicable
          await processAffiliateCommission(payment);
          
          // Include the processing type and appropriate redirect URL in the response
          return NextResponse.json({
            success: true,
            status: 'completed',
            message: 'Payment verified successfully',
            assessmentId: payment.assessment?.id,
            assessmentType: payment.assessment?.type,
            isManualProcessing: isManualProcessing,
            // Always redirect to results for both processing types
            redirectUrl: `/assessment/${payment.assessment?.type}/results/${payment.assessment?.id}`
          });
        } else {
          return NextResponse.json({
            success: true,
            status: 'failed',
            message: 'Payment verification failed',
            assessmentId: payment.assessment?.id,
            assessmentType: payment.assessment?.type
          });
        }
      } else {
        // Payment already processed by webhook, just return the status
        return NextResponse.json({
          success: true,
          status: payment.status === 'completed' ? 'completed' : 'failed',
          message: `Payment already processed (${payment.status})`,
          assessmentId: payment.assessment?.id,
          assessmentType: payment.assessment?.type,
          isManualProcessing: payment.assessment?.manualProcessing || 
                            payment.assessment?.price === 100 || 
                            payment.assessment?.price === 250,
          redirectUrl: `/assessment/${payment.assessment?.type}/results/${payment.assessment?.id}`
        });
      }
    } 
    else if (gateway === 'toyyibpay') {
      // Similar logic for toyyibpay with the same changes for manual processing
      const { billcode, status } = params;
      
      if (!billcode) {
        return NextResponse.json({ 
          success: false, 
          message: 'Missing billcode' 
        }, { status: 400 });
      }
      
      // Use gateway's payment ID to find our internal payment record
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
      
      // Check payment status (status=1 means successful for Toyyibpay)
      isSuccessful = status === '1';
      
      // Only update if not already updated by webhook
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
          // Check if this assessment requires manual processing
          const isManualProcessing = payment.assessment?.manualProcessing || 
                                    payment.assessment?.price === 100 || 
                                    payment.assessment?.price === 250;
          
          // Update assessment status based on processing type
          if (payment.assessment && payment.assessment.status !== 'completed') {
            await prisma.assessment.update({
              where: { id: payment.assessment.id },
              data: {
                status: isManualProcessing ? 'pending_review' : 'in_progress',
              }
            });
          }
          
          // Send receipt email
          sendPaymentReceipt(paymentId).catch(err => {
            console.error('Failed to send receipt email:', err);
          });
          
          // Process affiliate commission
          await processAffiliateCommission(payment);
          
          return NextResponse.json({
            success: true,
            status: 'completed',
            message: 'Payment verified successfully',
            assessmentId: payment.assessment?.id,
            assessmentType: payment.assessment?.type,
            isManualProcessing: isManualProcessing,
            redirectUrl: `/assessment/${payment.assessment?.type}/results/${payment.assessment?.id}`
          });
        }
      }
    } 
    else {
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
  // Implement the same signature verification as in verifyBillplzPayment
  // This is a simplified example - you should use your actual verification logic
  
  // For now, always return true in development (REMOVE THIS IN PRODUCTION)
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // Implementation would depend on how Billplz signatures work
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
    
    // Create referral record
    await prisma.referral.create({
      data: {
        affiliateId: payment.user.referredBy,
        userName: payment.user.name || 'Anonymous',
        email: payment.user.email,
        assessmentId: payment.assessment.id,
        assessmentType: payment.assessment.type,
        status: 'completed',
        commission: commissionAmount,
        paidOut: false
      }
    });
    
    // Update affiliate stats
    const affiliateStats = await prisma.affiliateStats.findUnique({
      where: { userId: payment.user.referredBy }
    });
    
    if (affiliateStats) {
      await prisma.affiliateStats.update({
        where: { userId: payment.user.referredBy },
        data: {
          totalReferrals: affiliateStats.totalReferrals + 1,
          totalEarnings: affiliateStats.totalEarnings + commissionAmount
        }
      });
    }
    
    // Create affiliate transaction
    await prisma.affiliateTransaction.create({
      data: {
        userId: payment.user.referredBy,
        paymentId: payment.id,
        amount: commissionAmount,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error processing affiliate commission:', error);
  }
}