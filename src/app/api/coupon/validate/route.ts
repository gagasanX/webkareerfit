import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { 
  getAssessmentBasePrice, 
  getTierPrice, 
  validateCoupon,
  formatCurrency 
} from '@/lib/utils/priceCalculation';

export async function POST(request: NextRequest) {
  try {
    console.log('Coupon validation API called');
    
    // Authenticate the user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('Unauthorized access attempt');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
      console.log('Request data:', JSON.stringify(requestData));
    } catch (jsonError) {
      console.error('Failed to parse request JSON:', jsonError);
      return NextResponse.json({ message: 'Invalid request data' }, { status: 400 });
    }
    
    const { code, assessmentType, tier } = requestData;
    
    if (!code) {
      console.log('Missing required field: code');
      return NextResponse.json({ message: 'Coupon code is required' }, { status: 400 });
    }
    
    // Find the coupon
    console.log(`Looking for coupon with code: ${code}`);
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim() },
    });
    
    console.log('Coupon found:', coupon);
    
    if (!coupon) {
      return NextResponse.json({ message: 'Invalid coupon code' }, { status: 400 });
    }
    
    // Determine base price
    let basePrice: number;
    
    if (tier) {
      // If tier is specified, use tier pricing
      basePrice = getTierPrice(tier);
      console.log(`Using tier pricing - ${tier}: ${basePrice}`);
    } else if (assessmentType) {
      // If assessment type is specified, use assessment type pricing
      basePrice = getAssessmentBasePrice(assessmentType);
      console.log(`Using assessment type pricing - ${assessmentType}: ${basePrice}`);
    } else {
      // Default fallback
      basePrice = getTierPrice('basic');
      console.log(`Using default basic pricing: ${basePrice}`);
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
    console.error('Error validating coupon:', error);
    return NextResponse.json({ 
      message: 'Error validating coupon',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}