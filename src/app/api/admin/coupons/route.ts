import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

// GET - Fetch all coupons
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
    
    // Get query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    
    // Prepare filters
    const where: any = {};
    
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Fetch coupons
    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            payments: true
          }
        }
      }
    });
    
    return NextResponse.json({
      coupons,
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching coupons' },
      { status: 500 }
    );
  }
}

// POST - Create a new coupon
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
    const { code, discountPercentage, maxDiscount, expiresAt, maxUses } = body;
    
    // Validate required fields
    if (!code) {
      return NextResponse.json({ message: 'Coupon code is required' }, { status: 400 });
    }
    
    if (!discountPercentage || discountPercentage <= 0 || discountPercentage > 100) {
      return NextResponse.json({ message: 'Valid discount percentage (1-100) is required' }, { status: 400 });
    }
    
    if (!expiresAt) {
      return NextResponse.json({ message: 'Expiry date is required' }, { status: 400 });
    }
    
    // Validate expiry date
    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime()) || expiryDate < new Date()) {
      return NextResponse.json({ message: 'Valid future expiry date is required' }, { status: 400 });
    }
    
    // Check if coupon code already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code }
    });
    
    if (existingCoupon) {
      return NextResponse.json({ message: 'Coupon code already exists' }, { status: 400 });
    }
    
    // Create new coupon
    const newCoupon = await prisma.coupon.create({
      data: {
        code,
        discountPercentage: Number(discountPercentage),
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        expiresAt: expiryDate,
        maxUses: Number(maxUses) || 100,
        currentUses: 0
      }
    });
    
    return NextResponse.json({
      message: 'Coupon created successfully',
      coupon: newCoupon
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { message: 'An error occurred while creating the coupon' },
      { status: 500 }
    );
  }
}

// DELETE - Delete all expired coupons
export async function DELETE(request: NextRequest) {
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
    
    // Delete expired coupons
    const result = await prisma.coupon.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
    
    return NextResponse.json({
      message: `${result.count} expired coupons deleted successfully`,
      count: result.count
    });
  } catch (error) {
    console.error('Error deleting expired coupons:', error);
    return NextResponse.json(
      { message: 'An error occurred while deleting expired coupons' },
      { status: 500 }
    );
  }
}