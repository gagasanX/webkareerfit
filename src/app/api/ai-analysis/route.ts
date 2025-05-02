import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOpenAIClient } from '@/lib/openai-client';

// Set Edge runtime for longer execution time
export const runtime = 'edge';
export const maxDuration = 60; // Set to 60 seconds

export async function POST(request: NextRequest) {
  console.log('[ai-analysis] API endpoint called');
  
  try {
    // Parse the request body
    const body = await request.json();
    const { assessmentId, type, responses } = body;

    if (!assessmentId || !type) {
      console.error('[ai-analysis] Missing required parameters');
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log(`[ai-analysis] Processing for assessment ${assessmentId} of type ${type}`);

    // Get the assessment data
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      console.error(`[ai-analysis] Assessment ${assessmentId} not found`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Get categories based on assessment type
    const categories = getCategories(type);
    console.log(`[ai-analysis] Categories for ${type}:`, categories);
    
    try {
      // Perform the AI analysis directly - no background processing
      console.log('[ai-analysis] Starting OpenAI analysis...');
      const analysisResult = await processAIAnalysis(type, responses, categories);
      console.log('[ai-analysis] Analysis completed successfully');
      
      // Update the assessment with the AI analysis results
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
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'AI analysis completed successfully',
        analysis: analysisResult
      });
      
    } catch (aiError) {
      console.error('[ai-analysis] Error in AI processing:', aiError);
      
      // Update assessment with error status
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'error',
          data: {
            ...(assessment.data as object || {}),
            aiError: aiError instanceof Error ? aiError.message : 'Unknown error',
            aiProcessing: false,
          }
        }
      });
      
      throw aiError;
    }
  } catch (error) {
    console.error('[ai-analysis] Unhandled error:', error);
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

// Function to process AI analysis directly
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

    // Create a more expert prompt for the AI analysis
    const systemPrompt = `You are a senior career assessment analyst with over 20 years of experience in ${assessmentType.toUpperCase()} evaluations. 
You provide sophisticated, individualized analyses that are insightful, nuanced, and actionable.
You must generate meaningful and varied scores (0-100) for each category that accurately reflect the assessment responses.
Think like a highly paid career advisor that provides personalized, expert insights.
Ensure that your recommendations are specific, practical, and tailored to the individual's situation.`;

    const userPrompt = `Analyze these ${assessmentType.toUpperCase()} assessment responses to provide a comprehensive professional analysis:

${formattedResponses}

Format your analysis as JSON with the following structure:
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

VERY IMPORTANT REQUIREMENTS:
- Each category must have a unique score that reflects the quality of the responses
- Scores should not all be the same or very similar
- Each recommendation must be detailed, actionable, and directly related to the assessment responses
- Include at least 3 distinct strengths and 3 areas for improvement
- The summary should be personalized and provide meaningful insight
- Your analysis should sound like it was written by a professional career coach with extensive experience
- Every aspect of your analysis must be personalized to the assessment responses provided

Return ONLY valid JSON - no other text or explanation.`;

    // Initialize OpenAI client
    console.log('[ai-analysis] Creating OpenAI client...');
    const openai = createOpenAIClient();
    
    // Call the OpenAI API
    console.log('[ai-analysis] Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-1106', // Using the JSON mode enabled model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' }, // Force JSON response
      temperature: 0.7, // Slightly higher temperature for more varied outputs
    });

    // Extract the response
    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      console.error('[ai-analysis] Empty response from OpenAI');
      throw new Error('Empty response from AI');
    }

    // Parse the JSON response
    console.log('[ai-analysis] Parsing JSON response...');
    let analysisResult;
    try {
      analysisResult = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('[ai-analysis] JSON parse error:', parseError);
      console.error('[ai-analysis] Response content:', responseContent);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate the response has all required fields
    if (!analysisResult.scores || !analysisResult.readinessLevel || 
        !Array.isArray(analysisResult.recommendations) || !analysisResult.summary ||
        !Array.isArray(analysisResult.strengths) || !Array.isArray(analysisResult.improvements)) {
      console.error('[ai-analysis] Incomplete response from OpenAI:', analysisResult);
      throw new Error('Incomplete AI response - missing required fields');
    }

    // Verify all categories have scores
    const missingCategories = categories.filter(cat => 
      !analysisResult.scores[cat] && analysisResult.scores[cat] !== 0
    );
    
    if (missingCategories.length > 0) {
      console.warn(`[ai-analysis] Missing scores for categories: ${missingCategories.join(', ')}`);
      
      // Fill in missing categories with default scores
      missingCategories.forEach(cat => {
        analysisResult.scores[cat] = 70; // Default score
      });
    }

    // Ensure overall score is present and valid
    if (!analysisResult.scores.overallScore) {
      console.log('[ai-analysis] Calculating missing overall score');
      const categoryScores = Object.entries(analysisResult.scores)
        .filter(([key]) => key !== 'overallScore')
        .map(([_, value]) => Number(value));
      
      if (categoryScores.length > 0) {
        const sum = categoryScores.reduce((a, b) => a + b, 0);
        analysisResult.scores.overallScore = Math.round(sum / categoryScores.length);
      } else {
        analysisResult.scores.overallScore = 70; // Default
      }
    }

    console.log('[ai-analysis] Analysis result successfully generated');
    return analysisResult;
  } catch (error) {
    console.error('[ai-analysis] Error in AI processing:', error);
    throw error;
  }
}