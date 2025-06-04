import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyBillplzPayment } from '@/lib/payment/billplz';
import { verifyToyyibpayPayment } from '@/lib/payment/toyyibpay';
import { sendPaymentReceipt } from '@/lib/email/sendReceipt';

export async function POST(
  request: NextRequest,
  { params }: { params: { gateway: string } }
) {
  const gateway = params.gateway;
  console.log(`Payment webhook called for gateway: ${gateway}`);
  
  try {
    // Parse webhook data
    let webhookData;
    try {
      webhookData = await request.json();
      console.log('Webhook data:', JSON.stringify(webhookData));
    } catch (jsonError) {
      console.error('Failed to parse webhook JSON:', jsonError);
      return NextResponse.json({ message: 'Invalid webhook data' }, { status: 400 });
    }
    
    // Verify payment based on gateway
    let paymentId: string;
    let isSuccessful = false;
    
    if (gateway === 'billplz') {
      paymentId = webhookData.reference_1 || '';
      isSuccessful = await verifyBillplzPayment(webhookData);
    } else if (gateway === 'toyyibpay') {
      paymentId = webhookData.billExternalReferenceNo || webhookData.order_id || '';
      isSuccessful = await verifyToyyibpayPayment(webhookData);
    } else {
      return NextResponse.json({ message: 'Invalid payment gateway' }, { status: 400 });
    }
    
    if (!paymentId) {
      return NextResponse.json({ message: 'Missing payment reference' }, { status: 400 });
    }
    
    // Update payment status in database
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { assessment: true }
    });
    
    if (!payment) {
      return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
    }
    
    // Update payment status
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: isSuccessful ? 'completed' : 'failed',
      }
    });
    
    // If payment is successful
    if (isSuccessful) {
      // CRITICAL FIX: Always set assessment status to 'in_progress' so user can continue to questionnaire
      if (payment.assessment && payment.assessment.status !== 'completed') {
        await prisma.assessment.update({
          where: { id: payment.assessment.id },
          data: {
            status: 'in_progress', // Set to in_progress so user can continue to questionnaire
          }
        });
      }
      
      // Send receipt email (won't block the response)
      sendPaymentReceipt(paymentId).catch(err => {
        console.error('Failed to send receipt email:', err);
      });
      
      // Process affiliate commission if applicable
      if (payment.assessment.userId) {
        const user = await prisma.user.findUnique({
          where: { id: payment.assessment.userId }
        });
        
        if (user && user.referredBy) {
          // Calculate commission (e.g., 10% of payment amount)
          const commissionRate = 0.10;
          const commissionAmount = payment.amount * commissionRate;
          
          // Create referral record
          try {
            await prisma.referral.create({
              data: {
                affiliateId: user.referredBy,
                userName: user.name || 'Anonymous',
                email: user.email,
                assessmentId: payment.assessment.id,
                assessmentType: payment.assessment.type,
                status: 'completed',
                commission: commissionAmount,
                paidOut: false
              }
            });
            
            // Update affiliate stats
            const affiliateStats = await prisma.affiliateStats.findUnique({
              where: { userId: user.referredBy }
            });
            
            if (affiliateStats) {
              await prisma.affiliateStats.update({
                where: { userId: user.referredBy },
                data: {
                  totalReferrals: affiliateStats.totalReferrals + 1,
                  totalEarnings: affiliateStats.totalEarnings + commissionAmount
                }
              });
            }
            
            // Create affiliate transaction
            await prisma.affiliateTransaction.create({
              data: {
                userId: user.referredBy,
                paymentId: payment.id,
                amount: commissionAmount,
                status: 'pending'
              }
            });
          } catch (referralError) {
            console.error('Error processing referral:', referralError);
            // Continue even if referral processing fails
          }
        }
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Payment ${isSuccessful ? 'successful' : 'failed'}`
    });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return NextResponse.json({ 
      message: 'Error processing payment webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}