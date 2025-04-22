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

    // Check if user exists and is an admin
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isAdmin: true
      }
    });

    // Return whether user is an admin
    return NextResponse.json({
      isAdmin: user?.isAdmin || false
    });
  } catch (error) {
    console.error('Error checking if user is an admin:', error);
    return NextResponse.json(
      { message: 'An error occurred while checking admin status' },
      { status: 500 }
    );
  }
}