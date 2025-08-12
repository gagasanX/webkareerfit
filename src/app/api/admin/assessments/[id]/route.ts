/* ------------------------------------------------------------------ */
/*  src/app/api/admin/assessments/[id]/route.ts – 100 % complete       */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Cached fetcher                                                    */
/* ------------------------------------------------------------------ */
const getCachedAssessmentDetail = unstable_cache(
  async (id: string): Promise<AssessmentDetail | null> => {
    if (!id.match(/^[a-z0-9]{25}$/)) return null;

    const a = await prisma.assessment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
        assignedClerk: { select: { id: true, name: true, email: true } },
        payment: {
          select: {
            id: true, amount: true, status: true, method: true, gatewayPaymentId: true,
            createdAt: true, updatedAt: true,
          },
        },
        referrals: {
          include: { affiliate: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!a) return null;

    return {
      id: a.id,
      type: a.type,
      tier: a.tier,
      status: a.status,
      price: Number(a.price) || 0,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      reviewedAt: a.reviewedAt?.toISOString() || null,
      reviewNotes: a.reviewNotes || null,
      manualProcessing: Boolean(a.manualProcessing),
      data: a.data,
      user: {
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        phone: a.user.phone,
        createdAt: a.user.createdAt.toISOString(),
      },
      assignedClerk: a.assignedClerk
        ? { id: a.assignedClerk.id, name: a.assignedClerk.name, email: a.assignedClerk.email, assignedAt: a.updatedAt.toISOString() }
        : null,
      payment: a.payment
        ? {
            id: a.payment.id,
            amount: Number(a.payment.amount) || 0,
            status: a.payment.status,
            method: a.payment.method,
            gatewayPaymentId: a.payment.gatewayPaymentId,
            createdAt: a.payment.createdAt.toISOString(),
            updatedAt: a.payment.updatedAt.toISOString(),
          }
        : null,
      referrals: a.referrals.map((r) => ({
        id: r.id,
        affiliateId: r.affiliateId,
        affiliateName: r.affiliate?.name || null,
        affiliateEmail: r.affiliate?.email || 'Unknown',
        commission: Number(r.commission) || 0,
        status: r.status,
        paidOut: Boolean(r.paidOut),
        createdAt: r.createdAt.toISOString(),
      })),
    };
  },
  ['assessment-detail'],
  { revalidate: 300, tags: ['assessment-detail'] }
);

/* ------------------------------------------------------------------ */
/*  Activity history                                                  */
/* ------------------------------------------------------------------ */
async function getActivityHistory(assessmentId: string) {
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { details: { path: ['assessmentId'], equals: assessmentId } },
        { details: { path: ['newAssessmentId'], equals: assessmentId } },
        { details: { path: ['assessmentIds'], array_contains: assessmentId } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, eventType: true, details: true, ipAddress: true, userAgent: true, createdAt: true },
  });

  return logs.map((l) => ({
    id: l.id,
    eventType: l.eventType,
    details: l.details,
    ipAddress: l.ipAddress,
    userAgent: l.userAgent,
    createdAt: l.createdAt.toISOString(),
  }));
}

/* ------------------------------ GET ------------------------------- */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 100, 60000))
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const auth = await validateAdminAuth(request);
    if (!auth.success) return auth.error!;

    const { id } = await params;
    if (!id.match(/^[a-z0-9]{25}$/))
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const [assessment, activity] = await Promise.all([
      getCachedAssessmentDetail(id),
      getActivityHistory(id),
    ]);
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ assessment, activity });
  } catch (err) {
    logger.error('GET /admin/assessments/:id error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ------------------------------ PATCH ----------------------------- */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 50, 60000))
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const auth = await validateAdminAuth(request);
    if (!auth.success) return auth.error!;

    const { id } = await params;
    if (!id.match(/^[a-z0-9]{25}$/))
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const body: UpdateAssessmentData = await request.json();
    const { status, tier, assignedClerkId, reviewNotes, manualProcessing, price } = body;

    if (status && !['pending', 'in_progress', 'completed', 'cancelled'].includes(status))
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    if (tier && !['basic', 'standard', 'premium'].includes(tier))
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });

    if (price !== undefined && (price < 0 || price > 10000))
      return NextResponse.json({ error: 'Price out of range' }, { status: 400 });

    const existing = await prisma.assessment.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updateData: any = { updatedAt: new Date() };
    if (status !== undefined) updateData.status = status;
    if (tier !== undefined) updateData.tier = tier;
    if (assignedClerkId !== undefined) updateData.assignedClerkId = assignedClerkId === 'unassign' ? null : assignedClerkId;
    if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes || null;
    if (manualProcessing !== undefined) updateData.manualProcessing = manualProcessing;
    if (price !== undefined) updateData.price = price;

    const updated = await prisma.assessment.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, assessment: updated });
  } catch (err) {
    logger.error('PATCH /admin/assessments/:id error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ------------------------------ DELETE ---------------------------- */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 20, 60000))
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const auth = await validateAdminAuth(request);
    if (!auth.success) return auth.error!;

    const { id } = await params;
    if (!id.match(/^[a-z0-9]{25}$/))
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        status: true,
        payment: { select: { id: true, status: true } },
        _count: { select: { referrals: true } },
      },
    });
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // safety check
    if (assessment.payment && ['completed', 'successful', 'paid'].includes(assessment.payment.status))
      return NextResponse.json({ error: 'Cannot delete assessment with completed payment' }, { status: 409 });

    await prisma.$transaction(async (tx) => {
      await tx.referral.deleteMany({ where: { assessmentId: id } });
      if (assessment.payment) await tx.payment.delete({ where: { id: assessment.payment.id } });
      await tx.assessment.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'Assessment deleted' });
  } catch (err) {
    logger.error('DELETE /admin/assessments/:id error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}