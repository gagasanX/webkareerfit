import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check user authentication and admin permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user is an admin
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Get user count
    const userCount = await prisma.user.count();
    
    // Get assessment count
    const assessmentCount = await prisma.assessment.count();
    
    // Get total payment amount
    const payments = await prisma.payment.findMany({
      where: {
        status: 'completed'
      },
      select: {
        amount: true
      }
    });
    
    const paymentAmount = payments.reduce((sum: number, payment: { amount: number }) => sum + payment.amount, 0);
    
    // Get coupon count
    const couponCount = await prisma.coupon.count({
      where: {
        expiresAt: {
          gt: new Date()
        }
      }
    });
    
    // Get recent assessments
    const recentAssessments = await prisma.assessment.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    // Format recent assessments
    const formattedAssessments = recentAssessments.map((assessment: any) => ({
      id: assessment.id,
      type: assessment.type,
      status: assessment.status,
      createdAt: assessment.createdAt,
      userName: assessment.user?.name || assessment.user?.email || 'Unknown'
    }));
    
    // Get recent payments
    const recentPayments = await prisma.payment.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        assessment: {
          select: {
            type: true
          }
        }
      }
    });
    
    // Format recent payments
    const formattedPayments = recentPayments.map((payment: any) => ({
      id: payment.id,
      amount: payment.amount,
      method: payment.method || payment.gateway || 'Unknown',
      status: payment.status,
      createdAt: payment.createdAt,
      userName: payment.user?.name || payment.user?.email || 'Unknown',
      assessmentType: payment.assessment?.type || 'Unknown'
    }));
    
    return NextResponse.json({
      userCount,
      assessmentCount,
      paymentAmount,
      couponCount,
      recentAssessments: formattedAssessments,
      recentPayments: formattedPayments
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching dashboard data' },
      { status: 500 }
    );
  }
}