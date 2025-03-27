import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/auth';

// You would typically import your payment gateway SDK here
// import { initializePayment } from '@/lib/payment/gateway';

// Define extended session user type
type ExtendedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  isAffiliate?: boolean;
  referredBy?: string | null;
};

// Define payment response type
type SimulatedPaymentResponse = {
  success: boolean;
  paymentId: string;
  redirectUrl?: string;
};

type PaymentRequestData = {
  assessmentId: string;
  paymentMethod: string;
  couponCode?: string;
  amount: number;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const data: PaymentRequestData = await req.json();
    
    // Validate request data
    if (!data.assessmentId || !data.paymentMethod || data.amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required payment information' },
        { status: 400 }
      );
    }

    // Fetch the assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: data.assessmentId },
      include: { payment: true },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Check if assessment belongs to the authenticated user
    if (assessment.userId !== (session.user as ExtendedUser).id) {
      return NextResponse.json(
        { error: 'You do not have permission to pay for this assessment' },
        { status: 403 }
      );
    }

    // Check if assessment is already paid
    if (assessment.payment && assessment.payment.status === 'completed') {
      return NextResponse.json(
        { error: 'This assessment has already been paid for' },
        { status: 400 }
      );
    }

    // Process discount/coupon if provided
    let finalAmount = assessment.price; // Default to full price
    let appliedCoupon = null;

    if (data.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: data.couponCode },
      });

      if (!coupon || new Date() > coupon.expiresAt || coupon.isUsed) {
        return NextResponse.json(
          { error: 'Invalid or expired coupon code' },
          { status: 400 }
        );
      }

      // Apply discount
      const discountAmount = (assessment.price * coupon.discountPercentage) / 100;
      
      // If there's a maximum discount limit
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        finalAmount -= coupon.maxDiscount;
      } else {
        finalAmount -= discountAmount;
      }

      finalAmount = Math.max(0, finalAmount); // Ensure amount is not negative
      appliedCoupon = coupon;
    }

    // Verify the amount matches what client sent
    if (Math.abs(finalAmount - data.amount) > 0.01) { // Small tolerance for floating point issues
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    // Create or update payment record
    let payment;
    if (assessment.payment) {
      payment = await prisma.payment.update({
        where: { id: assessment.payment.id },
        data: {
          method: data.paymentMethod,
          amount: finalAmount,
          status: 'pending', // Reset to pending if retry payment
          couponId: appliedCoupon?.id || null,
          updatedAt: new Date(),
        },
      });
    } else {
      payment = await prisma.payment.create({
        data: {
          userId: (session.user as ExtendedUser).id,
          assessmentId: assessment.id,
          method: data.paymentMethod,
          amount: finalAmount,
          status: 'pending',
          couponId: appliedCoupon?.id || null,
        },
      });
    }

    // If coupon is being used, mark it as used
    if (appliedCoupon) {
      await prisma.coupon.update({
        where: { id: appliedCoupon.id },
        data: { isUsed: true, usedAt: new Date() },
      });
    }

    // In a real implementation, you would call your payment gateway here
    // const paymentGatewayResponse = await initializePayment({
    //   amount: finalAmount,
    //   currency: 'MYR',
    //   paymentMethod: data.paymentMethod,
    //   description: `Payment for ${assessment.type.toUpperCase()} Assessment`,
    //   metadata: {
    //     assessmentId: assessment.id,
    //     paymentId: payment.id,
    //     userId: session.user.id,
    //   },
    //   returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/callback`,
    // });

    // For development/testing, simulate a successful payment
    const simulatedPaymentResponse: SimulatedPaymentResponse = {
      success: true,
      paymentId: `sim_${Date.now()}`,
      // Uncomment for testing redirect flow:
      // redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?id=${assessment.id}`,
    };

    // Update payment with gateway reference
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId: simulatedPaymentResponse.paymentId,
        // In real implementation, keep status as pending until callback confirmation
        // For development, we'll mark it as completed immediately
        status: 'completed',
      },
    });

    // Track referral if applicable
    const referrer = (session.user as ExtendedUser).referredBy;
    if (referrer) {
      const referrerUser = await prisma.user.findUnique({
        where: { affiliateCode: referrer },
      });

      if (referrerUser && referrerUser.isAffiliate) {
        // Calculate commission (10% of the original price, not the discounted price)
        const commissionAmount = assessment.price * 0.1;

        // Create affiliate transaction
        await prisma.affiliateTransaction.create({
          data: {
            userId: referrerUser.id,
            paymentId: payment.id,
            amount: commissionAmount,
            status: 'pending', // Will be updated to 'completed' when payout is processed
          },
        });

        // Update affiliate stats
        const stats = await prisma.affiliateStats.findUnique({
          where: { userId: referrerUser.id },
        });

        if (stats) {
          await prisma.affiliateStats.update({
            where: { userId: referrerUser.id },
            data: {
              totalReferrals: stats.totalReferrals + 1,
              totalEarnings: stats.totalEarnings + commissionAmount,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      // If the payment gateway requires redirect, include the URL
      ...(simulatedPaymentResponse.redirectUrl && {
        redirectUrl: simulatedPaymentResponse.redirectUrl,
      }),
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}