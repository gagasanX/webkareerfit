// /src/app/api/payment/secure/route.ts - FINAL SECURE VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { createBillplzPayment } from '@/lib/payment/billplz';
import { 
  getTierPrice, 
  validateCoupon, 
  formatCurrency 
} from '@/lib/utils/priceCalculation';

interface PaymentRequest {
  assessmentId: string;
  idempotencyKey: string;
  couponCode?: string;
}

interface PaymentResponse {
  success: boolean;
  paymentId: string;
  status: string;
  finalPrice: number;
  paymentUrl?: string;
  discountInfo?: any;
  message?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Get client IP for fraud detection (available throughout function)
  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assessmentId, idempotencyKey, couponCode }: PaymentRequest = await request.json();
    
    // Validate required fields
    if (!assessmentId || !idempotencyKey) {
      await logAuditEvent('payment_validation_failed', session.user.id, {
        reason: 'missing_required_fields',
        assessmentId,
        hasIdempotencyKey: !!idempotencyKey
      }, clientIp);
      
      return NextResponse.json({ 
        error: 'Missing required fields: assessmentId, idempotencyKey' 
      }, { status: 400 });
    }

    // 🔐 IDEMPOTENCY CHECK: Return cached response if exists
    const existingPayment = await prisma.payment.findUnique({
      where: { idempotencyKey },
      include: { 
        assessment: {
          select: { type: true, tier: true, userId: true }
        }
      }
    });

    if (existingPayment) {
      // Log idempotent request for monitoring
      await logAuditEvent('payment_idempotent_request', session.user.id, {
        paymentId: existingPayment.id,
        idempotencyKey,
        status: existingPayment.status
      }, clientIp);

      const response: PaymentResponse = {
        success: true,
        paymentId: existingPayment.id,
        status: existingPayment.status,
        finalPrice: existingPayment.amount,
        paymentUrl: getPaymentUrl(existingPayment),
        message: 'Payment already processed (idempotent response)'
      };

      return NextResponse.json(response);
    }

    // 🔒 ATOMIC TRANSACTION: All operations together
    const result = await prisma.$transaction(async (tx) => {
      // Verify assessment ownership
      const assessment = await tx.assessment.findUnique({
        where: { id: assessmentId },
        include: { payment: true }
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      if (assessment.userId !== session.user.id) {
        throw new Error('Assessment not found or unauthorized');
      }

      // Check if already paid (by different idempotency key)
      if (assessment.payment?.status === 'completed') {
        throw new Error('Assessment already paid');
      }

      // 💰 SECURE PRICE CALCULATION (server-side only)
      const basePrice = getTierPrice(assessment.tier || 'basic');
      let finalPrice = basePrice;
      let couponId = null;
      let discountInfo = null;

      // Apply coupon if provided
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode.trim() }
        });

        if (!coupon) {
          throw new Error('Invalid coupon code');
        }

        const validation = validateCoupon(coupon, basePrice);
        if (!validation.isValid) {
          throw new Error(validation.message);
        }

        finalPrice = validation.discountCalculation!.finalPrice;
        couponId = coupon.id;
        discountInfo = validation.discountCalculation;

        // 🔐 ATOMIC: Increment coupon usage
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { currentUses: { increment: 1 } }
        });

        // Log successful coupon application
        await tx.auditLog.create({
          data: {
            eventType: 'coupon_applied',
            userId: session.user.id,
            details: {
              couponCode: couponCode.trim(),
              assessmentId,
              originalPrice: basePrice,
              finalPrice,
              discount: discountInfo?.savings || 0
            },
            ipAddress: clientIp
          }
        });
      }

      // Create/update payment with idempotency key
      let payment;
      if (assessment.payment) {
        payment = await tx.payment.update({
          where: { id: assessment.payment.id },
          data: {
            amount: finalPrice,
            couponId,
            idempotencyKey,
            clientIpAddress: clientIp,
            status: 'pending',
            updatedAt: new Date()
          }
        });
      } else {
        payment = await tx.payment.create({
          data: {
            userId: session.user.id,
            assessmentId,
            amount: finalPrice,
            method: 'pending',
            status: 'pending',
            couponId,
            idempotencyKey,
            clientIpAddress: clientIp
          }
        });
      }

      // Log payment creation
      await tx.auditLog.create({
        data: {
          eventType: 'payment_created',
          userId: session.user.id,
          details: {
            paymentId: payment.id,
            assessmentId,
            amount: finalPrice,
            originalPrice: basePrice,
            hasCoupon: !!couponCode,
            processingTime: Date.now() - startTime
          },
          ipAddress: clientIp
        }
      });

      return { payment, assessment, finalPrice, basePrice, discountInfo };
    });

    // Handle payment processing
    let response: PaymentResponse = {
      success: true,
      paymentId: result.payment.id,
      status: 'pending',
      finalPrice: result.finalPrice,
      discountInfo: result.discountInfo || undefined
    };

    if (result.finalPrice > 0) {
      // Get user's phone number from database
      const userProfile = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { phone: true }
      });

      // Create Billplz payment
      const billplzPayment = await createBillplzPayment({
        amount: result.finalPrice,
        description: `${result.assessment.type.toUpperCase()} Assessment - ${result.assessment.tier || 'basic'}`,
        name: session.user.name || 'User',
        email: session.user.email!,
        phone: userProfile?.phone || '',
        paymentId: result.payment.id,
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/status`,
        callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/webhook/billplz`
      });

      // Update payment with gateway ID
      await prisma.payment.update({
        where: { id: result.payment.id },
        data: { 
          gatewayPaymentId: billplzPayment.id,
          status: 'processing'
        }
      });

      response.status = 'processing';
      response.paymentUrl = billplzPayment.url;

      return NextResponse.json(response);

    } else {
      // 🆓 Free assessment - mark as completed
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: result.payment.id },
          data: { status: 'completed' }
        });
        
        await tx.assessment.update({
          where: { id: assessmentId },
          data: { status: 'in_progress' }
        });

        // Log free assessment completion
        await tx.auditLog.create({
          data: {
            eventType: 'free_assessment_completed',
            userId: session.user.id,
            details: {
              assessmentId,
              paymentId: result.payment.id,
              couponUsed: !!couponCode
            },
            ipAddress: clientIp
          }
        });
      });

      response.status = 'completed';
      response.paymentUrl = `/assessment/${result.assessment.type}/${assessmentId}`;
      response.message = 'Assessment is free - ready to start!';

      return NextResponse.json(response);
    }

  } catch (error) {
    console.error('Payment processing error:', error);
    
    // Log error for monitoring (with safe error handling)
    try {
      const errorSession = await getServerSession(authOptions);
      if (errorSession?.user?.id) {
        await logAuditEvent('payment_processing_error', errorSession.user.id, {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }, clientIp);
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Payment processing failed' 
    }, { status: 500 });
  }
}

// 📊 Helper: Log audit events
async function logAuditEvent(
  eventType: string, 
  userId: string, 
  details: any, 
  ipAddress: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        eventType,
        userId,
        details,
        ipAddress,
        userAgent: 'api-request'
      }
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging shouldn't break payment flow
  }
}

// 🔗 Helper: Get payment URL based on status
function getPaymentUrl(payment: any): string {
  if (payment.status === 'completed') {
    return `/assessment/${payment.assessment?.type}/${payment.assessmentId}`;
  }
  
  if (payment.status === 'processing' && payment.gatewayPaymentId) {
    // Return Billplz payment URL (constructed from gateway ID)
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.billplz.com'
      : 'https://www.billplz-sandbox.com';
    return `${baseUrl}/bills/${payment.gatewayPaymentId}`;
  }
  
  return `/payment/status?id=${payment.assessmentId}`;
}