// src/app/api/assessment/[type]/results/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { openai } from '@/lib/openai';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { type, id } = params;
    console.log(`Fetching results for assessment: ${type}/${id}`);

    // Get assessment data with user info
    const assessment = await prisma.assessment.findUnique({
      where: {
        id: id,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Verify user owns this assessment
    if (assessment.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if AI analysis needs to be run
    const data = assessment.data as any;
    const needsAnalysis = !data?.aiProcessed && 
                          process.env.OPENAI_API_KEY && 
                          !data?.aiProcessedAt;
    
    // If analysis is needed and not already in progress (no analysis timestamp)
    if (needsAnalysis) {
      console.log('AI analysis needed, triggering analysis process');
      
      // Get the answers and personal info from assessment data
      const answers = data?.answers || {};
      const personalInfo = data?.personalInfo || {};
      
      // Run AI analysis in background
      runAiAnalysis(assessment.id, type, answers, personalInfo, session.user.id)
        .catch(err => console.error('Error during AI analysis:', err));
        
      // Set a flag to indicate analysis is in progress
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: {
          data: {
            ...data,
            aiAnalysisStarted: true,
            aiAnalysisStartedAt: new Date().toISOString()
          }
        }
      });
      
      console.log('Analysis job started and flagged in database');
    }

    // Return assessment with properly structured data for the results display
    return NextResponse.json(assessment);
  } catch (error) {
    console.error('Error fetching assessment results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment results', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Function to run AI analysis
async function runAiAnalysis(
  assessmentId: string, 
  assessmentType: string, 
  answers: Record<string, any>, 
  personalInfo: Record<string, any>,
  userId: string
) {
  try {
    console.log(`Running AI analysis for assessment: ${assessmentId}`);
    
    // Call the AI analysis endpoint
    const response = await fetch(new URL('/api/ai-analysis', process.env.NEXTAUTH_URL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assessmentId,
        assessmentType,
        answers,
        personalInfo,
        userId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI Analysis failed: ${errorData.error || response.status}`);
    }
    
    const result = await response.json();
    
    // Update assessment with analysis results
    const updatedAssessment = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        data: {
          // Preserve existing data
          answers,
          personalInfo,
          // Add AI analysis data
          scores: result.analysis.scores,
          recommendations: result.analysis.recommendations,
          summary: result.analysis.summary,
          strengths: result.analysis.strengths,
          improvements: result.analysis.improvements,
          // Mark as processed
          aiProcessed: true,
          aiProcessedAt: new Date().toISOString()
        }
      }
    });
    
    console.log(`AI analysis completed for assessment: ${assessmentId}`);
    return updatedAssessment;
  } catch (error) {
    console.error('Error in AI analysis:', error);
    
    // Update assessment to indicate analysis failed
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        data: {
          aiProcessed: false,
          aiError: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    });
    
    throw error;
  }
}