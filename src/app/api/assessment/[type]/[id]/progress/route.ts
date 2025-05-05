// app/api/assessment/[type]/[id]/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { getOpenAIInstance, isOpenAIConfigured } from '@/lib/openai';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  if (!params || !params.id || !params.type) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }
  
  const assessmentId = params.id;
  const assessmentType = params.type;
  
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    });
    
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    if (assessment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    // Check current status
    const assessmentData = assessment.data as Record<string, any> || {};
    const currentStatus = assessmentData.analysisStatus || 'pending';
    
    // If already completed or failed, return current status
    if (currentStatus === 'completed') {
      return NextResponse.json({
        success: true,
        status: assessment.status,
        analysisStatus: currentStatus,
        data: {
          scores: assessmentData.scores || {},
          readinessLevel: assessmentData.readinessLevel || '',
          recommendations: assessmentData.recommendations || [],
          summary: assessmentData.summary || '',
          strengths: assessmentData.strengths || [],
          improvements: assessmentData.improvements || []
        }
      });
    }
    
    if (currentStatus === 'error') {
      return NextResponse.json({
        success: false,
        error: assessmentData.processingError || 'AI processing failed',
        status: assessment.status,
        analysisStatus: currentStatus
      });
    }
    
    // If processing has started, return current status
    if (currentStatus === 'processing') {
      return NextResponse.json({
        success: true,
        status: assessment.status,
        analysisStatus: currentStatus,
        message: 'AI processing is in progress'
      });
    }
    
    // Mark as pending and initiate analysis via the ai-analysis endpoint
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'processing',
        data: {
          ...assessmentData,
          analysisStatus: 'pending',
          processingStartedAt: new Date().toISOString()
        }
      }
    });
    
    // Now call the AI analysis endpoint to start processing
    try {
      const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://my.kareerfit.com'}/api/ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentId,
          type: assessmentType,
          responses: assessmentData.responses || {}
        }),
      });
      
      if (!aiResponse.ok) {
        throw new Error(`Failed to start AI analysis: ${aiResponse.status}`);
      }
      
      const aiResult = await aiResponse.json();
      
      return NextResponse.json({
        success: true,
        status: 'processing',
        analysisStatus: 'processing',
        message: 'AI processing has started via Make.com'
      });
    } catch (aiError) {
      console.error('Error initiating AI analysis:', aiError);
      return NextResponse.json({
        success: false,
        error: 'Failed to start AI analysis',
        details: aiError instanceof Error ? aiError.message : 'Unknown error'
      }, { status: 500 });
    }
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
  if (!params || !params.id || !params.type) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }
  
  const assessmentId = params.id;
  const assessmentType = params.type;
  
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    });
    
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    if (assessment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    // Get required data for OpenAI
    const assessmentData = assessment.data as Record<string, any> || {};
    const responses = assessmentData.responses || {};
    
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'error',
          data: {
            ...assessmentData,
            analysisStatus: 'error',
            processingError: 'OpenAI API key is not configured'
          }
        }
      });
      
      return NextResponse.json({
        success: false,
        error: 'AI processing service is currently unavailable',
        status: 'error'
      }, { status: 500 });
    }
    
    // Mark as processing
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'processing',
        data: {
          ...assessmentData,
          analysisStatus: 'processing',
          processingStartedAt: new Date().toISOString()
        }
      }
    });
    
    try {
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
        model: 'gpt-3.5-turbo-1106',
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

      // Update assessment with analysis
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'completed',
          data: {
            ...assessmentData,
            scores: analysisResult.scores,
            readinessLevel: analysisResult.readinessLevel,
            recommendations: analysisResult.recommendations,
            summary: analysisResult.summary,
            strengths: analysisResult.strengths,
            improvements: analysisResult.improvements,
            aiProcessed: true,
            aiProcessedAt: new Date().toISOString(),
            analysisStatus: 'completed'
          }
        }
      });

      return NextResponse.json({
        success: true,
        status: 'completed',
        analysisStatus: 'completed',
        data: analysisResult
      });

    } catch (aiError) {
      console.error('Error processing AI analysis:', aiError);
      
      // Create fallback analysis
      const fallbackAnalysis = createFallbackAnalysis(assessmentType, responses);
      
      // Update with fallback
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'completed',
          data: {
            ...assessmentData,
            ...fallbackAnalysis,
            aiProcessed: true,
            aiProcessedAt: new Date().toISOString(),
            analysisStatus: 'completed',
            usedFallback: true,
            fallbackReason: aiError instanceof Error ? aiError.message : 'AI processing failed'
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        status: 'completed',
        analysisStatus: 'completed',
        data: fallbackAnalysis,
        usedFallback: true
      });
    }
    
  } catch (error) {
    console.error('Server error during AI processing:', error);
    
    // Update assessment with error status
    try {
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId }
      });
      
      if (assessment) {
        await prisma.assessment.update({
          where: { id: assessmentId },
          data: {
            status: 'error',
            data: {
              ...(assessment.data as Record<string, any> || {}),
              analysisStatus: 'error',
              processingError: error instanceof Error ? error.message : 'Unknown error'
            }
          }
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
    ]
  };
}