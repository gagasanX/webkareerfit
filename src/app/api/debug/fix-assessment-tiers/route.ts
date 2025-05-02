// app/api/debug/fix-assessment-tiers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Ensure only admins can run this
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.isAdmin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    // Get all assessments
    const assessments = await prisma.assessment.findMany({
      include: { payment: true }
    });
    
    const results = [];
    
    // Process each assessment
    for (const assessment of assessments) {
      // Determine if manual processing should be enabled based on tier/price
      const shouldBeManualProcessing = 
        assessment.tier === 'standard' || 
        assessment.tier === 'premium' || 
        assessment.price >= 100;
      
      // If the flag is wrong, update it
      if (assessment.manualProcessing !== shouldBeManualProcessing) {
        await prisma.assessment.update({
          where: { id: assessment.id },
          data: { manualProcessing: shouldBeManualProcessing }
        });
        
        results.push({
          id: assessment.id,
          tier: assessment.tier,
          price: assessment.price,
          manualProcessingWas: assessment.manualProcessing,
          manualProcessingNow: shouldBeManualProcessing
        });
      }
      
      // Check if status needs to be updated based on tier/price and payment status
      if (assessment.payment && assessment.payment.status === 'completed') {
        let updatedStatus = assessment.status;
        let statusChanged = false;
        
        // For manual processing tiers with 'in_progress' status, fix to 'pending_review'
        if (shouldBeManualProcessing && assessment.status === 'in_progress') {
          updatedStatus = 'pending_review';
          statusChanged = true;
        }
        // For basic tier with 'pending_review' status, fix to 'in_progress'
        else if (!shouldBeManualProcessing && assessment.status === 'pending_review') {
          updatedStatus = 'in_progress';
          statusChanged = true;
        }
        
        // If status needs to be updated
        if (statusChanged) {
          await prisma.assessment.update({
            where: { id: assessment.id },
            data: { status: updatedStatus }
          });
          
          // Add to results
          const existingResult = results.find(r => r.id === assessment.id);
          if (existingResult) {
            existingResult.statusWas = assessment.status;
            existingResult.statusNow = updatedStatus;
          } else {
            results.push({
              id: assessment.id,
              tier: assessment.tier,
              price: assessment.price,
              statusWas: assessment.status,
              statusNow: updatedStatus
            });
          }
        }
      }
    }
    
    return NextResponse.json({
      message: `Fixed ${results.length} assessments`,
      fixedAssessments: results
    });
  } catch (error) {
    console.error('Error fixing assessment tiers:', error);
    return NextResponse.json({ 
      message: 'Error fixing assessment tiers',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Add GET endpoint to check for potential issues without fixing
export async function GET(request: NextRequest) {
  try {
    // Ensure only admins can run this
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.isAdmin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    // Get assessments with potential issues
    const assessments = await prisma.assessment.findMany({
      where: {
        OR: [
          { tier: 'standard', manualProcessing: false },
          { tier: 'premium', manualProcessing: false },
          { price: { gte: 100 }, manualProcessing: false },
          {
            AND: [
              { tier: 'standard' },
              { status: 'in_progress' }
            ]
          },
          {
            AND: [
              { tier: 'premium' },
              { status: 'in_progress' }
            ]
          },
          {
            AND: [
              { price: { gte: 100 } },
              { status: 'in_progress' }
            ]
          }
        ]
      },
      include: { payment: true }
    });
    
    return NextResponse.json({
      message: `Found ${assessments.length} assessments with potential issues`,
      assessments: assessments.map(a => ({
        id: a.id,
        tier: a.tier,
        price: a.price,
        status: a.status,
        manualProcessing: a.manualProcessing,
        paymentStatus: a.payment?.status || 'none'
      }))
    });
  } catch (error) {
    console.error('Error checking assessment tiers:', error);
    return NextResponse.json({ 
      message: 'Error checking assessment tiers',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}