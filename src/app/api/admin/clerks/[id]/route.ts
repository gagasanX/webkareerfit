// src/app/api/admin/clerks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

interface Params {
  params: {
    id: string;
  };
}

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
    
    // Get the user
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
    });
    
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    // Remove clerk permissions - Use role: 'USER' instead of isClerk: false
    const updatedUser = await prisma.user.update({
      where: {
        id,
      },
      data: {
        role: 'USER',
      },
    });
    
    return NextResponse.json({
      message: 'Clerk permissions have been removed',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    console.error('Error removing clerk permissions:', error);
    return NextResponse.json(
      { message: 'An error occurred while processing the request' },
      { status: 500 }
    );
  }
}