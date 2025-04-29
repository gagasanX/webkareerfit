import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { type, id } = params;
    
    if (!type || !id) {
      return NextResponse.json(
        { message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Extract the tier from the request body
    const { tier, manualProcessing } = await request.json();
    
    if (!tier) {
      return NextResponse.json(
        { message: 'Missing tier information' },
        { status: 400 }
      );
    }

    // Validate tier
    const validTiers = ['basic', 'standard', 'premium'];
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { message: 'Invalid tier selection' },
        { status: 400 }
      );
    }

    // Find the assessment
    const assessment = await prisma.assessment.findUnique({
      where: {
        id: id,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { message: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Ensure the assessment belongs to the user
    if (assessment.userId !== session.user.id) {
      return NextResponse.json(
        { message: 'You do not have permission to update this assessment' },
        { status: 403 }
      );
    }

    // Determine price based on tier
    const tierPrices = {
      basic: 50,
      standard: 100,
      premium: 250,
    };

    const price = tierPrices[tier as keyof typeof tierPrices];

    // Set manualProcessing based on tier
    // Standard and Premium tiers (RM100 and RM250) use manual processing
    const useManualProcessing = tier === 'standard' || tier === 'premium';

    // Update the assessment with the selected tier and price
    const updatedAssessment = await prisma.assessment.update({
      where: {
        id: id,
      },
      data: {
        tier: tier,
        price: price,
        manualProcessing: useManualProcessing
      },
    });

    console.log(`Updated assessment ${id} with tier: ${tier}, price: ${price}, manualProcessing: ${useManualProcessing}`);

    return NextResponse.json({
      success: true,
      assessment: updatedAssessment,
    });
  } catch (error) {
    console.error('Error updating assessment tier:', error);
    return NextResponse.json(
      { 
        message: 'Failed to update assessment tier',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}