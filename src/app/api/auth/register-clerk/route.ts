import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

const CLERK_REGISTRATION_CODE = "987654321ZaqXsw!@#";

export async function POST(request: NextRequest) {
  try {
    // Get registration data
    const data = await request.json();
    const { name, email, password, registrationCode } = data;

    // Validate required fields
    if (!name || !email || !password || !registrationCode) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Verify registration code
    if (registrationCode !== CLERK_REGISTRATION_CODE) {
      return NextResponse.json(
        { message: 'Invalid registration code' },
        { status: 403 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with clerk role
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isClerk: true, // Mark as clerk
        role: "CLERK" // Also update the role field
      }
    });

    // Remove sensitive data from response
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      message: 'Clerk registered successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error during clerk registration:', error);
    return NextResponse.json(
      { message: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}