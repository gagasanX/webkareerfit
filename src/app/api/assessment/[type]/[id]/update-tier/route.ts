import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    console.log('Update tier API called');
    
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('Unauthorized access attempt');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { type, id } = params;
    
    // Parse request data
    let requestData;
    try {
      requestData = await request.json();
      console.log('Request data:', JSON.stringify(requestData));
    } catch (jsonError) {
      console.error('Failed to parse request JSON:', jsonError);
      return NextResponse.json({ message: 'Invalid request data' }, { status: 400 });
    }
    
    const { tier } = requestData;
    
    if (!tier) {
      console.log('Missing required field: tier');
      return NextResponse.json({ message: 'Missing required field: tier' }, { status: 400 });
    }
    
    // Validate tier
    if (!['basic', 'standard', 'premium'].includes(tier)) {
      return NextResponse.json({ message: 'Invalid tier. Must be basic, standard, or premium' }, { status: 400 });
    }
    
    // Verify assessment exists and belongs to user
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });
    
    if (!assessment) {
      return NextResponse.json({ message: 'Assessment not found' }, { status: 404 });
    }
    
    if (assessment.userId !== userId) {
      return NextResponse.json({ message: 'You do not own this assessment' }, { status: 403 });
    }
    
    // Determine price based on tier
    const tierPrices = {
      basic: 50,       // Basic Analysis
      standard: 100,   // Basic Report
      premium: 250     // Full Report + Interview
    };
    
    const price = tierPrices[tier as keyof typeof tierPrices] || 50;
    
    // Update assessment tier and price
    const updatedAssessment = await prisma.assessment.update({
      where: { id },
      data: {
        tier,
        price,
      },
    });
    
    // If there's an existing payment, update it
    const existingPayment = await prisma.payment.findUnique({
      where: { assessmentId: id },
    });
    
    if (existingPayment && existingPayment.status === 'pending') {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: { amount: price },
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Assessment tier updated successfully',
      assessment: updatedAssessment
    });
  } catch (error) {
    console.error('Error updating assessment tier:', error);
    return NextResponse.json({ 
      message: 'Failed to update assessment tier',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}