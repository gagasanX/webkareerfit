import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/auth';

export async function GET(req: Request) {
  try {
    // Check authentication and clerk role
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a clerk or admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || (!user.isClerk && !user.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    const type = url.searchParams.get('type') || 'all';

    // Calculate pagination
    const limit = 10;
    const skip = (page - 1) * limit;

    // Build query conditions
    const where: any = {};

    // Filter by status if provided
    if (status !== 'all') {
      where.status = status;
    }

    // Filter by type if provided
    if (type !== 'all') {
      where.type = type;
    }

    // Filter to only show manual review assessments (price 100 or 250)
    where.price = { in: [100, 250] };

    // Add search condition if provided
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    // Get assigned assessments
    const assignedWhere = {
      ...where,
      assignedClerkId: session.user.id,
    };

    // Get unassigned assessments
    const unassignedWhere = {
      ...where,
      assignedClerkId: null,
      status: 'pending_review',
    };

    // Execute queries
    const [assigned, unassigned, totalAssigned, totalUnassigned] = await Promise.all([
      prisma.assessment.findMany({
        where: assignedWhere,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.assessment.findMany({
        where: unassignedWhere,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.assessment.count({ where: assignedWhere }),
      prisma.assessment.count({ where: unassignedWhere }),
    ]);

    return NextResponse.json({
      assigned,
      unassigned,
      pagination: {
        totalAssigned,
        totalUnassigned,
        currentPage: page,
        totalPages: Math.max(
          Math.ceil(totalAssigned / limit),
          Math.ceil(totalUnassigned / limit)
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}