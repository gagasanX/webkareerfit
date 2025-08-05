import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth, logAdminAction, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';

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

interface BulkUpdateData {
  assessmentIds: string[];
  action: 'assign_clerk' | 'update_status' | 'bulk_process';
  clerkId?: string;
  status?: string;
  notes?: string;
}

// ===== OPTIMIZED CACHED FUNCTIONS =====
const getCachedClerks = unstable_cache(
  async () => {
    try {
      const clerks = await prisma.user.findMany({
        where: { isClerk: true },
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: {
              assignedAssessments: {
                where: { 
                  status: { in: ['pending', 'in_progress'] } 
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      return clerks.map(clerk => ({
        ...clerk,
        currentWorkload: clerk._count.assignedAssessments
      }));
    } catch (error) {
      logger.error('Error fetching clerks', { error: error instanceof Error ? error.message : 'Unknown' });
      return [];
    }
  },
  ['available-clerks'],
  { revalidate: 300, tags: ['clerk-workload'] }
);

// ===== OPTIMIZED STATS CALCULATION =====
async function getOptimizedStats(whereClause: Prisma.AssessmentWhereInput): Promise<AssessmentStats> {
  try {
    // 🚀 FIXED: Use Prisma native groupBy instead of raw SQL
    const [statusStats, manualCount, completionTimeResult, revenueResult] = await Promise.all([
      // Get status breakdown with Prisma groupBy
      prisma.assessment.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { status: true }
      }),
      
      // Manual processing count
      prisma.assessment.count({
        where: { ...whereClause, manualProcessing: true }
      }),
      
      // Average completion time (only completed assessments)
      prisma.assessment.aggregate({
        where: {
          ...whereClause,
          status: 'completed',
          reviewedAt: { not: null },
        },
        _avg: {
          // We'll calculate this differently since Prisma doesn't support EXTRACT
        }
      }),
      
      // Total revenue from successful payments
      prisma.payment.aggregate({
        where: {
          assessment: whereClause,
          status: { in: ['completed', 'successful', 'paid'] }
        },
        _sum: { amount: true }
      })
    ]);

    // Map status counts
    const statusMap = new Map();
    statusStats.forEach(item => {
      statusMap.set(item.status, item._count.status);
    });

    const totalAssessments = statusStats.reduce((sum, item) => sum + item._count.status, 0);
    const completedCount = statusMap.get('completed') || 0;

    // Calculate average completion time separately if needed
    let avgCompletionTime = 0;
    if (completedCount > 0) {
      try {
        // Use a simpler approach for completion time
        const completedAssessments = await prisma.assessment.findMany({
          where: {
            ...whereClause,
            status: 'completed',
            reviewedAt: { not: null }
          },
          select: {
            createdAt: true,
            reviewedAt: true
          },
          take: 100 // Sample for performance
        });

        if (completedAssessments.length > 0) {
          const totalHours = completedAssessments.reduce((sum, assessment) => {
            if (assessment.reviewedAt && assessment.createdAt) {
              const diff = assessment.reviewedAt.getTime() - assessment.createdAt.getTime();
              return sum + (diff / (1000 * 60 * 60)); // Convert to hours
            }
            return sum;
          }, 0);
          
          avgCompletionTime = totalHours / completedAssessments.length;
        }
      } catch (err) {
        logger.warn('Failed to calculate completion time', { error: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    return {
      totalAssessments,
      completedAssessments: completedCount,
      pendingAssessments: statusMap.get('pending') || 0,
      inProgressAssessments: statusMap.get('in_progress') || 0,
      cancelledAssessments: statusMap.get('cancelled') || 0,
      manualProcessingCount: manualCount,
      averageCompletionTime: Number(avgCompletionTime.toFixed(2)),
      totalRevenue: Number(revenueResult._sum.amount) || 0,
      conversionRate: totalAssessments > 0 ? Number(((completedCount / totalAssessments) * 100).toFixed(2)) : 0
    };

  } catch (error) {
    logger.error('Error calculating stats', { 
      error: error instanceof Error ? error.message : 'Unknown',
      whereClause: JSON.stringify(whereClause)
    });
    
    // Return default stats on error
    return {
      totalAssessments: 0,
      completedAssessments: 0,
      pendingAssessments: 0,
      inProgressAssessments: 0,
      cancelledAssessments: 0,
      manualProcessingCount: 0,
      averageCompletionTime: 0,
      totalRevenue: 0,
      conversionRate: 0
    };
  }
}

// ===== SAFE WHERE CLAUSE BUILDER =====
function buildSafeWhereClause(searchParams: URLSearchParams): Prisma.AssessmentWhereInput {
  const whereClause: Prisma.AssessmentWhereInput = {};
  
  try {
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const tier = searchParams.get('tier');
    const assignedClerk = searchParams.get('assignedClerk');
    const manualProcessing = searchParams.get('manualProcessing');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Search filter - optimized for index usage
    if (search && search.length > 0) {
      whereClause.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { user: { 
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }}
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (validStatuses.includes(status)) {
        whereClause.status = status;
      }
    }

    // Type filter
    if (type && type !== 'all') {
      const validTypes = ['ccrl', 'cdrl', 'ctrl', 'fjrl', 'ijrl', 'irl', 'rrl'];
      if (validTypes.includes(type.toLowerCase())) {
        whereClause.type = type.toLowerCase();
      }
    }

    // Tier filter
    if (tier && tier !== 'all') {
      const validTiers = ['basic', 'standard', 'premium'];
      if (validTiers.includes(tier)) {
        whereClause.tier = tier;
      }
    }

    // Clerk filter
    if (assignedClerk && assignedClerk !== 'all') {
      if (assignedClerk === 'unassigned') {
        whereClause.assignedClerkId = null;
      } else {
        // Validate clerk ID format (cuid)
        if (assignedClerk.match(/^[a-z0-9]{25}$/)) {
          whereClause.assignedClerkId = assignedClerk;
        }
      }
    }

    // Manual processing filter
    if (manualProcessing === 'true') {
      whereClause.manualProcessing = true;
    } else if (manualProcessing === 'false') {
      whereClause.manualProcessing = false;
    }

    // Date range filter with validation
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          whereClause.createdAt.gte = fromDate;
        }
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo + 'T23:59:59.999Z');
        if (!isNaN(toDate.getTime())) {
          whereClause.createdAt.lte = toDate;
        }
      }
    }

  } catch (error) {
    logger.warn('Error building where clause', { 
      error: error instanceof Error ? error.message : 'Unknown',
      searchParams: Object.fromEntries(searchParams.entries())
    });
  }

  return whereClause;
}

// ===== GET - OPTIMIZED LIST ASSESSMENTS =====
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 50, 60000)) {
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

    // 3. Parse and validate query parameters
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '10')), 100);
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const includeStats = url.searchParams.get('includeStats') === 'true';

    const offset = (page - 1) * limit;

    // 4. Build safe where clause
    const whereClause = buildSafeWhereClause(url.searchParams);

    // 5. Build order by clause
    const validSortFields = ['createdAt', 'updatedAt', 'status', 'type', 'tier', 'price'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const orderBy: Prisma.AssessmentOrderByWithRelationInput = {
      [safeSortBy]: sortOrder
    };

    // 6. 🚀 OPTIMIZED: Core queries with graceful degradation
    const [assessments, totalCount] = await Promise.all([
      prisma.assessment.findMany({
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
      }),
      
      prisma.assessment.count({ where: whereClause })
    ]);

    // 7. Optional data - don't fail if these fail
    let availableClerks: any[] = [];
    let statsData: AssessmentStats | null = null;

    try {
      availableClerks = await getCachedClerks();
    } catch (err) {
      logger.warn('Failed to load clerks', { error: err instanceof Error ? err.message : 'Unknown' });
    }

    try {
      if (includeStats) {
        statsData = await getOptimizedStats(whereClause);
      }
    } catch (err) {
      logger.warn('Failed to load stats', { error: err instanceof Error ? err.message : 'Unknown' });
    }

    // 8. Format response
    const formattedAssessments: Assessment[] = assessments.map(assessment => ({
      ...assessment,
      price: Number(assessment.price) || 0,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
      reviewedAt: assessment.reviewedAt?.toISOString() || null
    }));

    const totalPages = Math.ceil(totalCount / limit);
    const queryTime = Date.now() - startTime;

    // 9. Log performance
    logger.info('Assessment list query completed', {
      queryTime: `${queryTime}ms`,
      totalCount,
      page,
      limit,
      hasFilters: Object.keys(whereClause).length > 0
    });

    // 10. Async logging (non-blocking)
    logAdminAction(
      authResult.user!.id,
      'assessments_list_view',
      { 
        page,
        limit,
        totalResults: totalCount,
        queryTime: `${queryTime}ms`,
        timestamp: new Date().toISOString()
      },
      request
    ).catch(err => logger.warn('Failed to log admin action', { error: err instanceof Error ? err.message : 'Unknown' }));

    // 11. Return response with performance headers
    return NextResponse.json({
      success: true,
      assessments: formattedAssessments,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats: statsData,
      availableClerks,
      metadata: {
        queryTime: `${queryTime}ms`,
        cached: {
          clerks: true,
          stats: !!statsData
        }
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        'X-Query-Performance': `${queryTime}ms`
      }
    });

  } catch (error) {
    const queryTime = Date.now() - startTime;
    
    logger.error('Assessment list API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      queryTime: `${queryTime}ms`,
      url: request.url,
      searchParams: Object.fromEntries(new URL(request.url).searchParams.entries())
    });

    // Return specific error information for debugging
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({
        error: 'Database query failed',
        code: error.code,
        details: error.meta,
        queryTime: `${queryTime}ms`
      }, { status: 500 });
    }

    return NextResponse.json({
      error: 'Failed to fetch assessments',
      details: error instanceof Error ? error.message : 'Unknown error',
      queryTime: `${queryTime}ms`
    }, { status: 500 });
  }
}

// ===== PUT - OPTIMIZED BULK UPDATE =====
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 20, 60000)) {
      logger.warn('Bulk update rate limit exceeded', { ip: clientIp });
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

    // Validate all IDs are valid cuid format
    const validIds = assessmentIds.filter(id => id.match(/^[a-z0-9]{25}$/));
    if (validIds.length !== assessmentIds.length) {
      return NextResponse.json(
        { error: 'Invalid assessment ID format' },
        { status: 400 }
      );
    }

    // 4. Validate assessments exist and clerk if needed
    const [existingAssessments, clerk] = await Promise.all([
      prisma.assessment.findMany({
        where: { id: { in: assessmentIds } },
        select: { id: true, status: true, assignedClerkId: true }
      }),
      
      action === 'assign_clerk' && clerkId ? 
        prisma.user.findFirst({
          where: { id: clerkId, isClerk: true },
          select: { id: true, name: true }
        }) : 
        Promise.resolve(null)
    ]);

    if (existingAssessments.length !== assessmentIds.length) {
      return NextResponse.json(
        { error: 'Some assessments not found' },
        { status: 404 }
      );
    }

    if (action === 'assign_clerk' && clerkId && !clerk) {
      return NextResponse.json(
        { error: 'Clerk not found or inactive' },
        { status: 404 }
      );
    }

    // 5. Build update data
    const updateData: Prisma.AssessmentUpdateManyArgs['data'] = {
      updatedAt: new Date()
    };

    switch (action) {
      case 'assign_clerk':
        updateData.assignedClerkId = clerkId;
        updateData.status = 'in_progress';
        break;
        
      case 'update_status':
        const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
        updateData.status = status;
        if (status === 'completed') {
          updateData.reviewedAt = new Date();
        }
        if (notes) {
          updateData.reviewNotes = notes;
        }
        break;
        
      case 'bulk_process':
        updateData.manualProcessing = false;
        updateData.status = 'completed';
        updateData.reviewedAt = new Date();
        if (notes) {
          updateData.reviewNotes = notes;
        }
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // 6. Execute bulk update
    const updateResult = await prisma.assessment.updateMany({
      where: { id: { in: assessmentIds } },
      data: updateData
    });

    const queryTime = Date.now() - startTime;

    // 7. Log admin action (async)
    logAdminAction(
      authResult.user!.id,
      'assessments_bulk_update',
      { 
        action,
        assessmentIds,
        updatedCount: updateResult.count,
        queryTime: `${queryTime}ms`,
        timestamp: new Date().toISOString()
      },
      request
    ).catch(err => logger.warn('Failed to log bulk action', { error: err instanceof Error ? err.message : 'Unknown' }));

    // 8. Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updateResult.count} assessments`,
      results: {
        updated: updateResult.count,
        action,
        queryTime: `${queryTime}ms`
      }
    });

  } catch (error) {
    const queryTime = Date.now() - startTime;
    
    logger.error('Bulk update API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      queryTime: `${queryTime}ms`,
      url: request.url
    });

    return NextResponse.json({
      error: 'Failed to update assessments',
      details: error instanceof Error ? error.message : 'Unknown error',
      queryTime: `${queryTime}ms`
    }, { status: 500 });
  }
}