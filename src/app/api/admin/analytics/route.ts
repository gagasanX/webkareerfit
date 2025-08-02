import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth, logAdminAction, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import { unstable_cache } from 'next/cache';

// ===== TYPES =====
interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalAssessments: number;
    totalRevenue: number;
    totalCommissions: number;
    activeAffiliates: number;
    pendingAssessments: number;
  };
  userGrowth: Array<{
    date: string;
    users: number;
    assessments: number;
    revenue: number;
  }>;
  assessmentTypes: Array<{
    type: string;
    count: number;
    revenue: number;
    avgPrice: number;
  }>;
  assessmentStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  revenueBreakdown: Array<{
    tier: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
  topAffiliates: Array<{
    id: string;
    name: string;
    email: string;
    totalReferrals: number;
    totalEarnings: number;
    conversionRate: number;
  }>;
  clerksPerformance: Array<{
    id: string;
    name: string;
    email: string;
    assignedCount: number;
    completedCount: number;
    avgProcessingTime: number;
  }>;
}

// ===== CACHED ANALYTICS FETCHER =====
const getCachedAnalytics = unstable_cache(
  async (range: string, startDate?: Date, endDate?: Date): Promise<AnalyticsData> => {
    const startTime = Date.now();
    
    try {
      // Calculate date range
      const { start, end } = calculateDateRange(range, startDate, endDate);
      
      // Parallel queries for better performance
      const [
        overviewData,
        userGrowthData,
        assessmentTypesData,
        assessmentStatusData,
        revenueBreakdownData,
        topAffiliatesData,
        clerksPerformanceData
      ] = await Promise.all([
        getOverviewData(start, end),
        getUserGrowthData(start, end),
        getAssessmentTypesData(start, end),
        getAssessmentStatusData(start, end),
        getRevenueBreakdownData(start, end),
        getTopAffiliatesData(start, end),
        getClerksPerformanceData(start, end)
      ]);

      const queryTime = Date.now() - startTime;
      logger.info('Analytics data fetched successfully', {
        queryTime: `${queryTime}ms`,
        range,
        recordsProcessed: overviewData.totalUsers + overviewData.totalAssessments
      });

      return {
        overview: overviewData,
        userGrowth: userGrowthData,
        assessmentTypes: assessmentTypesData,
        assessmentStatus: assessmentStatusData,
        revenueBreakdown: revenueBreakdownData,
        topAffiliates: topAffiliatesData,
        clerksPerformance: clerksPerformanceData
      };

    } catch (error) {
      logger.error('Failed to fetch analytics data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        queryTime: `${Date.now() - startTime}ms`,
        range
      });
      throw error;
    }
  },
  ['admin-analytics'],
  {
    revalidate: 600, // Cache for 10 minutes
    tags: ['analytics-data']
  }
);

// ===== HELPER FUNCTIONS =====
function calculateDateRange(range: string, startDate?: Date, endDate?: Date) {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last7days':
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last30days':
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'thisYear':
      start = new Date(now.getFullYear(), 0, 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      start = startDate || new Date(now.setDate(now.getDate() - 29));
      end = endDate || new Date();
      break;
    default:
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

async function getOverviewData(start: Date, end: Date) {
  const [
    totalUsers,
    totalAssessments,
    totalRevenueResult,
    totalCommissionsResult,
    activeAffiliates,
    pendingAssessments
  ] = await Promise.all([
    prisma.user.count({
      where: { createdAt: { gte: start, lte: end } }
    }),
    prisma.assessment.count({
      where: { createdAt: { gte: start, lte: end } }
    }),
    prisma.payment.aggregate({
      where: { 
        createdAt: { gte: start, lte: end },
        status: { in: ['completed', 'successful', 'paid'] }
      },
      _sum: { amount: true }
    }),
    prisma.referral.aggregate({
      where: { 
        createdAt: { gte: start, lte: end },
        status: 'completed'
      },
      _sum: { commission: true }
    }),
    prisma.user.count({
      where: { 
        isAffiliate: true,
        createdAt: { gte: start, lte: end }
      }
    }),
    prisma.assessment.count({
      where: { 
        status: 'pending',
        createdAt: { gte: start, lte: end }
      }
    })
  ]);

  return {
    totalUsers,
    totalAssessments,
    totalRevenue: totalRevenueResult._sum.amount || 0,
    totalCommissions: totalCommissionsResult._sum.commission || 0,
    activeAffiliates,
    pendingAssessments
  };
}

async function getUserGrowthData(start: Date, end: Date) {
  const growthData = await prisma.$queryRaw<Array<{
    date: Date;
    users: bigint;
    assessments: bigint;
    revenue: number;
  }>>`
    SELECT 
      DATE_TRUNC('day', date_series) as date,
      COALESCE(user_counts.count, 0) as users,
      COALESCE(assessment_counts.count, 0) as assessments,
      COALESCE(payment_sums.sum, 0) as revenue
    FROM generate_series(
      ${start}::date,
      ${end}::date,
      '1 day'::interval
    ) AS date_series
    LEFT JOIN (
      SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as count
      FROM "User"
      WHERE "createdAt" BETWEEN ${start} AND ${end}
      GROUP BY DATE_TRUNC('day', "createdAt")
    ) user_counts ON DATE_TRUNC('day', date_series) = user_counts.day
    LEFT JOIN (
      SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as count
      FROM "Assessment"
      WHERE "createdAt" BETWEEN ${start} AND ${end}
      GROUP BY DATE_TRUNC('day', "createdAt")
    ) assessment_counts ON DATE_TRUNC('day', date_series) = assessment_counts.day
    LEFT JOIN (
      SELECT DATE_TRUNC('day', "createdAt") as day, SUM(amount) as sum
      FROM "Payment"
      WHERE "createdAt" BETWEEN ${start} AND ${end}
        AND status IN ('completed', 'successful', 'paid')
      GROUP BY DATE_TRUNC('day', "createdAt")
    ) payment_sums ON DATE_TRUNC('day', date_series) = payment_sums.day
    ORDER BY date_series ASC
  `;

  return growthData.map(item => ({
    date: item.date.toISOString().split('T')[0],
    users: Number(item.users),
    assessments: Number(item.assessments),
    revenue: Number(item.revenue) || 0
  }));
}

async function getAssessmentTypesData(start: Date, end: Date) {
  const typesData = await prisma.assessment.groupBy({
    by: ['type'],
    where: { createdAt: { gte: start, lte: end } },
    _count: { id: true },
    _avg: { price: true },
  });

  const revenueByType = await prisma.$queryRaw<Array<{
    type: string;
    revenue: number;
  }>>`
    SELECT 
      a.type,
      COALESCE(SUM(p.amount), 0) as revenue
    FROM "Assessment" a
    LEFT JOIN "Payment" p ON a.id = p."assessmentId" 
      AND p.status IN ('completed', 'successful', 'paid')
    WHERE a."createdAt" BETWEEN ${start} AND ${end}
    GROUP BY a.type
  `;

  const revenueMap = new Map(revenueByType.map(item => [item.type, Number(item.revenue)]));

  return typesData.map(item => ({
    type: item.type,
    count: item._count.id,
    revenue: revenueMap.get(item.type) || 0,
    avgPrice: item._avg.price || 0
  }));
}

async function getAssessmentStatusData(start: Date, end: Date) {
  const statusData = await prisma.assessment.groupBy({
    by: ['status'],
    where: { createdAt: { gte: start, lte: end } },
    _count: { id: true }
  });

  const total = statusData.reduce((sum, item) => sum + item._count.id, 0);

  return statusData.map(item => ({
    status: item.status,
    count: item._count.id,
    percentage: total > 0 ? (item._count.id / total) * 100 : 0
  }));
}

async function getRevenueBreakdownData(start: Date, end: Date) {
  const tierData = await prisma.$queryRaw<Array<{
    tier: string;
    count: bigint;
    revenue: number;
  }>>`
    SELECT 
      a.tier,
      COUNT(p.id) as count,
      COALESCE(SUM(p.amount), 0) as revenue
    FROM "Assessment" a
    LEFT JOIN "Payment" p ON a.id = p."assessmentId" 
      AND p.status IN ('completed', 'successful', 'paid')
    WHERE a."createdAt" BETWEEN ${start} AND ${end}
    GROUP BY a.tier
  `;

  const totalRevenue = tierData.reduce((sum, item) => sum + Number(item.revenue), 0);

  return tierData.map(item => ({
    tier: item.tier,
    count: Number(item.count),
    revenue: Number(item.revenue),
    percentage: totalRevenue > 0 ? (Number(item.revenue) / totalRevenue) * 100 : 0
  }));
}

async function getTopAffiliatesData(start: Date, end: Date) {
  const affiliatesData = await prisma.$queryRaw<Array<{
    id: string;
    name: string | null;
    email: string;
    totalReferrals: bigint;
    totalEarnings: number;
  }>>`
    SELECT 
      u.id,
      u.name,
      u.email,
      COUNT(r.id) as "totalReferrals",
      COALESCE(SUM(r.commission), 0) as "totalEarnings"
    FROM "User" u
    LEFT JOIN "Referral" r ON u.id = r."affiliateId" 
      AND r."createdAt" BETWEEN ${start} AND ${end}
    WHERE u."isAffiliate" = true
    GROUP BY u.id, u.name, u.email
    ORDER BY "totalEarnings" DESC
    LIMIT 10
  `;

  return affiliatesData.map(item => ({
    id: item.id,
    name: item.name || 'Unknown',
    email: item.email,
    totalReferrals: Number(item.totalReferrals),
    totalEarnings: Number(item.totalEarnings),
    conversionRate: Number(item.totalReferrals) > 0 ? 
      (Number(item.totalEarnings) / Number(item.totalReferrals)) * 100 : 0
  }));
}

async function getClerksPerformanceData(start: Date, end: Date) {
  const clerksData = await prisma.$queryRaw<Array<{
    id: string;
    name: string | null;
    email: string;
    assignedCount: bigint;
    completedCount: bigint;
    avgProcessingHours: number;
  }>>`
    SELECT 
      u.id,
      u.name,
      u.email,
      COUNT(a.id) as "assignedCount",
      SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as "completedCount",
      COALESCE(AVG(
        CASE 
          WHEN a.status = 'completed' AND a."reviewedAt" IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (a."reviewedAt" - a."createdAt")) / 3600
          ELSE NULL 
        END
      ), 0) as "avgProcessingHours"
    FROM "User" u
    LEFT JOIN "Assessment" a ON u.id = a."assignedClerkId" 
      AND a."createdAt" BETWEEN ${start} AND ${end}
    WHERE u."isClerk" = true
    GROUP BY u.id, u.name, u.email
    ORDER BY "completedCount" DESC
  `;

  return clerksData.map(item => ({
    id: item.id,
    name: item.name || 'Unknown',
    email: item.email,
    assignedCount: Number(item.assignedCount),
    completedCount: Number(item.completedCount),
    avgProcessingTime: Number(item.avgProcessingHours) || 0
  }));
}

// ===== API HANDLER =====
export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 20, 60000)) {
      logger.warn('Admin analytics rate limit exceeded', { ip: clientIp });
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Authentication & Authorization
    const authResult = await validateAdminAuth(request);
    if (!authResult.success) {
      return authResult.error!;
    }

    // 3. Parse query parameters
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || 'last30days';
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      startDate = new Date(startDateParam);
    }
    if (endDateParam) {
      endDate = new Date(endDateParam);
    }

    // 4. Fetch analytics data
    const analyticsData = await getCachedAnalytics(range, startDate, endDate);

    // 5. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'analytics_view',
      { 
        range,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        timestamp: new Date().toISOString()
      },
      request
    );

    // 6. Return success response
    return NextResponse.json({
      success: true,
      data: analyticsData,
      metadata: {
        range,
        cachedAt: new Date().toISOString(),
        userId: authResult.user!.id
      }
    });

  } catch (error) {
    logger.error('Analytics API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    });

    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}