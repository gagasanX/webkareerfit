import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/auth';
import { 
  validateCoupon,
  formatCurrency,
  getTierPrice  // Use existing function
} from '@/lib/utils/priceCalculation';
import { calculateCommission } from '@/lib/utils/commissionCalculation';
import { sendPaymentReceipt } from '@/lib/email/sendReceipt';

type ExtendedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  isAffiliate?: boolean;
  referredBy?: string | null;
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

    const data = await req.json();
    
    if (!data.assessmentId || !data.paymentMethod || data.amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required payment information' },
        { status: 400 }
      );
    }

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

    if (assessment.userId !== (session.user as ExtendedUser).id) {
      return NextResponse.json(
        { error: 'You do not have permission to pay for this assessment' },
        { status: 403 }
      );
    }

    if (assessment.payment && assessment.payment.status === 'completed') {
      return NextResponse.json(
        { error: 'This assessment has already been paid for' },
        { status: 400 }
      );
    }

    // Use assessment tier price (fixed)
    let finalAmount = getTierPrice(assessment.tier || 'basic');
    let appliedCoupon = null;
    let discountInfo = null;

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

    // Get original price for commission
    const originalAssessmentPrice = getTierPrice(assessment.tier || 'basic');

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

    if (appliedCoupon) {
      await prisma.coupon.update({
        where: { id: appliedCoupon.id },
        data: { 
          currentUses: { increment: 1 },
          updatedAt: new Date() 
        },
      });
    }

    const simulatedPaymentResponse = {
      success: true,
      paymentId: `sim_${Date.now()}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/payment/status?id=${assessment.id}`,
    };

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId: simulatedPaymentResponse.paymentId,
        status: 'completed',
      },
    });

    // 🚀 SEND RECEIPT EMAIL AFTER PAYMENT COMPLETION
    sendPaymentReceipt(payment.id).catch((emailError) => {
      console.error('Failed to send receipt email:', emailError);
      // Don't fail the payment if email fails
    });

    // Process affiliate commission
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

// Helper function for affiliate commission with proper queries
async function processAffiliateCommission(
  userId: string,
  paymentId: string,
  originalPrice: number
): Promise<void> {
  try {
    // Include name and email in query
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        referredBy: true,
        name: true,
        email: true
      }
    });

    if (!user?.referredBy) {
      return;
    }

    const affiliate = await prisma.user.findUnique({
      where: { affiliateCode: user.referredBy },
      select: { 
        id: true, 
        isAffiliate: true,
        affiliateType: true 
      }
    });

    if (!affiliate?.isAffiliate) {
      return;
    }

    // Use simple calculateCommission function
    const commissionAmount = calculateCommission(originalPrice);

    if (commissionAmount <= 0) {
      return;
    }

    console.log('Processing affiliate commission:', {
      affiliateId: affiliate.id,
      originalPrice,
      commissionAmount,
      paymentId
    });

    // Use existing referral table structure
    await prisma.referral.create({
      data: {
        affiliateId: affiliate.id,
        userName: user.name || 'Anonymous',
        email: user.email || '',
        assessmentId: '', // Optional field
        assessmentType: '',
        paymentId: paymentId,
        status: 'completed',
        commission: commissionAmount,
        paidOut: false
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
  }
}