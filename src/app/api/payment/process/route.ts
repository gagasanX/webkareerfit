import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/auth';
import { 
  validateCoupon,
  formatCurrency 
} from '@/lib/utils/priceCalculation';
import { calculateCommission } from '@/lib/utils/commissionCalculation';

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

    // Process additional coupon if provided
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
    }

    // Verify the amount matches what client sent
    if (Math.abs(finalAmount - data.amount) > 0.01) {
      return NextResponse.json(
        { 
          error: 'Invalid payment amount',
          expected: finalAmount,
          provided: data.amount
        },
        { status: 400 }
      );
    }

    // Get the ORIGINAL assessment price for commission calculation (before any discounts)
    const originalAssessmentPrice = await getOriginalAssessmentPrice(assessment.type, assessment.tier);

    // Create or update payment record
    let payment;
    if (assessment.payment) {
      payment = await prisma.payment.update({
        where: { id: assessment.payment.id },
        data: {
          method: data.paymentMethod,
          amount: finalAmount,
          status: 'pending',
          couponId: appliedCoupon?.id || assessment.payment.couponId,
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

    // Simulate payment gateway response
    const simulatedPaymentResponse: SimulatedPaymentResponse = {
      success: true,
      paymentId: `sim_${Date.now()}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/payment/status?id=${assessment.id}`,
    };

    // Update payment with gateway reference and mark as completed
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId: simulatedPaymentResponse.paymentId,
        status: 'completed',
      },
    });

    // Process affiliate commission using ORIGINAL price
    await processAffiliateCommission(
      (session.user as ExtendedUser).id,
      payment.id,
      originalAssessmentPrice
    );

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

// Helper function to process affiliate commission
async function processAffiliateCommission(
  userId: string,
  paymentId: string,
  originalPrice: number
): Promise<void> {
  try {
    // Get user details including referrer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true }
    });

    if (!user?.referredBy) {
      return; // No referrer, no commission
    }

    // Find the affiliate (referrer)
    const affiliate = await prisma.user.findUnique({
      where: { affiliateCode: user.referredBy },
      select: { 
        id: true, 
        isAffiliate: true,
        affiliateType: true 
      }
    });

    if (!affiliate?.isAffiliate) {
      return; // Referrer is not an active affiliate
    }

    // Calculate commission based on original price
    const commissionCalc = calculateCommission(originalPrice);
    const commissionAmount = commissionCalc.commissionAmount;

    if (commissionAmount <= 0) {
      return; // No commission for this price tier
    }

    console.log('Processing affiliate commission:', {
      affiliateId: affiliate.id,
      originalPrice,
      commissionAmount,
      paymentId
    });

    // Create affiliate transaction
    await prisma.affiliateTransaction.create({
      data: {
        userId: affiliate.id,
        paymentId: paymentId,
        amount: commissionAmount,
        status: 'pending', // Will be paid out later
      },
    });

    // Update affiliate stats
    const existingStats = await prisma.affiliateStats.findUnique({
      where: { userId: affiliate.id },
    });

    if (existingStats) {
      await prisma.affiliateStats.update({
        where: { userId: affiliate.id },
        data: {
          totalReferrals: { increment: 1 },
          totalEarnings: { increment: commissionAmount },
        },
      });
    } else {
      // Create stats if they don't exist
      await prisma.affiliateStats.create({
        data: {
          userId: affiliate.id,
          totalReferrals: 1,
          totalEarnings: commissionAmount,
          totalPaid: 0,
        },
      });
    }

    console.log(`Commission of RM${commissionAmount} processed for affiliate ${affiliate.id}`);
  } catch (error) {
    console.error('Error processing affiliate commission:', error);
    // Don't throw error - commission processing shouldn't fail payment
  }
}