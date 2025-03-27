// app/api/assessment/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

// GET handler to fetch user's assessments
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const assessments = await prisma.assessment.findMany({
      where: { userId: session.user.id },
      include: { payment: true },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(assessments);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}

// POST handler to create a new assessment
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { type, tier } = await request.json();
    
    // Determine price based on tier
    let price = 50; // Default to basic tier price
    if (tier === 'standard') price = 100;
    if (tier === 'premium') price = 250;
    
    // Create assessment
    const assessment = await prisma.assessment.create({
      data: {
        type,
        status: 'pending',
        price,
        data: { tier }, // Store tier in the data JSON field
        user: { connect: { id: session.user.id } },
      },
    });
    
    // Create pending payment record
    await prisma.payment.create({
      data: {
        amount: price,
        method: 'pending',
        status: 'pending',
        user: { connect: { id: session.user.id } },
        assessment: { connect: { id: assessment.id } },
      },
    });
    
    return NextResponse.json(assessment);
  } catch (error) {
    console.error('Error creating assessment:', error);
    return NextResponse.json(
      { error: 'Failed to create assessment' },
      { status: 500 }
    );
  }
}