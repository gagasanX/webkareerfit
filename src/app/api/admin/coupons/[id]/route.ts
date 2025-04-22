import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

interface Params {
  params: {
    id: string;
  };
}

// GET - Retrieve a specific coupon by ID
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    
    // Check user authentication and admin permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user is an admin
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Find the coupon
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            payments: true
          }
        },
        payments: {
          take: 5,
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    if (!coupon) {
      return NextResponse.json({ message: 'Coupon not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      coupon
    });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching the coupon' },
      { status: 500 }
    );
  }
}

// PATCH - Update a coupon
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    
    // Check user authentication and admin permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user is an admin
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Get the coupon
    const coupon = await prisma.coupon.findUnique({
      where: { id }
    });
    
    if (!coupon) {
      return NextResponse.json({ message: 'Coupon not found' }, { status: 404 });
    }
    
    // Parse request body
    const body = await request.json();
    const {
      code,
      discountPercentage,
      maxDiscount,
      expiresAt,
      maxUses
    } = body;
    
    // Prepare update data
    const updateData: any = {};
    
    // Only update fields that are provided
    if (code !== undefined) {
      // Check if the new code already exists (if it's different from current)
      if (code !== coupon.code) {
        const existingCoupon = await prisma.coupon.findUnique({
          where: { code }
        });
        
        if (existingCoupon) {
          return NextResponse.json({ message: 'Coupon code already exists' }, { status: 400 });
        }
      }
      
      updateData.code = code;
    }
    
    if (discountPercentage !== undefined) {
      if (discountPercentage <= 0 || discountPercentage > 100) {
        return NextResponse.json({ message: 'Discount percentage must be between 1 and 100' }, { status: 400 });
      }
      updateData.discountPercentage = Number(discountPercentage);
    }
    
    if (maxDiscount !== undefined) {
      updateData.maxDiscount = maxDiscount === null ? null : Number(maxDiscount);
    }
    
    if (expiresAt !== undefined) {
      const expiryDate = new Date(expiresAt);
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json({ message: 'Invalid expiry date' }, { status: 400 });
      }
      updateData.expiresAt = expiryDate;
    }
    
    if (maxUses !== undefined) {
      if (maxUses <= 0) {
        return NextResponse.json({ message: 'Maximum uses must be greater than 0' }, { status: 400 });
      }
      updateData.maxUses = Number(maxUses);
    }
    
    // Update the coupon
    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json({
      message: 'Coupon updated successfully',
      coupon: updatedCoupon
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { message: 'An error occurred while updating the coupon' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a coupon
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    
    // Check user authentication and admin permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user is an admin
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Check if coupon exists
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            payments: true
          }
        }
      }
    });
    
    if (!coupon) {
      return NextResponse.json({ message: 'Coupon not found' }, { status: 404 });
    }
    
    // Check if coupon has been used
    if (coupon._count.payments > 0) {
      return NextResponse.json({ 
        message: 'Cannot delete coupon that has been used in payments',
        suggestion: 'Consider setting the expiry date to past instead'
      }, { status: 400 });
    }
    
    // Delete the coupon
    await prisma.coupon.delete({
      where: { id }
    });
    
    return NextResponse.json({
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { message: 'An error occurred while deleting the coupon' },
      { status: 500 }
    );
  }
}