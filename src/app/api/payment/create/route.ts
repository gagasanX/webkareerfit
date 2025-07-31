// /src/app/api/payment/create/route.ts
// UPDATED: Unified, secure payment creation endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { createBillplzPayment, validateBillplzConfig } from '@/lib/payment/billplz';
import { 
  formatCurrency, 
  validateCoupon, 
  getTierPrice, 
  calculateDiscount,
  type CouponValidation 
} from '@/lib/utils/priceCalculation';
import { calculateCommission, getCommissionRate } from '@/lib/utils/commissionCalculation';

interface PaymentRequest {
  assessmentId: string;
  amount: number;
  method: string;
  couponCode?: string;
  tier?: string;
}

interface PaymentResponse {
  success: boolean;
  paymentId: string;
  gatewayPaymentId?: string;
  paymentUrl?: string | null;
  amount: number;
  formattedAmount: string;
  message?: string;
  discountInfo?: {
    originalPrice: number;
    discount: number;
    discountPercentage: number;
    formattedOriginalPrice: string;
    formattedDiscount: string;
  };
  commissionInfo?: {
    eligible: boolean;
    amount: number;
    rate: number;
    formattedAmount: string;
    reason?: string;
  };
  affiliatePreview?: any;
}

export async function POST(request: NextRequest): Promise<NextResponse<PaymentResponse | { message: string; details?: string }>> {
  try {
    console.log('💳 Payment creation API called');
    
    // Validate Billplz configuration first
    const configValidation = validateBillplzConfig();
    if (!configValidation.isValid) {
      console.error('❌ Billplz configuration invalid:', configValidation.errors);
      return NextResponse.json({ 
        message: 'Payment gateway configuration error',
        details: configValidation.errors.join(', ')
      }, { status: 500 });
    }
    
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Parse and validate request data
    const requestData: PaymentRequest = await request.json();
    const { assessmentId, amount, method, couponCode } = requestData;
    
    console.log('📝 Payment request:', {
      assessmentId,
      amount,
      method,
      hasCoupon: !!couponCode,
      userId
    });
    
    if (!assessmentId || amount === undefined || !method) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ 
        message: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Validate amount
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return NextResponse.json({ 
        message: 'Invalid amount' 
      }, { status: 400 });
    }
    
    // Get and validate assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { 
        payment: true,
        user: true 
      }
    });
    
    if (!assessment) {
      return NextResponse.json({ 
        message: 'Assessment not found' 
      }, { status: 404 });
    }
    
    if (assessment.userId !== userId) {
      return NextResponse.json({ 
        message: 'Access denied' 
      }, { status: 403 });
    }
    
    // Calculate pricing
    const pricingResult = await calculatePaymentPricing(assessment, couponCode);
    if (!pricingResult.success) {
      return NextResponse.json({ 
        message: pricingResult.error! 
      }, { status: 400 });
    }
    
    const { finalAmount, originalPrice, couponApplied, discountInfo } = pricingResult;
    
    // Verify provided amount matches calculated amount
    if (Math.abs(finalAmount - numericAmount) > 0.01) {
      console.error('💰 Amount mismatch:', {
        calculated: finalAmount,
        provided: numericAmount,
        difference: Math.abs(finalAmount - numericAmount)
      });
      
      return NextResponse.json({ 
        message: 'Amount does not match calculated price',
        expected: finalAmount,
        provided: numericAmount
      }, { status: 400 });
    }
    
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true,
        referredBy: true 
      }
    });
    
    if (!user) {
      return NextResponse.json({ 
        message: 'User not found' 
      }, { status: 404 });
    }
    
    // Create or update payment record
    const paymentRecord = await upsertPaymentRecord(assessment, finalAmount, method, couponApplied?.id);
    
    // Handle payment processing
    if (finalAmount > 0) {
      // Process paid payment
      return await processPaidPayment(
        paymentRecord,
        assessment,
        user,
        finalAmount,
        originalPrice,
        discountInfo
      );
    } else {
      // Process free payment
      return await processFreePayment(
        paymentRecord,
        assessment,
        originalPrice
      );
    }
    
  } catch (error) {
    console.error('💥 Error creating payment:', error);
    return NextResponse.json({ 
      message: 'Failed to create payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Calculate final pricing with coupon application
 */
async function calculatePaymentPricing(assessment: any, couponCode?: string): Promise<{
  success: boolean;
  error?: string;
  finalAmount: number;
  originalPrice: number;
  couponApplied?: any;
  discountInfo?: any;
}> {
  try {
    // Get original price based on tier
    const originalPrice = getTierPrice(assessment.tier);
    let finalAmount = originalPrice;
    let couponApplied = null;
    let discountInfo = null;
    
    console.log('💰 Pricing calculation:', {
      assessmentId: assessment.id,
      tier: assessment.tier,
      originalPrice
    });
    
    // Apply coupon if provided
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode }
      });
      
      if (!coupon) {
        return { success: false, error: 'Invalid coupon code', finalAmount: 0, originalPrice: 0 };
      }
      
      const validation: CouponValidation = validateCoupon(coupon, originalPrice);
      
      if (!validation.isValid) {
        return { success: false, error: validation.message, finalAmount: 0, originalPrice: 0 };
      }
      
      if (validation.discountCalculation) {
        finalAmount = validation.discountCalculation.finalPrice;
        couponApplied = coupon;
        discountInfo = validation.discountCalculation;
        
        console.log('🎫 Coupon applied:', {
          code: couponCode,
          originalPrice,
          finalAmount,
          savings: discountInfo.savings
        });
      }
    }
    
    return {
      success: true,
      finalAmount: Math.round(finalAmount * 100) / 100, // Round to 2 decimal places
      originalPrice,
      couponApplied,
      discountInfo
    };
    
  } catch (error) {
    console.error('💥 Error calculating pricing:', error);
    return { 
      success: false, 
      error: 'Pricing calculation failed', 
      finalAmount: 0, 
      originalPrice: 0 
    };
  }
}

/**
 * Create or update payment record
 */
async function upsertPaymentRecord(
  assessment: any, 
  amount: number, 
  method: string, 
  couponId?: string
) {
  if (assessment.payment) {
    // Update existing payment
    return await prisma.payment.update({
      where: { id: assessment.payment.id },
      data: {
        amount,
        method,
        status: 'pending',
        couponId: couponId || assessment.payment.couponId,
        updatedAt: new Date(),
      }
    });
  } else {
    // Create new payment
    return await prisma.payment.create({
      data: {
        userId: assessment.userId,
        assessmentId: assessment.id,
        amount,
        method,
        status: 'pending',
        couponId: couponId || null,
      }
    });
  }
}

/**
 * Process paid payment through Billplz
 */
async function processPaidPayment(
  paymentRecord: any,
  assessment: any,
  user: any,
  finalAmount: number,
  originalPrice: number,
  discountInfo?: any
): Promise<NextResponse<PaymentResponse>> {
  console.log('💳 Processing paid payment through Billplz...');
  
  const paymentDescription = `Payment for ${assessment.type.toUpperCase()} Assessment - ${assessment.tier} tier`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const returnUrl = `${baseUrl}/payment/status`;
  const callbackUrl = `${baseUrl}/api/payment/webhook/billplz`;
  
  try {
    // Create Billplz payment
    const billplzResponse = await createBillplzPayment({
      amount: finalAmount,
      description: paymentDescription,
      name: user.name || 'User',
      email: user.email || '',
      phone: user.phone || '',
      paymentId: paymentRecord.id,
      redirectUrl: returnUrl,
      callbackUrl: callbackUrl
    });
    
    // Update payment record with gateway payment ID
    await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: {
        gatewayPaymentId: billplzResponse.id
      }
    });
    
    // Calculate commission info for response
    const commissionAmount = calculateCommission(originalPrice);
    const commissionRate = getCommissionRate(originalPrice);
    
    // Get affiliate preview
    const affiliatePreview = await getAffiliateCommissionPreview(user.id, originalPrice);
    
    const response: PaymentResponse = {
      success: true,
      paymentId: paymentRecord.id,
      gatewayPaymentId: billplzResponse.id,
      paymentUrl: billplzResponse.url,
      amount: finalAmount,
      formattedAmount: formatCurrency(finalAmount),
      commissionInfo: {
        eligible: commissionAmount > 0,
        amount: commissionAmount,
        rate: commissionRate,
        formattedAmount: formatCurrency(commissionAmount)
      },
      affiliatePreview
    };
    
    // Add discount info if applicable
    if (discountInfo) {
      response.discountInfo = {
        originalPrice: discountInfo.originalPrice,
        discount: discountInfo.savings,
        discountPercentage: discountInfo.discountPercentage,
        formattedOriginalPrice: formatCurrency(discountInfo.originalPrice),
        formattedDiscount: formatCurrency(discountInfo.savings),
      };
    }
    
    console.log('✅ Paid payment created successfully:', {
      paymentId: paymentRecord.id,
      billplzId: billplzResponse.id,
      amount: finalAmount
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('💥 Error creating Billplz payment:', error);
    
    // Update payment status to failed
    await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: { status: 'failed' }
    });
    
    throw error;
  }
}

/**
 * Process free payment (when amount is 0 due to coupons)
 */
async function processFreePayment(
  paymentRecord: any,
  assessment: any,
  originalPrice: number
): Promise<NextResponse<PaymentResponse>> {
  console.log('🆓 Processing free payment...');
  
  // Update payment to completed and assessment to in_progress
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentRecord.id },
      data: {
        status: 'completed',
        method: 'coupon'
      }
    });
    
    await tx.assessment.update({
      where: { id: assessment.id },
      data: {
        status: 'in_progress'
      }
    });
  });
  
  console.log('✅ Free payment processed - no commission for free assessments');
  
  const response: PaymentResponse = {
    success: true,
    paymentId: paymentRecord.id,
    paymentUrl: null,
    amount: 0,
    formattedAmount: formatCurrency(0),
    message: 'Assessment is free - no payment required',
    commissionInfo: {
      eligible: false,
      amount: 0,
      rate: 0,
      formattedAmount: formatCurrency(0),
      reason: 'No commission for free assessments'
    }
  };
  
  return NextResponse.json(response);
}

/**
 * Get affiliate commission preview for response
 */
async function getAffiliateCommissionPreview(userId: string, originalPrice: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true }
    });

    if (!user?.referredBy) {
      return null;
    }

    const affiliate = await prisma.user.findUnique({
      where: { affiliateCode: user.referredBy },
      select: { 
        id: true, 
        name: true,
        email: true,
        isAffiliate: true,
        affiliateType: true 
      }
    });

    if (!affiliate?.isAffiliate) {
      return null;
    }

    const commissionAmount = calculateCommission(originalPrice);
    const commissionRate = getCommissionRate(originalPrice);

    return {
      affiliateId: affiliate.id,
      affiliateName: affiliate.name,
      affiliateEmail: affiliate.email,
      affiliateType: affiliate.affiliateType || 'individual',
      commissionAmount: commissionAmount,
      commissionRate: commissionRate,
      formattedCommission: formatCurrency(commissionAmount)
    };
  } catch (error) {
    console.error('⚠️  Error getting affiliate preview:', error);
    return null;
  }
}