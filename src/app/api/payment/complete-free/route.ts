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
    
    console.log('Processing free assessment completion:', {
      assessmentId,
      tier: assessment.tier,
      originalPrice: assessment.price,
      paymentAmount: assessment.payment?.amount || 0,
      couponApplied: !!assessment.payment?.couponId
    });
    
    // CRITICAL: Check payment amount, not assessment price
    // Assessment price never changes, but payment amount can be 0 after coupon
    const paymentAmount = assessment.payment?.amount || 0;
    
    if (paymentAmount > 0) {
      return NextResponse.json({ 
        message: 'Payment amount is not zero - this is not a free assessment',
        paymentAmount,
        assessmentPrice: assessment.price
      }, { status: 400 });
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
            amount: 0 // Ensure amount is 0 for free assessment
          }
        });
        paymentId = updatedPayment.id;
        console.log(`Updated existing payment ${paymentId} to completed`);
        
        // Coupon usage already incremented during coupon application
        // No need to increment again
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
        console.log(`Created new free payment ${paymentId}`);
      }
      
      // CRITICAL FIX: Always set status to 'in_progress' after free payment completion
      // This allows user to continue to questionnaire page
      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'in_progress' // Always set to in_progress so user can fill questionnaire
        }
      });
      
      console.log(`Assessment status updated to: in_progress`);
    });
    
    // 🚀 SEND RECEIPT EMAIL (already exists, keeping it)
    if (paymentId) {
      sendPaymentReceipt(paymentId).catch((err: Error) => {
        console.error('Failed to send receipt email for free assessment:', err);
      });
    }
    
    // NO AFFILIATE COMMISSION FOR FREE ASSESSMENTS
    console.log('Free assessment completed - no commission processed');
    
    // CRITICAL FIX: Always redirect to questionnaire page for free assessments
    const redirectUrl = `/assessment/${assessment.type}/${assessment.id}`;
    console.log(`Free assessment - Redirecting to questionnaire: ${redirectUrl}`);
    
    const isManualProcessing = assessment.tier === 'standard' || 
                              assessment.tier === 'premium' ||
                              assessment.manualProcessing === true;
    
    return NextResponse.json({
      success: true,
      message: 'Free assessment unlocked successfully',
      redirectUrl: redirectUrl,
      isManualProcessing: isManualProcessing,
      commission: {
        processed: false,
        reason: 'No commission for free assessments'
      },
      debug: {
        tier: assessment.tier,
        originalPrice: assessment.price,
        paymentAmount: 0,
        manualProcessing: isManualProcessing,
        redirectReason: `Redirecting to questionnaire: ${redirectUrl}`
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