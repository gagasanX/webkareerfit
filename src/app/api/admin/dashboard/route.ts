// /src/app/api/admin/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAdminAuth, logAdminAction, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { dashboardQuerySchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import { unstable_cache } from 'next/cache';

// ===== TYPES =====
interface DashboardStats {
  userCount: number;
  assessmentCount: number;
  paymentAmount: number;
  couponCount: number;
  recentAssessments: FormattedAssessment[];
  recentPayments: FormattedPayment[];
  dailyStats: DailyStats[];
}

interface FormattedAssessment {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  userName: string;
}

interface FormattedPayment {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  userName: string;
  assessmentType: string;
}

interface DailyStats {
  date: string;
  users: number;
  assessments: number;
  revenue: number;
}

// ===== CACHED DATA FETCHER =====
const getCachedDashboardStats = unstable_cache(
  async (): Promise<DashboardStats> => {
    const startTime = Date.now();
    
    try {
      // Optimized parallel queries using Promise.all
      const [
        userCount,
        assessmentCount,
        paymentStats,
        activeCouponCount,
        recentAssessmentsRaw,
        recentPaymentsRaw,
        dailyStatsRaw
      ] = await Promise.all([
        // User count
        prisma.user.count(),
        
        // Assessment count
        prisma.assessment.count(),
        
        // Payment stats (aggregated)
        prisma.payment.aggregate({
          where: { status: { in: ['completed', 'successful', 'paid'] } },
          _sum: { amount: true },
          _count: true
        }),
        
        // Active coupon count
        prisma.coupon.count({
          where: { expiresAt: { gt: new Date() } }
        }),
        
        // Recent assessments with user info
        prisma.assessment.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }),
        
        // Recent payments with user and assessment info
        prisma.payment.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            createdAt: true,
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
        }),
        
        // Daily stats for last 7 days
        prisma.$queryRaw<Array<{
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
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            '1 day'::interval
          ) AS date_series
          LEFT JOIN (
            SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as count
            FROM "User"
            WHERE "createdAt" >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY DATE_TRUNC('day', "createdAt")
          ) user_counts ON DATE_TRUNC('day', date_series) = user_counts.day
          LEFT JOIN (
            SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as count
            FROM "Assessment"
            WHERE "createdAt" >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY DATE_TRUNC('day', "createdAt")
          ) assessment_counts ON DATE_TRUNC('day', date_series) = assessment_counts.day
          LEFT JOIN (
            SELECT DATE_TRUNC('day', "createdAt") as day, SUM(amount) as sum
            FROM "Payment"
            WHERE "createdAt" >= CURRENT_DATE - INTERVAL '6 days'
              AND status IN ('completed', 'successful', 'paid')
            GROUP BY DATE_TRUNC('day', "createdAt")
          ) payment_sums ON DATE_TRUNC('day', date_series) = payment_sums.day
          ORDER BY date_series ASC
        `
      ]);

      // Format the data
      const formattedAssessments: FormattedAssessment[] = recentAssessmentsRaw.map(assessment => ({
        id: assessment.id,
        type: assessment.type,
        status: assessment.status,
        createdAt: assessment.createdAt.toISOString(),
        userName: assessment.user?.name || assessment.user?.email || 'Unknown'
      }));

      const formattedPayments: FormattedPayment[] = recentPaymentsRaw.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        method: payment.method || 'Unknown',
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
        userName: payment.user?.name || payment.user?.email || 'Unknown',
        assessmentType: payment.assessment?.type || 'Unknown'
      }));

      const dailyStats: DailyStats[] = dailyStatsRaw.map(stat => ({
        date: stat.date.toISOString().split('T')[0],
        users: Number(stat.users),
        assessments: Number(stat.assessments),
        revenue: Number(stat.revenue) || 0
      }));

      const queryTime = Date.now() - startTime;
      logger.info('Dashboard stats fetched successfully', {
        queryTime: `${queryTime}ms`,
        userCount,
        assessmentCount,
        paymentAmount: paymentStats._sum.amount || 0
      });

      return {
        userCount,
        assessmentCount,
        paymentAmount: paymentStats._sum.amount || 0,
        couponCount: activeCouponCount,
        recentAssessments: formattedAssessments,
        recentPayments: formattedPayments,
        dailyStats
      };

    } catch (error) {
      logger.error('Failed to fetch dashboard stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        queryTime: `${Date.now() - startTime}ms`
      });
      throw error;
    }
  },
  ['admin-dashboard-stats'],
  {
    revalidate: 300, // Cache for 5 minutes
    tags: ['dashboard-stats']
  }
);

// ===== API HANDLER =====
export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 30, 60000)) { // 30 requests per minute
      logger.warn('Admin dashboard rate limit exceeded', { ip: clientIp });
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

    // 3. Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = dashboardQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      logger.warn('Invalid dashboard query parameters', {
        errors: validationResult.error.issues,
        userId: authResult.user!.id
      });
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    // 4. Fetch cached dashboard data
    const dashboardStats = await getCachedDashboardStats();

    // 5. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'dashboard_view',
      { 
        range: validationResult.data.range,
        timestamp: new Date().toISOString()
      },
      request
    );

    // 6. Return success response
    return NextResponse.json({
      success: true,
      data: dashboardStats,
      metadata: {
        cachedAt: new Date().toISOString(),
        userId: authResult.user!.id
      }
    });

  } catch (error) {
    logger.error('Dashboard API error', {
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