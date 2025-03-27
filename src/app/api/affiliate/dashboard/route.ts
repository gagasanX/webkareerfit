import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

interface ReferralData {
  id: string;
  createdAt: Date;
  affiliateId: string;
  userName: string | null;
  email: string | null;
  assessmentId: string | null;
  assessmentType: string | null;
  status: string;
  commission: number;
  paidOut: boolean;
}

interface MappedReferral {
  id: string;
  date: string;
  userName: string;
  assessmentType: string;
  status: string;
  commission: number;
}

interface DashboardResponse {
  affiliateCode: string;
  referrals: MappedReferral[];
  stats: {
    totalReferrals: number;
    totalEarnings: number;
    conversionRate: number;
    pendingPayouts: number;
  };
}

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
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (!user.isAffiliate) {
      return NextResponse.json({ 
        isAffiliate: false,
        message: 'User is not an affiliate'
      }, { status: 403 });
    }
    
    // Generate affiliate code if not present
    let affiliateCode = user.affiliateCode;
    if (!affiliateCode) {
      affiliateCode = `KF-${userId.substring(0, 6).toUpperCase()}`;
      await prisma.user.update({
        where: { id: userId },
        data: { affiliateCode },
      });
    }
    
    // Try to get referrals using raw query for robustness
    let referrals: ReferralData[] = [];
    try {
      const rows = await prisma.$queryRaw`
        SELECT 
          id, "createdAt", "affiliateId", "userName", email, 
          "assessmentId", "assessmentType", status, commission, "paidOut"
        FROM "Referral"
        WHERE "affiliateId" = ${userId}
        ORDER BY "createdAt" DESC
        LIMIT 10
      `;
      
      referrals = rows as ReferralData[];
    } catch (referralError) {
      console.error('Error fetching referrals:', referralError);
      // Fallback to empty array if query fails
      referrals = [];
    }
    
    // Map referrals to the expected format
    const mappedReferrals: MappedReferral[] = referrals.map(referral => ({
      id: referral.id,
      date: referral.createdAt.toISOString(),
      userName: referral.userName || 'Anonymous User',
      assessmentType: referral.assessmentType || 'Unknown',
      status: referral.status,
      commission: referral.commission,
    }));
    
    // Calculate stats if referrals are available
    // Or fallback to getting stats from AffiliateStats table
    let stats = {
      totalReferrals: 0,
      totalEarnings: 0,
      conversionRate: 0,
      pendingPayouts: 0
    };
    
    try {
      // Try to get the affiliate stats from the table first
      const affiliateStats = await prisma.affiliateStats.findUnique({
        where: { userId }
      });
      
      if (affiliateStats) {
        // Use data from the stats table
        stats.totalReferrals = affiliateStats.totalReferrals;
        stats.totalEarnings = affiliateStats.totalEarnings;
        
        // Calculate conversion rate and pending payouts
        try {
          // If we have referrals data, use it to calculate more stats
          if (referrals.length > 0) {
            const allReferrals = await prisma.$queryRaw`
              SELECT count(*) as total FROM "Referral" WHERE "affiliateId" = ${userId}
            `;
            const completedReferrals = await prisma.$queryRaw`
              SELECT count(*) as completed FROM "Referral" 
              WHERE "affiliateId" = ${userId} AND status = 'completed'
            `;
            
            const totalCount = (allReferrals as any)[0]?.total || 0;
            const completedCount = (completedReferrals as any)[0]?.completed || 0;
            
            stats.totalReferrals = totalCount;
            stats.conversionRate = totalCount > 0 
              ? (completedCount / totalCount) * 100 
              : 0;
              
            // Get pending payouts
            const pendingPayoutsQuery = await prisma.$queryRaw`
              SELECT SUM(commission) as pending FROM "Referral"
              WHERE "affiliateId" = ${userId} 
              AND status = 'completed' 
              AND "paidOut" = false
            `;
            
            stats.pendingPayouts = (pendingPayoutsQuery as any)[0]?.pending || 0;
          }
        } catch (statsCalcError) {
          console.error('Error calculating additional stats:', statsCalcError);
          // Keep the stats from the table
        }
      } else {
        // No stats record, calculate from referrals if available
        if (referrals.length > 0) {
          stats.totalReferrals = referrals.length;
          stats.totalEarnings = referrals
            .filter(r => r.status === 'completed')
            .reduce((sum, r) => sum + r.commission, 0);
          
          const completedCount = referrals.filter(r => r.status === 'completed').length;
          stats.conversionRate = stats.totalReferrals > 0 
            ? (completedCount / stats.totalReferrals) * 100 
            : 0;
            
          stats.pendingPayouts = referrals
            .filter(r => r.status === 'completed' && !r.paidOut)
            .reduce((sum, r) => sum + r.commission, 0);
        }
        
        // Create a stats record for future use
        try {
          await prisma.affiliateStats.create({
            data: {
              userId,
              totalReferrals: stats.totalReferrals,
              totalEarnings: stats.totalEarnings,
              totalPaid: stats.totalEarnings - stats.pendingPayouts,
            }
          });
        } catch (createStatsError) {
          console.error('Error creating stats record:', createStatsError);
          // Non-critical, proceed without creating stats
        }
      }
    } catch (statsError) {
      console.error('Error fetching affiliate stats:', statsError);
      // Keep default stats
    }
    
    // Build the response
    const response: DashboardResponse = {
      affiliateCode: affiliateCode || '',
      referrals: mappedReferrals,
      stats
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