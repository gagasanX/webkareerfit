import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('Coupon application API called');
    
    // Authenticate the user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('Unauthorized access attempt');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
      console.log('Request data:', JSON.stringify(requestData));
    } catch (jsonError) {
      console.error('Failed to parse request JSON:', jsonError);
      return NextResponse.json({ message: 'Invalid request data' }, { status: 400 });
    }
    
    const { code, assessmentId } = requestData;
    
    if (!code || !assessmentId) {
      console.log('Missing required fields:', { code, assessmentId });
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // Find the assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    
    if (!assessment) {
      return NextResponse.json({ message: 'Assessment not found' }, { status: 404 });
    }
    
    if (assessment.userId !== userId) {
      return NextResponse.json({ message: 'You do not own this assessment' }, { status: 403 });
    }
    
    // Find the coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim() },
    });
    
    if (!coupon) {
      return NextResponse.json({ message: 'Invalid coupon code' }, { status: 400 });
    }
    
    // Check usage limit instead of isUsed
    if (coupon.currentUses >= coupon.maxUses) {
      return NextResponse.json({ message: 'This coupon has reached its usage limit' }, { status: 400 });
    }
    
    if (new Date() > coupon.expiresAt) {
      return NextResponse.json({ message: 'This coupon has expired' }, { status: 400 });
    }
    
    // Calculate discounted price
    let basePrice = assessment.price;
    let finalPrice = basePrice;
    const discountAmount = (basePrice * coupon.discountPercentage) / 100;
    
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      finalPrice = basePrice - coupon.maxDiscount;
    } else {
      finalPrice = basePrice - discountAmount;
    }
    
    // Ensure price is not negative
    finalPrice = Math.max(0, finalPrice);
    
    // Check if a payment record already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { assessmentId },
    });
    
    // Transaction to ensure both operations happen or none
    await prisma.$transaction(async (tx) => {
      // Increment coupon usage count instead of marking as used
      await tx.coupon.update({
        where: { id: coupon.id },
        data: {
          currentUses: {
            increment: 1
          }
        },
      });
      
      if (existingPayment) {
        // Update existing payment
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            amount: finalPrice,
            couponId: coupon.id,
          },
        });
      } else {
        // Create new payment record
        await tx.payment.create({
          data: {
            assessmentId,
            userId,
            amount: finalPrice,
            method: 'pending',
            status: 'pending',
            couponId: coupon.id,
          },
        });
      }
      
      // Update assessment price
      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          price: finalPrice,
        },
      });
    });
    
    return NextResponse.json({
      success: true,
      couponCode: code,
      originalPrice: basePrice,
      finalPrice,
      discount: basePrice - finalPrice,
      message: 'Coupon applied successfully to assessment'
    });
  } catch (error) {
    console.error('Error applying coupon to assessment:', error);
    return NextResponse.json({ 
      message: 'Error applying coupon to assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}