import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/auth';
import { 
  validateCoupon,
  formatCurrency 
} from '@/lib/utils/priceCalculation';

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

    // Use assessment price as base price (which may already be discounted)
    let finalAmount = Number(assessment.price);
    let appliedCoupon = null;
    let discountInfo = null;

    // Process additional coupon if provided (for double discount scenarios)
    if (data.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: data.couponCode },
      });

      if (!coupon) {
        return NextResponse.json(
          { error: 'Invalid coupon code' },
          { status: 400 }
        );
      }

      // Validate coupon
      const validation = validateCoupon(coupon, finalAmount);
      
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.message },
          { status: 400 }
        );
      }

      const discountCalc = validation.discountCalculation!;
      finalAmount = discountCalc.finalPrice;
      appliedCoupon = coupon;
      discountInfo = discountCalc;

      console.log('Additional coupon applied:', {
        originalAmount: discountCalc.originalPrice,
        finalAmount: discountCalc.finalPrice,
        savings: discountCalc.savings
      });
    }

    // Verify the amount matches what client sent (with small tolerance for floating point)
    if (Math.abs(finalAmount - data.amount) > 0.01) {
      console.error('Amount mismatch:', {
        calculated: finalAmount,
        provided: data.amount,
        difference: Math.abs(finalAmount - data.amount)
      });
      
      return NextResponse.json(
        { 
          error: 'Invalid payment amount',
          expected: finalAmount,
          provided: data.amount
        },
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
          couponId: appliedCoupon?.id || assessment.payment.couponId, // Keep existing coupon if no new one
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

    // If new coupon is being used, increment its usage count
    if (appliedCoupon) {
      await prisma.coupon.update({
        where: { id: appliedCoupon.id },
        data: { 
          currentUses: { increment: 1 },
          updatedAt: new Date() 
        },
      });
    }

    // In a real implementation, you would call your payment gateway here
    // For development/testing, simulate a successful payment
    const simulatedPaymentResponse: SimulatedPaymentResponse = {
      success: true,
      paymentId: `sim_${Date.now()}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/payment/status?id=${assessment.id}`,
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

    // Track referral if applicable (use original assessment price for commission calculation)
    const referrer = (session.user as ExtendedUser).referredBy;
    if (referrer) {
      const referrerUser = await prisma.user.findUnique({
        where: { affiliateCode: referrer },
      });

      if (referrerUser && referrerUser.isAffiliate) {
        // Calculate commission (10% of the original assessment price, not the discounted price)
        const originalPrice = await getOriginalAssessmentPrice(assessment.type, assessment.tier);
        const commissionAmount = Math.round(originalPrice * 0.1 * 100) / 100; // Proper rounding

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
              totalReferrals: { increment: 1 },
              totalEarnings: { increment: commissionAmount },
            },
          });
        }
      }
    }

    const response: any = {
      success: true,
      paymentId: payment.id,
      paymentUrl: simulatedPaymentResponse.redirectUrl,
      finalAmount: finalAmount,
      formattedAmount: formatCurrency(finalAmount),
    };

    // Include discount information if coupon was applied
    if (discountInfo) {
      response.discountInfo = {
        originalPrice: discountInfo.originalPrice,
        discount: discountInfo.savings,
        discountPercentage: discountInfo.discountPercentage,
        formattedOriginalPrice: formatCurrency(discountInfo.originalPrice),
        formattedDiscount: formatCurrency(discountInfo.savings),
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

// Helper function to get original assessment price
async function getOriginalAssessmentPrice(assessmentType: string, tier?: string): Promise<number> {
  const { getAssessmentBasePrice, getTierPrice } = await import('@/lib/utils/priceCalculation');
  
  if (tier) {
    return getTierPrice(tier);
  }
  
  return getAssessmentBasePrice(assessmentType);
}