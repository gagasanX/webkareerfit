// src/app/api/auth/check-clerk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';

export async function POST(request: NextRequest) {
  try {
    // Get the current session if available (for secure checks)
    const session = await getServerSession(authOptions);
    
    // Get email from request
    const { email, userId } = await request.json();

    // Validate input - need either email or userId
    if (!email && !userId) {
      return NextResponse.json(
        { message: 'Email or userId is required' },
        { status: 400 }
      );
    }

    // Basic email validation if email is provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // If user is checking their own status, we allow more data to be returned
    const isSelfCheck = session?.user?.email === email || session?.user?.id === userId;

    // Query conditions
    const where = email 
      ? { email } 
      : { id: userId };

    // Select fields (more data for self-check)
    const select = {
      id: true,
      isClerk: true,
      isAdmin: true,
      ...(!isSelfCheck ? {} : {
        name: true,
        email: true,
        role: true,
        createdAt: true
      })
    };

    // Check if user exists and is a clerk
    const user = await prisma.user.findUnique({
      where,
      select
    });

    if (!user) {
      return NextResponse.json({
        isClerk: false,
        isAdmin: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Return whether user is a clerk or admin (admin can also access clerk features)
    const responseData = {
      isClerk: user.isClerk || user.isAdmin,
      isAdmin: user.isAdmin,
      userId: user.id,
      ...(!isSelfCheck ? {} : {
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      })
    };

    // Create the response with rate limiting headers to prevent abuse
    const response = NextResponse.json(responseData);
    
    // Add rate limiting headers
    response.headers.set('X-RateLimit-Limit', '20');
    response.headers.set('X-RateLimit-Remaining', '19');

    return response;
    
  } catch (error) {
    console.error('Error checking clerk status:', error);
    return NextResponse.json(
      { 
        message: 'An error occurred while checking clerk status',
        isClerk: false,
        isAdmin: false,
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

// Add GET endpoint to allow checking current user's clerk status
export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the current user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        isClerk: true,
        isAdmin: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json({
        isClerk: false,
        isAdmin: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Return user's clerk status and basic profile info
    return NextResponse.json({
      isClerk: user.isClerk || user.isAdmin,
      isAdmin: user.isAdmin,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    });
    
  } catch (error) {
    console.error('Error checking current user clerk status:', error);
    return NextResponse.json(
      { 
        message: 'An error occurred while checking clerk status',
        isClerk: false,
        isAdmin: false,
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}