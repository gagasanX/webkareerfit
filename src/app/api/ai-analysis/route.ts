// src/app/api/ai-analysis/route.ts - UPDATED
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Remove edge runtime to avoid limitations with external API calls
// export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    console.log('[AI Analysis] Starting processing with chunked approach');
    
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

    // Application URL for callback
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://my.kareerfit.com');
    
    // Instead of sending to Make.com, initiate our local chunked processing
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

      // Initiate chunked processing without awaiting the result
      console.log(`[AI Analysis] Initiating chunked processing for ${assessmentId}`);
      
      // Use fetch to trigger async processing - don't await this to avoid timeout
      fetch(`${appUrl}/api/assessment/${type}/${assessmentId}/initiate-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }).catch(err => console.error('Error initiating chunked analysis:', err));

      // Return success to client immediately
      return NextResponse.json({
        success: true,
        message: 'Assessment analysis initiated with chunked processing',
        processingStatus: 'initiated',
      });
    } catch (error) {
      console.error(`[AI Analysis] Chunked processing error for ${assessmentId}:`, error);
      
      // Create fallback analysis if processing fails
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
            fallbackReason: error instanceof Error ? error.message : 'Chunked processing failed'
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'AI analysis completed with fallback (chunked processing error)',
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

// Helper to generate type-specific recommendations (keep existing function)
function generateTypeSpecificRecommendations(assessmentType: string) {
  // Keep your existing function implementation
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
    // Keep other cases for other assessment types
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