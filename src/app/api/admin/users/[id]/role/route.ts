import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

interface Params {
  params: {
    id: string;
  };
}

// PATCH - Update user role
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
    
    // Prevent admin from modifying their own admin role to avoid lockout
    if (id === session.user.id) {
      return NextResponse.json({ 
        message: 'Cannot modify your own admin status' 
      }, { status: 403 });
    }
    
    // Get the user
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    // Parse request body
    const body = await request.json();
    const { role, value } = body;
    
    // Validate required fields
    if (!role || (typeof value !== 'boolean')) {
      return NextResponse.json({ message: 'Role name and boolean value are required' }, { status: 400 });
    }
    
    // Check if role is valid
    if (!['isAdmin', 'isClerk', 'isAffiliate'].includes(role)) {
      return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
    }
    
    // Update user role
    const updateData: any = {
      [role]: value
    };
    
    // If making user an admin/clerk/affiliate, update the role field too
    if (value) {
      const roleMapping: Record<string, string> = {
        'isAdmin': 'ADMIN',
        'isClerk': 'CLERK',
        'isAffiliate': 'AFFILIATE'
      };
      
      updateData.role = roleMapping[role];
    } else {
      // If removing a role, check if any other special roles remain
      const hasOtherRoles = (role !== 'isAdmin' && user.isAdmin) || 
                            (role !== 'isClerk' && user.isClerk) || 
                            (role !== 'isAffiliate' && user.isAffiliate);
      
      // If no other special roles, set role back to USER
      if (!hasOtherRoles) {
        updateData.role = 'USER';
      }
    }
    
    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    return NextResponse.json({
      message: 'User role updated successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { message: 'An error occurred while updating user role' },
      { status: 500 }
    );
  }
}