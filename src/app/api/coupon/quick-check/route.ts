// /src/app/api/coupon/quick-check/route.ts - WITH COMPREHENSIVE DEBUG LOGS
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { validateCoupon, getTierPrice } from '@/lib/utils/priceCalculation';

export async function POST(request: NextRequest) {
  console.log('🎫 =================================');
  console.log('🎫 COUPON VALIDATION API CALLED');
  console.log('🎫 =================================');
  
  try {
    // 🔥 DEBUG: Check session
    console.log('🔐 Checking session...');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ Session found for user:', session.user.id);

    // 🔥 DEBUG: Parse request body
    console.log('📥 Parsing request body...');
    const requestBody = await request.json();
    console.log('📥 Request body:', requestBody);
    
    const { code, assessmentId, originalPrice } = requestBody;
    
    // 🔥 DEBUG: Validate input
    console.log('🔍 Input validation:', {
      code: code ? `"${code}"` : 'MISSING',
      assessmentId: assessmentId ? `"${assessmentId}"` : 'MISSING', 
      originalPrice: originalPrice !== undefined ? originalPrice : 'MISSING'
    });
    
    if (!code) {
      console.log('❌ No coupon code provided');
      return NextResponse.json({ valid: false, message: 'Coupon code required' });
    }

    const trimmedCode = code.trim();
    console.log('🎫 Searching for coupon:', `"${trimmedCode}"`);

    // 🔥 DEBUG: Database query
    console.log('🗄️ Querying database...');
    const coupon = await prisma.coupon.findUnique({
      where: { code: trimmedCode }
    });

    console.log('🗄️ Database result:', coupon ? {
      id: coupon.id,
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
      maxDiscount: coupon.maxDiscount,
      currentUses: coupon.currentUses,
      maxUses: coupon.maxUses,
      expiresAt: coupon.expiresAt,
      isExpired: new Date() > coupon.expiresAt
    } : 'NOT FOUND');

    if (!coupon) {
      console.log('❌ Coupon not found in database');
      return NextResponse.json({ 
        valid: false, 
        message: 'Invalid coupon code',
        debug: { searched: trimmedCode }
      });
    }

    // 🔥 DEBUG: Validate coupon business logic
    console.log('🧮 Validating coupon business rules...');
    console.log('🧮 Original price for calculation:', originalPrice);
    
    const validation = validateCoupon(coupon, originalPrice);
    
    console.log('🧮 Validation result:', {
      isValid: validation.isValid,
      message: validation.message,
      discountCalculation: validation.discountCalculation ? {
        originalPrice: validation.discountCalculation.originalPrice,
        discountPercentage: validation.discountCalculation.discountPercentage,
        discountAmount: validation.discountCalculation.discountAmount,
        finalPrice: validation.discountCalculation.finalPrice,
        savings: validation.discountCalculation.savings
      } : null
    });

    if (!validation.isValid) {
      console.log('❌ Coupon validation failed:', validation.message);
      return NextResponse.json({ 
        valid: false, 
        message: validation.message,
        debug: {
          couponFound: true,
          validationFailed: true,
          reason: validation.message
        }
      });
    }

    // 🔥 DEBUG: Success response preparation
    const responseData = {
      valid: true,
      finalPrice: validation.discountCalculation!.finalPrice,
      discount: validation.discountCalculation!.savings,
      message: `Save RM ${validation.discountCalculation!.savings.toFixed(2)}!`,
      debug: {
        originalPrice: validation.discountCalculation!.originalPrice,
        discountPercentage: validation.discountCalculation!.discountPercentage,
        discountAmount: validation.discountCalculation!.discountAmount,
        finalPrice: validation.discountCalculation!.finalPrice,
        savings: validation.discountCalculation!.savings
      }
    };
    
    console.log('✅ SUCCESS - Sending response:', responseData);
    console.log('🎫 =================================');

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('💥 COUPON API ERROR:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.log('🎫 =================================');
    
    return NextResponse.json({ 
      valid: false, 
      message: 'Validation failed',
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}