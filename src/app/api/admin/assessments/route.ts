// /src/app/api/admin/assessments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth, logAdminAction, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import { Prisma } from '@prisma/client';

// ===== TYPES =====
interface Assessment {
  id: string;
  type: string;
  tier: string;
  status: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  manualProcessing: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  assignedClerk: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  payment: {
    id: string;
    amount: number;
    status: string;
    method: string;
  } | null;
  _count: {
    referrals: number;
  };
}

interface AssessmentStats {
  totalAssessments: number;
  completedAssessments: number;
  pendingAssessments: number;
  inProgressAssessments: number;
  cancelledAssessments: number;
  manualProcessingCount: number;
  averageCompletionTime: number;
  totalRevenue: number;
  conversionRate: number;
}

interface AssessmentTypeBreakdown {
  type: string;
  count: number;
  completed: number;
  pending: number;
  revenue: number;
  avgPrice: number;
  completionRate: number;
}

interface BulkUpdateData {
  assessmentIds: string[];
  action: 'assign_clerk' | 'update_status' | 'bulk_process';
  clerkId?: string;
  status?: string;
  notes?: string;
}

// ===== GET - LIST ASSESSMENTS =====
export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 30, 60000)) {
      logger.warn('Admin assessments list rate limit exceeded', { ip: clientIp });
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
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    const type = url.searchParams.get('type') || 'all';
    const tier = url.searchParams.get('tier') || 'all';
    const assignedClerk = url.searchParams.get('assignedClerk') || 'all';
    const manualProcessing = url.searchParams.get('manualProcessing');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    const validPage = Math.max(1, page);
    const offset = (validPage - 1) * limit;

    // DEBUG: Log query parameters
    logger.info('Assessment query parameters', {
      page: validPage,
      limit,
      search,
      status,
      type,
      sortBy,
      sortOrder,
      offset
    });

    // 4. Build where clause
    const whereClause: Prisma.AssessmentWhereInput = {};

    // Search filter
    if (search) {
      whereClause.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { user: { 
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }},
        { assignedClerk: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }}
      ];
    }

    // Status filter - DEBUG: Log if filtering
    if (status !== 'all') {
      whereClause.status = status;
      logger.info('Filtering by status', { status });
    }

    // Type filter
    if (type !== 'all') {
      whereClause.type = type;
      logger.info('Filtering by type', { type });
    }

    // Tier filter
    if (tier !== 'all') {
      whereClause.tier = tier;
      logger.info('Filtering by tier', { tier });
    }

    // Assigned clerk filter
    if (assignedClerk !== 'all') {
      if (assignedClerk === 'unassigned') {
        whereClause.assignedClerkId = null;
      } else {
        whereClause.assignedClerkId = assignedClerk;
      }
      logger.info('Filtering by clerk', { assignedClerk });
    }

    // Manual processing filter
    if (manualProcessing === 'true') {
      whereClause.manualProcessing = true;
    } else if (manualProcessing === 'false') {
      whereClause.manualProcessing = false;
    }

    // Date range filter - DEBUG: Check if this blocks new assessments
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        whereClause.createdAt.gte = fromDate;
        logger.info('Date from filter', { dateFrom, fromDate });
      }
      if (dateTo) {
        const toDate = new Date(dateTo + 'T23:59:59.999Z');
        whereClause.createdAt.lte = toDate;
        logger.info('Date to filter', { dateTo, toDate });
      }
    }

    // DEBUG: Log final where clause
    logger.info('Final where clause', { whereClause: JSON.stringify(whereClause, null, 2) });

    // 5. Build order by clause
    const validSortFields = ['createdAt', 'updatedAt', 'status', 'type', 'tier', 'price'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const orderBy: Prisma.AssessmentOrderByWithRelationInput = {
      [safeSortBy]: safeSortOrder
    };

    logger.info('Order by clause', { orderBy });

    // DEBUG: First, get total count without pagination
    const totalCount = await prisma.assessment.count({ where: whereClause });
    logger.info('Total assessments matching filters', { totalCount });

    // DEBUG: Get latest 5 assessments without any filters to verify they exist
    const latestAssessments = await prisma.assessment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            email: true
          }
        }
      }
    });

    logger.info('Latest 5 assessments in database', { 
      assessments: latestAssessments.map(a => ({
        id: a.id,
        type: a.type,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        userEmail: a.user.email
      }))
    });

    // 6. Fetch assessments with pagination
    const assessments = await prisma.assessment.findMany({
      where: whereClause,
      orderBy,
      skip: offset,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedClerk: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
            method: true
          }
        },
        _count: {
          select: {
            referrals: true
          }
        }
      }
    });

    logger.info('Query results', { 
      found: assessments.length,
      totalCount,
      page: validPage,
      limit,
      firstResult: assessments[0] ? {
        id: assessments[0].id,
        type: assessments[0].type,
        status: assessments[0].status,
        createdAt: assessments[0].createdAt.toISOString()
      } : null
    });

    // 7. Format response
    const formattedAssessments: Assessment[] = assessments.map(assessment => ({
      ...assessment,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
      reviewedAt: assessment.reviewedAt?.toISOString() || null
    }));

    // 8. Get additional stats if requested
    let stats: AssessmentStats | null = null;
    let typeBreakdown: AssessmentTypeBreakdown[] = [];

    if (url.searchParams.get('includeStats') === 'true') {
      stats = await getAssessmentStats(whereClause);
      typeBreakdown = await getAssessmentTypeBreakdown(whereClause);
    }

    const totalPages = Math.ceil(totalCount / limit);

    // 9. Get available clerks for assignment
    const availableClerks = await prisma.user.findMany({
      where: { isClerk: true },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            assignedAssessments: {
              where: { status: { in: ['pending', 'in_progress'] } }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // 10. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'assessments_list_view',
      { 
        page: validPage,
        limit,
        search,
        filters: { status, type, tier, assignedClerk, manualProcessing },
        totalResults: totalCount,
        timestamp: new Date().toISOString()
      },
      request
    );

    // 11. Return success response
    return NextResponse.json({
      success: true,
      assessments: formattedAssessments,
      pagination: {
        currentPage: validPage,
        totalPages,
        totalCount,
        limit,
        hasNext: validPage < totalPages,
        hasPrev: validPage > 1
      },
      stats,
      typeBreakdown,
      availableClerks: availableClerks.map(clerk => ({
        ...clerk,
        currentWorkload: clerk._count.assignedAssessments
      })),
      metadata: {
        filters: { status, type, tier, assignedClerk, manualProcessing },
        sortBy: safeSortBy,
        sortOrder: safeSortOrder,
        dateRange: { from: dateFrom, to: dateTo }
      }
    });

  } catch (error) {
    logger.error('Assessments list API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    });

    return NextResponse.json(
      { error: 'Failed to fetch assessments. Please try again later.' },
      { status: 500 }
    );
  }
}

// ===== PUT - BULK UPDATE ASSESSMENTS =====
export async function PUT(request: NextRequest) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 10, 60000)) {
      logger.warn('Admin assessments bulk update rate limit exceeded', { ip: clientIp });
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

    // 3. Parse and validate request body
    const body: BulkUpdateData = await request.json();
    const { assessmentIds, action, clerkId, status, notes } = body;

    if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
      return NextResponse.json(
        { error: 'Assessment IDs are required' },
        { status: 400 }
      );
    }

    if (assessmentIds.length > 100) {
      return NextResponse.json(
        { error: 'Cannot update more than 100 assessments at once' },
        { status: 400 }
      );
    }

    // 4. Validate assessments exist
    const existingAssessments = await prisma.assessment.findMany({
      where: { id: { in: assessmentIds } },
      select: { id: true, status: true, assignedClerkId: true }
    });

    if (existingAssessments.length !== assessmentIds.length) {
      return NextResponse.json(
        { error: 'Some assessments not found' },
        { status: 404 }
      );
    }

    // 5. Perform bulk update based on action
    let updateData: Prisma.AssessmentUpdateManyArgs['data'] = {};
    let results: any = {};

    switch (action) {
      case 'assign_clerk':
        if (!clerkId) {
          return NextResponse.json(
            { error: 'Clerk ID is required for assignment' },
            { status: 400 }
          );
        }

        // Verify clerk exists and is active
        const clerk = await prisma.user.findFirst({
          where: { id: clerkId, isClerk: true }
        });

        if (!clerk) {
          return NextResponse.json(
            { error: 'Clerk not found or inactive' },
            { status: 404 }
          );
        }

        updateData = {
          assignedClerkId: clerkId,
          status: 'in_progress',
          updatedAt: new Date()
        };
        break;

      case 'update_status':
        if (!status) {
          return NextResponse.json(
            { error: 'Status is required for status update' },
            { status: 400 }
          );
        }

        const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
          return NextResponse.json(
            { error: 'Invalid status' },
            { status: 400 }
          );
        }

        updateData = {
          status,
          updatedAt: new Date()
        };

        if (status === 'completed') {
          updateData.reviewedAt = new Date();
        }

        if (notes) {
          updateData.reviewNotes = notes;
        }
        break;

      case 'bulk_process':
        updateData = {
          manualProcessing: false,
          status: 'completed',
          reviewedAt: new Date(),
          updatedAt: new Date()
        };

        if (notes) {
          updateData.reviewNotes = notes;
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // 6. Execute bulk update
    const updateResult = await prisma.assessment.updateMany({
      where: { id: { in: assessmentIds } },
      data: updateData
    });

    results = {
      updated: updateResult.count,
      action,
      assessmentIds
    };

    // 7. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'assessments_bulk_update',
      { 
        action,
        assessmentIds,
        clerkId,
        status,
        notes,
        updatedCount: updateResult.count,
        timestamp: new Date().toISOString()
      },
      request
    );

    // 8. Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updateResult.count} assessments`,
      results
    });

  } catch (error) {
    logger.error('Assessments bulk update API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    });

    return NextResponse.json(
      { error: 'Failed to update assessments. Please try again later.' },
      { status: 500 }
    );
  }
}

// ===== HELPER FUNCTIONS =====
async function getAssessmentStats(whereClause: Prisma.AssessmentWhereInput): Promise<AssessmentStats> {
  const [
    totalAssessments,
    statusCounts,
    completionTimes,
    revenue
  ] = await Promise.all([
    prisma.assessment.count({ where: whereClause }),
    prisma.assessment.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { id: true }
    }),
    // Enhanced completion time query with better null safety
    prisma.$queryRaw<Array<{ avgHours: number | null }>>`
      SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM ("reviewedAt" - "createdAt")) / 3600), 
        0
      ) as "avgHours"
      FROM "Assessment"
      WHERE "reviewedAt" IS NOT NULL 
        AND status = 'completed' 
        AND "createdAt" IS NOT NULL
    `,
    prisma.payment.aggregate({
      where: {
        assessment: whereClause,
        status: { in: ['completed', 'successful', 'paid'] }
      },
      _sum: { amount: true }
    })
  ]);

  // Map status counts for easy access
  const statusMap = new Map(statusCounts.map(item => [item.status, item._count.id]));

  // Calculate stats with enhanced null safety
  const completedCount = statusMap.get('completed') || 0;
  const pendingCount = statusMap.get('pending') || 0;
  const inProgressCount = statusMap.get('in_progress') || 0;
  const cancelledCount = statusMap.get('cancelled') || 0;

  const manualProcessingCount = await prisma.assessment.count({
    where: { ...whereClause, manualProcessing: true }
  });

  // Enhanced completion time calculation with multiple fallbacks
  const avgCompletionTime = completionTimes?.[0]?.avgHours;
  let safeAvgCompletionTime = 0;
  
  if (avgCompletionTime !== null && avgCompletionTime !== undefined && !isNaN(Number(avgCompletionTime))) {
    safeAvgCompletionTime = Math.max(0, Number(avgCompletionTime));
  }

  return {
    totalAssessments,
    completedAssessments: completedCount,
    pendingAssessments: pendingCount,
    inProgressAssessments: inProgressCount,
    cancelledAssessments: cancelledCount,
    manualProcessingCount,
    averageCompletionTime: safeAvgCompletionTime,
    totalRevenue: Number(revenue._sum.amount) || 0,
    conversionRate: totalAssessments > 0 ? Number(((completedCount / totalAssessments) * 100).toFixed(2)) : 0
  };
}

async function getAssessmentTypeBreakdown(whereClause: Prisma.AssessmentWhereInput): Promise<AssessmentTypeBreakdown[]> {
  const typeStats = await prisma.assessment.groupBy({
    by: ['type'],
    where: whereClause,
    _count: { id: true },
    _avg: { price: true }
  });

  const typeRevenue = await prisma.$queryRaw<Array<{
    type: string;
    revenue: number;
    completed: bigint;
    pending: bigint;
  }>>`
    SELECT 
      a.type,
      COALESCE(SUM(p.amount), 0) as revenue,
      SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM "Assessment" a
    LEFT JOIN "Payment" p ON a.id = p."assessmentId" 
      AND p.status IN ('completed', 'successful', 'paid')
    WHERE a.id IS NOT NULL
    GROUP BY a.type
  `;

  const revenueMap = new Map(typeRevenue.map(item => [
    item.type, 
    { 
      revenue: Number(item.revenue), 
      completed: Number(item.completed),
      pending: Number(item.pending)
    }
  ]));

  return typeStats.map(item => {
    const revenueData = revenueMap.get(item.type) || { revenue: 0, completed: 0, pending: 0 };
    const total = item._count.id;
    
    return {
      type: item.type,
      count: total,
      completed: revenueData.completed,
      pending: revenueData.pending,
      revenue: revenueData.revenue,
      avgPrice: item._avg.price || 0,
      completionRate: total > 0 ? (revenueData.completed / total) * 100 : 0
    };
  });
}