import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/auth';

// Define extended session user type
type ExtendedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  isAffiliate?: boolean;
  referredBy?: string | null;
};

// Define transaction type
type AffiliateTransaction = {
  id: string;
  userId: string;
  paymentId: string;
  amount: number;
  status: string;
  createdAt: Date;
  payment?: {
    user?: {
      email?: string | null;
    } | null;
    status?: string;
  } | null;
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if the user is an affiliate
    const user = await prisma.user.findUnique({
      where: { id: (session.user as ExtendedUser).id },
      include: {
        affiliateStats: true,
      },
    });

    if (!user || !user.isAffiliate) {
      return NextResponse.json(
        { error: 'User is not an affiliate' },
        { status: 403 }
      );
    }

    // Get affiliate stats
    let affiliateStats = user.affiliateStats;
    
    // If no affiliate stats record exists, create one
    if (!affiliateStats) {
      affiliateStats = await prisma.affiliateStats.create({
        data: {
          userId: user.id,
          totalReferrals: 0,
          totalEarnings: 0,
          totalPaid: 0,
        },
      });
    }

    // Calculate pending amount
    const pendingAmount = affiliateStats.totalEarnings - affiliateStats.totalPaid;

    // Get recent referrals
    const affiliateTransactions = await prisma.affiliateTransaction.findMany({
      where: {
        userId: user.id,
      },
      include: {
        payment: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Format the referrals data
    const referrals = affiliateTransactions.map((transaction: AffiliateTransaction) => ({
      id: transaction.id,
      referredEmail: transaction.payment?.user?.email || 'Unknown',
      status: transaction.payment?.status || 'pending',
      createdAt: transaction.createdAt.toISOString(),
      amount: transaction.amount,
      paidStatus: transaction.status,
    }));

    return NextResponse.json({
      stats: {
        totalReferrals: affiliateStats.totalReferrals,
        totalEarnings: affiliateStats.totalEarnings,
        totalPaid: affiliateStats.totalPaid,
        pendingAmount,
        affiliateCode: user.affiliateCode,
      },
      referrals,
    });
  } catch (error) {
    console.error('Error fetching affiliate stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch affiliate stats' },
      { status: 500 }
    );
  }
}