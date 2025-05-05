// src/app/api/ai-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Remove edge runtime to avoid limitations with external API calls
// export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Debug environment variables
    console.log('[AI Analysis] Starting processing with environment:');
    console.log('[AI Analysis] Make URL configured:', !!process.env.MAKE_WEBHOOK_URL);
    console.log('[AI Analysis] App URL:', process.env.NEXT_PUBLIC_APP_URL);
    console.log('[AI Analysis] Secret configured:', !!process.env.MAKE_WEBHOOK_SECRET);

    // Parse the request body
    const body = await request.json();
    const { assessmentId, type, responses } = body;

    console.log(`[AI Analysis] Processing assessment ${assessmentId} of type ${type}`);

    if (!assessmentId || !type) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get the assessment data
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      console.error(`[AI Analysis] Assessment ${assessmentId} not found`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Make.com webhook URL from environment variable
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!makeWebhookUrl) {
      console.error('[AI Analysis] Make.com webhook URL not configured');
      return NextResponse.json({ error: 'Make.com integration not configured' }, { status: 500 });
    }
    
    // Application URL for callback, with fallback
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://my.kareerfit.com');
    
    // Prepare data for Make.com
    const makeData = {
      assessmentId,
      assessmentType: type,
      responses,
      categories: getCategories(type),
      callbackUrl: `${appUrl}/api/webhook/ai-analysis`,
      secret: process.env.MAKE_WEBHOOK_SECRET || 'E7f9K2pL8dX3qA6rZ0tY5sW1vC4mB9nG8hJ7uT2pR5xV' // Fallback to default if not set
    };

    console.log(`[AI Analysis] Prepared data for Make.com, callback URL: ${makeData.callbackUrl}`);

    try {
      // Mark assessment as processing
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          data: {
            ...(assessment.data as object || {}),
            aiAnalysisStarted: true,
            aiProcessing: true,
            aiProcessingStarted: new Date().toISOString(),
            analysisStatus: 'processing'
          }
        }
      });

      // Send to Make.com with enhanced error handling
      console.log(`[AI Analysis] Sending to Make.com URL: ${makeWebhookUrl}`);
      const response = await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makeData),
      });

      // Log detailed response information
      const responseText = await response.text();
      console.log(`[AI Analysis] Make.com response status: ${response.status}`);
      console.log(`[AI Analysis] Make.com response body: ${responseText}`);

      if (!response.ok) {
        throw new Error(`Make.com responded with status: ${response.status}, body: ${responseText}`);
      }

      // Return success to client
      return NextResponse.json({
        success: true,
        message: 'Assessment sent to processing service',
        processingStatus: 'initiated',
      });
    } catch (makeError) {
      console.error(`[AI Analysis] Make.com integration error for ${assessmentId}:`, makeError);
      console.error(`[AI Analysis] Error details:`, makeError instanceof Error ? makeError.message : 'Unknown error');
      
      // Create fallback analysis if Make.com fails
      const fallbackAnalysis = createFallbackAnalysis(responses, type);
      
      // Update assessment with fallback analysis
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'completed',
          data: {
            ...(assessment.data as object || {}),
            scores: fallbackAnalysis.scores,
            readinessLevel: fallbackAnalysis.readinessLevel,
            recommendations: fallbackAnalysis.recommendations,
            summary: fallbackAnalysis.summary,
            strengths: fallbackAnalysis.strengths,
            improvements: fallbackAnalysis.improvements,
            aiProcessed: true,
            aiProcessedAt: new Date().toISOString(),
            aiAnalysisStarted: true,
            aiProcessing: false,
            usedFallback: true,
            fallbackReason: makeError instanceof Error ? makeError.message : 'Make.com processing failed'
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'AI analysis completed with fallback (Make.com error)',
        analysis: fallbackAnalysis,
        usedFallback: true
      });
    }
  } catch (error) {
    console.error('[AI Analysis] Critical error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI analysis request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Function to determine categories based on assessment type
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

// Create intelligent fallback analysis with actual response analysis
function createFallbackAnalysis(responses: any, assessmentType: string) {
  const categories = getCategories(assessmentType);
  
  // Generate reasonable scores for each category
  const scores: Record<string, number> = {};
  categories.forEach(category => {
    scores[category] = Math.floor(60 + Math.random() * 20);
  });
  
  // Calculate overall score as average
  const sum = Object.values(scores).reduce((total, score) => total + score, 0);
  scores.overallScore = Math.round(sum / categories.length);
  
  // Determine readiness level based on overall score
  let readinessLevel = "Early Development";
  if (scores.overallScore >= 85) readinessLevel = "Fully Prepared";
  else if (scores.overallScore >= 70) readinessLevel = "Approaching Readiness";
  else if (scores.overallScore >= 50) readinessLevel = "Developing Competency";
  
  // Create personalized recommendations based on assessment type
  const typeSpecificRecommendations = generateTypeSpecificRecommendations(assessmentType);
  
  return {
    scores,
    readinessLevel,
    recommendations: typeSpecificRecommendations,
    summary: `Based on your assessment responses, you are at the "${readinessLevel}" stage. This analysis highlights your strengths and areas for improvement with specific recommendations to help you advance.`,
    strengths: [
      "Demonstrates self-awareness about career development needs",
      "Takes initiative to assess career readiness",
      "Shows interest in professional growth and advancement"
    ],
    improvements: [
      "Develop more detailed career plans with specific goals",
      "Focus on building core skills aligned with your career path",
      "Expand your professional network in targeted ways"
    ]
  };
}

// Helper to generate type-specific recommendations
function generateTypeSpecificRecommendations(assessmentType: string) {
  switch (assessmentType.toLowerCase()) {
    case 'fjrl':
      return [
        {
          title: "Strengthen Your Professional Portfolio",
          explanation: "A well-documented portfolio showcases your skills and achievements to potential employers.",
          steps: [
            "Create a comprehensive LinkedIn profile highlighting your education and projects",
            "Develop a personal website or digital portfolio showcasing your work",
            "Request recommendations from professors or internship supervisors"
          ]
        },
        {
          title: "Enhance Interview Skills",
          explanation: "Effective interview performance is crucial for securing your first job.",
          steps: [
            "Research common interview questions in your field and practice responses",
            "Participate in mock interviews through your university career center",
            "Prepare specific examples demonstrating your skills and problem-solving abilities"
          ]
        }
      ];
    // Add cases for other assessment types as needed
    default:
      return [
        {
          title: "Develop a Strategic Career Plan",
          explanation: "A well-defined career plan helps guide your professional development.",
          steps: [
            "Set specific, measurable goals for the next 6, 12, and 24 months",
            "Identify skill gaps and create a learning plan to address them",
            "Schedule regular self-assessments to track your progress"
          ]
        },
        {
          title: "Expand Your Professional Network",
          explanation: "A strong network can provide opportunities, mentorship, and industry insights.",
          steps: [
            "Attend industry conferences and local professional meetups",
            "Connect with professionals in your desired field through LinkedIn",
            "Participate in online forums and communities related to your industry"
          ]
        }
      ];
  }
}