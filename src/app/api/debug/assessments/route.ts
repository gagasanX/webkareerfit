// src/app/api/debug/assessments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

// GET endpoint to list all assessment IDs - useful for debugging
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if user is admin or retrieve only their assessments
    const isAdmin = (session.user as any).isAdmin;
    const userId = session.user.id;
    
    // Get the assessment ID from the query parameter
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    // If ID is provided, get details for that assessment
    if (id) {
      console.log(`Debugging assessment: ${id}`);

      // Get assessment with all data
      const assessment = await prisma.assessment.findUnique({
        where: { id },
        include: {
          user: { 
            select: { 
              id: true, 
              name: true, 
              email: true 
            } 
          },
          payment: true
        }
      });

      if (!assessment) {
        return NextResponse.json(
          { error: 'Assessment not found' },
          { status: 404 }
        );
      }

      // Verify user is admin or owns this assessment
      if (assessment.userId !== userId && !isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Check OpenAI configuration
      const openaiConfigured = !!process.env.OPENAI_API_KEY;
      
      // Debug info
      const debugInfo = {
        assessmentId: assessment.id,
        assessmentType: assessment.type,
        status: assessment.status,
        userId: assessment.userId,
        userName: assessment.user?.name,
        paymentStatus: assessment.payment?.status,
        dataKeys: Object.keys(assessment.data || {}),
        aiAnalysisInfo: {
          aiProcessed: (assessment.data as any)?.aiProcessed || false,
          aiProcessedAt: (assessment.data as any)?.aiProcessedAt,
          aiAnalysisStarted: (assessment.data as any)?.aiAnalysisStarted || false,
          aiError: (assessment.data as any)?.aiError,
          hasScores: !!(assessment.data as any)?.scores,
          hasRecommendations: !!(assessment.data as any)?.recommendations,
          hasStrengths: !!(assessment.data as any)?.strengths,
          hasImprovements: !!(assessment.data as any)?.improvements,
        },
        openaiConfigured,
        currentTimestamp: new Date().toISOString()
      };

      return NextResponse.json(debugInfo);
    }
    
    // Otherwise, list all assessments the user has access to
    const assessments = await prisma.assessment.findMany({
      where: isAdmin ? undefined : { userId },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    // Check OpenAI configuration
    const openaiConfigured = !!process.env.OPENAI_API_KEY;
    
    return NextResponse.json({
      assessments,
      openaiConfigured,
      totalCount: assessments.length,
      message: 'To debug a specific assessment, use ?id=assessmentId in the URL'
    });
  } catch (error) {
    console.error('Error in assessment debug endpoint:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST endpoint to reset AI analysis for an assessment
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const { id, action } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Assessment ID required' },
        { status: 400 }
      );
    }
    
    console.log(`Debug action "${action}" for assessment: ${id}`);

    // Get assessment data
    const assessment = await prisma.assessment.findUnique({
      where: { id }
    });

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Verify user owns this assessment or is admin
    const isAdmin = (session.user as any).isAdmin;
    if (assessment.userId !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check OpenAI configuration
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    if (action === 'reset-ai') {
      // Reset AI analysis flags
      await prisma.assessment.update({
        where: { id },
        data: {
          data: {
            ...(assessment.data as any),
            aiProcessed: false,
            aiProcessedAt: null,
            aiAnalysisStarted: false,
            aiAnalysisStartedAt: null,
            aiError: null
          }
        }
      });
      
      return NextResponse.json({
        message: 'AI analysis flags reset. Refresh the results page to trigger analysis.'
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in assessment debug action:', error);
    return NextResponse.json(
      { error: 'Action failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}