import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth, logAdminAction, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

// ===== TYPES =====
interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isAdmin: boolean;
  isClerk: boolean;
  isAffiliate: boolean;
  createdAt: string;
  phone: string | null;
  affiliateCode: string | null;
  affiliateType: string | null;
  _count: {
    assessments: number;
    payments: number;
    referrals: number;
  };
}

interface CreateUserData {
  name?: string;
  email: string;
  password: string;
  isAdmin?: boolean;
  isClerk?: boolean;
  isAffiliate?: boolean;
  phone?: string;
  affiliateCode?: string;
  affiliateType?: string;
}

// ===== GET - LIST USERS =====
export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 30, 60000)) {
      logger.warn('Admin users list rate limit exceeded', { ip: clientIp });
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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100); // Max 100 per page
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || 'all'; // all, user, admin, clerk, affiliate
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    // Validate pagination
    const validPage = Math.max(1, page);
    const offset = (validPage - 1) * limit;

    // 4. Build where clause
    const whereClause: Prisma.UserWhereInput = {};

    // Search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { affiliateCode: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Role filter
    switch (role) {
      case 'admin':
        whereClause.isAdmin = true;
        break;
      case 'clerk':
        whereClause.isClerk = true;
        break;
      case 'affiliate':
        whereClause.isAffiliate = true;
        break;
      case 'user':
        whereClause.AND = [
          { isAdmin: false },
          { isClerk: false },
          { isAffiliate: false }
        ];
        break;
      // 'all' - no additional filter
    }

    // 5. Build order by clause
    const validSortFields = ['createdAt', 'name', 'email', 'role'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    let orderBy: Prisma.UserOrderByWithRelationInput = {};
    if (safeSortBy === 'role') {
      // Custom sorting for role - admins first, then clerks, then affiliates, then users
      orderBy = {
        isAdmin: 'desc',
        isClerk: 'desc',
        isAffiliate: 'desc',
        createdAt: 'desc'
      };
    } else {
      orderBy = { [safeSortBy]: safeSortOrder };
    }

    // 6. Fetch users and total count
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isAdmin: true,
          isClerk: true,
          isAffiliate: true,
          createdAt: true,
          phone: true,
          affiliateCode: true,
          affiliateType: true,
          _count: {
            select: {
              assessments: true,
              payments: true,
              referrals: true
            }
          }
        }
      }),
      prisma.user.count({ where: whereClause })
    ]);

    // 7. Format response
    const formattedUsers: User[] = users.map(user => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      _count: user._count
    }));

    const totalPages = Math.ceil(totalCount / limit);

    // 8. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'users_list_view',
      { 
        page: validPage,
        limit,
        search,
        role,
        totalResults: totalCount,
        timestamp: new Date().toISOString()
      },
      request
    );

    // 9. Return success response
    return NextResponse.json({
      success: true,
      users: formattedUsers,
      pagination: {
        currentPage: validPage,
        totalPages,
        totalCount,
        limit,
        hasNext: validPage < totalPages,
        hasPrev: validPage > 1
      },
      metadata: {
        search,
        role,
        sortBy: safeSortBy,
        sortOrder: safeSortOrder
      }
    });

  } catch (error) {
    logger.error('Users list API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    });

    return NextResponse.json(
      { error: 'Failed to fetch users. Please try again later.' },
      { status: 500 }
    );
  }
}

// ===== POST - CREATE USER =====
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 10, 60000)) {
      logger.warn('Admin user creation rate limit exceeded', { ip: clientIp });
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
    const body: CreateUserData = await request.json();
    const {
      name,
      email,
      password,
      isAdmin = false,
      isClerk = false,
      isAffiliate = false,
      phone,
      affiliateCode,
      affiliateType = 'individual'
    } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // 4. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // 5. Check if affiliate code already exists (if provided)
    if (affiliateCode) {
      const existingAffiliateCode = await prisma.user.findUnique({
        where: { affiliateCode }
      });

      if (existingAffiliateCode) {
        return NextResponse.json(
          { error: 'Affiliate code already exists' },
          { status: 409 }
        );
      }
    }

    // 6. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Determine role
    let role = 'USER';
    if (isAdmin) role = 'ADMIN';
    else if (isClerk) role = 'CLERK';
    else if (isAffiliate) role = 'AFFILIATE';

    // 8. Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        isAdmin,
        isClerk,
        isAffiliate,
        phone,
        affiliateCode: isAffiliate ? affiliateCode : null,
        affiliateType: isAffiliate ? affiliateType : null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isAdmin: true,
        isClerk: true,
        isAffiliate: true,
        createdAt: true,
        phone: true,
        affiliateCode: true,
        affiliateType: true
      }
    });

    // 9. Create affiliate stats if user is affiliate
    if (isAffiliate) {
      await prisma.affiliateStats.create({
        data: {
          userId: newUser.id,
          totalReferrals: 0,
          totalEarnings: 0,
          totalPaid: 0
        }
      });
    }

    // 10. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'user_created',
      { 
        newUserId: newUser.id,
        newUserEmail: newUser.email,
        newUserRole: role,
        timestamp: new Date().toISOString()
      },
      request
    );

    // 11. Return success response
    return NextResponse.json({
      success: true,
      user: {
        ...newUser,
        createdAt: newUser.createdAt.toISOString()
      },
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    logger.error('User creation API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];
        if (target?.includes('email')) {
          return NextResponse.json(
            { error: 'Email already exists' },
            { status: 409 }
          );
        }
        if (target?.includes('affiliateCode')) {
          return NextResponse.json(
            { error: 'Affiliate code already exists' },
            { status: 409 }
          );
        }
      }
    }

    return NextResponse.json(
      { error: 'Failed to create user. Please try again later.' },
      { status: 500 }
    );
  }
}