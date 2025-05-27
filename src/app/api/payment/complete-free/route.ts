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
                                assessment.tier === 'standard' || 
                                assessment.tier === 'premium';
      
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
    
    // NO AFFILIATE COMMISSION FOR FREE ASSESSMENTS
    console.log('Free assessment completed - no commission processed');
    
    // Determine the appropriate redirect URL based on tier
    let redirectUrl;
    
    if (assessment.tier === 'premium') {
      redirectUrl = `/assessment/${assessment.type}/premium-results/${assessment.id}`;
      console.log(`Premium tier - Redirecting to: ${redirectUrl}`);
    } 
    else if (assessment.tier === 'standard') {
      redirectUrl = `/assessment/${assessment.type}/standard-results/${assessment.id}`;
      console.log(`Standard tier - Redirecting to: ${redirectUrl}`);
    }
    else {
      redirectUrl = `/assessment/${assessment.type}/results/${assessment.id}`;
      console.log(`Basic tier - Redirecting to: ${redirectUrl}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Free assessment unlocked successfully',
      redirectUrl: redirectUrl,
      isManualProcessing: assessment.manualProcessing || assessment.tier === 'standard' || assessment.tier === 'premium',
      commission: {
        processed: false,
        reason: 'No commission for free assessments'
      }
    });
  } catch (error) {
    console.error('Error processing free assessment:', error);
    return NextResponse.json({ 
      message: 'Failed to process free assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}