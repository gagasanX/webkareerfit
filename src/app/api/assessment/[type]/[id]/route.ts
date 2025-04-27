// src/app/api/assessment/[type]/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/auth';
import { Assessment } from '@prisma/client';

// Define interface for Assessment data JSON structure
interface AssessmentData {
  responses?: Record<string, any>;
  submittedAt?: string;
  aiAnalysisStarted?: boolean;
  aiAnalysisStartedAt?: string;
  aiError?: string;
  [key: string]: any; // Allow for other properties
}

// POST endpoint for submitting an assessment
export async function POST(
  request: Request,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id } = params;
    const { responses } = await request.json();

    // Get assessment to check package price and processing type
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Update assessment with user responses
    const updatedAssessment = await prisma.assessment.update({
      where: { id },
      data: {
        data: {
          ...(assessment.data as object || {}),
          responses,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    // Determine processing path based on manual processing flag or price
    if (assessment.manualProcessing || assessment.price >= 100) {
      // For manual processing packages - queue for manual review
      return await queueForManualReview(updatedAssessment);
    } else {
      // For AI processed packages - process with AI
      return await processWithAI(updatedAssessment, type);
    }
  } catch (error: unknown) {
    console.error('Error processing assessment:', error);
    return NextResponse.json(
      { error: 'Failed to process assessment' },
      { status: 500 }
    );
  }
}

// Process with AI (typically RM50 tier)
async function processWithAI(assessment: Assessment, type: string) {
  try {
    // Update status to processing
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { 
        status: 'processing',
        data: {
          ...(assessment.data as object || {}),
          aiAnalysisStarted: true,
          aiAnalysisStartedAt: new Date().toISOString(),
        }
      },
    });

    // Safely extract responses from data with proper typing
    const assessmentData = assessment.data as AssessmentData | null;
    const responses = assessmentData?.responses || {};

    // Call your existing AI analysis endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const aiResponse = await fetch(`${apiUrl}/api/ai-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId: assessment.id,
        type: type,
        responses: responses,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('AI processing failed');
    }

    return NextResponse.json({
      success: true,
      message: 'Assessment submitted for AI processing',
      redirectUrl: `/assessment/${type}/processing/${assessment.id}`,
    });
  } catch (error: unknown) {
    console.error('AI processing error:', error);
    
    // Update status to error
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { 
        status: 'error',
        data: {
          ...(assessment.data as object || {}),
          aiError: error instanceof Error ? error.message : String(error),
        }
      },
    });

    return NextResponse.json(
      { error: 'AI processing failed' },
      { status: 500 }
    );
  }
}

// Queue assessment for manual review (RM100 and RM250 tiers)
async function queueForManualReview(assessment: Assessment) {
  try {
    // Update assessment status to pending review
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { 
        status: 'pending_review',
        manualProcessing: true,  // Ensure the manual processing flag is set
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Assessment submitted for expert review',
      redirectUrl: `/assessment/${assessment.type}/results/${assessment.id}`,
    });
  } catch (error: unknown) {
    console.error('Error queueing for manual review:', error);
    return NextResponse.json(
      { error: 'Failed to queue assessment' },
      { status: 500 }
    );
  }
}