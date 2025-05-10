// src/app/api/admin/clerks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

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
    
    // Find users with clerk role using custom where condition 
    // to work around TypeScript issues
    const whereCondition: any = {
      role: 'CLERK',
    };
    
    if (search) {
      whereCondition.OR = [
        { id: { contains: search } },
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }
    
    // Find clerks
    const clerks = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            assessments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format clerks and include assessment count
    const formattedClerks = clerks.map(clerk => ({
      id: clerk.id,
      name: clerk.name,
      email: clerk.email,
      createdAt: clerk.createdAt,
      assessmentCount: clerk._count.assessments,
    }));

    return NextResponse.json({
      clerks: formattedClerks,
    });
  } catch (error) {
    console.error('Error fetching clerks:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching clerks' },
      { status: 500 }
    );
  }
}

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
    const { email, makeClerk } = body;
    
    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }
    
    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    
    if (existingUser) {
      // Update existing user to make them a clerk
      if (makeClerk) {
        // Use any to work around TypeScript issues
        const updateData: any = {
          role: 'CLERK',
        };
        
        const updatedUser = await prisma.user.update({
          where: {
            id: existingUser.id,
          },
          data: updateData,
        });
        
        return NextResponse.json({
          message: 'Existing user has been granted clerk permissions',
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
          },
        });
      } else {
        return NextResponse.json({ 
          message: 'User already exists but was not made a clerk' 
        });
      }
    } else {
      // Create new user with clerk permissions
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Use any to work around TypeScript issues
      const createData: any = {
        email,
        password: hashedPassword,
        role: makeClerk ? 'CLERK' : 'USER',
      };
      
      const newUser = await prisma.user.create({
        data: createData,
      });
      
      return NextResponse.json({
        message: 'New clerk account created',
        user: {
          id: newUser.id,
          email: newUser.email,
        },
        temporaryPassword: tempPassword,
      });
    }
  } catch (error) {
    console.error('Error creating/updating clerk:', error);
    return NextResponse.json(
      { message: 'An error occurred while processing the request' },
      { status: 500 }
    );
  }
}