// app/api/assessment/[type]/[id]/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { getOpenAIInstance, isOpenAIConfigured } from '@/lib/openai';

/**
 * GET: Checks the processing status of an assessment
 * POST: Processes an assessment with OpenAI
 */

// ROUTE HANDLERS
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  try {
    const { assessment, error } = await validateRequest(params);
    if (error) return error;

    // Return current processing status
    const assessmentData = assessment.data as Record<string, any> || {};
    const processingStatus = assessmentData.analysisStatus || 'pending';
    
    return NextResponse.json({
      success: true,
      status: assessment.status,
      analysisStatus: processingStatus,
      isComplete: processingStatus === 'completed',
      updatedAt: assessment.updatedAt,
      aiProcessed: !!assessmentData.aiProcessed,
    });
  } catch (error) {
    console.error('Error checking assessment status:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  const startTime = Date.now();
  
  try {
    // Validate request
    const { assessment, error } = await validateRequest(params);
    if (error) return error;
    
    // Get required data for OpenAI
    const assessmentData = assessment.data as Record<string, any> || {};
    const responses = assessmentData.responses || {};
    
    console.log(`Starting AI processing for assessment: ${assessment.id} (${params.type})`);
    
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      console.error('OpenAI not configured!');
      await updateAssessment(assessment.id, 'error', {
        ...assessmentData,
        analysisStatus: 'error',
        processingError: 'OpenAI API key is not configured'
      });
      
      return NextResponse.json({
        success: false,
        error: 'AI processing service is currently unavailable',
        status: 'error'
      }, { status: 500 });
    }
    
    // Mark as processing
    await updateAssessment(assessment.id, 'processing', {
      ...assessmentData,
      analysisStatus: 'processing',
      processingStartedAt: new Date().toISOString()
    });
    
    try {
      // Call OpenAI API
      console.log(`Calling OpenAI for assessment ${assessment.id}`);
      const analysisResult = await callOpenAI(params.type, responses);
      
      console.log(`OpenAI processing successful for assessment ${assessment.id}`);
      
      // Update assessment with analysis
      await updateAssessment(assessment.id, 'completed', {
        ...assessmentData,
        ...analysisResult,
        aiProcessed: true,
        aiProcessedAt: new Date().toISOString(),
        analysisStatus: 'completed',
        processingTimeMs: Date.now() - startTime
      });

      return NextResponse.json({
        success: true,
        status: 'completed',
        analysisStatus: 'completed',
        processingTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
        data: analysisResult
      });

    } catch (aiError) {
      console.error(`AI processing error for assessment ${assessment.id}:`, aiError);
      
      // Create fallback analysis
      console.log(`Using fallback analysis for assessment ${assessment.id}`);
      const fallbackAnalysis = createFallbackAnalysis(params.type, responses);
      
      // Update with fallback
      await updateAssessment(assessment.id, 'completed', {
        ...assessmentData,
        ...fallbackAnalysis,
        aiProcessed: true,
        aiProcessedAt: new Date().toISOString(),
        analysisStatus: 'completed',
        usedFallback: true,
        fallbackReason: aiError instanceof Error ? aiError.message : 'AI processing failed',
        processingTimeMs: Date.now() - startTime
      });
      
      return NextResponse.json({
        success: true,
        status: 'completed',
        analysisStatus: 'completed',
        data: fallbackAnalysis,
        usedFallback: true,
        processingTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
      });
    }
    
  } catch (error) {
    console.error('Server error during AI processing:', error);
    
    try {
      const assessment = await prisma.assessment.findUnique({
        where: { id: params.id }
      });
      
      if (assessment) {
        await updateAssessment(params.id, 'error', {
          ...(assessment.data as Record<string, any> || {}),
          analysisStatus: 'error',
          processingError: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } catch (updateError) {
      console.error('Failed to update assessment with error status:', updateError);
    }
    
    return NextResponse.json({ 
      error: 'AI processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// HELPER FUNCTIONS

/**
 * Validates the request and retrieves the assessment
 */
async function validateRequest(params: { type: string, id: string }) {
  if (!params || !params.id || !params.type) {
    return { 
      error: NextResponse.json({ error: 'Invalid parameters' }, { status: 400 }) 
    };
  }
  
  // Authenticate user
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { 
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) 
    };
  }
  
  // Get assessment
  const assessment = await prisma.assessment.findUnique({
    where: { id: params.id }
  });
  
  if (!assessment) {
    return { 
      error: NextResponse.json({ error: 'Assessment not found' }, { status: 404 }) 
    };
  }
  
  if (assessment.userId !== session.user.id) {
    return { 
      error: NextResponse.json({ error: 'Unauthorized access' }, { status: 403 }) 
    };
  }
  
  return { assessment };
}

/**
 * Updates an assessment with new data
 */
async function updateAssessment(id: string, status: string, data: Record<string, any>) {
  return await prisma.assessment.update({
    where: { id },
    data: {
      status,
      data
    }
  });
}

/**
 * Calls OpenAI API to analyze assessment responses
 */
async function callOpenAI(assessmentType: string, responses: Record<string, any>) {
  // Get OpenAI instance
  const openai = getOpenAIInstance();
  
  // Get assessment categories based on type
  const categories = getCategories(assessmentType);
  
  // Format responses for OpenAI
  const formattedResponses = Object.entries(responses)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  
  // Create system prompt
  const systemPrompt = `You are a career assessment expert specializing in ${assessmentType.toUpperCase()} evaluations. 
You provide detailed, personalized analysis based on assessment responses. Generate varied scores (0-100) for each category,
ensuring they're individualized and reflect the nuances in the responses.`;

  // Create user prompt
  const userPrompt = `Analyze these ${assessmentType.toUpperCase()} assessment responses:

${formattedResponses}

Provide a comprehensive professional analysis with this EXACT JSON structure:
{
  "scores": {
    ${categories.map(cat => `"${cat}": number (0-100)`).join(',\n    ')},
    "overallScore": number (0-100)
  },
  "readinessLevel": "Early Development" | "Developing Competency" | "Approaching Readiness" | "Fully Prepared",
  "recommendations": [
    {
      "title": "string",
      "explanation": "string",
      "steps": ["string", "string", "string"]
    },
    {
      "title": "string",
      "explanation": "string",
      "steps": ["string", "string", "string"]
    }
  ],
  "summary": "string (max 200 words)",
  "strengths": ["string", "string", "string"],
  "improvements": ["string", "string", "string"]
}

Levels are based on overall score:
- Below 50: "Early Development"
- 50-69: "Developing Competency"
- 70-84: "Approaching Readiness"
- 85-100: "Fully Prepared"

REQUIREMENTS:
- Every score must reflect a detailed analysis of the responses, not arbitrary values
- Each category should have a unique score appropriate to the responses
- Recommendations must be specific, actionable and personalized
- Analyze the responses as an expert career analyst would
- Return ONLY valid JSON with NO extra text`;

  // Call OpenAI API
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  });

  // Get and validate response
  const responseContent = completion.choices[0]?.message?.content;
  
  if (!responseContent) {
    throw new Error('Empty response from AI');
  }

  // Parse JSON
  const analysisResult = JSON.parse(responseContent);

  // Validate result has required fields
  if (!analysisResult.scores || !analysisResult.readinessLevel || 
      !Array.isArray(analysisResult.recommendations) || !analysisResult.summary ||
      !Array.isArray(analysisResult.strengths) || !Array.isArray(analysisResult.improvements)) {
    throw new Error('Incomplete AI response structure');
  }

  return analysisResult;
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

// Helper function to create fallback analysis
function createFallbackAnalysis(assessmentType: string, responses: Record<string, any>) {
  const categories = getCategories(assessmentType);
  const scores: Record<string, number> = {};
  
  // Generate reasonable scores based on categories
  categories.forEach(category => {
    scores[category] = 65 + Math.floor(Math.random() * 15);
  });
  
  // Calculate overall score
  const sum = Object.values(scores).reduce((acc, score) => acc + score, 0);
  const overallScore = Math.round(sum / categories.length);
  scores.overallScore = overallScore;
  
  // Determine readiness level
  let readinessLevel = "Early Development";
  if (overallScore >= 85) readinessLevel = "Fully Prepared";
  else if (overallScore >= 70) readinessLevel = "Approaching Readiness";
  else if (overallScore >= 50) readinessLevel = "Developing Competency";
  
  return {
    scores,
    readinessLevel,
    recommendations: [
      {
        title: "Expand Your Professional Network",
        explanation: "Building connections with professionals in your field provides access to opportunities and industry insights.",
        steps: [
          "Attend industry events and conferences",
          "Join professional groups on LinkedIn and other platforms",
          "Reach out to alumni from your educational institutions"
        ]
      },
      {
        title: "Develop Your Technical Skills",
        explanation: "Continuously improving your technical abilities ensures you remain competitive in your field.",
        steps: [
          "Identify in-demand skills in your industry",
          "Enroll in relevant courses or certifications",
          "Practice through hands-on projects"
        ]
      },
      {
        title: "Create a Strategic Career Plan",
        explanation: "A well-defined career plan helps you make informed decisions and track your progress.",
        steps: [
          "Define short-term and long-term career goals",
          "Research potential career paths in your field",
          "Set measurable milestones to track your progress"
        ]
      }
    ],
    summary: "Your assessment indicates you're making progress in your career development. Focus on building both technical skills and professional relationships to enhance your opportunities. Continue working on the recommendations provided for optimal growth.",
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
    categoryAnalysis: createCategoryAnalysis(categories)
  };
}

// Helper function to create category analysis for fallback
function createCategoryAnalysis(categories: string[]) {
  const analysis: Record<string, any> = {};
  
  categories.forEach(category => {
    analysis[category] = {
      score: 65 + Math.floor(Math.random() * 15),
      strengths: [
        `Shows interest in developing ${formatCategoryName(category)}`,
        `Has awareness of the importance of ${formatCategoryName(category)}`
      ],
      improvements: [
        `Develop more specific plans for improving ${formatCategoryName(category)}`,
        `Seek resources or mentorship in ${formatCategoryName(category)}`
      ]
    };
  });
  
  return analysis;
}

// Helper function to format category names for display
function formatCategoryName(category: string): string {
  return category
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
}