import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth, logAdminAction, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';

// ===== TYPES =====
interface AssessmentDetail {
  id: string;
  type: string;
  tier: string;
  status: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  manualProcessing: boolean;
  data: any;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    createdAt: string;
  };
  assignedClerk: {
    id: string;
    name: string | null;
    email: string;
    assignedAt: string;
  } | null;
  payment: {
    id: string;
    amount: number;
    status: string;
    method: string;
    gatewayPaymentId: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  referrals: Array<{
    id: string;
    affiliateId: string;
    affiliateName: string | null;
    affiliateEmail: string;
    commission: number;
    status: string;
    paidOut: boolean;
    createdAt: string;
  }>;
}

interface UpdateAssessmentData {
  status?: string;
  tier?: string;
  assignedClerkId?: string;
  reviewNotes?: string;
  manualProcessing?: boolean;
  price?: number;
}

// ===== CACHED ASSESSMENT FETCHER =====
const getCachedAssessmentDetail = unstable_cache(
  async (id: string): Promise<AssessmentDetail | null> => {
    const startTime = Date.now();
    
    try {
      // Validate ID format
      if (!id.match(/^[a-z0-9]{25}$/)) {
        throw new Error('Invalid assessment ID format');
      }

      // Single optimized query with all needed relations
      const assessment = await prisma.assessment.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              createdAt: true
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
              method: true,
              gatewayPaymentId: true,
              createdAt: true,
              updatedAt: true
            }
          },
          referrals: {
            include: {
              affiliate: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!assessment) {
        return null;
      }

      // Format response with proper type safety
      const formattedAssessment: AssessmentDetail = {
        id: assessment.id,
        type: assessment.type,
        tier: assessment.tier,
        status: assessment.status,
        price: Number(assessment.price) || 0,
        createdAt: assessment.createdAt.toISOString(),
        updatedAt: assessment.updatedAt.toISOString(),
        reviewedAt: assessment.reviewedAt?.toISOString() || null,
        reviewNotes: assessment.reviewNotes || null,
        manualProcessing: Boolean(assessment.manualProcessing),
        data: assessment.data,
        user: {
          id: assessment.user.id,
          name: assessment.user.name,
          email: assessment.user.email,
          phone: assessment.user.phone,
          createdAt: assessment.user.createdAt.toISOString()
        },
        assignedClerk: assessment.assignedClerk ? {
          id: assessment.assignedClerk.id,
          name: assessment.assignedClerk.name,
          email: assessment.assignedClerk.email,
          assignedAt: assessment.updatedAt.toISOString()
        } : null,
        payment: assessment.payment ? {
          id: assessment.payment.id,
          amount: Number(assessment.payment.amount) || 0,
          status: assessment.payment.status,
          method: assessment.payment.method,
          gatewayPaymentId: assessment.payment.gatewayPaymentId,
          createdAt: assessment.payment.createdAt.toISOString(),
          updatedAt: assessment.payment.updatedAt.toISOString()
        } : null,
        referrals: assessment.referrals.map(referral => ({
          id: referral.id,
          affiliateId: referral.affiliateId,
          affiliateName: referral.affiliate?.name || null,
          affiliateEmail: referral.affiliate?.email || 'Unknown',
          commission: Number(referral.commission) || 0,
          status: referral.status,
          paidOut: Boolean(referral.paidOut),
          createdAt: referral.createdAt.toISOString()
        }))
      };

      const queryTime = Date.now() - startTime;
      logger.info('Assessment detail fetched', {
        assessmentId: id,
        queryTime: `${queryTime}ms`
      });

      return formattedAssessment;
      
    } catch (error) {
      logger.error('Failed to fetch assessment detail', {
        error: error instanceof Error ? error.message : 'Unknown error',
        assessmentId: id
      });
      throw error;
    }
  },
  ['assessment-detail'],
  {
    revalidate: 300, // Cache for 5 minutes
    tags: ['assessment-detail']
  }
);

// ===== ACTIVITY HISTORY FETCHER =====
async function getActivityHistory(assessmentId: string) {
  try {
    // Use Prisma native query instead of raw SQL
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { details: { path: ['assessmentId'], equals: assessmentId } },
          { details: { path: ['newAssessmentId'], equals: assessmentId } },
          { details: { path: ['assessmentIds'], array_contains: assessmentId } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        eventType: true,
        details: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true
      }
    });

    return auditLogs.map(log => ({
      id: log.id,
      eventType: log.eventType,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString()
    }));
  } catch (error) {
    logger.error('Failed to fetch assessment activity history', {
      error: error instanceof Error ? error.message : 'Unknown error',
      assessmentId
    });
    return [];
  }
}

// ===== GET - FETCH ASSESSMENT DETAILS =====
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 100, 60000)) {
      logger.warn('Assessment detail rate limit exceeded', { ip: clientIp });
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

    // 3. Validate assessment ID
    const { id } = await params;
    if (!id || !id.match(/^[a-z0-9]{25}$/)) {
      return NextResponse.json(
        { error: 'Invalid assessment ID format' },
        { status: 400 }
      );
    }

    // 4. Fetch assessment and activity history in parallel
    const [assessment, activityHistory] = await Promise.all([
      getCachedAssessmentDetail(id),
      getActivityHistory(id)
    ]);

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    const queryTime = Date.now() - startTime;

    // 5. Log admin action (async, non-blocking)
    logAdminAction(
      authResult.user!.id,
      'assessment_detail_view',
      { 
        assessmentId: id,
        assessmentType: assessment.type,
        assessmentStatus: assessment.status,
        queryTime: `${queryTime}ms`,
        timestamp: new Date().toISOString()
      },
      request
    ).catch(err => logger.warn('Failed to log admin action', { error: err instanceof Error ? err.message : 'Unknown' }));

    // 6. Return response
    return NextResponse.json({
      success: true,
      assessment,
      activityHistory,
      metadata: {
        viewedAt: new Date().toISOString(),
        viewedBy: authResult.user!.id,
        queryTime: `${queryTime}ms`,
        cached: true
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'X-Query-Performance': `${queryTime}ms`
      }
    });

  } catch (error) {
    const queryTime = Date.now() - startTime;
    
    logger.error('Assessment detail API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      assessmentId: (await params).id,
      queryTime: `${queryTime}ms`,
      url: request.url
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({
        error: 'Database query failed',
        code: error.code,
        details: error.meta,
        queryTime: `${queryTime}ms`
      }, { status: 500 });
    }

    return NextResponse.json({
      error: 'Failed to fetch assessment details',
      details: error instanceof Error ? error.message : 'Unknown error',
      queryTime: `${queryTime}ms`
    }, { status: 500 });
  }
}

// ===== PATCH - UPDATE ASSESSMENT =====
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 50, 60000)) {
      logger.warn('Assessment update rate limit exceeded', { ip: clientIp });
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

    // 3. Validate assessment ID
    const { id } = await params;
    if (!id || !id.match(/^[a-z0-9]{25}$/)) {
      return NextResponse.json(
        { error: 'Invalid assessment ID format' },
        { status: 400 }
      );
    }

    // 4. Parse and validate request body
    const body: UpdateAssessmentData = await request.json();
    const {
      status,
      tier,
      assignedClerkId,
      reviewNotes,
      manualProcessing,
      price
    } = body;

    // 5. Input validation
    if (status && !['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    if (tier && !['basic', 'standard', 'premium'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier value' }, { status: 400 });
    }

    if (price !== undefined && (price < 0 || price > 10000)) {
      return NextResponse.json({ error: 'Price must be between 0 and 10000' }, { status: 400 });
    }

    if (assignedClerkId && assignedClerkId !== 'unassign' && !assignedClerkId.match(/^[a-z0-9]{25}$/)) {
      return NextResponse.json({ error: 'Invalid clerk ID format' }, { status: 400 });
    }

    // 6. Validate assessment exists and clerk if needed
    const [existingAssessment, clerk] = await Promise.all([
      prisma.assessment.findUnique({
        where: { id },
        select: { id: true, status: true, assignedClerkId: true }
      }),
      
      assignedClerkId && assignedClerkId !== 'unassign' ? 
        prisma.user.findFirst({
          where: { id: assignedClerkId, isClerk: true },
          select: { id: true, name: true }
        }) : 
        Promise.resolve(null)
    ]);

    if (!existingAssessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (assignedClerkId && assignedClerkId !== 'unassign' && !clerk) {
      return NextResponse.json({ error: 'Clerk not found or inactive' }, { status: 404 });
    }

    // 7. Build update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.reviewedAt = new Date();
      }
    }

    if (tier !== undefined) {
      updateData.tier = tier;
    }

    if (assignedClerkId !== undefined) {
      if (assignedClerkId === 'unassign' || assignedClerkId === '') {
        updateData.assignedClerkId = null;
      } else {
        updateData.assignedClerkId = assignedClerkId;
        if (existingAssessment.status === 'pending') {
          updateData.status = 'in_progress';
        }
      }
    }

    if (reviewNotes !== undefined) {
      updateData.reviewNotes = reviewNotes || null;
    }

    if (manualProcessing !== undefined) {
      updateData.manualProcessing = manualProcessing;
    }

    if (price !== undefined) {
      updateData.price = price;
    }

    // 8. Update assessment
    const updatedAssessment = await prisma.assessment.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        status: true,
        assignedClerkId: true,
        createdAt: true,
        updatedAt: true,
        reviewedAt: true
      }
    });

    const queryTime = Date.now() - startTime;

    // 9. Log admin action (async)
    logAdminAction(
      authResult.user!.id,
      'assessment_updated',
      { 
        assessmentId: id,
        changes: body,
        previousStatus: existingAssessment.status,
        newStatus: updatedAssessment.status,
        queryTime: `${queryTime}ms`,
        timestamp: new Date().toISOString()
      },
      request
    ).catch(err => logger.warn('Failed to log update action', { error: err instanceof Error ? err.message : 'Unknown' }));

    // 10. Return success response
    return NextResponse.json({
      success: true,
      assessment: {
        ...updatedAssessment,
        createdAt: updatedAssessment.createdAt.toISOString(),
        updatedAt: updatedAssessment.updatedAt.toISOString(),
        reviewedAt: updatedAssessment.reviewedAt?.toISOString() || null
      },
      message: 'Assessment updated successfully',
      metadata: {
        queryTime: `${queryTime}ms`
      }
    });

  } catch (error) {
    const queryTime = Date.now() - startTime;
    
    logger.error('Assessment update API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      assessmentId: (await params).id,
      queryTime: `${queryTime}ms`,
      url: request.url
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
      }
      return NextResponse.json({
        error: 'Database update failed',
        code: error.code,
        details: error.meta,
        queryTime: `${queryTime}ms`
      }, { status: 500 });
    }

    return NextResponse.json({
      error: 'Failed to update assessment',
      details: error instanceof Error ? error.message : 'Unknown error',
      queryTime: `${queryTime}ms`
    }, { status: 500 });
  }
}

// ===== DELETE - DELETE ASSESSMENT =====
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 20, 60000)) {
      logger.warn('Assessment delete rate limit exceeded', { ip: clientIp });
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

    // 3. Validate assessment ID
    const { id } = await params;
    if (!id || !id.match(/^[a-z0-9]{25}$/)) {
      return NextResponse.json(
        { error: 'Invalid assessment ID format' },
        { status: 400 }
      );
    }

    // 4. Check assessment exists and safety constraints
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        status: true,
        payment: {
          select: {
            id: true,
            status: true
          }
        },
        _count: {
          select: {
            referrals: true
          }
        }
      }
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // 5. Safety check for completed payments
    if (assessment.payment && ['completed', 'successful', 'paid'].includes(assessment.payment.status)) {
      return NextResponse.json(
        { error: 'Cannot delete assessment with completed payment. Cancel or refund first.' },
        { status: 409 }
      );
    }

    // 6. Delete in transaction with proper cleanup
    await prisma.$transaction(async (tx) => {
      // Delete referrals first
      await tx.referral.deleteMany({
        where: { assessmentId: id }
      });

      // Delete payment if exists
      if (assessment.payment) {
        await tx.payment.delete({
          where: { id: assessment.payment.id }
        });
      }

      // Delete assessment
      await tx.assessment.delete({
        where: { id }
      });
    });

    const queryTime = Date.now() - startTime;

    // 7. Log admin action (async)
    logAdminAction(
      authResult.user!.id,
      'assessment_deleted',
      { 
        assessmentId: id,
        assessmentType: assessment.type,
        assessmentStatus: assessment.status,
        hadPayment: !!assessment.payment,
        hadReferrals: assessment._count.referrals > 0,
        queryTime: `${queryTime}ms`,
        timestamp: new Date().toISOString()
      },
      request
    ).catch(err => logger.warn('Failed to log delete action', { error: err instanceof Error ? err.message : 'Unknown' }));

    // 8. Return success response
    return NextResponse.json({
      success: true,
      message: 'Assessment deleted successfully',
      metadata: {
        queryTime: `${queryTime}ms`
      }
    });

  } catch (error) {
    const queryTime = Date.now() - startTime;
    
    logger.error('Assessment delete API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      assessmentId: (await params).id,
      queryTime: `${queryTime}ms`,
      url: request.url
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
      }
      return NextResponse.json({
        error: 'Database delete failed',
        code: error.code,
        details: error.meta,
        queryTime: `${queryTime}ms`
      }, { status: 500 });
    }

    return NextResponse.json({
      error: 'Failed to delete assessment',
      details: error instanceof Error ? error.message : 'Unknown error',
      queryTime: `${queryTime}ms`
    }, { status: 500 });
  }
}