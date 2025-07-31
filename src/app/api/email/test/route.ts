import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { engineMailer } from '@/lib/email/enginemailerService';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development or for admin users
    if (process.env.NODE_ENV === 'production') {
      const session = await getServerSession(authOptions);
      if (!session?.user?.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { type, email, data } = await request.json();

    if (!type || !email) {
      return NextResponse.json(
        { error: 'Type and email are required' },
        { status: 400 }
      );
    }

    let result;
    
    switch (type) {
      case 'welcome':
        result = await engineMailer.sendWelcomeEmail({
          userName: data?.name || 'Test User',
          email,
          hasReferral: data?.hasReferral || false
        });
        break;
        
      case 'assessment':
        result = await engineMailer.sendAssessmentEmail({
          userName: data?.name || 'Test User',
          email,
          assessmentType: data?.assessmentType || 'fjrl',
          assessmentId: data?.assessmentId || 'test-123',
          assessmentName: data?.assessmentName || 'First Job Readiness Level'
        });
        break;
        
      case 'receipt':
        result = await engineMailer.sendReceiptEmail({
          userName: data?.name || 'Test User',
          email,
          receiptNumber: 'KF25010001',
          assessmentType: 'fjrl',
          assessmentName: 'First Job Readiness Level',
          date: new Date(),
          amount: 50,
          gateway: 'Test Payment',
          paymentId: 'test-payment-123'
        });
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result,
      message: result ? 'Test email sent successfully' : 'Failed to send test email'
    });

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}