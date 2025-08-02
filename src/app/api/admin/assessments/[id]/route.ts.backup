// /src/app/api/admin/assessments/[id]/route.ts
// Main CRUD operations for individual assessments
// Replaces: view/route.ts and reassign/route.ts for consolidated API
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth, logAdminAction, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import { Prisma } from '@prisma/client';

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

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// ===== GET - FETCH ASSESSMENT DETAILS =====
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 60, 60000)) {
      logger.warn('Admin assessment detail rate limit exceeded', { ip: clientIp });
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

    // 3. Validate assessment ID - FIX: Await params
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Assessment ID is required' },
        { status: 400 }
      );
    }

    // 4. Fetch assessment with all related data
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
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // 5. Format response with enhanced null checks and data validation
    const formattedAssessment: AssessmentDetail = {
      ...assessment,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
      reviewedAt: assessment.reviewedAt?.toISOString() || null,
      // Ensure price is always a valid number
      price: Number(assessment.price) || 0,
      // Safely handle user data
      user: {
        ...assessment.user,
        createdAt: assessment.user.createdAt.toISOString(),
        phone: assessment.user.phone || null
      },
      // Handle clerk assignment with proper timestamp
      assignedClerk: assessment.assignedClerk ? {
        ...assessment.assignedClerk,
        // Use updatedAt as proxy for assignment time (could be enhanced with dedicated field)
        assignedAt: assessment.updatedAt.toISOString()
      } : null,
      // Safely format payment data
      payment: assessment.payment ? {
        ...assessment.payment,
        amount: Number(assessment.payment.amount) || 0,
        gatewayPaymentId: assessment.payment.gatewayPaymentId || null,
        createdAt: assessment.payment.createdAt.toISOString(),
        updatedAt: assessment.payment.updatedAt.toISOString()
      } : null,
      // Format referrals with safe data handling
      referrals: (assessment.referrals || []).map((referral: any) => ({
        id: referral.id,
        affiliateId: referral.affiliateId,
        affiliateName: referral.affiliate?.name || null,
        affiliateEmail: referral.affiliate?.email || 'Unknown',
        commission: Number(referral.commission) || 0,
        status: referral.status || 'pending',
        paidOut: Boolean(referral.paidOut),
        createdAt: referral.createdAt.toISOString()
      }))
    };

    // 6. Get activity history (safely)
    const activityHistory = await getAssessmentActivityHistory(id);

    // 7. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'assessment_detail_view',
      { 
        assessmentId: id,
        assessmentType: assessment.type,
        assessmentStatus: assessment.status,
        timestamp: new Date().toISOString()
      },
      request
    );

    // 8. Return success response
    return NextResponse.json({
      success: true,
      assessment: formattedAssessment,
      activityHistory,
      metadata: {
        viewedAt: new Date().toISOString(),
        viewedBy: authResult.user!.id
      }
    });

  } catch (error) {
    logger.error('Assessment detail API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      assessmentId: (await params).id,
      url: request.url
    });

    return NextResponse.json(
      { error: 'Failed to fetch assessment details. Please try again later.' },
      { status: 500 }
    );
  }
}

// ===== PATCH - UPDATE ASSESSMENT =====
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 30, 60000)) {
      logger.warn('Admin assessment update rate limit exceeded', { ip: clientIp });
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

    // 3. Validate assessment ID - FIX: Await params  
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Assessment ID is required' },
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

    // 5. Validate enum values
    if (status && !['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    if (tier && !['basic', 'standard', 'premium'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier value' },
        { status: 400 }
      );
    }

    if (price !== undefined && (price < 0 || price > 10000)) {
      return NextResponse.json(
        { error: 'Price must be between 0 and 10000' },
        { status: 400 }
      );
    }

    // 6. Check if assessment exists
    const existingAssessment = await prisma.assessment.findUnique({
      where: { id },
      select: { id: true, status: true, assignedClerkId: true }
    });

    if (!existingAssessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // 7. Validate clerk assignment
    if (assignedClerkId && assignedClerkId !== 'unassign') {
      const clerk = await prisma.user.findFirst({
        where: { id: assignedClerkId, isClerk: true }
      });

      if (!clerk) {
        return NextResponse.json(
          { error: 'Clerk not found or inactive' },
          { status: 404 }
        );
      }
    }

    // 8. Build update data with proper null handling
    const updateData: any = {
      updatedAt: new Date()
    };

    if (status !== undefined) {
      updateData.status = status;
      
      // Auto-set reviewedAt when marking as completed
      if (status === 'completed') {
        updateData.reviewedAt = new Date();
      }
    }

    if (tier !== undefined) {
      updateData.tier = tier;
    }

    if (assignedClerkId !== undefined) {
      // Handle clerk assignment with proper null handling
      if (assignedClerkId === 'unassign' || assignedClerkId === '') {
        updateData.assignedClerkId = null;
      } else {
        updateData.assignedClerkId = assignedClerkId;
        
        // Auto-set status to in_progress when assigning
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

    // 9. Update assessment
    const updatedAssessment = await prisma.assessment.update({
      where: { id },
      data: updateData,
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
        }
      }
    });

    // 10. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'assessment_updated',
      { 
        assessmentId: id,
        changes: body,
        previousStatus: existingAssessment.status,
        newStatus: updatedAssessment.status,
        previousClerkId: existingAssessment.assignedClerkId,
        newClerkId: updatedAssessment.assignedClerkId,
        timestamp: new Date().toISOString()
      },
      request
    );

    // 11. Return success response
    return NextResponse.json({
      success: true,
      assessment: {
        ...updatedAssessment,
        createdAt: updatedAssessment.createdAt.toISOString(),
        updatedAt: updatedAssessment.updatedAt.toISOString(),
        reviewedAt: updatedAssessment.reviewedAt?.toISOString() || null
      },
      message: 'Assessment updated successfully'
    });

  } catch (error) {
    logger.error('Assessment update API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      assessmentId: (await params).id,
      url: request.url
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Assessment not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update assessment. Please try again later.' },
      { status: 500 }
    );
  }
}

// ===== DELETE - DELETE ASSESSMENT =====
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 10, 60000)) {
      logger.warn('Admin assessment delete rate limit exceeded', { ip: clientIp });
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

    // 3. Validate assessment ID - FIX: Await params
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Assessment ID is required' },
        { status: 400 }
      );
    }

    // 4. Check if assessment exists and get related data
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        payment: true,
        referrals: true
      }
    });

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // 5. Check if safe to delete (no completed payments)
    if (assessment.payment && ['completed', 'successful', 'paid'].includes(assessment.payment.status)) {
      return NextResponse.json(
        { error: 'Cannot delete assessment with completed payment. Cancel or refund first.' },
        { status: 409 }
      );
    }

    // 6. Delete in transaction to ensure atomicity
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

      // Finally delete assessment
      await tx.assessment.delete({
        where: { id }
      });
    });

    // 7. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'assessment_deleted',
      { 
        assessmentId: id,
        assessmentType: assessment.type,
        assessmentStatus: assessment.status,
        hadPayment: !!assessment.payment,
        hadReferrals: assessment.referrals.length > 0,
        timestamp: new Date().toISOString()
      },
      request
    );

    // 8. Return success response
    return NextResponse.json({
      success: true,
      message: 'Assessment deleted successfully'
    });

  } catch (error) {
    logger.error('Assessment delete API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      assessmentId: (await params).id,
      url: request.url
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Assessment not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete assessment. Please try again later.' },
      { status: 500 }
    );
  }
}

// ===== HELPER FUNCTIONS =====
async function getAssessmentActivityHistory(assessmentId: string) {
  try {
    // Get audit logs for this assessment
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { details: { path: ['assessmentId'], equals: assessmentId } },
          { details: { path: ['newAssessmentId'], equals: assessmentId } },
          { details: { path: ['assessmentIds'], array_contains: assessmentId } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
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