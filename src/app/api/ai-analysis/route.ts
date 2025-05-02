// app/api/ai-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOpenAIClient } from '@/lib/openai';

export const maxDuration = 60; // Use Edge Runtime with longer timeouts

export async function POST(request: NextRequest) {
  console.log('AI Analysis endpoint called');
  
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
    
    // Process AI analysis directly (no background processing)
    try {
      console.log('Starting immediate AI analysis');
      const analysisResult = await processAIAnalysis(type, responses, categories);
      
      // Update the assessment with the AI analysis
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'completed',
          data: {
            ...(assessment.data as object || {}),
            scores: analysisResult.scores,
            readinessLevel: analysisResult.readinessLevel,
            recommendations: analysisResult.recommendations,
            summary: analysisResult.summary,
            strengths: analysisResult.strengths,
            improvements: analysisResult.improvements,
            aiProcessed: true,
            aiProcessedAt: new Date().toISOString(),
            aiAnalysisStarted: true,
            aiAnalysisCompleted: true,
          }
        }
      });
      
      console.log('AI analysis completed successfully');
      
      return NextResponse.json({
        success: true,
        message: 'AI analysis completed',
        analysis: analysisResult,
      });
    } catch (error) {
      console.error('Error in direct AI analysis:', error);
      
      // Update assessment with error
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'error',
          data: {
            ...(assessment.data as object || {}),
            aiError: error instanceof Error ? error.message : 'Unknown error',
            aiProcessing: false,
          }
        }
      });
      
      throw error;
    }
  } catch (error) {
    console.error('Error in AI analysis API:', error);
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

// Process AI analysis directly - no background processing
async function processAIAnalysis(
  assessmentType: string,
  responses: any,
  categories: string[]
): Promise<any> {
  try {
    // Create a string representation of the responses for the AI
    const formattedResponses = Object.entries(responses)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    // Create the prompt for the AI - improved for higher quality analysis
    const systemPrompt = `You are an expert career assessment analyst with deep expertise in ${assessmentType.toUpperCase()} evaluations. 
You provide sophisticated, highly personalized analyses based on assessment responses. 
Your analysis should be thorough, insightful, and actionable - comparable to what a highly paid career consultant would provide.
Generate varied and realistic scores (0-100) for each category that accurately reflect the responses.
Your recommendations should be specific, detailed, and tailored to the individual's unique situation.`;

    const userPrompt = `Analyze these ${assessmentType.toUpperCase()} assessment responses and provide a comprehensive professional analysis:

${formattedResponses}

Provide a thorough analysis with this JSON structure:
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

IMPORTANT REQUIREMENTS:
- Each category MUST get a unique score based on a careful analysis of the responses
- Scores should reflect the quality and depth of the responses, not just be arbitrary
- Each recommendation must be highly specific, actionable, and directly tied to the assessment responses
- The summary should provide a personalized overview of their current career readiness
- Strengths and improvements must be personalized to the individual's situation
- Your analysis must sound like it comes from a professional career coach with 15+ years of experience
- Avoid generic advice - everything should be personalized to the assessment responses

Return ONLY valid JSON with NO additional text.`;

    // Get the OpenAI client
    const openai = getOpenAIClient();
    
    // Call the OpenAI API - use GPT-4-turbo for better quality
    console.log('Making OpenAI API call...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-1106', // Can be upgraded to gpt-4 for even better results
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

    return analysisResult;
  } catch (error) {
    console.error('Error processing AI analysis:', error);
    throw error;
  }
}