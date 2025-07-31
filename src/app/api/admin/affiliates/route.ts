import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIXED: Use only fields that exist in schema
    const affiliates = await prisma.user.findMany({
      where: { isAffiliate: true },
      select: {
        id: true,
        name: true,
        email: true,
        affiliateCode: true,
        createdAt: true,
        // FIXED: Include relations that actually exist
        affiliateStats: true,
        referrals: {
          where: { paidOut: false },
          select: { commission: true }
        }
      }
    });

    // Calculate stats properly
    const affiliatesWithStats = affiliates.map(affiliate => {
      const stats = affiliate.affiliateStats || {
        totalReferrals: 0,
        totalEarnings: 0,
        totalPaid: 0
      };

      const pendingPayout = affiliate.referrals.reduce(
        (sum: number, referral: { commission: number }) => sum + referral.commission,
        0
      );

      return {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        affiliateCode: affiliate.affiliateCode,
        createdAt: affiliate.createdAt,
        stats,
        pendingPayout
      };
    });

    const totalEarnings = affiliatesWithStats.reduce(
      (sum: number, affiliate: any) => sum + (affiliate.stats?.totalEarnings || 0), 
      0
    );

    return NextResponse.json({
      affiliates: affiliatesWithStats,
      totalEarnings
    });
  } catch (error) {
    console.error('Error fetching affiliates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch affiliates' },
      { status: 500 }
    );
  }
}