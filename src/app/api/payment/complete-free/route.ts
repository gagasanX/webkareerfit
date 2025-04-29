import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { sendPaymentReceipt } from '@/lib/email/sendReceipt';

export async function POST(request: NextRequest) {
  try {
    console.log('Free assessment completion API called');
    
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('Unauthorized access attempt');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Parse request data
    let requestData;
    try {
      requestData = await request.json();
      console.log('Request data:', JSON.stringify(requestData));
    } catch (jsonError) {
      console.error('Failed to parse request JSON:', jsonError);
      return NextResponse.json({ message: 'Invalid request data' }, { status: 400 });
    }
    
    const { assessmentId } = requestData;
    
    if (!assessmentId) {
      console.log('Missing required field: assessmentId');
      return NextResponse.json({ message: 'Missing required field: assessmentId' }, { status: 400 });
    }
    
    // Verify assessment exists and belongs to user
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { payment: { include: { coupon: true } } }
    });
    
    if (!assessment) {
      return NextResponse.json({ message: 'Assessment not found' }, { status: 404 });
    }
    
    if (assessment.userId !== userId) {
      return NextResponse.json({ message: 'You do not own this assessment' }, { status: 403 });
    }
    
    // Verify the assessment is actually free (price is 0)
    if (assessment.price > 0) {
      return NextResponse.json({ message: 'Assessment is not free' }, { status: 400 });
    }
    
    let paymentId;
    
    // Transaction to update both payment and assessment
    await prisma.$transaction(async (tx) => {
      // If payment record exists, update it
      if (assessment.payment) {
        const updatedPayment = await tx.payment.update({
          where: { id: assessment.payment.id },
          data: {
            status: 'completed',
            method: 'coupon',
            amount: 0
          }
        });
        paymentId = updatedPayment.id;
        
        // If there's a coupon associated, increment its usage counter
        if (assessment.payment.couponId) {
          await tx.coupon.update({
            where: { id: assessment.payment.couponId },
            data: {
              currentUses: {
                increment: 1
              }
            }
          });
        }
      } else {
        // Create payment record if it doesn't exist
        const newPayment = await tx.payment.create({
          data: {
            userId: userId,
            assessmentId: assessmentId,
            status: 'completed',
            method: 'coupon',
            amount: 0
          }
        });
        paymentId = newPayment.id;
      }
      
      // Check if this assessment requires manual processing
      const isManualProcessing = assessment.manualProcessing || 
                                assessment.price === 100 || 
                                assessment.price === 250;
      
      // Update assessment status based on processing type
      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          status: isManualProcessing ? 'pending_review' : 'in_progress'
        }
      });
    });
    
    // Send receipt email
    if (paymentId) {
      sendPaymentReceipt(paymentId).catch(err => {
        console.error('Failed to send receipt email for free assessment:', err);
      });
    }
    
    // Process affiliate reward if applicable
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (user && user.referredBy) {
        // For free assessments, we may want different commission rules
        const commissionAmount = 2.0; // Fixed RM2 commission for free assessments
        
        // Create or update the referral record
        await prisma.referral.create({
          data: {
            affiliateId: user.referredBy,
            userName: user.name || 'Anonymous',
            email: user.email,
            assessmentId: assessment.id,
            assessmentType: assessment.type,
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
      }
    } catch (referralError) {
      // Log but don't fail the request if referral processing fails
      console.error('Error processing referral for free assessment:', referralError);
    }
    
    // Check if this assessment requires manual processing
    const isManualProcessing = assessment.manualProcessing || 
                              assessment.price === 100 || 
                              assessment.price === 250;
    
    return NextResponse.json({
      success: true,
      message: 'Assessment unlocked successfully',
      redirectUrl: `/assessment/${assessment.type}/results/${assessment.id}`,
      isManualProcessing: isManualProcessing
    });
  } catch (error) {
    console.error('Error processing free assessment:', error);
    return NextResponse.json({ 
      message: 'Failed to process free assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}