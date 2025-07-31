// app/api/affiliate/dashboard/route.ts - UPDATED & UNIFIED
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || !user.isAffiliate) {
      return NextResponse.json({ 
        isAffiliate: false,
        message: 'User is not an affiliate'
      }, { status: 403 });
    }
    
    // Generate affiliate code if missing
    let affiliateCode = user.affiliateCode;
    if (!affiliateCode) {
      affiliateCode = `KF-${userId.substring(0, 6).toUpperCase()}`;
      await prisma.user.update({
        where: { id: userId },
        data: { affiliateCode },
      });
    }
    
    // Get referrals from SINGLE table
    const referrals = await prisma.referral.findMany({
      where: { affiliateId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    // Get affiliate stats
    const affiliateStats = await prisma.affiliateStats.findUnique({
      where: { userId }
    });
    
    // Calculate stats from referrals if stats missing
    const totalReferrals = referrals.length;
    const completedReferrals = referrals.filter(r => r.status === 'completed');
    const totalEarnings = completedReferrals.reduce((sum, r) => sum + r.commission, 0);
    const pendingPayouts = completedReferrals
      .filter(r => !r.paidOut)
      .reduce((sum, r) => sum + r.commission, 0);
    const conversionRate = totalReferrals > 0 
      ? (completedReferrals.length / totalReferrals) * 100 
      : 0;
    
    // Format referrals for frontend
    const formattedReferrals = referrals.map(referral => ({
      id: referral.id,
      date: referral.createdAt.toISOString(),
      userName: referral.userName || 'Anonymous',
      assessmentType: referral.assessmentType || 'Unknown',
      status: referral.status,
      commission: referral.commission,
      paidOut: referral.paidOut
    }));
    
    const response = {
      affiliateCode,
      referrals: formattedReferrals,
      stats: {
        totalReferrals: affiliateStats?.totalReferrals || totalReferrals,
        totalEarnings: affiliateStats?.totalEarnings || totalEarnings,
        conversionRate: Math.round(conversionRate * 100) / 100,
        pendingPayouts: Math.round(pendingPayouts * 100) / 100
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching affiliate dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch affiliate dashboard data' },
      { status: 500 }
    );
  }
}