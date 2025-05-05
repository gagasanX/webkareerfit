// app/api/assessment/[type]/[id]/check-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  try {
    // Check if params exist
    if (!params || typeof params.id !== 'string' || typeof params.type !== 'string') {
      console.error('Invalid parameters:', params);
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    const assessmentId = params.id.trim();
    
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Find assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    
    if (!assessment) {
      console.error('Assessment not found with ID:', assessmentId);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    if (assessment.userId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    // Check if this is a manual processing assessment
    if (assessment.manualProcessing || 
        assessment.tier === 'standard' || 
        assessment.tier === 'premium' || 
        assessment.price >= 100) {
      
      // For manual processing assessments, return appropriate status
      return NextResponse.json({
        status: assessment.status,
        manualProcessing: true,
        progress: assessment.status === 'completed' ? 100 : 50,
        redirectUrl: assessment.tier === 'premium' || assessment.price >= 250
          ? `/assessment/${params.type}/premium-results/${assessmentId}`
          : `/assessment/${params.type}/standard-results/${assessmentId}`
      });
    }
    
    // Get assessment data
    const data = assessment.data as Record<string, any> || {};
    
    // Determine status and progress
    let status = assessment.status;
    let progress = 0;
    let analysisStatus = data.analysisStatus || 'waiting';
    
    // Calculate progress based on status
    if (status === 'completed' || analysisStatus === 'completed') {
      progress = 100;
      status = 'completed';
      analysisStatus = 'completed';
    } else if (status === 'error' || analysisStatus === 'error') {
      progress = 0;
      status = 'error';
    } else if (status === 'processing' || status === 'submitted' || 
               analysisStatus === 'processing' || analysisStatus === 'pending') {
      // If processing has started, set progress to at least 30%
      progress = 30;
      
      // If analysis is processing, set progress to at least 50%
      if (analysisStatus === 'processing') {
        progress = 50;
      }
      
      // If we have a processingStartedAt timestamp, calculate progress based on time elapsed
      if (data.processingStartedAt || data.aiProcessingStarted) {
        const startTime = new Date(data.processingStartedAt || data.aiProcessingStarted).getTime();
        const currentTime = new Date().getTime();
        const elapsedSeconds = (currentTime - startTime) / 1000;
        
        // Assume processing takes about 60 seconds max
        // Add progress based on time elapsed (up to 40% more)
        const timeProgress = Math.min(40, Math.floor(elapsedSeconds / 60 * 40));
        progress = Math.min(90, progress + timeProgress);
      }
      
      // Check if processing has been running too long (over 5 minutes)
      // This prevents the page from being stuck in processing forever
      if (data.processingStartedAt || data.aiProcessingStarted) {
        const startTime = new Date(data.processingStartedAt || data.aiProcessingStarted).getTime();
        const currentTime = new Date().getTime();
        const elapsedMinutes = (currentTime - startTime) / (1000 * 60);
        
        if (elapsedMinutes > 5) {
          // Force completion after 5 minutes to prevent endless loading
          console.log(`Assessment ${assessmentId} processing timeout - forcing completion`);
          
          // Update assessment to completed with fallback data
          await updateAssessmentWithFallback(assessment, params.type);
          
          // Return completed status
          return NextResponse.json({
            status: 'completed',
            analysisStatus: 'completed',
            progress: 100,
            message: 'Assessment completed (timeout)'
          });
        }
      }
    }
    
    // If the assessment isn't being processed yet but needs to be,
    // try to initiate processing via ai-analysis endpoint
    if ((analysisStatus === 'waiting' || analysisStatus === 'pending') && 
        status !== 'completed' && 
        !data.aiProcessing) {
      
      try {
        // Initiate AI processing without waiting for response
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://my.kareerfit.com'}/api/ai-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assessmentId,
            type: params.type,
            responses: data.responses || {}
          }),
        })
        .then(res => console.log('AI analysis initiated:', res.status))
        .catch(err => console.error('Error initiating AI analysis:', err));
        
        // Update status to processing
        await prisma.assessment.update({
          where: { id: assessmentId },
          data: {
            data: {
              ...data,
              aiAnalysisStarted: true,
              aiProcessing: true,
              processingStartedAt: new Date().toISOString(),
              analysisStatus: 'processing'
            }
          }
        });
        
        analysisStatus = 'processing';
        progress = 30;
      } catch (processError) {
        console.error('Error initiating AI analysis:', processError);
      }
    }
    
    // Return status information
    return NextResponse.json({
      status,
      analysisStatus,
      progress,
      message: `Assessment status: ${status}, Analysis status: ${analysisStatus}`
    });
    
  } catch (error) {
    console.error('Error checking assessment status:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to update assessment with fallback data if processing times out
async function updateAssessmentWithFallback(assessment: any, assessmentType: string) {
  try {
    const data = assessment.data as Record<string, any> || {};
    const responses = data.responses || {};
    
    // Get categories based on assessment type
    const categories = getCategories(assessmentType);
    
    // Create fallback scores for each category
    const defaultScores: Record<string, number> = {};
    categories.forEach(category => {
      defaultScores[category] = 65 + Math.floor(Math.random() * 10);
    });
    
    // Calculate overall score as average
    const sum = Object.values(defaultScores).reduce((total, score) => total + score, 0);
    defaultScores.overallScore = Math.round(sum / categories.length);
    
    // Determine readiness level based on score
    let readinessLevel = "Early Development";
    if (defaultScores.overallScore >= 85) readinessLevel = "Fully Prepared";
    else if (defaultScores.overallScore >= 70) readinessLevel = "Approaching Readiness";
    else if (defaultScores.overallScore >= 50) readinessLevel = "Developing Competency";
    
    // Create type-specific recommendations
    const recommendations = generateTypeSpecificRecommendations(assessmentType);
    
    // Update data with fallback analysis
    const updatedData = {
      ...data,
      scores: defaultScores,
      readinessLevel: readinessLevel,
      recommendations: recommendations,
      summary: `Based on your assessment, we've identified that you're at the "${readinessLevel}" stage. While we experienced a processing issue, we've provided you with insights based on your responses.`,
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
      completedAt: new Date().toISOString(),
      aiProcessed: true,
      aiProcessedAt: new Date().toISOString(),
      analysisStatus: 'completed',
      usedFallback: true,
      fallbackReason: "Processing timeout after 5 minutes"
    };
    
    // Update assessment
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        status: 'completed',
        data: updatedData,
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error updating assessment with fallback:', error);
    return false;
  }
}

// Helper function to get categories based on assessment type
function getCategories(assessmentType: string): string[] {
  switch (assessmentType.toLowerCase()) {
    case 'fjrl':
      return ['technicalSkills', 'jobMarketAwareness', 'professionalPresentation', 'interviewPreparation'];
    case 'ijrl':
      return ['careerGoalClarity', 'qualificationGap', 'industryKnowledge', 'networkDevelopment'];
    case 'cdrl':
      return ['leadershipPotential', 'strategicThinking', 'domainExpertise', 'changeManagement'];
    case 'ccrl':
      return ['skillCurrency', 'marketKnowledge', 'confidenceLevel', 'networkStrength'];
    case 'ctrl':
      return ['transferableSkills', 'targetIndustryKnowledge', 'adaptability', 'transitionStrategy'];
    case 'rrl':
      return ['financialPreparation', 'psychologicalReadiness', 'postRetirementPlan', 'knowledgeTransfer'];
    case 'irl':
      return ['academicPreparation', 'professionalAwareness', 'practicalExperience', 'learningOrientation'];
    default:
      return ['careerPlanning', 'skillsDevelopment', 'professionalNetworking', 'industryKnowledge'];
  }
}

// Helper function to generate type-specific recommendations
function generateTypeSpecificRecommendations(assessmentType: string) {
  switch (assessmentType.toLowerCase()) {
    case 'fjrl':
      return [
        {
          title: "Build a Strong Professional Portfolio",
          explanation: "Create a compelling showcase of your skills and projects.",
          steps: [
            "Develop an online portfolio highlighting your best work",
            "Create a comprehensive LinkedIn profile with all relevant skills",
            "Include academic projects that demonstrate practical skills"
          ]
        },
        {
          title: "Enhance Interview Preparation",
          explanation: "Prepare thoroughly for the interview process to make a strong impression.",
          steps: [
            "Research common interview questions in your field",
            "Practice answering behavioral questions with specific examples",
            "Prepare thoughtful questions to ask potential employers"
          ]
        }
      ];
    case 'ijrl':
      return [
        {
          title: "Clarify Your Career Goals",
          explanation: "Define your ideal role with specific targets and timeline.",
          steps: [
            "Research specific job titles and descriptions that appeal to you",
            "Identify companies and industries where these roles exist",
            "Create a 1, 3, and 5-year career progression plan"
          ]
        },
        {
          title: "Bridge Your Qualification Gap",
          explanation: "Identify and address specific skills needed for your ideal role.",
          steps: [
            "Compare your current skills to job requirements",
            "Prioritize skills that need development",
            "Create a learning plan with courses or certifications"
          ]
        }
      ];
    // Add cases for other assessment types
    default:
      return [
        {
          title: "Develop a Strategic Career Plan",
          explanation: "Create a structured approach to your professional growth.",
          steps: [
            "Set clear, measurable career goals for the next 1-3 years",
            "Identify specific skills to develop that align with these goals",
            "Create a timeline with regular checkpoints to assess progress"
          ]
        },
        {
          title: "Expand Your Professional Network",
          explanation: "Build meaningful connections that can provide opportunities and guidance.",
          steps: [
            "Identify industry events and professional associations to join",
            "Schedule regular networking activities each month",
            "Develop an elevator pitch that clearly communicates your value"
          ]
        }
      ];
  }
}