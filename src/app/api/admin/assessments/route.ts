import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    
    // Calculate pagination
    const skip = page * limit;
    
    // Build the query
    const where: any = {};
    
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { title: { contains: search } },
        { type: { contains: search } },
        { user: { name: { contains: search } } },
      ];
    }
      
    // Fetch assessments with pagination
    const [assessments, totalCount] = await Promise.all([
      prisma.assessment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.assessment.count({ where }),
    ]);
    
    // Transform the data to simplify the structure
    const formattedAssessments = assessments.map((assessment: any) => ({
      id: assessment.id,
      type: assessment.type,
      title: assessment.title || `${assessment.type} Assessment`,
      status: assessment.status,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
      completedAt: assessment.completedAt,
      tier: assessment.tier,
      userId: assessment.userId,
      userName: assessment.user?.name || assessment.user?.email || 'Unknown',
      userEmail: assessment.user?.email,
    }));
    
    return NextResponse.json({
      assessments: formattedAssessments,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
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