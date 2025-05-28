import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyBillplzPayment } from '@/lib/payment/billplz';
import { verifyToyyibpayPayment } from '@/lib/payment/toyyibpay';
import { sendPaymentReceipt } from '@/lib/email/sendReceipt';
import { calculateCommission } from '@/lib/utils/commissionCalculation';

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
    
    console.log(`Processing payment ${paymentId}, successful: ${isSuccessful}`);
    
    // Update payment status in database
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { 
        assessment: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            referredBy: true
          }
        }
      }
    });
    
    if (!payment) {
      console.error(`Payment ${paymentId} not found`);
      return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
    }
    
    // Update payment status
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: isSuccessful ? 'completed' : 'failed',
        updatedAt: new Date()
      }
    });
    
    console.log(`Payment ${paymentId} updated to status: ${isSuccessful ? 'completed' : 'failed'}`);
    
    // If payment is successful
    if (isSuccessful) {
      // Update assessment status if it's not already completed
      if (payment.assessment && payment.assessment.status !== 'completed') {
        await prisma.assessment.update({
          where: { id: payment.assessment.id },
          data: {
            status: 'in_progress', // Set to in_progress so user can continue
          }
        });
        
        console.log(`Assessment ${payment.assessment.id} status updated to in_progress`);
      }
      
      // Send receipt email (won't block the response)
      sendPaymentReceipt(paymentId).catch(err => {
        console.error('Failed to send receipt email:', err);
      });
      
      // Process affiliate commission if applicable
      if (payment.user?.referredBy) {
        console.log(`Processing affiliate commission for referral code: ${payment.user.referredBy}`);
        
        try {
          // Find affiliate by affiliateCode (not by ID)
          const affiliate = await prisma.user.findUnique({
            where: { 
              affiliateCode: payment.user.referredBy,
              isAffiliate: true 
            },
            select: {
              id: true,
              name: true,
              email: true,
              affiliateCode: true
            }
          });
          
          if (!affiliate) {
            console.log(`Affiliate not found for code: ${payment.user.referredBy}`);
          } else {
            console.log(`Found affiliate: ${affiliate.name} (${affiliate.id}) for code: ${affiliate.affiliateCode}`);
            
            // Get original assessment price for commission calculation
            let originalPrice = payment.amount;
            
            // If assessment has tier, use tier pricing for commission calculation
            if (payment.assessment) {
              try {
                const { getTierPrice, getAssessmentBasePrice } = await import('@/lib/utils/priceCalculation');
                
                if (payment.assessment.tier) {
                  originalPrice = getTierPrice(payment.assessment.tier);
                } else {
                  originalPrice = getAssessmentBasePrice(payment.assessment.type);
                }
                
                console.log(`Original price for commission: RM${originalPrice} (assessment: ${payment.assessment.type}, tier: ${payment.assessment.tier})`);
              } catch (priceError) {
                console.error('Error getting original price, using payment amount:', priceError);
                originalPrice = payment.amount;
              }
            }
            
            // Calculate commission using our fixed commission structure
            const commissionCalc = calculateCommission(originalPrice);
            const commissionAmount = commissionCalc.commissionAmount;
            
            console.log(`Commission calculation: RM${originalPrice} → RM${commissionAmount} (${commissionCalc.commissionRate}%)`);
            
            if (commissionAmount > 0) {
              // Create referral record
              const referralRecord = await prisma.referral.create({
                data: {
                  affiliateId: affiliate.id, // Use affiliate.id, not user.referredBy
                  userName: payment.user.name || 'Anonymous',
                  email: payment.user.email || '',
                  assessmentId: payment.assessment?.id || null,
                  assessmentType: payment.assessment?.type || 'Unknown',
                  status: 'completed',
                  commission: commissionAmount,
                  paidOut: false
                }
              });
              
              console.log(`Created referral record: ${referralRecord.id}`);
              
              // Update affiliate stats
              const updatedStats = await prisma.affiliateStats.upsert({
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
                  totalPaid: 0
                }
              });
              
              console.log(`Updated affiliate stats for ${affiliate.id}: ${updatedStats.totalReferrals} referrals, RM${updatedStats.totalEarnings} total earnings`);
              
              // Create affiliate transaction record
              const affiliateTransaction = await prisma.affiliateTransaction.create({
                data: {
                  userId: affiliate.id,
                  paymentId: payment.id,
                  amount: commissionAmount,
                  status: 'pending' // Will be updated when payout is processed
                }
              });
              
              console.log(`Created affiliate transaction: ${affiliateTransaction.id}`);
              
              console.log(`✅ Commission RM${commissionAmount} awarded to affiliate ${affiliate.name} (${affiliate.id})`);
            } else {
              console.log(`No commission awarded - amount is RM${commissionAmount}`);
            }
          }
        } catch (referralError) {
          console.error('Error processing affiliate commission:', referralError);
          // Continue even if referral processing fails - don't block payment completion
        }
      } else {
        console.log('No referral code found for this payment');
      }
    } else {
      console.log(`Payment ${paymentId} failed - no commission processing`);
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Payment ${isSuccessful ? 'successful' : 'failed'}`,
      paymentId: paymentId,
      status: isSuccessful ? 'completed' : 'failed'
    });
    
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return NextResponse.json({ 
      message: 'Error processing payment webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}