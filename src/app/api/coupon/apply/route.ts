// /src/app/api/coupon/apply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

// Helper functions (same as validation route for consistency)
interface DiscountCalculation {
  originalPrice: number;
  discountPercentage: number;
  discountAmount: number;
  finalPrice: number;
  savings: number;
}

function calculateDiscount(
  basePrice: number,
  discountPercentage: number,
  maxDiscount?: number | null
): DiscountCalculation {
  const price = Number(basePrice);
  const percentage = Number(discountPercentage);
  const maxDiscountNum = maxDiscount ? Number(maxDiscount) : null;
  
  if (isNaN(price) || isNaN(percentage) || price < 0 || percentage < 0 || percentage > 100) {
    throw new Error('Invalid price or discount percentage');
  }
  
  let discountAmount = Math.round((price * percentage) / 100 * 100) / 100;
  
  if (maxDiscountNum && discountAmount > maxDiscountNum) {
    discountAmount = maxDiscountNum;
  }
  
  let finalPrice = price - discountAmount;
  finalPrice = Math.max(0, Math.round(finalPrice * 100) / 100);
  discountAmount = Math.round(discountAmount * 100) / 100;
  
  return {
    originalPrice: Math.round(price * 100) / 100,
    discountPercentage: percentage,
    discountAmount,
    finalPrice,
    savings: discountAmount,
  };
}

function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

function validateCoupon(
  coupon: {
    discountPercentage: number;
    maxDiscount?: number | null;
    currentUses: number;
    maxUses: number;
    expiresAt: Date;
  },
  basePrice: number
): { isValid: boolean; message: string; discountCalculation?: DiscountCalculation } {
  // FIXED: Use correct schema properties
  if (coupon.currentUses >= coupon.maxUses) {
    return {
      isValid: false,
      message: 'This coupon has reached its usage limit'
    };
  }
  
  if (new Date() > coupon.expiresAt) {
    return {
      isValid: false,
      message: 'This coupon has expired'
    };
  }
  
  try {
    const discountCalculation = calculateDiscount(
      basePrice,
      coupon.discountPercentage,
      coupon.maxDiscount
    );
    
    return {
      isValid: true,
      message: 'Coupon is valid',
      discountCalculation
    };
  } catch (error) {
    return {
      isValid: false,
      message: 'Invalid coupon configuration'
    };
  }
}

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
    
    // CRITICAL: Use assessment's ORIGINAL price - NEVER change it
    const originalPrice = Number(assessment.price);
    
    if (isNaN(originalPrice) || originalPrice <= 0) {
      return NextResponse.json({ message: 'Invalid assessment price' }, { status: 400 });
    }
    
    console.log('Coupon validation:', {
      assessmentId,
      originalPrice,
      couponCode: code.trim(),
      assessmentTier: assessment.tier
    });
    
    // Validate coupon and calculate discount
    const validation = validateCoupon(coupon, originalPrice);
    
    if (!validation.isValid) {
      return NextResponse.json({ 
        message: validation.message 
      }, { status: 400 });
    }
    
    const discountCalc = validation.discountCalculation!;
    
    console.log('Discount calculation:', {
      originalPrice: discountCalc.originalPrice,
      discountPercentage: discountCalc.discountPercentage,
      discountAmount: discountCalc.discountAmount,
      finalPaymentAmount: discountCalc.finalPrice,
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
        // Update existing payment with discounted amount
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            amount: discountCalc.finalPrice, // Only payment amount changes
            couponId: coupon.id,
            updatedAt: new Date(),
          },
        });
        console.log(`Updated existing payment: ${existingPayment.id} with amount: ${discountCalc.finalPrice}`);
      } else {
        // Create new payment record with discounted amount
        const newPayment = await tx.payment.create({
          data: {
            assessmentId,
            userId,
            amount: discountCalc.finalPrice, // Only payment amount is discounted
            method: 'pending',
            status: 'pending',
            couponId: coupon.id,
          },
        });
        console.log(`Created new payment: ${newPayment.id} with amount: ${discountCalc.finalPrice}`);
      }
      
      // CRITICAL: DO NOT change assessment price!
      // Assessment price remains the same for tier determination
      console.log(`✅ CRITICAL: Assessment price REMAINS unchanged at RM${originalPrice} (tier: ${assessment.tier})`);
      console.log(`✅ Only payment amount changes to RM${discountCalc.finalPrice}`);
      
      // Optional: Store discount info in assessment data for reference only
      const currentData = assessment.data as Record<string, any> || {};
      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          data: {
            ...currentData,
            couponApplied: {
              code: code.trim(),
              discountPercentage: discountCalc.discountPercentage,
              originalPrice: discountCalc.originalPrice,
              discountAmount: discountCalc.discountAmount,
              finalPaymentAmount: discountCalc.finalPrice,
              appliedAt: new Date().toISOString(),
              note: 'Assessment price unchanged - only payment amount discounted for tier determination'
            }
          }
        },
      });
      
      console.log(`Assessment tier determination will use original price: RM${originalPrice}`);
    });
    
    console.log('Coupon applied successfully:', {
      assessmentId,
      couponCode: code.trim(),
      originalAssessmentPrice: originalPrice, // Unchanged
      finalPaymentAmount: discountCalc.finalPrice, // Discounted
      tier: assessment.tier,
      manualProcessing: assessment.manualProcessing
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
      message: `Coupon applied successfully! You save ${formatCurrency(discountCalc.savings)}`,
      // Debug info
      debug: {
        assessmentPriceUnchanged: originalPrice,
        paymentAmountChanged: discountCalc.finalPrice,
        tier: assessment.tier,
        manualProcessing: assessment.manualProcessing
      }
    });
  } catch (error) {
    console.error('Error applying coupon to assessment:', error);
    return NextResponse.json({ 
      message: 'Error applying coupon to assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}