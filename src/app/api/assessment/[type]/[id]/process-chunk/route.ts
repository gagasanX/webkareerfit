import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helper function to delay execution 
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  try {
    const { type, id } = params;
    const chunkIndex = parseInt(request.nextUrl.searchParams.get('chunk') || '0');
    
    console.log(`[Process Chunk] Starting chunk ${chunkIndex} for assessment ${id}`);
    
    // 1. Fetch assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });
    
    if (!assessment) {
      console.error(`[Process Chunk] Assessment ${id} not found`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    const assessmentData = assessment.data as any || {};
    const chunks = assessmentData.chunk_results || [];
    
    if (chunkIndex >= chunks.length) {
      console.error(`[Process Chunk] Invalid chunk index ${chunkIndex}`);
      return NextResponse.json({ error: 'Invalid chunk index' }, { status: 400 });
    }
    
    // 2. Update status to processing for this chunk
    const updatedChunks = [...chunks];
    updatedChunks[chunkIndex] = { 
      ...updatedChunks[chunkIndex], 
      status: 'processing',
      startedAt: new Date().toISOString()
    };
    
    await prisma.assessment.update({
      where: { id },
      data: {
        data: {
          ...assessmentData,
          current_chunk: chunkIndex,
          chunk_results: updatedChunks
        }
      }
    });
    
    // 3. Process chunk based on type
    const chunkType = chunks[chunkIndex].type;
    const responses = assessmentData.responses || {};
    
    // Simulate processing with a delay (remove in production)
    await delay(2000);
    
    let chunkResult;
    
    switch (chunkType) {
      case 'scores':
        chunkResult = processScores(type, responses);
        break;
      case 'recommendations':
        chunkResult = processRecommendations(type, responses);
        break;
      case 'strengths':
        chunkResult = processStrengths(type, responses);
        break;
      case 'improvements':
        chunkResult = processImprovements(type, responses);
        break;
      default:
        throw new Error(`Unknown chunk type: ${chunkType}`);
    }
    
    // 4. Update assessment with chunk result
    updatedChunks[chunkIndex] = {
      ...updatedChunks[chunkIndex],
      status: 'completed',
      result: chunkResult,
      completedAt: new Date().toISOString()
    };
    
    await prisma.assessment.update({
      where: { id },
      data: {
        data: {
          ...assessmentData,
          chunk_results: updatedChunks
        }
      }
    });
    
    // 5. Process next chunk or combine results if all chunks are completed
    const nextChunkIndex = chunkIndex + 1;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://my.kareerfit.com');
    
    if (nextChunkIndex < chunks.length) {
      // Process next chunk
      fetch(`${appUrl}/api/assessment/${type}/${id}/process-chunk?chunk=${nextChunkIndex}`, {
        method: 'POST',
      }).catch(err => console.error(`Error starting chunk ${nextChunkIndex}:`, err));
      
      return NextResponse.json({
        success: true,
        message: `Chunk ${chunkIndex} processed, starting chunk ${nextChunkIndex}`,
        progress: (chunkIndex + 1) / chunks.length
      });
    } else {
      // All chunks completed, combine results
      fetch(`${appUrl}/api/assessment/${type}/${id}/combine-results`, {
        method: 'POST',
      }).catch(err => console.error('Error combining results:', err));
      
      return NextResponse.json({
        success: true,
        message: 'All chunks processed, combining results',
        progress: 1.0
      });
    }
    
  } catch (error) {
    console.error('[Process Chunk] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chunk', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Dummy functions to simulate AI processing
function processScores(assessmentType: string, responses: any) {
  const categories = getCategories(assessmentType);
  const scores: Record<string, number> = {};
  
  categories.forEach(category => {
    scores[category] = Math.floor(60 + Math.random() * 30);
  });
  
  const sum = Object.values(scores).reduce((total, score) => total + score, 0);
  scores.overallScore = Math.round(sum / categories.length);
  
  return scores;
}

function processRecommendations(assessmentType: string, responses: any) {
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

function processStrengths(assessmentType: string, responses: any) {
  return [
    "Strong foundation in key industry concepts and terminology",
    "Demonstrates initiative in seeking professional development",
    "Shows self-awareness about career development needs",
    "Has a proactive approach to career planning"
  ];
}

function processImprovements(assessmentType: string, responses: any) {
  return [
    "Expand professional network with industry practitioners",
    "Gain more hands-on experience with relevant tools and technologies",
    "Develop more specific, measurable career goals",
    "Increase knowledge of current industry trends and best practices"
  ];
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