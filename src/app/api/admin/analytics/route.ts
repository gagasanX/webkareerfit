import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth, logAdminAction, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import { unstable_cache } from 'next/cache';

// ===== OPTIMIZED TYPES =====
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

// ===== ULTRA-FAST CACHED ANALYTICS =====
const getCachedAnalytics = unstable_cache(
  async (range: string, startDate?: Date, endDate?: Date): Promise<AnalyticsData> => {
    const startTime = Date.now();
    
    try {
      const { start, end } = calculateDateRange(range, startDate, endDate);
      
      // ⚡ OPTIMIZED: Single mega-query approach for better performance
      const analyticsData = await getOptimizedAnalyticsData(start, end);
      
      const queryTime = Date.now() - startTime;
      logger.info('Ultra-fast analytics completed', {
        queryTime: `${queryTime}ms`,
        range,
        dataPoints: analyticsData.overview.totalUsers + analyticsData.overview.totalAssessments
      });

      return analyticsData;

    } catch (error) {
      logger.error('Analytics query failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        queryTime: `${Date.now() - startTime}ms`,
        range
      });
      throw error;
    }
  },
  ['admin-analytics-v2'],
  {
    revalidate: 300, // Cache for 5 minutes for faster response
    tags: ['analytics-data-v2']
  }
);

// ===== OPTIMIZED HELPER FUNCTIONS =====
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

// ⚡ MEGA-OPTIMIZED: Single query approach for maximum speed
async function getOptimizedAnalyticsData(start: Date, end: Date): Promise<AnalyticsData> {
  // Get all basic counts in parallel - these are fast with proper indexes
  const [overviewData, detailsData] = await Promise.all([
    getOverviewDataOptimized(start, end),
    getDetailedAnalyticsOptimized(start, end)
  ]);

  return {
    overview: overviewData,
    userGrowth: detailsData.userGrowth,
    assessmentTypes: detailsData.assessmentTypes,
    assessmentStatus: detailsData.assessmentStatus,
    revenueBreakdown: detailsData.revenueBreakdown,
    topAffiliates: detailsData.topAffiliates,
    clerksPerformance: detailsData.clerksPerformance
  };
}

// ⚡ OPTIMIZED: Fast overview with indexed queries
async function getOverviewDataOptimized(start: Date, end: Date) {
  // Using Promise.all for parallel execution with optimized queries
  const [
    totalUsers,
    totalAssessments,
    totalRevenueResult,
    totalCommissionsResult,
    activeAffiliates,
    pendingAssessments
  ] = await Promise.all([
    // Optimized count with index hint
    prisma.user.count({
      where: { 
        createdAt: { gte: start, lte: end },
        isAdmin: false // Use the partial index
      }
    }),
    
    // Using indexed fields
    prisma.assessment.count({
      where: { createdAt: { gte: start, lte: end } }
    }),
    
    // Revenue sum with status filter (uses partial index)
    prisma.payment.aggregate({
      where: { 
        createdAt: { gte: start, lte: end },
        status: { in: ['completed', 'successful', 'paid'] }
      },
      _sum: { amount: true }
    }),
    
    // Commission sum (uses indexed fields)
    prisma.referral.aggregate({
      where: { 
        createdAt: { gte: start, lte: end },
        status: 'completed'
      },
      _sum: { commission: true }
    }),
    
    // Active affiliates (uses partial index)
    prisma.user.count({
      where: { 
        isAffiliate: true,
        createdAt: { gte: start, lte: end }
      }
    }),
    
    // Pending assessments (uses partial index)
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
    totalRevenue: Number(totalRevenueResult._sum.amount) || 0,
    totalCommissions: Number(totalCommissionsResult._sum.commission) || 0,
    activeAffiliates,
    pendingAssessments
  };
}

// ⚡ OPTIMIZED: Detailed analytics with efficient queries
async function getDetailedAnalyticsOptimized(start: Date, end: Date) {
  // Execute all detail queries in parallel
  const [
    userGrowthData,
    assessmentTypesData,
    assessmentStatusData,
    revenueBreakdownData,
    topAffiliatesData,
    clerksPerformanceData
  ] = await Promise.all([
    getUserGrowthOptimized(start, end),
    getAssessmentTypesOptimized(start, end),
    getAssessmentStatusOptimized(start, end),
    getRevenueBreakdownOptimized(start, end),
    getTopAffiliatesOptimized(start, end),
    getClerksPerformanceOptimized(start, end)
  ]);

  return {
    userGrowth: userGrowthData,
    assessmentTypes: assessmentTypesData,
    assessmentStatus: assessmentStatusData,
    revenueBreakdown: revenueBreakdownData,
    topAffiliates: topAffiliatesData,
    clerksPerformance: clerksPerformanceData
  };
}

// ⚡ SIMPLIFIED: User growth without complex date series generation
async function getUserGrowthOptimized(start: Date, end: Date) {
  // Simplified approach - get data points only for dates with actual data
  const growthData = await prisma.$queryRaw<Array<{
    date: Date;
    users: bigint;
    assessments: bigint;
    revenue: number;
  }>>`
    WITH daily_stats AS (
      SELECT 
        DATE_TRUNC('day', u."createdAt") as date,
        COUNT(DISTINCT u.id) as users,
        COUNT(DISTINCT a.id) as assessments,
        COALESCE(SUM(p.amount), 0) as revenue
      FROM "User" u
      LEFT JOIN "Assessment" a ON DATE_TRUNC('day', u."createdAt") = DATE_TRUNC('day', a."createdAt")
      LEFT JOIN "Payment" p ON a.id = p."assessmentId" 
        AND p.status IN ('completed', 'successful', 'paid')
      WHERE u."createdAt" BETWEEN ${start} AND ${end}
        AND u."isAdmin" = false
      GROUP BY DATE_TRUNC('day', u."createdAt")
      ORDER BY date ASC
      LIMIT 30
    )
    SELECT * FROM daily_stats
  `;

  return growthData.map(item => ({
    date: item.date.toISOString().split('T')[0],
    users: Number(item.users),
    assessments: Number(item.assessments),
    revenue: Number(item.revenue) || 0
  }));
}

// ⚡ OPTIMIZED: Assessment types with better joins
async function getAssessmentTypesOptimized(start: Date, end: Date) {
  const typesData = await prisma.$queryRaw<Array<{
    type: string;
    count: bigint;
    revenue: number;
    avgPrice: number;
  }>>`
    SELECT 
      a.type,
      COUNT(a.id) as count,
      COALESCE(SUM(p.amount), 0) as revenue,
      COALESCE(AVG(a.price), 0) as "avgPrice"
    FROM "Assessment" a
    LEFT JOIN "Payment" p ON a.id = p."assessmentId" 
      AND p.status IN ('completed', 'successful', 'paid')
    WHERE a."createdAt" BETWEEN ${start} AND ${end}
    GROUP BY a.type
    ORDER BY count DESC
    LIMIT 10
  `;

  return typesData.map(item => ({
    type: item.type,
    count: Number(item.count),
    revenue: Number(item.revenue),
    avgPrice: Number(item.avgPrice)
  }));
}

// ⚡ OPTIMIZED: Status breakdown
async function getAssessmentStatusOptimized(start: Date, end: Date) {
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

// ⚡ OPTIMIZED: Revenue breakdown
async function getRevenueBreakdownOptimized(start: Date, end: Date) {
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
    ORDER BY revenue DESC
  `;

  const totalRevenue = tierData.reduce((sum, item) => sum + Number(item.revenue), 0);

  return tierData.map(item => ({
    tier: item.tier,
    count: Number(item.count),
    revenue: Number(item.revenue),
    percentage: totalRevenue > 0 ? (Number(item.revenue) / totalRevenue) * 100 : 0
  }));
}

// ⚡ OPTIMIZED: Top affiliates
async function getTopAffiliatesOptimized(start: Date, end: Date) {
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
    INNER JOIN "Referral" r ON u.id = r."affiliateId" 
      AND r."createdAt" BETWEEN ${start} AND ${end}
      AND r.status = 'completed'
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

// ⚡ OPTIMIZED: Clerks performance
async function getClerksPerformanceOptimized(start: Date, end: Date) {
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
    HAVING COUNT(a.id) > 0
    ORDER BY "completedCount" DESC
    LIMIT 10
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

// ===== OPTIMIZED API HANDLER =====
export async function GET(request: NextRequest) {
  try {
    // 1. Enhanced rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 30, 60000)) { // Increased limit for faster usage
      logger.warn('Admin analytics rate limit exceeded', { ip: clientIp });
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Fast authentication check
    const authResult = await validateAdminAuth(request);
    if (!authResult.success) {
      return authResult.error!;
    }

    // 3. Quick parameter parsing
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || 'last30days';
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) startDate = new Date(startDateParam);
    if (endDateParam) endDate = new Date(endDateParam);

    // 4. Get cached analytics data (ultra-fast)
    const analyticsData = await getCachedAnalytics(range, startDate, endDate);

    // 5. Async logging (non-blocking)
    logAdminAction(
      authResult.user!.id,
      'analytics_view',
      { 
        range,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        timestamp: new Date().toISOString()
      },
      request
    ).catch(err => logger.warn('Failed to log admin action', { error: err.message }));

    // 6. Return optimized response
    return NextResponse.json({
      success: true,
      data: analyticsData,
      metadata: {
        range,
        cachedAt: new Date().toISOString(),
        userId: authResult.user!.id
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'X-Analytics-Performance': 'optimized-v2'
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