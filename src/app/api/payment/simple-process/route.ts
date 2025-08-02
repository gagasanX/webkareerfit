// /src/app/api/payment/simple-process/route.ts  
// 🎯 SIMPLE: Handle coupon + payment in one call
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { createBillplzPayment } from '@/lib/payment/billplz';
import { validateCoupon, getTierPrice } from '@/lib/utils/priceCalculation';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assessmentId, couponCode, expectedAmount } = await request.json();

    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    });

    if (!assessment || assessment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    let finalPrice = getTierPrice(assessment.tier);
    let couponId = null;

    // Apply coupon if provided  
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.trim() }
      });

      if (coupon) {
        const validation = validateCoupon(coupon, finalPrice);
        if (validation.isValid) {
          finalPrice = validation.discountCalculation!.finalPrice;
          couponId = coupon.id;

          // Increment coupon usage
          await prisma.coupon.update({
            where: { id: coupon.id },
            data: { currentUses: { increment: 1 } }
          });
        }
      }
    }

    // Verify expected amount matches calculated amount
    if (Math.abs(finalPrice - expectedAmount) > 0.01) {
      return NextResponse.json({ 
        error: 'Price mismatch. Please refresh and try again.' 
      }, { status: 400 });
    }

    // Create/update payment record
    const payment = await prisma.payment.upsert({
      where: { assessmentId },
      update: {
        amount: finalPrice,
        couponId,
        status: 'pending'
      },
      create: {
        userId: session.user.id,
        assessmentId,
        amount: finalPrice,
        method: 'pending',
        status: 'pending',
        couponId
      }
    });

    // Handle free assessment
    if (finalPrice <= 0) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'completed', method: 'coupon' }
        }),
        prisma.assessment.update({
          where: { id: assessmentId },
          data: { status: 'in_progress' }
        })
      ]);

      return NextResponse.json({
        success: true,
        paymentUrl: null, // Will redirect to assessment in component
        message: 'Free assessment unlocked!'
      });
    }

    // Handle paid assessment - create Billplz payment
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true }
    });

    const billplzPayment = await createBillplzPayment({
      amount: finalPrice,
      description: `${assessment.type.toUpperCase()} Assessment`,
      name: user?.name || 'User',
      email: user?.email || session.user.email!,
      phone: user?.phone || '',
      paymentId: payment.id,
      redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/status`,
      callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/webhook/billplz`
    });

    // Update payment with gateway ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId: billplzPayment.id,
        status: 'processing'
      }
    });

    return NextResponse.json({
      success: true,
      paymentUrl: billplzPayment.url,
      amount: finalPrice
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json({ 
      error: 'Payment processing failed' 
    }, { status: 500 });
  }
}