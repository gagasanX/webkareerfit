import { prisma } from '@/lib/db';
import { sendReceiptEmail, generateReceiptNumber } from './emailService';

// Map assessment types to readable names
const assessmentLabels = {
  fjrl: 'First Job Readiness Level',
  ijrl: 'Ideal Job Readiness Level',
  cdrl: 'Career Development Readiness Level', 
  ccrl: 'Career Comeback Readiness Level',
  ctrl: 'Career Transition Readiness Level',
  rrl: 'Retirement Readiness Level',
  irl: 'Internship Readiness Level',
};

/**
 * Send receipt for a completed payment
 */
export async function sendPaymentReceipt(paymentId: string): Promise<boolean> {
  try {
    // Get payment with related data
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
        assessment: true,
        coupon: true,
      }
    });
    
    if (!payment || !payment.user || !payment.assessment) {
      console.error('Missing payment data for receipt:', paymentId);
      return false;
    }
    
    // Calculate discount if coupon was used
    let discount = 0;
    if (payment.coupon) {
      // Get assessment base price
      const basePrice = getAssessmentBasePrice(payment.assessment.type);
      
      // Calculate discount
      const discountAmount = (basePrice * payment.coupon.discountPercentage) / 100;
      discount = payment.coupon.maxDiscount && discountAmount > payment.coupon.maxDiscount
        ? payment.coupon.maxDiscount
        : discountAmount;
    }
    
    // Generate receipt number
    const receiptNumber = generateReceiptNumber(paymentId);
    
    // Get gateway information
    const gateway = payment.method === 'coupon' 
      ? 'Coupon (100% discount)'
      : payment.method === 'card'
      ? 'Credit/Debit Card'
      : 'FPX Online Banking';
    
    // Get assessment type name
    const assessmentType = payment.assessment.type;
    const assessmentName = assessmentLabels[assessmentType as keyof typeof assessmentLabels] || 
                          payment.assessment.type.toUpperCase();
    
    // Send receipt email
    const sent = await sendReceiptEmail({
      userName: payment.user.name || 'Valued Customer',
      email: payment.user.email || '',
      receiptNumber,
      assessmentType,
      assessmentName,
      date: payment.updatedAt,
      amount: payment.amount,
      gateway,
      paymentId: payment.id,
      discount,
      couponCode: payment.coupon?.code
    });
    
    return sent;
  } catch (error) {
    console.error('Error sending payment receipt:', error);
    return false;
  }
}

/**
 * Get base price for an assessment type
 */
function getAssessmentBasePrice(type: string): number {
  const prices = {
    fjrl: 50,  // First Job Readiness Level
    ijrl: 60,  // Ideal Job Readiness Level
    cdrl: 75,  // Career Development Readiness Level
    ccrl: 80,  // Career Comeback Readiness Level
    ctrl: 100, // Career Transition Readiness Level
    rrl: 120,  // Retirement Readiness Level
    irl: 40,   // Internship Readiness Level
  };
  
  return prices[type as keyof typeof prices] || 50;
}