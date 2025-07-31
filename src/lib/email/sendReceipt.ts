import { prisma } from '@/lib/db';
import { engineMailer, generateReceiptNumber } from './enginemailerService';

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

export async function sendPaymentReceipt(paymentId: string): Promise<boolean> {
  try {
    console.log(`Sending payment receipt for payment: ${paymentId}`);
    
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
    if (payment.coupon && payment.assessment) {
      const basePrice = getAssessmentBasePrice(payment.assessment.tier || 'basic');
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
      : payment.method === 'fpx'
      ? 'FPX Online Banking'
      : payment.method || 'Online Payment';
    
    // Get assessment type name
    const assessmentType = payment.assessment.type;
    const assessmentName = assessmentLabels[assessmentType as keyof typeof assessmentLabels] || 
                          payment.assessment.type.toUpperCase();
    
    // Send receipt email
    const sent = await engineMailer.sendReceiptEmail({
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
    
    if (sent) {
      console.log(`Receipt email sent successfully for payment: ${paymentId}`);
    } else {
      console.error(`Failed to send receipt email for payment: ${paymentId}`);
    }
    
    return sent;
  } catch (error) {
    console.error('Error sending payment receipt:', error);
    return false;
  }
}

function getAssessmentBasePrice(tier: string): number {
  const tierPrices = {
    basic: 50,
    standard: 100,
    premium: 250
  };
  
  return tierPrices[tier as keyof typeof tierPrices] || 50;
}
