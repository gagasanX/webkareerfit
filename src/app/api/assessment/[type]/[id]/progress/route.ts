// app/api/assessment/[type]/processing/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { getOpenAIClient } from '@/lib/openai';

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
        // Trigger the AI processing in the background by making a request
        const baseUrl = process.env.NEXTAUTH_URL || request.headers.get('origin') || 'http://localhost:3000';
        
        fetch(`${baseUrl}/api/ai-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assessmentId: id,
            type: type,
            responses: (assessment.data as any)?.answers || {},
          }),
        }).catch(err => {
          console.error('Failed to trigger AI analysis:', err);
        });
        
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
    console.error("Error fetching assessment status:", error);
    return NextResponse.json(
      { message: "Error fetching assessment status", error: String(error) },
      { status: 500 }
    );
  }
}