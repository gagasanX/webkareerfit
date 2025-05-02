// app/api/assessment/[type]/[id]/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { createOpenAIClient } from '@/lib/openai-client';

export const runtime = 'edge';
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { type, id } = params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
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

    // Check if assessment is already processed
    if (assessment.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        redirectUrl: `/assessment/${type}/results/${id}`
      });
    }

    // Check if assessment is being processed
    if (assessment.status === 'processing') {
      return NextResponse.json({
        status: 'processing'
      });
    }

    // Check if assessment is in error state
    if (assessment.status === 'error') {
      return NextResponse.json({
        status: 'error',
        error: (assessment.data as any)?.aiError || 'Unknown error'
      });
    }

    // If the assessment is submitted but not yet processed, trigger processing
    if (assessment.status === 'submitted') {
      // For basic tier assessments that need AI processing
      if (!assessment.manualProcessing) {
        console.log(`[process] Starting AI analysis for assessment ${id}`);
        
        // Update status to processing
        await prisma.assessment.update({
          where: { id },
          data: {
            status: 'processing',
            data: {
              ...(assessment.data as any),
              aiAnalysisStarted: true,
              aiAnalysisStartedAt: new Date().toISOString(),
            }
          }
        });
        
        // Trigger the AI processing in the background by making a direct API call
        const baseUrl = request.headers.get('origin') || process.env.NEXTAUTH_URL || '';
        console.log(`[process] Calling AI analysis API at ${baseUrl}/api/ai-analysis`);
        
        try {
          const aiResponse = await fetch(`${baseUrl}/api/ai-analysis`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              assessmentId: id,
              type: type,
              responses: (assessment.data as any)?.answers || {},
            }),
          });
          
          if (!aiResponse.ok) {
            console.error(`[process] AI analysis API returned error: ${aiResponse.status}`);
            const errorData = await aiResponse.json().catch(() => ({}));
            console.error('[process] AI error details:', errorData);
          } else {
            console.log('[process] AI analysis initiated successfully');
          }
        } catch (aiError) {
          console.error('[process] Error calling AI analysis:', aiError);
          // Continue even if API call fails
        }
        
        return NextResponse.json({
          status: 'processing',
          message: 'AI analysis initiated'
        });
      }
    }

    return NextResponse.json({
      status: assessment.status,
    });
  } catch (error) {
    console.error(`[process] Error:`, error);
    return NextResponse.json(
      { message: "Error fetching assessment status", error: String(error) },
      { status: 500 }
    );
  }
}

// POST endpoint for manually triggering reprocessing (useful for retries)
export async function POST(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { type, id } = params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      return NextResponse.json(
        { message: "Assessment not found" },
        { status: 404 }
      );
    }

    if (assessment.userId !== session.user.id && !(session.user as any).isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access to this assessment" },
        { status: 403 }
      );
    }

    // Reset AI analysis fields
    await prisma.assessment.update({
      where: { id },
      data: {
        status: 'submitted',
        data: {
          ...(assessment.data as any),
          aiAnalysisStarted: false,
          aiAnalysisStartedAt: null,
          aiProcessed: false,
          aiProcessedAt: null,
          aiError: null,
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Assessment reset for reprocessing',
      status: 'submitted'
    });
  } catch (error) {
    console.error(`[process] Error:`, error);
    return NextResponse.json(
      { message: "Error resetting assessment", error: String(error) },
      { status: 500 }
    );
  }
}