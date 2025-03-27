import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

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
    
    const { code, assessmentType } = requestData;
    
    if (!code || !assessmentType) {
      console.log('Missing required fields:', { code, assessmentType });
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
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
    
    // Check usage limit instead of isUsed
    if (coupon.currentUses >= coupon.maxUses) {
      return NextResponse.json({ message: 'This coupon has reached its usage limit' }, { status: 400 });
    }
    
    if (new Date() > coupon.expiresAt) {
      return NextResponse.json({ message: 'This coupon has expired' }, { status: 400 });
    }
    
    // Find base price for assessment type
    let basePrice = 50; // Default to basic tier
    if (assessmentType === 'fjrl') basePrice = 50;  // First Job Readiness Level
    if (assessmentType === 'ijrl') basePrice = 60;  // Ideal Job Readiness Level
    if (assessmentType === 'cdrl') basePrice = 75;  // Career Development Readiness Level
    if (assessmentType === 'ccrl') basePrice = 80;  // Career Comeback Readiness Level
    if (assessmentType === 'ctrl') basePrice = 100; // Career Transition Readiness Level
    if (assessmentType === 'rrl') basePrice = 120;  // Retirement Readiness Level
    if (assessmentType === 'irl') basePrice = 40;   // Internship Readiness Level
    
    console.log(`Base price for ${assessmentType}: ${basePrice}`);
    
    // Calculate discounted price
    let finalPrice = basePrice;
    const discountAmount = (basePrice * coupon.discountPercentage) / 100;
    
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      finalPrice = basePrice - coupon.maxDiscount;
    } else {
      finalPrice = basePrice - discountAmount;
    }
    
    // Ensure price is not negative
    finalPrice = Math.max(0, finalPrice);
    
    console.log('Discount calculation:', {
      basePrice,
      discountPercentage: coupon.discountPercentage,
      discountAmount,
      maxDiscount: coupon.maxDiscount,
      finalPrice
    });
    
    return NextResponse.json({
      success: true,
      couponCode: code,
      originalPrice: basePrice,
      finalPrice,
      discount: basePrice - finalPrice,
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    return NextResponse.json({ 
      message: 'Error applying coupon',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}