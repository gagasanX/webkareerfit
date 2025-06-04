// /src/app/api/coupon/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

// CRITICAL: Simplified tier pricing - ONLY source of truth
const TIER_PRICES: Record<string, number> = {
  'basic': 50,
  'standard': 100,
  'premium': 250
};

// Helper function for discount calculation
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
  // FIXED: Use correct schema properties (currentUses, not isUsed)
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
    console.log('Coupon validation API called');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('Unauthorized access attempt');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    let requestData;
    try {
      requestData = await request.json();
      console.log('Request data:', JSON.stringify(requestData));
    } catch (jsonError) {
      console.error('Failed to parse request JSON:', jsonError);
      return NextResponse.json({ message: 'Invalid request data' }, { status: 400 });
    }
    
    const { code, tier, assessmentId } = requestData;
    
    if (!code) {
      console.log('Missing required field: code');
      return NextResponse.json({ message: 'Coupon code is required' }, { status: 400 });
    }
    
    // Find the coupon
    console.log(`Looking for coupon with code: ${code.trim()}`);
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim() },
    });
    
    console.log('Coupon found:', coupon ? 'Yes' : 'No');
    
    if (!coupon) {
      return NextResponse.json({ message: 'Invalid coupon code' }, { status: 400 });
    }
    
    // CRITICAL: Simplified pricing logic - tier pricing ONLY
    let basePrice: number;
    let priceSource: string;
    
    console.log('Pricing determination inputs:', { tier, assessmentId });
    
    // Priority 1: Use tier pricing (MOST RELIABLE)
    if (tier && TIER_PRICES[tier]) {
      basePrice = TIER_PRICES[tier];
      priceSource = `tier pricing - ${tier}`;
      console.log(`✅ Using tier pricing - ${tier}: RM${basePrice}`);
    }
    // Priority 2: Get tier from existing assessment
    else if (assessmentId) {
      try {
        const assessment = await prisma.assessment.findUnique({
          where: { id: assessmentId },
          select: { tier: true, price: true }
        });
        
        if (assessment && assessment.tier && TIER_PRICES[assessment.tier]) {
          basePrice = TIER_PRICES[assessment.tier];
          priceSource = `assessment tier - ${assessment.tier}`;
          console.log(`✅ Using assessment tier pricing - ${assessment.tier}: RM${basePrice}`);
        } else {
          basePrice = TIER_PRICES.basic;
          priceSource = 'fallback to basic tier';
          console.log('⚠️ Assessment not found or invalid tier, using basic');
        }
      } catch (error) {
        console.warn('Error getting assessment, using default basic tier');
        basePrice = TIER_PRICES.basic;
        priceSource = 'error fallback - basic tier';
      }
    }
    // Priority 3: Default fallback
    else {
      basePrice = TIER_PRICES.basic;
      priceSource = 'default basic pricing';
      console.log('⚠️ No tier or assessment provided, using default basic');
    }
    
    console.log(`Final pricing decision: ${priceSource} = RM${basePrice}`);
    
    // Validate coupon and calculate discount
    const validation = validateCoupon(coupon, basePrice);
    
    if (!validation.isValid) {
      return NextResponse.json({ 
        message: validation.message 
      }, { status: 400 });
    }
    
    const discountCalc = validation.discountCalculation!;
    
    console.log('Discount calculation result:', {
      priceSource: priceSource,
      originalPrice: discountCalc.originalPrice,
      discountPercentage: discountCalc.discountPercentage,
      discountAmount: discountCalc.discountAmount,
      finalPrice: discountCalc.finalPrice,
      savings: discountCalc.savings
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
      debug: {
        priceSource: priceSource,
        inputTier: tier,
        inputAssessmentId: assessmentId,
        detectedPrice: basePrice,
        tierUsed: Object.keys(TIER_PRICES).find(key => TIER_PRICES[key] === basePrice)
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json({ 
      message: 'Error validating coupon',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}