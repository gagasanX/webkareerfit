import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/auth';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { clerkId } = await req.json();
    
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Check if assessment exists
    const assessment = await prisma.assessment.findUnique({
      where: { id }
    });
    
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    // If clerkId is provided, verify the clerk exists
    if (clerkId) {
      const clerk = await prisma.user.findFirst({
        where: { 
          id: clerkId,
          isClerk: true,
        }
      });
      
      if (!clerk) {
        return NextResponse.json({ error: 'Clerk not found' }, { status: 404 });
      }
    }
    
    // Reassign the assessment
    const updatedAssessment = await prisma.assessment.update({
      where: { id },
      data: {
        assignedClerkId: clerkId || null,
        status: clerkId ? 'in_review' : 'pending_review', // If unassigning, set back to pending
        reviewedAt: null,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: clerkId 
        ? `Assessment reassigned successfully` 
        : 'Assessment unassigned and returned to pool',
      assessment: updatedAssessment,
    });
  } catch (error) {
    console.error('Error reassigning assessment:', error);
    return NextResponse.json(
      { error: 'Failed to reassign assessment' },
      { status: 500 }
    );
  }
}