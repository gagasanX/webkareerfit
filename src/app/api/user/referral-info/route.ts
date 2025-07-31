import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        referredBy: true,
        assessments: {
          where: { status: 'completed' },
          select: { id: true }
        }
      }
    });

    if (!user?.referredBy) {
      return NextResponse.json({ isReferred: false });
    }

    // Get affiliate info
    const affiliate = await prisma.user.findFirst({
      where: {
        affiliateCode: user.referredBy,
        isAffiliate: true
      },
      select: {
        name: true,
        affiliateCode: true
      }
    });

    const hasCompletedAssessment = user.assessments.length > 0;

    return NextResponse.json({
      isReferred: true,
      referredBy: user.referredBy,
      affiliateName: affiliate?.name || 'KareerFit Partner',
      hasCompletedAssessment
    });

  } catch (error) {
    console.error('Error fetching referral info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral info' },
      { status: 500 }
    );
  }
}