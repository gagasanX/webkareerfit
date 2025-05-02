// app/api/assessment/[type]/[id]/update-tier/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

// Define valid tier types
type TierType = 'basic' | 'standard' | 'premium';

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
    const data = await request.json();
    const tier = data.tier as TierType;
    
    if (!tier) {
      return NextResponse.json(
        { message: 'Missing tier information' },
        { status: 400 }
      );
    }

    // Validate tier
    const validTiers: TierType[] = ['basic', 'standard', 'premium'];
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
      include: {
        payment: true
      }
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

    // Determine price based on tier - properly typed
    const tierPrices: Record<TierType, number> = {
      basic: 50,
      standard: 100,
      premium: 250,
    };

    const price = tierPrices[tier];

    // Set manualProcessing based on tier
    const manualProcessing = tier === 'standard' || tier === 'premium';

    // Update the assessment with the selected tier and price
    const updatedAssessment = await prisma.assessment.update({
      where: {
        id: id,
      },
      data: {
        tier: tier,
        price: price,
        manualProcessing,
        data: {
          ...(assessment.data as Record<string, any> || {}),
          tier,
        },
      },
    });

    // Update any associated payment
    if (assessment.payment) {
      await prisma.payment.update({
        where: { id: assessment.payment.id },
        data: { amount: price },
      });
    }

    console.log(`Updated assessment ${id} with tier: ${tier}, price: ${price}, manualProcessing: ${manualProcessing}`);

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