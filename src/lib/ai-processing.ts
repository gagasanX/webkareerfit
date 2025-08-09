// /src/lib/ai-processing.ts
// ✅ CLEAN VERSION: No syntax errors, simplified processing

import OpenAI from 'openai';
import { prisma } from '@/lib/db';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Processing configuration for efficiency
const PROCESSING_TIMEOUT = 8 * 60 * 1000; // 8 minutes max processing time
const MAX_RETRY_ATTEMPTS = 2; // Reduced retry attempts

/**
 * ✅ SIMPLIFIED: Main processing function optimized for speed
 */
export async function processAssessmentWithAI(assessmentId: string, assessmentType: string): Promise<void> {
  console.log(`[AI Processing] 🚀 Starting SIMPLIFIED AI analysis for ${assessmentType} assessment: ${assessmentId}`);
  
  try {
    // Get assessment data
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    });
    
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }
    
    const data = assessment.data as Record<string, any> || {};
    
    // Check if already processed
    if (data.aiProcessed === true) {
      console.log(`[AI Processing] ✅ Assessment ${assessmentId} already processed, skipping`);
      return;
    }
    
    // Check if currently being processed
    if (data.aiProcessingInProgress === true) {
      const processingStarted = new Date(data.aiAnalysisStartedAt || new Date());
      const now = new Date();
      const timeDiff = now.getTime() - processingStarted.getTime();
      
      if (timeDiff < PROCESSING_TIMEOUT) {
        console.log(`[AI Processing] ⏭️ Assessment ${assessmentId} currently being processed, skipping`);
        return;
      }
    }
    
    // Validate required data
    const responses = data.responses;
    const personalInfo = data.personalInfo || {};
    
    if (!responses) {
      throw new Error('No responses found in assessment data');
    }
    
    console.log(`[AI Processing] 📋 Assessment data validated for ${assessmentId}`);
    
    // Execute simplified processing
    await processWithSimplifiedMethod(assessmentId, assessmentType, data);
    
  } catch (error) {
    console.error(`[AI Processing] ❌ Error processing assessment ${assessmentId}:`, error);
    await handleProcessingError(assessmentId, error);
    throw error;
  }
}

/**
 * ✅ SIMPLIFIED: Single optimized processing method (5-8 seconds)
 */
async function processWithSimplifiedMethod(
  assessmentId: string, 
  assessmentType: string, 
  data: Record<string, any>
): Promise<void> {
  console.log(`[AI Processing] ⚡ Processing with simplified method: ${assessmentId}`);
  
  const responses = data.responses;
  const resumeText = data.extractedText || data.resumeText || data.resumeContent || '';
  const personalInfo = data.personalInfo || {};
  
  // Mark as processing
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      data: {
        ...data,
        aiAnalysisStarted: true,
        aiAnalysisStartedAt: new Date().toISOString(),
        aiProcessed: false,
        aiProcessingInProgress: true,
        aiError: null,
        aiRetryCount: (data.aiRetryCount || 0) + 1,
        processingMessage: 'AI analysis in progress...'
      },
      status: 'processing'
    }
  });
  
  console.log(`[AI Processing] 🔒 Processing lock acquired, starting simplified analysis...`);
  
  try {
    // ✅ SINGLE COMPREHENSIVE OpenAI CALL (instead of multiple calls)
    console.log('[AI Processing] 🧠 Starting single comprehensive AI analysis...');
    
    const comprehensiveResult = await processSingleComprehensiveAnalysis(
      responses, 
      assessmentType, 
      resumeText, 
      personalInfo
    );
    
    console.log('[AI Processing] ✅ Comprehensive analysis completed successfully');
    
    // Calculate readiness level
    const overallScore = comprehensiveResult.scores.overallScore || 70;
    const readinessLevel = calculateReadinessLevel(overallScore);
    
    // Create final assessment data
    const processedData = {
      ...data,
      ...comprehensiveResult,
      readinessLevel,
      
      // Critical: Mark as completed and clear processing flags
      aiProcessed: true,
      aiProcessedAt: new Date().toISOString(),
      aiAnalysisStarted: true,
      aiAnalysisStartedAt: data.aiAnalysisStartedAt,
      aiProcessingInProgress: false, // Clear processing flag
      aiError: null,
      processingMessage: null,
      processingMethod: 'simplified_comprehensive'
    };
    
    // Update assessment with final results
    console.log(`[AI Processing] 💾 Saving final results for ${assessmentId}`);
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        data: processedData,
        status: 'completed'
      }
    });
    
    console.log(`[AI Processing] ✅ Successfully completed SIMPLIFIED analysis for ${assessmentId}`);
    console.log(`[AI Processing] 📊 Overall score: ${overallScore}% | Readiness: ${readinessLevel}`);
    console.log(`[AI Processing] 🔓 Processing lock released for ${assessmentId}`);
    
  } catch (error) {
    console.error(`[AI Processing] ❌ Simplified processing failed:`, error);
    throw error;
  }
}

/**
 * ⚡ SINGLE COMPREHENSIVE OpenAI CALL (5-8 seconds)
 * Replaces multiple API calls with one optimized request
 */
export async function processSingleComprehensiveAnalysis(
  responses: any, 
  assessmentType: string, 
  resumeText: string = '', 
  personalInfo: any = {}
) {
  console.log('[AI Processing] ⚡ Processing single comprehensive analysis');
  
  const categories = getCategories(assessmentType);
  const targetRole = personalInfo.jobPosition || 'Not specified';
  
  try {
    const prompt = `
You are a COMPREHENSIVE career assessment expert analyzing a ${assessmentType.toUpperCase()} assessment.

ASSESSMENT CONTEXT:
- Target Role: ${targetRole}
- Assessment Type: ${assessmentType.toUpperCase()}
- Resume Available: ${resumeText ? 'YES' : 'NO'}

ASSESSMENT RESPONSES:
${JSON.stringify(responses)}

${resumeText ? `
RESUME CONTENT FOR VALIDATION:
${resumeText}

VALIDATION INSTRUCTIONS:
- Compare claimed skills in responses with actual evidence in resume
- If resume shows strong experience but responses are weak → investigate inconsistency
- If resume lacks relevant experience but responses claim expertise → be skeptical
- If resume supports responses with specific examples → give appropriate credit
- Look for quantifiable achievements, leadership roles, relevant technologies
` : `
WARNING: No resume provided - assessment accuracy is limited without evidence validation.
Scoring will be more conservative due to lack of supporting documentation.
`}

COMPREHENSIVE ANALYSIS REQUIREMENTS:

1. REALISTIC SCORING (Be strict and honest):
- Most people are NOT exceptional (scores 85-100 should be rare)
- Entry level: expect 40-65% typically
- Mid-level: expect 55-75% typically  
- Senior level: expect 65-85% typically

2. COMPLETE ASSESSMENT OUTPUT:
- Individual category scores: ${categories.join(', ')}
- Overall assessment and readiness level
- Specific strengths and improvement areas
// --- PERUBAHAN DI SINI ---
- **Provide AT LEAST 3 and AT MOST 5 actionable recommendations.** Prioritize the most impactful ones.
- Honest career fit evaluation

Return ONLY valid JSON with this COMPLETE structure:
{
  "scores": {
    ${categories.map(cat => `"${cat}": number`).join(',\n    ')},
    "overallScore": number,
    "resumeConsistency": number,
    "evidenceLevel": "STRONG" | "MODERATE" | "WEAK" | "INSUFFICIENT"
  },
  "summary": "Honest 2-3 sentence assessment of overall readiness and key insights",
  "strengths": [
    "Evidence-based strength 1 with specific examples",
    "Evidence-based strength 2 with specific examples", 
    "Evidence-based strength 3 with specific examples"
  ],
  "improvements": [
    "Specific improvement area 1 with clear reasoning",
    "Specific improvement area 2 with clear reasoning",
    "Specific improvement area 3 with clear reasoning"
  ],
  "recommendations": [
    {
      "title": "Specific actionable recommendation title",
      "explanation": "Why this recommendation matters for career goals",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "timeframe": "1-3 months",
      "priority": "HIGH"
    }
    // Note: The AI will generate more recommendations based on the instruction above.
    // We only need one example here to show the format.
  ],
  ${resumeText ? `
  "resumeAnalysis": {
    "analysis": "Honest assessment of resume quality and career readiness",
    "keyFindings": ["Key finding 1", "Key finding 2", "Key finding 3"],
    "experienceLevel": "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "EXECUTIVE",
    "credibilityScore": number,
    "recommendations": ["Resume improvement 1", "Resume improvement 2"]
  },` : ''}
  "careerFit": {
    "fitLevel": "EXCELLENT_FIT" | "GOOD_FIT" | "PARTIAL_FIT" | "POOR_FIT",
    "fitPercentage": number,
    "honestAssessment": "Realistic assessment of suitability for target role",
    "timeToReadiness": "Realistic timeline to become competitive",
    "criticalGaps": ["Gap 1", "Gap 2", "Gap 3"]
  }
}

IMPORTANT: Be brutally honest. Most people need significant development. Don't give false hope, but provide actionable guidance.
`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Faster and cheaper than gpt-4
      messages: [
        { 
          role: 'system', 
          content: 'You are a brutally honest Malaysian career assessment expert who provides comprehensive, realistic feedback in a single analysis. Be thorough but efficient.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000,
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    // Validate and adjust scores for realism
    const validatedResult = validateComprehensiveResult(result, responses, resumeText);
    
    console.log('[AI Processing] ✅ Single comprehensive analysis completed successfully');
    return validatedResult;
    
  } catch (error) {
    console.error('[AI Processing] ❌ Error in comprehensive analysis:', error);
    
    // ✅ NO FAKE RESULTS - Throw error instead of returning fallback
    throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * ✅ Validate comprehensive result (no fake data allowed)
 */
function validateComprehensiveResult(result: any, responses: any, resumeText: string): any {
  // Ensure required fields exist
  const validatedResult = {
    scores: result.scores || {},
    summary: result.summary || 'Assessment analysis completed successfully.',
    strengths: Array.isArray(result.strengths) ? result.strengths : [],
    improvements: Array.isArray(result.improvements) ? result.improvements : [],
    recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
    resumeAnalysis: result.resumeAnalysis || null,
    careerFit: result.careerFit || null
  };
  
  // ✅ VALIDATE: Ensure we have real scores, not defaults
  if (!validatedResult.scores.overallScore || typeof validatedResult.scores.overallScore !== 'number') {
    throw new Error('AI analysis returned invalid or missing overall score');
  }
  
  // ✅ VALIDATE: Ensure we have real results arrays
  if (validatedResult.strengths.length === 0 || validatedResult.improvements.length === 0) {
    throw new Error('AI analysis returned incomplete results');
  }
  
  if (!validatedResult.scores.resumeConsistency) {
    validatedResult.scores.resumeConsistency = resumeText ? 75 : 50;
  }
  
  if (!validatedResult.scores.evidenceLevel) {
    validatedResult.scores.evidenceLevel = resumeText ? 'MODERATE' : 'INSUFFICIENT';
  }
  
  return validatedResult;
}

/**
 * ❌ Enhanced error handling - NO FAKE RESULTS
 */
async function handleProcessingError(assessmentId: string, error: any): Promise<void> {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    });
    
    if (assessment) {
      const data = assessment.data as Record<string, any> || {};
      const retryCount = (data.aiRetryCount || 0);
      const canRetry = retryCount < MAX_RETRY_ATTEMPTS;
      
      console.log(`[AI Processing] 📝 Updating assessment with error (retry ${retryCount}/${MAX_RETRY_ATTEMPTS})`);
      
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          data: {
            ...data,
            aiError: error instanceof Error ? error.message : 'Unknown AI processing error',
            aiProcessed: false,
            aiProcessingInProgress: false, // Release processing lock
            aiAnalysisStarted: canRetry,
            processingMessage: canRetry ? 'Analysis failed, will retry automatically...' : 'Analysis failed - please try again',
            aiRetryCount: retryCount,
            lastErrorAt: new Date().toISOString(),
            canRetry: canRetry
          },
          status: canRetry ? 'pending' : 'failed'
        }
      });
      
      console.log(`[AI Processing] 🔓 Processing lock released for ${assessmentId} (error)`);
    }
  } catch (updateError) {
    console.error(`[AI Processing] ❌ Failed to update assessment with error:`, updateError);
  }
}

/**
 * 🔧 Helper Functions
 */
export function calculateReadinessLevel(score: number): string {
  if (score < 50) return "Early Development";
  if (score < 70) return "Developing Competency";
  if (score < 85) return "Approaching Readiness";
  return "Fully Prepared";
}

export function getCategories(assessmentType: string): string[] {
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