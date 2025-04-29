import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

// GET handler to fetch user's assessments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const assessments = await prisma.assessment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json({
      success: true,
      assessments
    });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    return NextResponse.json(
      { 
        message: 'Failed to fetch assessments',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST handler to create a new assessment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Parse request data
    const { type, tier = 'basic' } = await request.json();
    
    if (!type) {
      return NextResponse.json(
        { message: 'Assessment type is required' },
        { status: 400 }
      );
    }

    // Determine price based on tier
    const tierPrices = {
      basic: 50,
      standard: 100,
      premium: 250,
    };

    const price = tierPrices[tier as keyof typeof tierPrices] || 50;
    
    // Convert object to string using JSON.stringify
    const tierData = JSON.stringify({ tier });
    
    // Create assessment
    const assessment = await prisma.assessment.create({
      data: {
        type,
        status: 'pending',
        price,
        data: tierData,
        user: {
          connect: {
            id: session.user.id
          }
        },
        tier
      },
    });

    return NextResponse.json({
      success: true,
      assessment: {
        id: assessment.id,
        type: assessment.type,
        tier: assessment.tier,
        price: assessment.price
      }
    });
  } catch (error) {
    console.error('Error creating assessment:', error);
    return NextResponse.json(
      { 
        message: 'Failed to create assessment',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}