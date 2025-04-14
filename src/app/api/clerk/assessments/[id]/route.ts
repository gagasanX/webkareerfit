// src/app/api/clerk/assessments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    
    // Check user authentication and clerk permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user has clerk or admin role
    if (session.user.role !== 'CLERK' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Fetch assessment with user information
    const assessment = await prisma.assessment.findUnique({
      where: {
        id: id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            coupon: {
              select: {
                code: true,
                discountPercentage: true,
              },
            },
          },
        },
      },
    });
    
    if (!assessment) {
      return NextResponse.json({ message: 'Assessment not found' }, { status: 404 });
    }
    
    return NextResponse.json({ assessment });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching the assessment' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    
    // Check user authentication and clerk permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user has clerk or admin role
    if (session.user.role !== 'CLERK' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Update allowable fields only (clerks can only update status and tier)
    const updateData: any = {};
    
    if (body.status) {
      updateData.status = body.status;
    }
    
    if (body.tier) {
      updateData.tier = body.tier;
    }
    
    // Perform update
    const updatedAssessment = await prisma.assessment.update({
      where: {
        id: id,
      },
      data: updateData,
    });
    
    return NextResponse.json({ 
      message: 'Assessment updated successfully',
      assessment: updatedAssessment,
    });
  } catch (error) {
    console.error('Error updating assessment:', error);
    return NextResponse.json(
      { message: 'An error occurred while updating the assessment' },
      { status: 500 }
    );
  }
}