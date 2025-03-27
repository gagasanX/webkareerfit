import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { type, id } = params;
    
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        payment: true,
        // You can include other relations here if needed
      },
    });
    
    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }
    
    // Check if this assessment belongs to the authenticated user
    if (assessment.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(assessment);
  } catch (error) {
    console.error('Error fetching assessment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment' },
      { status: 500 }
    );
  }
}

// PUT handler to update assessment
export async function PUT(
  request: Request,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { type, id } = params;
    const updateData = await request.json();
    
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
    
    // Check if this assessment belongs to the authenticated user
    if (assessment.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Create a safe data object for the update
    // Avoid using the spread operator directly on assessment.data 
    // if it could potentially be null or not an object
    const currentData = assessment.data || {};
    
    // Ensure data is an object before spreading
    const updatedData = typeof currentData === 'object'
      ? { ...currentData, ...updateData.data }
      : updateData.data;
    
    // Update assessment
    const updatedAssessment = await prisma.assessment.update({
      where: { id },
      data: {
        // Only update fields that are provided
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.type && { type: updateData.type }),
        ...(updateData.price && { price: updateData.price }),
        // Use the safely created data object
        data: updatedData,
      },
    });
    
    return NextResponse.json(updatedAssessment);
  } catch (error) {
    console.error('Error updating assessment:', error);
    return NextResponse.json(
      { error: 'Failed to update assessment' },
      { status: 500 }
    );
  }
}