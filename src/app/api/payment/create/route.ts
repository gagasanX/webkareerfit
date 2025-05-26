import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { createBillplzPayment } from '@/lib/payment/billplz';
import { formatCurrency } from '@/lib/utils/priceCalculation';

export async function POST(request: NextRequest) {
  try {
    console.log('Payment creation API called');
    
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('Unauthorized access attempt');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Parse request data
    let requestData;
    try {
      requestData = await request.json();
      console.log('Request data:', JSON.stringify(requestData));
    } catch (jsonError) {
      console.error('Failed to parse request JSON:', jsonError);
      return NextResponse.json({ message: 'Invalid request data' }, { status: 400 });
    }
    
    const { assessmentId, amount, method } = requestData;
    
    // Billplz sahaja - tidak perlu semak gateway
    const gateway = 'billplz';
    
    if (!assessmentId || amount === undefined || !method) {
      console.log('Missing required fields:', { assessmentId, amount, method });
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate amount is a positive number with proper precision
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return NextResponse.json({ message: 'Invalid amount' }, { status: 400 });
    }
    
    // Round amount to 2 decimal places for currency
    const finalAmount = Math.round(numericAmount * 100) / 100;
    
    // Verify assessment exists and belongs to user
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { payment: true }
    });
    
    if (!assessment) {
      return NextResponse.json({ message: 'Assessment not found' }, { status: 404 });
    }
    
    if (assessment.userId !== userId) {
      return NextResponse.json({ message: 'You do not own this assessment' }, { status: 403 });
    }
    
    // Verify amount matches assessment price (with small tolerance for floating point)
    const assessmentPrice = Number(assessment.price);
    if (Math.abs(finalAmount - assessmentPrice) > 0.01) {
      console.error('Amount mismatch:', {
        assessmentPrice,
        providedAmount: finalAmount,
        difference: Math.abs(finalAmount - assessmentPrice)
      });
      
      return NextResponse.json({ 
        message: 'Amount does not match assessment price',
        expected: assessmentPrice,
        provided: finalAmount
      }, { status: 400 });
    }
    
    // Get user details for payment
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    // Create or update payment record
    const paymentRecord = assessment.payment
      ? await prisma.payment.update({
          where: { id: assessment.payment.id },
          data: {
            amount: finalAmount,
            method: method,
            status: 'pending',
            updatedAt: new Date(),
          }
        })
      : await prisma.payment.create({
          data: {
            userId: userId,
            assessmentId: assessmentId,
            amount: finalAmount,
            method: method,
            status: 'pending'
          }
        });
    
    // Only create payment gateway integration if amount > 0
    if (finalAmount > 0) {
      // Create payment with Billplz
      let paymentUrl: string;
      let gatewayPaymentId: string;
      
      const paymentDescription = `Payment for ${assessment.type.toUpperCase()} Assessment`;
      const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/status`;
      const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payment/webhook/${gateway}`;
      
      // Billplz integration
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
      
      paymentUrl = billplzResponse.url;
      gatewayPaymentId = billplzResponse.id;
      
      // Update payment record with gateway payment ID
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          gatewayPaymentId: gatewayPaymentId
        }
      });
      
      return NextResponse.json({
        success: true,
        paymentId: paymentRecord.id,
        gatewayPaymentId: gatewayPaymentId,
        paymentUrl: paymentUrl,
        amount: finalAmount,
        formattedAmount: formatCurrency(finalAmount)
      });
    } else {
      // Free assessment - no payment gateway needed
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'completed',
          method: 'coupon'
        }
      });
      
      return NextResponse.json({
        success: true,
        paymentId: paymentRecord.id,
        paymentUrl: null, // No payment URL needed for free
        amount: 0,
        formattedAmount: formatCurrency(0),
        message: 'Assessment is free - no payment required'
      });
    }
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ 
      message: 'Failed to create payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}