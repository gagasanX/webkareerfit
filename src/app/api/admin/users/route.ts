import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import * as bcrypt from 'bcrypt';

// GET - Fetch users with pagination and filters
export async function GET(request: NextRequest) {
  try {
    // Check user authentication and admin permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user is an admin
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const role = url.searchParams.get('role') || 'all';
    
    // Prepare filters
    const where: any = {};
    
    // Add search filter if provided
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }
    
    // Add role filter if provided
    if (role !== 'all') {
      switch (role) {
        case 'admin':
          where.isAdmin = true;
          break;
        case 'clerk':
          where.isClerk = true;
          break;
        case 'affiliate':
          where.isAffiliate = true;
          break;
        case 'user':
          where.isAdmin = false;
          where.isClerk = false;
          where.isAffiliate = false;
          break;
      }
    }
    
    // Get total count for pagination
    const totalCount = await prisma.user.count({ where });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // Fetch users with pagination
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isAdmin: true,
        isClerk: true,
        isAffiliate: true,
        createdAt: true,
        _count: {
          select: {
            assessments: true,
            payments: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    
    return NextResponse.json({
      users,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching users' },
      { status: 500 }
    );
  }
}

// POST - Create a new user
export async function POST(request: NextRequest) {
  try {
    // Check user authentication and admin permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user is an admin
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const { name, email, password, role, isAdmin, isClerk, isAffiliate } = body;
    
    // Validate required fields
    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }
    
    if (!password) {
      return NextResponse.json({ message: 'Password is required' }, { status: 400 });
    }
    
    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Determine role values
    const userIsAdmin = isAdmin === true;
    const userIsClerk = isClerk === true;
    const userIsAffiliate = isAffiliate === true;
    
    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || 'USER',
        isAdmin: userIsAdmin,
        isClerk: userIsClerk,
        isAffiliate: userIsAffiliate,
      }
    });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;
    
    return NextResponse.json({
      message: 'User created successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { message: 'An error occurred while creating the user' },
      { status: 500 }
    );
  }
}