// src/app/api/clerk/users/route.ts
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
    
    // Ensure user has clerk or admin role
    if (session.user.role !== 'CLERK' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Get query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const search = url.searchParams.get('search') || '';
    const pageSize = 10;
    
    // Build filters
    const filters: any = {
      role: 'USER', // Only get regular users, not clerks or admins
    };
    
    // Add search filter (search by email, name, or user ID)
    if (search) {
      filters.OR = [
        { id: { contains: search } },
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }
    
    // Count total matching users
    const totalUsers = await prisma.user.count({
      where: filters,
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / pageSize);
    
    // Fetch users with pagination
    const users = await prisma.user.findMany({
      where: filters,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        assessments: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Format users and include assessment count
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      assessmentCount: user.assessments.length,
    }));

    return NextResponse.json({
      users: formattedUsers,
      currentPage: page,
      totalPages,
      totalUsers,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching users' },
      { status: 500 }
    );
  }
}