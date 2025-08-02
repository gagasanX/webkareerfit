// src/app/api/assessment/[type]/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const { type, id } = params;
    
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get the current assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });
    
    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }
    
    // Check if assessment type matches
    if (assessment.type !== type) {
      return NextResponse.json(
        { error: 'Assessment type mismatch' },
        { status: 400 }
      );
    }
    
    // Check if this assessment belongs to the authenticated user
    if (assessment.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Check if assessment can be cancelled (not already completed)
    if (assessment.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed assessment' },
        { status: 400 }
      );
    }
    
    // Update assessment status to cancelled
    const updatedAssessment = await prisma.assessment.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
    });
    
    return NextResponse.json({
      message: 'Assessment cancelled successfully',
      assessment: updatedAssessment
    });
  } catch (error) {
    console.error('Error cancelling assessment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel assessment' },
      { status: 500 }
    );
  }
}