import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function POST(request: { json: () => PromiseLike<{ code: any; assessmentType: any; }> | { code: any; assessmentType: any; }; }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { code, assessmentType } = await request.json();
    
    if (!code || !assessmentType) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // Find the coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });
    
    if (!coupon || coupon.currentUses >= coupon.maxUses || new Date() > coupon.expiresAt) {
      return NextResponse.json({ message: 'Invalid or expired coupon' }, { status: 400 });
    }
    
    // Find base price for assessment type
    let basePrice = 50; // Default to basic tier
    if (assessmentType === 'standard') basePrice = 100;
    if (assessmentType === 'premium') basePrice = 250;
    
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
    return NextResponse.json({ message: 'Error applying coupon' }, { status: 500 });
  }
}