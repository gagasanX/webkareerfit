import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check user authentication and clerk permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user has clerk or admin role - PERBAIKAN
    if (!session.user.isClerk && !session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Get query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const type = url.searchParams.get('type') || '';
    const pageSize = 10;
    
    // Build filters
    const filters: any = {};
    
    // Add status filter
    if (status && status !== 'all') {
      filters.status = status;
    }
    
    // Add type filter
    if (type && type !== 'all') {
      filters.type = type;
    }
    
    // Add search filter (search by user email, name, or assessment ID)
    if (search) {
      filters.OR = [
        { id: { contains: search } },
        { user: { email: { contains: search } } },
        { user: { name: { contains: search } } },
      ];
    }
    
    // Count total matching assessments
    const totalAssessments = await prisma.assessment.count({
      where: filters,
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalAssessments / pageSize);
    
    // Fetch assessments with pagination
    const assessments = await prisma.assessment.findMany({
      where: filters,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      assessments,
      currentPage: page,
      totalPages,
      totalAssessments,
    });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching assessments' },
      { status: 500 }
    );
  }
}