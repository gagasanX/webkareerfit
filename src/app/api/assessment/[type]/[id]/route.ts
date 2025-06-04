// app/api/assessment/[type]/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { Assessment } from "@prisma/client";

// Define interface for Assessment data JSON structure
interface AssessmentData {
  responses?: Record<string, any>;
  submittedAt?: string;
  aiAnalysisStarted?: boolean;
  aiAnalysisStartedAt?: string;
  aiError?: string;
  tier?: string;
  affiliateId?: string | null;
  [key: string]: any; // Allow for other properties
}

// CRITICAL FIX: Proper Next.js 15 async params handling
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // FIXED: Properly await params for Next.js 15
    const resolvedParams = await params;
    const { type, id } = resolvedParams;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        payment: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { message: "Assessment not found" },
        { status: 404 }
      );
    }

    if (assessment.userId !== session.user.id) {
      return NextResponse.json(
        { message: "Unauthorized access to this assessment" },
        { status: 403 }
      );
    }

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("Error fetching assessment:", error);
    return NextResponse.json(
      { message: "Error fetching assessment", error: String(error) },
      { status: 500 }
    );
  }
}

// CRITICAL FIX: Proper Next.js 15 async params handling
export async function POST(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIXED: Properly await params for Next.js 15
    const resolvedParams = await params;
    const { type, id } = resolvedParams;
    
    const { responses } = await request.json();

    // Get assessment to check package price and processing type
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { user: true, payment: true },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // CRITICAL FIX: Double-check manualProcessing flag based on tier and price
    const shouldBeManualProcessing = assessment.tier === 'standard' || 
                                   assessment.tier === 'premium' || 
                                   assessment.price >= 100;
                                   
    // If manualProcessing flag doesn't match what it should be, update it
    if (assessment.manualProcessing !== shouldBeManualProcessing) {
      console.log(`Fixing manualProcessing flag for assessment ${assessment.id}: was ${assessment.manualProcessing}, should be ${shouldBeManualProcessing}`);
      
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { manualProcessing: shouldBeManualProcessing }
      });
      
      // Update our local reference too
      assessment.manualProcessing = shouldBeManualProcessing;
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

    // Log assessment details for debugging
    console.log(`Assessment submitted: ${id} - Type: ${type}, Tier: ${assessment.tier}, Price: ${assessment.price}, Manual: ${assessment.manualProcessing}`);

    // CRITICAL FIX: Determine processing path based on tier/price, not just manualProcessing flag
    if (assessment.tier === 'standard' || assessment.tier === 'premium' || assessment.price >= 100) {
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

// Process with AI (typically RM50 tier) - SIMPLIFIED VERSION
async function processWithAI(assessment: Assessment, type: string) {
  try {
    console.log(`Starting simplified AI processing for assessment ${assessment.id} (${type})`);
    
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

    // Call the simplified AI analysis endpoint and WAIT for results (synchronous)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    console.log(`Calling simplified AI analysis endpoint: ${apiUrl}/api/ai-analysis for assessment ${assessment.id}`);
    
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
      const errorData = await aiResponse.json().catch(() => ({}));
      console.error(`AI processing failed with status ${aiResponse.status}:`, errorData);
      throw new Error(`AI processing failed: ${errorData.error || aiResponse.status}`);
    }

    // Parse the AI response
    const aiResponseData = await aiResponse.json();
    
    console.log(`AI processing completed successfully for assessment ${assessment.id}`);
    
    // Direct to results page immediately (not processing page)
    const redirectUrl = `/assessment/${type}/results/${assessment.id}`;
    
    return NextResponse.json({
      success: true,
      message: 'Assessment processed successfully',
      redirectUrl: redirectUrl,
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
      { error: 'AI processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Queue assessment for manual review (RM100 and RM250 tiers)
async function queueForManualReview(assessment: Assessment) {
  try {
    console.log(`Starting manual review process for assessment ${assessment.id} (${assessment.tier} tier)`);
    
    // Update assessment status to pending review
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { 
        status: 'pending_review',
        manualProcessing: true,  // Ensure the manual processing flag is set
      },
    });

    // CRITICAL FIX: Determine the appropriate redirect URL based on tier with explicit checks
    let redirectUrl;
    
    // Explicit tier checks first, then fall back to price checks
    if (assessment.tier === 'premium') {
      redirectUrl = `/assessment/${assessment.type}/premium-results/${assessment.id}`;
      console.log(`Premium tier detected - Redirecting to: ${redirectUrl}`);
    } 
    else if (assessment.tier === 'standard') {
      redirectUrl = `/assessment/${assessment.type}/standard-results/${assessment.id}`;
      console.log(`Standard tier detected - Redirecting to: ${redirectUrl}`);
    }
    // Fallback checks based on price
    else if (assessment.price >= 250) {
      redirectUrl = `/assessment/${assessment.type}/premium-results/${assessment.id}`;
      console.log(`Premium price detected (RM${assessment.price}) - Redirecting to: ${redirectUrl}`);
    } 
    else if (assessment.price >= 100) {
      redirectUrl = `/assessment/${assessment.type}/standard-results/${assessment.id}`;
      console.log(`Standard price detected (RM${assessment.price}) - Redirecting to: ${redirectUrl}`);
    }
    // Final fallback
    else {
      redirectUrl = `/assessment/${assessment.type}/results/${assessment.id}`;
      console.log(`Default tier - Redirecting to: ${redirectUrl}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Assessment submitted for expert review',
      redirectUrl: redirectUrl,
    });
  } catch (error: unknown) {
    console.error('Error queueing for manual review:', error);
    return NextResponse.json(
      { error: 'Failed to queue assessment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}