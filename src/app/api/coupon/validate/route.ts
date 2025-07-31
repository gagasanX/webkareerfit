// /src/app/api/coupon/validate/route.ts - CLEANED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { 
  validateCoupon,
  formatCurrency,
  getTierPrice  // Use central function
} from '@/lib/utils/priceCalculation';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { code, tier, assessmentId } = await request.json();
    
    if (!code) {
      return NextResponse.json({ message: 'Coupon code is required' }, { status: 400 });
    }
    
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim() },
    });
    
    if (!coupon) {
      return NextResponse.json({ message: 'Invalid coupon code' }, { status: 400 });
    }
    
    // SIMPLIFIED: Use central pricing function
    let basePrice: number;
    let priceSource: string;
    
    if (tier) {
      basePrice = getTierPrice(tier);
      priceSource = `tier pricing - ${tier}`;
    } else if (assessmentId) {
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        select: { tier: true }
      });
      
      basePrice = getTierPrice(assessment?.tier || 'basic');
      priceSource = `assessment tier - ${assessment?.tier || 'basic'}`;
    } else {
      basePrice = getTierPrice('basic');
      priceSource = 'default basic pricing';
    }
    
    const validation = validateCoupon(coupon, basePrice);
    
    if (!validation.isValid) {
      return NextResponse.json({ 
        message: validation.message 
      }, { status: 400 });
    }
    
    const discountCalc = validation.discountCalculation!;
    
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
      message: `Coupon applied! You save ${formatCurrency(discountCalc.savings)}`,
      debug: { priceSource }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json({ 
      message: 'Error validating coupon',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}