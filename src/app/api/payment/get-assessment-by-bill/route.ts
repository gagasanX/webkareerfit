// /src/app/api/payment/get-assessment-by-bill/route.ts - SCHEMA-FIXED VERSION

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { billId } = await request.json();
    
    if (!billId) {
      return NextResponse.json(
        { error: 'Bill ID required' },
        { status: 400 }
      );
    }

    console.log('🔍 Looking up assessment for bill ID:', billId);

    // 🔧 FIXED: Use correct schema field (only gatewayPaymentId exists)
    const payment = await prisma.payment.findFirst({
      where: {
        gatewayPaymentId: billId, // ✅ Only field that exists in schema
        userId: session.user.id    // Ensure user owns this payment
        // ❌ REMOVED: externalPaymentId (doesn't exist in schema)
      },
      include: {
        assessment: {
          select: {
            id: true,
            type: true,
            status: true,
            tier: true
          }
        }
      }
    });

    if (!payment || !payment.assessment) {
      console.log('❌ No payment/assessment found for bill ID:', billId);
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    console.log('✅ Assessment found:', {
      assessmentId: payment.assessment.id,
      type: payment.assessment.type,
      status: payment.assessment.status,
      paymentMethod: payment.method // ✅ Correct field name
    });

    return NextResponse.json({
      success: true,
      assessment: payment.assessment,
      payment: {
        id: payment.id,
        status: payment.status,
        method: payment.method // ✅ Correct field name
      }
    });

  } catch (error) {
    console.error('💥 Error getting assessment by bill ID:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Get assessment by bill ID endpoint active',
    timestamp: new Date().toISOString(),
    method: 'POST required'
  });
}