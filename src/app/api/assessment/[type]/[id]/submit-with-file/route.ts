// app/api/assessment/[type]/[id]/submit-with-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { saveFormDataWithFile } from '@/lib/upload';

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  console.log('Submit-with-file endpoint called with params:', params);
  
  // Check if params exist
  if (!params || typeof params.id !== 'string' || typeof params.type !== 'string') {
    console.error('Invalid parameters:', params);
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }
  
  const assessmentId = params.id.trim();
  const assessmentType = params.type.trim();
  
  console.log(`Processing assessment ID: "${assessmentId}" of type: "${assessmentType}"`);
  
  try {
    // Find assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    
    if (!assessment) {
      console.error('Assessment not found with ID:', assessmentId);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (assessment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    // Parse form data
    const { fields, filePath } = await saveFormDataWithFile(request);
    
    let formData;
    try {
      formData = JSON.parse(fields.formData);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid form data format' }, { status: 400 });
    }
    
    // Extract form components
    const { personalInfo, ...answers } = formData;
    
    // Create a new data object safely
    const newData: Record<string, any> = {};
    
    // Safely add existing data if it exists
    if (assessment.data && typeof assessment.data === 'object') {
      Object.assign(newData, assessment.data as Record<string, any>);
    }
    
    // Add new data
    newData.personalInfo = personalInfo;
    newData.answers = answers;
    newData.resumePath = filePath || undefined; // Changed from null to undefined to fix type error
    newData.submittedAt = new Date().toISOString();
    newData.analysisStatus = 'waiting'; // Mark explicitly that analysis hasn't started yet
    
    // Update assessment with submitted data
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'submitted',  // Use 'submitted' instead of 'completed'
        data: newData
      }
    });
    
    // Start background processing
    processAssessmentInBackground(assessmentId, assessmentType, answers, personalInfo, session, filePath);
    
    // Return response to user immediately with a special URL for the waiting/loading page
    return NextResponse.json({
      message: 'Assessment submitted successfully',
      redirectTo: `/assessment/${assessmentType}/processing/${assessmentId}`
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Background processing function
async function processAssessmentInBackground(
  assessmentId: string, 
  assessmentType: string, 
  answers: Record<string, any>, 
  personalInfo: Record<string, any>,
  session: any,
  filePath?: string
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
    
    // Update assessment to processing status
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'processing',
        data: {
          ...currentData,
          analysisStatus: 'processing',
          processingStartedAt: new Date().toISOString()
        }
      }
    });
    
    // Call AI analysis API with improved error handling and retry logic
    console.log('Calling AI analyzer in background...');
    let aiAnalysis;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        
        // Add cache-busting parameter and specify format
        const timestamp = new Date().getTime();
        
        // Prepare the payload
        const payload: Record<string, any> = {
          assessmentId,
          assessmentType,
          answers,
          personalInfo,
          userId: session.user.id,
          forceRealAI: true  // Add flag to force real AI analysis
        };
        
        // Add file path if available
        if (filePath) {
          payload.filePath = filePath;
        }
        
        const aiResponse = await fetch(`${baseUrl}/api/ai-analysis?_t=${timestamp}&format=json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',  // Explicitly request JSON response
            'X-Force-JSON-Response': 'true'  // Custom header to force JSON response
          },
          body: JSON.stringify(payload),
        });
        
        // Check response type before parsing
        const contentType = aiResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error(`Received non-JSON response: ${contentType}`);
          throw new Error(`AI analysis returned non-JSON response: ${contentType}`);
        }
        
        if (!aiResponse.ok) {
          throw new Error(`AI analysis failed with status: ${aiResponse.status}`);
        }
        
        const aiData = await aiResponse.json();
        
        // Validate the response has the expected structure
        if (!aiData.analysis || !aiData.analysis.scores) {
          throw new Error('AI analysis response missing required data structure');
        }
        
        aiAnalysis = aiData.analysis;
        console.log('AI analysis received successfully in background');
        break; // Success, exit retry loop
      } catch (aiError) {
        retryCount++;
        console.error(`Error getting AI analysis (attempt ${retryCount}/${maxRetries}):`, aiError);
        
        if (retryCount < maxRetries) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // All retries failed, use fallback
          console.error('All AI analysis attempts failed, using fallback');
          
          // Fallback to standard analysis if AI fails
          const defaultScores: Record<string, number> = {};
          Object.keys(answers).forEach(key => {
            defaultScores[key] = 70;
          });
          defaultScores.overallScore = 70;
          
          // Determine readiness level based on score
          let readinessLevel = "Early Development";
          if (defaultScores.overallScore >= 85) readinessLevel = "Fully Prepared";
          else if (defaultScores.overallScore >= 70) readinessLevel = "Approaching Readiness";
          else if (defaultScores.overallScore >= 50) readinessLevel = "Developing Competency";
          
          aiAnalysis = {
            scores: defaultScores,
            readinessLevel: readinessLevel,
            recommendations: [
              "Continue to develop your professional skills and knowledge.",
              "Seek mentorship opportunities in your field of interest.",
              "Build a strong professional network to enhance career opportunities.",
              "Stay updated with industry trends and technologies.",
              "Consider pursuing relevant certifications to validate your skills."
            ],
            summary: "Assessment completed successfully. For detailed insights, check the category scores.",
            strengths: [
              "Shows dedication to professional development",
              "Demonstrates self-awareness of career needs",
              "Takes initiative in seeking assessment and guidance"
            ],
            improvements: [
              "Develop more specific goals aligned with career aspirations",
              "Seek additional training or education in key skill areas",
              "Build a stronger professional network in your field"
            ],
            usedFallback: true,  // Mark explicitly that fallback was used
            fallbackReason: "AI analysis failed after multiple retries"
          };
        }
      }
    }
    
    // Update data with AI analysis
    const updatedData = {
      ...currentData,
      scores: aiAnalysis.scores || {},
      readinessLevel: aiAnalysis.readinessLevel || "Early Development",
      recommendations: aiAnalysis.recommendations || [],
      summary: aiAnalysis.summary || '',
      strengths: aiAnalysis.strengths || [],
      improvements: aiAnalysis.improvements || [],
      completedAt: new Date().toISOString(),
      aiProcessed: true,
      aiProcessedAt: new Date().toISOString(),
      analysisStatus: 'completed',
      usedFallback: aiAnalysis.usedFallback || false,  // Track if fallback was used
      fallbackReason: aiAnalysis.fallbackReason || null
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
            analysisStatus: 'error',
            processingError: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      });
    } catch (updateError) {
      console.error('Failed to update assessment with error status:', updateError);
    }
  }
}
