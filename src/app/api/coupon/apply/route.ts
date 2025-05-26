import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { 
  validateCoupon,
  formatCurrency 
} from '@/lib/utils/priceCalculation';

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
    
    // Use assessment's current price as base price
    const basePrice = Number(assessment.price);
    
    if (isNaN(basePrice) || basePrice <= 0) {
      return NextResponse.json({ message: 'Invalid assessment price' }, { status: 400 });
    }
    
    // Validate coupon and calculate discount
    const validation = validateCoupon(coupon, basePrice);
    
    if (!validation.isValid) {
      return NextResponse.json({ 
        message: validation.message 
      }, { status: 400 });
    }
    
    const discountCalc = validation.discountCalculation!;
    
    console.log('Discount calculation:', {
      basePrice: discountCalc.originalPrice,
      discountPercentage: discountCalc.discountPercentage,
      discountAmount: discountCalc.discountAmount,
      finalPrice: discountCalc.finalPrice,
      savings: discountCalc.savings
    });
    
    // Check if a payment record already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { assessmentId },
    });
    
    // Transaction to ensure both operations happen or none
    await prisma.$transaction(async (tx) => {
      // Increment coupon usage count
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
            amount: discountCalc.finalPrice,
            couponId: coupon.id,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new payment record
        await tx.payment.create({
          data: {
            assessmentId,
            userId,
            amount: discountCalc.finalPrice,
            method: 'pending',
            status: 'pending',
            couponId: coupon.id,
          },
        });
      }
      
      // Update assessment price to the discounted price
      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          price: discountCalc.finalPrice,
        },
      });
    });
    
    return NextResponse.json({
      success: true,
      couponCode: code.trim(),
      originalPrice: discountCalc.originalPrice,
      finalPrice: discountCalc.finalPrice,
      discount: discountCalc.savings,
      discountPercentage: discountCalc.discountPercentage,
      formattedOriginalPrice: formatCurrency(discountCalc.originalPrice),
      formattedFinalPrice: formatCurrency(discountCalc.finalPrice),
      formattedDiscount: formatCurrency(discountCalc.savings),
      message: `Coupon applied successfully! You save ${formatCurrency(discountCalc.savings)}`
    });
  } catch (error) {
    console.error('Error applying coupon to assessment:', error);
    return NextResponse.json({ 
      message: 'Error applying coupon to assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}