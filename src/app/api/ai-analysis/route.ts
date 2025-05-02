// app/api/ai-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';

// Initialize OpenAI with API key (should be in your .env file)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { assessmentId, type, responses } = body;

    if (!assessmentId || !type) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log(`Processing AI analysis for assessment ${assessmentId} of type ${type}`);

    // Get the assessment data
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      console.error(`Assessment ${assessmentId} not found`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Update assessment status to processing
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'processing',
        data: {
          ...(assessment.data as object || {}),
          aiAnalysisStarted: true,
          aiAnalysisStartedAt: new Date().toISOString(),
        }
      },
    });

    // Get categories based on assessment type
    const categories = getCategories(type);
    
    // Create AI analysis in the background
    processAIAnalysis(assessmentId, type, responses, categories)
      .then(() => console.log(`AI analysis completed for assessment ${assessmentId}`))
      .catch(error => console.error(`Error in AI analysis for assessment ${assessmentId}:`, error));

    // Respond immediately
    return NextResponse.json({
      success: true,
      message: 'AI analysis initiated',
    });
  } catch (error) {
    console.error('Error in AI analysis API:', error);
    return NextResponse.json(
      { error: 'Failed to process AI analysis request' },
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

// This function processes the AI analysis asynchronously
async function processAIAnalysis(
  assessmentId: string,
  assessmentType: string,
  responses: any,
  categories: string[]
) {
  try {
    // Create a string representation of the responses for the AI
    const formattedResponses = Object.entries(responses)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    // Create the prompt for the AI
    const systemPrompt = `You are a career assessment expert specializing in ${assessmentType.toUpperCase()} evaluations. 
You provide detailed, objective analysis based on assessment responses. Generate varied scores (0-100) for each category.`;

    const userPrompt = `Analyze these ${assessmentType.toUpperCase()} assessment responses:

${formattedResponses}

Provide a comprehensive analysis with the following JSON structure:
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
    }
  ],
  "summary": "string",
  "strengths": ["string", "string", "string"],
  "improvements": ["string", "string", "string"]
}

For readiness levels:
- Below 50: "Early Development"
- 50-69: "Developing Competency"
- 70-84: "Approaching Readiness"
- 85-100: "Fully Prepared"

ENSURE:
- Each category gets a unique, appropriate score
- Recommendations are specific and actionable
- Strengths and improvements are personalized
- All analysis is directly based on responses

Return ONLY valid JSON.`;

    // Call the OpenAI API - use GPT-3.5 Turbo for cost efficiency while maintaining quality
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-1106', // Using a more cost-effective model that still performs well
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5, // Balance between creativity and consistency
    });

    // Extract the response
    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('Empty response from AI');
    }

    // Parse the JSON response
    const analysisResult = JSON.parse(responseContent);

    // Validate the response has all required fields
    if (!analysisResult.scores || !analysisResult.readinessLevel || 
        !Array.isArray(analysisResult.recommendations) || !analysisResult.summary ||
        !Array.isArray(analysisResult.strengths) || !Array.isArray(analysisResult.improvements)) {
      throw new Error('Incomplete AI response');
    }

    // Update the assessment with the AI analysis
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'completed',
        data: {
          // Get the existing data first
          ...(await prisma.assessment.findUnique({ where: { id: assessmentId } }))?.data as object || {},
          // Add the AI analysis
          scores: analysisResult.scores,
          readinessLevel: analysisResult.readinessLevel,
          recommendations: analysisResult.recommendations,
          summary: analysisResult.summary,
          strengths: analysisResult.strengths,
          improvements: analysisResult.improvements,
          aiProcessed: true,
          aiProcessedAt: new Date().toISOString(),
          aiAnalysisStarted: true,
          aiProcessing: false,
        }
      }
    });

    return analysisResult;
  } catch (error) {
    console.error('Error processing AI analysis:', error);
    
    // Update assessment with error
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'error',
        data: {
          ...(await prisma.assessment.findUnique({ where: { id: assessmentId } }))?.data as object || {},
          aiError: error instanceof Error ? error.message : 'Unknown error',
          aiProcessing: false,
        }
      }
    });
    
    throw error;
  }
}