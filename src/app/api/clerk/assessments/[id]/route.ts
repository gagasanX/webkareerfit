import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/auth';

// Get assessment details
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a clerk or admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || (!user.isClerk && !user.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id },
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
          include: {
            coupon: true,
          },
        },
        assignedClerk: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment' },
      { status: 500 }
    );
  }
}

// Update assessment status or assign to clerk
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a clerk or admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || (!user.isClerk && !user.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, reviewNotes } = await req.json();

    // Get the assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Handle different actions
    if (action === 'accept') {
      // Check if already assigned
      if (assessment.assignedClerkId && assessment.assignedClerkId !== session.user.id) {
        return NextResponse.json({
          error: 'This assessment has already been assigned to another clerk'
        }, { status: 400 });
      }
      
      // Assign to this clerk
      const updatedAssessment = await prisma.assessment.update({
        where: { id },
        data: {
          assignedClerkId: session.user.id,
          status: 'in_review',
          reviewStartedAt: new Date(),
        },
      });
      
      return NextResponse.json({
        success: true,
        message: 'Assessment accepted for review',
        assessment: updatedAssessment,
      });
    } 
    else if (action === 'submit_review') {
      // Submit review for assessment
      // First check if this clerk is assigned to the assessment or is an admin
      if (assessment.assignedClerkId !== session.user.id && !user.isAdmin) {
        return NextResponse.json({
          error: 'You are not assigned to this assessment'
        }, { status: 403 });
      }
      
      if (!reviewNotes || reviewNotes.trim() === '') {
        return NextResponse.json({
          error: 'Review notes are required'
        }, { status: 400 });
      }
      
      // Update with review notes
      const updatedAssessment = await prisma.assessment.update({
        where: { id },
        data: {
          status: 'completed',
          reviewNotes,
          reviewCompletedAt: new Date(),
          data: {
            ...(assessment.data as object || {}),
            reviewedBy: user.name || user.email,
            reviewNotes,
            reviewDate: new Date().toISOString(),
          }
        },
      });
      
      return NextResponse.json({
        success: true,
        message: 'Review submitted successfully',
        assessment: updatedAssessment,
      });
    }
    
    return NextResponse.json({
      error: 'Invalid action'
    }, { status: 400 });
  } catch (error) {
    console.error('Error updating assessment:', error);
    return NextResponse.json(
      { error: 'Failed to update assessment' },
      { status: 500 }
    );
  }
}