import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Get email from request
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists and is a clerk
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isClerk: true
      }
    });

    // Return whether user is a clerk
    return NextResponse.json({
      isClerk: user?.isClerk || false
    });
  } catch (error) {
    console.error('Error checking if user is a clerk:', error);
    return NextResponse.json(
      { message: 'An error occurred while checking clerk status' },
      { status: 500 }
    );
  }
}