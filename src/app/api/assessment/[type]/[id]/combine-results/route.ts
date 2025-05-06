// /src/app/api/assessment/[type]/[id]/combine-results/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateReadinessLevel } from '@/lib/ai-processing';

// Define type for chunk object
interface AnalysisChunk {
  type: string;
  status: string;
  result?: any;
  error?: string;
  completedAt?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  try {
    const { type, id } = params;
    console.log(`[Combine Results] Combining results for assessment ${id}`);
    
    // 1. Fetch assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });
    
    if (!assessment) {
      console.error(`[Combine Results] Assessment ${id} not found`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    const assessmentData = assessment.data as any || {};
    const chunks = assessmentData.chunk_results || [] as AnalysisChunk[];
    
    // 2. Find chunk results with explicit type annotation
    const scoresChunk = chunks.find((c: AnalysisChunk) => c.type === 'scores');
    const recommendationsChunk = chunks.find((c: AnalysisChunk) => c.type === 'recommendations');
    const strengthsChunk = chunks.find((c: AnalysisChunk) => c.type === 'strengths');
    const improvementsChunk = chunks.find((c: AnalysisChunk) => c.type === 'improvements');
    
    // Check if any required chunks are missing or failed
    const missingChunks = [];
    if (!scoresChunk || scoresChunk.status !== 'completed') missingChunks.push('scores');
    if (!recommendationsChunk || recommendationsChunk.status !== 'completed') missingChunks.push('recommendations');
    if (!strengthsChunk || strengthsChunk.status !== 'completed') missingChunks.push('strengths');
    if (!improvementsChunk || improvementsChunk.status !== 'completed') missingChunks.push('improvements');
    
    // 3. If any required chunks missing, use fallback for those
    let scores = scoresChunk?.result || createFallbackScores(type);
    
    // Ensure overallScore exists
    if (!scores.overallScore) {
      const categoryScores = Object.entries(scores)
        .filter(([key]) => key !== 'overallScore')
        .map(([_, value]) => value as number);
      
      scores.overallScore = Math.round(
        categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length
      );
    }
    
    // Determine readiness level
    const readinessLevel = calculateReadinessLevel(scores.overallScore);
    
    // 4. Combine results
    const combinedResults = {
      scores: scores,
      readinessLevel: readinessLevel,
      recommendations: recommendationsChunk?.result || createFallbackRecommendations(type),
      strengths: strengthsChunk?.result || ["Demonstrates self-awareness about career development needs", "Shows initiative in seeking assessment"],
      improvements: improvementsChunk?.result || ["Develop more detailed career plans with specific goals", "Focus on building core skills"],
      summary: `Based on your assessment responses, you are at the "${readinessLevel}" stage. This analysis highlights your strengths and areas for improvement with specific recommendations to help you advance.`,
      aiProcessed: true,
      aiProcessedAt: new Date().toISOString(),
      aiProcessing: false,
      analysisStatus: 'completed'
    };
    
    // 5. Save combined results to assessment
    await prisma.assessment.update({
      where: { id },
      data: {
        status: 'completed',
        data: {
          ...assessmentData,
          ...combinedResults,
          processingComplete: true,
          processingCompletedAt: new Date().toISOString(),
          usedFallback: missingChunks.length > 0,
          fallbackReason: missingChunks.length > 0 ? `Missing or failed chunks: ${missingChunks.join(', ')}` : undefined
        }
      }
    });
    
    console.log(`[Combine Results] Successfully combined results for ${id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Results combined successfully',
      missingChunks: missingChunks.length > 0 ? missingChunks : undefined
    });
  } catch (error) {
    console.error('[Combine Results] Error:', error);
    return NextResponse.json(
      { error: 'Failed to combine results', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Fallback functions remain the same as before
function createFallbackScores(assessmentType: string) {
  const categories = getCategories(assessmentType);
  const scores: Record<string, number> = {};
  
  categories.forEach(category => {
    scores[category] = Math.floor(60 + Math.random() * 20);
  });
  
  const sum = Object.values(scores).reduce((total, score) => total + score, 0);
  scores.overallScore = Math.round(sum / categories.length);
  
  return scores;
}

function createFallbackRecommendations(assessmentType: string) {
  // Use existing function from ai-analysis route
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