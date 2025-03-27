// app/api/assessment/[type]/[id]/submit/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

interface AssessmentAnswers {
  [key: string]: any;
}

interface PersonalInfo {
  [key: string]: any;
}

export async function POST(
  request: Request,
  { params }: { params: { type: string, id: string } }
) {
  try {
    console.log('Submit endpoint called with params:', params);
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { type, id: assessmentId } = params;
    
    // Parse request body
    let requestBody: any;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }
    
    // Extract answers and personal info
    let answers: AssessmentAnswers = {};
    let personalInfo: PersonalInfo = {};
    
    if (requestBody.answers) {
      answers = requestBody.answers;
    } else if (requestBody.formData) {
      const { personalInfo: personInfo, ...rest } = requestBody.formData;
      answers = rest;
      personalInfo = personInfo || {};
    } else {
      answers = requestBody;
    }
    
    // Get assessment from database
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        payment: true,
        user: true,
      },
    });
    
    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }
    
    if (assessment.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Prepare assessment data
    const currentData = assessment.data as Record<string, any> || {};
    
    // First, save the assessment with processing status
    const initialData = {
      ...currentData,
      answers: {
        ...(currentData.answers as Record<string, any> || {}),
        ...answers
      },
      personalInfo: {
        ...(currentData.personalInfo as Record<string, any> || {}),
        ...personalInfo
      },
      submittedAt: new Date().toISOString(),
    };
    
    // Update assessment with processing status
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'processing',
        data: initialData,
      },
    });
    
    // Return success response immediately to client
    const responseData = {
      message: 'Assessment submitted successfully. Results are being processed.',
      redirectTo: `/assessment/${assessment.type}/processing/${assessmentId}`
    };
    
    // Start background processing
    processAssessmentInBackground(assessmentId, type, answers, personalInfo, session);
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error submitting assessment:', error);
    return NextResponse.json(
      { error: 'Failed to submit assessment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Background processing function
async function processAssessmentInBackground(
  assessmentId: string, 
  assessmentType: string, 
  answers: AssessmentAnswers, 
  personalInfo: PersonalInfo,
  session: any
) {
  try {
    console.log(`Starting background processing for assessment ${assessmentId}`);
    
    // Get the assessment from the database
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    });
    
    if (!assessment) {
      console.error('Assessment not found during background processing');
      return;
    }
    
    const currentData = assessment.data as Record<string, any> || {};
    
    // Call AI analysis API
    console.log('Calling AI analyzer in background...');
    let aiAnalysis;
    
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const aiResponse = await fetch(`${baseUrl}/api/ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentType,
          answers,
          personalInfo,
          userId: session.user.id, // Pass user ID for authentication
        }),
      });
      
      if (!aiResponse.ok) {
        throw new Error(`AI analysis failed with status: ${aiResponse.status}`);
      }
      
      const aiData = await aiResponse.json();
      aiAnalysis = aiData.analysis;
      console.log('AI analysis received successfully in background');
    } catch (aiError) {
      console.error('Error getting AI analysis in background:', aiError);
      
      // Fallback to standard analysis if AI fails
      const defaultScores: Record<string, number> = {};
      Object.keys(answers).forEach(key => {
        defaultScores[key] = 70;
      });
      defaultScores.overallScore = 70;
      
      aiAnalysis = {
        scores: defaultScores,
        recommendations: [
          "Continue to develop your professional skills and knowledge.",
          "Seek mentorship opportunities in your field of interest.",
          "Build a strong professional network to enhance career opportunities.",
          "Stay updated with industry trends and technologies.",
          "Consider pursuing relevant certifications to validate your skills."
        ],
        summary: "Assessment completed successfully. For detailed insights, check the category scores.",
        strengths: [],
        improvements: []
      };
    }
    
    // Update data with AI analysis
    const updatedData = {
      ...currentData,
      scores: aiAnalysis.scores || {},
      recommendations: aiAnalysis.recommendations || [],
      summary: aiAnalysis.summary || '',
      strengths: aiAnalysis.strengths || [],
      improvements: aiAnalysis.improvements || [],
      completedAt: new Date().toISOString(),
    };
    
    // Update assessment
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'completed',
        data: updatedData,
      },
    });
    
    console.log('Assessment updated successfully with AI analysis in background');
  } catch (error) {
    console.error('Error in background processing:', error);
    
    // Update assessment to error state
    try {
      // Fetch the assessment first to avoid the reference error
      const failedAssessment = await prisma.assessment.findUnique({
        where: { id: assessmentId }
      });
      
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'error',
          data: {
            ...(failedAssessment?.data as Record<string, any> || {}),
            processingError: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      });
    } catch (updateError) {
      console.error('Failed to update assessment with error status:', updateError);
    }
  }
}