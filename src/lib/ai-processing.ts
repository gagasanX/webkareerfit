// /src/lib/ai-processing.ts
import OpenAI from 'openai';
import { prisma } from '@/lib/db';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔥 NEW: Processing lock management
const PROCESSING_TIMEOUT = 10 * 60 * 1000; // 10 minutes max processing time
const CONCURRENT_LOCK_TIME = 5 * 60 * 1000; // 5 minutes to prevent concurrent processing
const MAX_RETRY_ATTEMPTS = 3;

// ENHANCED: Main function with comprehensive locking and state management
export async function processAssessmentWithAI(assessmentId: string, assessmentType: string): Promise<void> {
  console.log(`[AI Processing] 🚀 Starting ENHANCED AI analysis for ${assessmentType} assessment: ${assessmentId}`);
  
  try {
    // 🔥 STEP 1: Get assessment data with lock check
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    });
    
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }
    
    const data = assessment.data as Record<string, any> || {};
    
    // 🔥 STEP 2: CRITICAL PROCESSING LOCKS - Prevent duplicate processing
    console.log(`[AI Processing] 🔍 Checking processing status for ${assessmentId}`);
    
    // Check if already completed
    if (data.aiProcessed === true) {
      console.log(`[AI Processing] ✅ Assessment ${assessmentId} already processed successfully, skipping`);
      return;
    }
    
    // Check if failed and mark for retry if needed
    if (data.aiError && data.aiRetryCount >= MAX_RETRY_ATTEMPTS) {
      console.log(`[AI Processing] ❌ Assessment ${assessmentId} failed after ${MAX_RETRY_ATTEMPTS} attempts, not retrying`);
      return;
    }
    
    // Check if currently being processed by another instance
    if (data.aiAnalysisStarted === true && data.aiProcessingInProgress === true) {
      const processingStarted = new Date(data.aiAnalysisStartedAt || new Date());
      const now = new Date();
      const timeDiff = now.getTime() - processingStarted.getTime();
      
      if (timeDiff < CONCURRENT_LOCK_TIME) {
        console.log(`[AI Processing] ⏭️ Assessment ${assessmentId} currently being processed by another instance (${Math.round(timeDiff/1000)}s ago), skipping`);
        return;
      } else if (timeDiff > PROCESSING_TIMEOUT) {
        console.log(`[AI Processing] ⚠️ Processing seems stuck for ${Math.round(timeDiff/60000)}min, resetting and continuing...`);
        // Reset stuck processing
        await resetProcessingState(assessmentId);
      } else {
        console.log(`[AI Processing] ⏳ Concurrent processing detected but within timeout, waiting...`);
        return;
      }
    }
    
    // 🔥 STEP 3: Validate required data
    const responses = data.responses;
    const resumeText = data.resumeText || data.resumeContent || '';
    const personalInfo = data.personalInfo || {};
    
    if (!responses) {
      throw new Error('No responses found in assessment data');
    }
    
    console.log(`[AI Processing] 📋 Assessment data validated for ${assessmentId}`);
    console.log(`[AI Processing] 📄 Resume available: ${!!resumeText} (${resumeText.length} chars)`);
    console.log(`[AI Processing] 🎯 Target role: ${personalInfo.jobPosition || 'Not specified'}`);
    
    // 🔥 STEP 4: IMMEDIATELY mark as processing to prevent concurrent runs
    console.log(`[AI Processing] 🔒 Acquiring processing lock for ${assessmentId}`);
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        data: {
          ...data,
          aiAnalysisStarted: true,
          aiAnalysisStartedAt: new Date().toISOString(),
          aiProcessed: false,
          aiProcessingInProgress: true,
          aiError: null, // Clear previous errors
          aiRetryCount: (data.aiRetryCount || 0) + 1,
          showProcessingScreen: true,
          processingMessage: 'AI analysis in progress...'
        },
        status: 'processing'
      }
    });
    
    console.log(`[AI Processing] 🔒 Processing lock acquired, starting analysis...`);
    
    // 🔥 STEP 5: Sequential AI processing with delays to avoid rate limits
    console.log('[AI Processing] 🧠 Starting sequential AI analysis to avoid rate limits...');
    
    // Process scores first
    console.log('[AI Processing] 📊 Processing scores...');
    const scoresResult = await processScores(responses, assessmentType, resumeText, personalInfo);
    await delay(2000); // 2 second delay
    
    // Process resume analysis  
    console.log('[AI Processing] 📄 Processing resume analysis...');
    const resumeAnalysis = await processResumeAnalysis(resumeText, responses, assessmentType, personalInfo);
    await delay(2000); // 2 second delay
    
    // Process career fit
    console.log('[AI Processing] 🎯 Processing career fit analysis...');
    const careerFit = await assessCareerFit(responses, assessmentType, personalInfo.jobPosition || '', resumeText);
    await delay(2000); // 2 second delay
    
    // Process recommendations
    console.log('[AI Processing] 💡 Processing recommendations...');
    const recommendations = await processRecommendations(responses, assessmentType, resumeText, personalInfo);
    await delay(1000); // 1 second delay
    
    // Process strengths and improvements (use fallbacks to avoid more API calls)
    console.log('[AI Processing] ⚡ Processing strengths and improvements...');
    const strengths = await processStrengthsSimple(responses, assessmentType, resumeText);
    const improvements = await processImprovementsSimple(responses, assessmentType, resumeText);
    
    // 🔥 STEP 6: Extract and validate results
    const scores = scoresResult.scores;
    const evidenceLevel = scoresResult.evidenceLevel;
    
    // Calculate readiness level from overall score
    const overallScore = scores.overallScore || 70;
    const readinessLevel = calculateReadinessLevel(overallScore);
    
    // 🔥 STEP 7: Create comprehensive assessment data
    const processedData = {
      ...data,
      scores,
      recommendations,
      strengths,
      improvements,
      resumeAnalysis,
      careerFit,
      evidenceLevel,
      resumeConsistency: scores.resumeConsistency,
      readinessLevel,
      summary: generateEnhancedSummary(overallScore, readinessLevel, assessmentType, careerFit, resumeAnalysis),
      
      // 🔥 CRITICAL: Mark as completed and clear processing flags
      aiProcessed: true,
      aiProcessedAt: new Date().toISOString(),
      aiAnalysisStarted: true,
      aiAnalysisStartedAt: data.aiAnalysisStartedAt,
      aiProcessingInProgress: false, // Clear processing flag
      aiError: null, // Clear any previous errors
      showProcessingScreen: false, // Hide processing screen
      processingMessage: null // Clear processing message
    };
    
    // 🔥 STEP 8: Update assessment with final results
    console.log(`[AI Processing] 💾 Saving final results for ${assessmentId}`);
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        data: processedData,
        status: 'completed'
      }
    });
    
    console.log(`[AI Processing] ✅ Successfully completed ENHANCED AI analysis for ${assessmentId}`);
    console.log(`[AI Processing] 📊 Overall score: ${overallScore}% | Readiness: ${readinessLevel}`);
    console.log(`[AI Processing] 🎯 Career fit: ${careerFit.fitLevel} (${careerFit.fitPercentage}%)`);
    console.log(`[AI Processing] 🔓 Processing lock released for ${assessmentId}`);
    
  } catch (error) {
    console.error(`[AI Processing] ❌ Error processing assessment ${assessmentId}:`, error);
    
    // 🔥 STEP 9: Enhanced error handling with retry logic
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
              aiAnalysisStarted: canRetry, // Keep started flag if can retry
              showProcessingScreen: false,
              processingMessage: canRetry ? 'Analysis failed, will retry...' : 'Analysis failed',
              aiRetryCount: retryCount,
              lastErrorAt: new Date().toISOString()
            },
            status: canRetry ? 'pending' : 'failed'
          }
        });
        
        console.log(`[AI Processing] 🔓 Processing lock released for ${assessmentId} (error)`);
      }
    } catch (updateError) {
      console.error(`[AI Processing] ❌ Failed to update assessment with error:`, updateError);
    }
    
    throw error;
  }
}

// 🔥 NEW: Helper function to reset stuck processing state
async function resetProcessingState(assessmentId: string): Promise<void> {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    });
    
    if (assessment) {
      const data = assessment.data as Record<string, any> || {};
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          data: {
            ...data,
            aiProcessingInProgress: false,
            showProcessingScreen: false,
            processingMessage: null,
            aiAnalysisStarted: false
          }
        }
      });
      console.log(`[AI Processing] 🔄 Reset processing state for ${assessmentId}`);
    }
  } catch (error) {
    console.error(`[AI Processing] ❌ Failed to reset processing state:`, error);
  }
}

// 🔥 NEW: Delay helper function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ENHANCED: Process scores with resume context and honest assessment
export async function processScores(
  responses: any, 
  assessmentType: string, 
  resumeText: string = '', 
  personalInfo: any = {}
) {
  console.log('[AI Processing] 📊 Processing scores with resume context');
  
  const categories = getCategories(assessmentType);
  const targetRole = personalInfo.jobPosition || 'Not specified';
  
  try {
    const prompt = `
You are a BRUTALLY HONEST career assessment expert analyzing a ${assessmentType.toUpperCase()} assessment.

CRITICAL CONTEXT:
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
- Check for employment gaps, progression, industry relevance
` : `
WARNING: No resume provided - assessment accuracy is limited without evidence validation.
Scoring will be more conservative due to lack of supporting documentation.
`}

SCORING PHILOSOPHY - BE REALISTIC:
- Most people are NOT exceptional (scores 85-100 should be rare)
- Entry level roles: expect 40-65% scores typically
- Mid-level roles: expect 55-75% scores typically  
- Senior roles: expect 65-85% scores typically
- Only give 85-100% for truly outstanding evidence

SCORING GUIDELINES (BE STRICT):
- 0-40: Significant preparation needed, major gaps identified
- 41-60: Basic foundation exists, substantial development required
- 61-75: Approaching competency, targeted improvements needed
- 76-85: Strong candidate, minor refinements needed
- 86-100: Exceptional readiness (RARE - only for outstanding evidence)

EVIDENCE REQUIREMENTS:
- Vague responses without resume backing = lower scores
- Specific examples with resume validation = higher scores
- Claims not supported by experience = penalize heavily
- Consistency between responses and resume = reward appropriately

Categories to analyze: ${categories.join(', ')}

IMPORTANT: Vary scores realistically - avoid uniform scoring. Each category should reflect different strengths/weaknesses based on actual evidence.

Return ONLY valid JSON:
{
  "${categories.join('": number,\n  "')}": number,
  "overallScore": number,
  "resumeConsistency": number,
  "evidenceLevel": "STRONG" | "MODERATE" | "WEAK" | "INSUFFICIENT"
}
`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        { 
          role: 'system', 
          content: 'You are a brutally honest career assessment expert. Your job is to provide realistic, evidence-based scoring that helps candidates understand their actual readiness level. Do not sugarcoat - be truthful about gaps and weaknesses.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1200,
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    // Validate and adjust scores for realism
    const validatedScores = validateAndAdjustScores(result, responses, resumeText);
    const evidenceLevel = result.evidenceLevel || (resumeText ? 'MODERATE' : 'INSUFFICIENT');
    
    console.log('[AI Processing] ✅ Scores processed successfully with evidence level:', evidenceLevel);
    return {
      scores: validatedScores,
      evidenceLevel: evidenceLevel
    };
  } catch (error) {
    console.error('[AI Processing] ❌ Error processing scores:', error);
    return {
      scores: createFallbackScores(assessmentType),
      evidenceLevel: 'INSUFFICIENT'
    };
  }
}

// NEW: Comprehensive resume analysis
export async function processResumeAnalysis(
  resumeText: string, 
  responses: any, 
  assessmentType: string, 
  personalInfo: any
) {
  console.log('[AI Processing] 📄 Processing resume analysis');
  
  if (!resumeText || resumeText.length < 50) {
    return {
      analysis: "No resume provided for analysis - assessment accuracy is limited",
      keyFindings: ["Assessment based on responses only", "Resume upload recommended for complete analysis"],
      experienceLevel: "UNKNOWN",
      skillsValidation: {
        claimed: [],
        evidenced: [],
        missing: []
      },
      gapAnalysis: ["Unable to identify specific gaps without resume"],
      credibilityScore: 50,
      recommendations: ["Upload resume for comprehensive analysis", "Provide specific examples in responses"]
    };
  }
  
  try {
    const targetRole = personalInfo.jobPosition || 'Not specified';
    
    const prompt = `
COMPREHENSIVE RESUME ANALYSIS FOR CAREER READINESS

Target Role: ${targetRole}
Assessment Type: ${assessmentType.toUpperCase()}

RESUME CONTENT:
${resumeText}

ASSESSMENT RESPONSES (for comparison):
${JSON.stringify(responses)}

Provide DETAILED HONEST analysis covering:

1. RESUME QUALITY ASSESSMENT:
   - Professional presentation and formatting
   - Clarity of achievements and responsibilities
   - Quantifiable results and impact metrics
   - Industry-relevant keywords and terminology

2. EXPERIENCE RELEVANCE:
   - How directly relevant is experience to target role
   - Career progression and growth trajectory
   - Industry alignment and transferable skills
   - Leadership and responsibility evolution

3. SKILLS VALIDATION:
   - Technical skills mentioned vs demonstrated
   - Soft skills evidenced through achievements
   - Certifications and education relevance
   - Skills claimed in responses vs proven in resume

4. CREDIBILITY CHECK:
   - Consistency between resume and assessment responses
   - Realistic progression and achievements
   - Specific vs vague accomplishments
   - Red flags or inconsistencies

5. GAP IDENTIFICATION:
   - Missing qualifications for target role
   - Experience gaps in key areas
   - Skills not demonstrated or mentioned
   - Industry knowledge limitations

Return ONLY valid JSON:
{
  "analysis": "2-3 sentence honest assessment of resume quality and career readiness",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3", "Finding 4"],
  "experienceLevel": "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "EXECUTIVE",
  "skillsValidation": {
    "claimed": ["skills mentioned in assessment responses"],
    "evidenced": ["skills actually demonstrated in resume with examples"],
    "missing": ["skills claimed in responses but not proven in resume"]
  },
  "gapAnalysis": ["Specific gap 1", "Specific gap 2", "Specific gap 3"],
  "credibilityScore": number (0-100),
  "recommendations": ["Specific resume improvement 1", "Specific resume improvement 2", "Specific resume improvement 3"]
}
`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        { role: 'system', content: 'You are an expert resume analyst and career advisor who provides honest, detailed feedback.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1800,
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    console.log('[AI Processing] ✅ Resume analysis completed successfully');
    return result;
  } catch (error) {
    console.error('[AI Processing] ❌ Error analyzing resume:', error);
    return {
      analysis: "Resume analysis unavailable due to processing error",
      keyFindings: ["Analysis could not be completed"],
      experienceLevel: "UNKNOWN",
      skillsValidation: { claimed: [], evidenced: [], missing: [] },
      gapAnalysis: ["Analysis unavailable"],
      credibilityScore: 50,
      recommendations: ["Retry analysis or contact support"]
    };
  }
}

// NEW: Career fit assessment with resume context
export async function assessCareerFit(
  responses: any, 
  assessmentType: string, 
  targetRole: string, 
  resumeText: string = ''
) {
  console.log('[AI Processing] 🎯 Assessing career fit');
  
  try {
    const prompt = `
CAREER FIT ANALYSIS - BRUTALLY HONEST ASSESSMENT

Target Role: ${targetRole}
Assessment Type: ${assessmentType.toUpperCase()}

ASSESSMENT RESPONSES:
${JSON.stringify(responses)}

${resumeText ? `
RESUME EVIDENCE:
${resumeText}
` : 'NOTE: No resume available - assessment based on responses only'}

ANALYSIS REQUIREMENTS:
Provide REALISTIC assessment of career fit considering:

1. ROLE REQUIREMENTS vs CURRENT CAPABILITY:
   - Technical skills required vs demonstrated
   - Experience level needed vs actual experience
   - Industry knowledge required vs current knowledge
   - Leadership/soft skills required vs evidenced

2. MARKET COMPETITIVENESS:
   - How candidate compares to typical applicants
   - Competitive advantages and disadvantages
   - Market demand for this role vs supply
   - Realistic chances in current job market

3. READINESS TIMELINE:
   - Immediate readiness vs development needed
   - Realistic time to become competitive
   - Critical gaps that must be addressed first
   - Prerequisites before pursuing this role

4. HONEST REALITY CHECK:
   - Is this a realistic career goal given current state?
   - What are the hard truths about their readiness?
   - Should they consider alternative paths?
   - What would make them truly competitive?

BE HONEST - Don't give false hope but also don't crush dreams unnecessarily.

Return ONLY valid JSON:
{
  "fitLevel": "EXCELLENT_FIT" | "GOOD_FIT" | "PARTIAL_FIT" | "POOR_FIT" | "WRONG_CAREER_PATH",
  "fitPercentage": number (0-100),
  "honestAssessment": "2-3 sentence brutally honest assessment of their suitability",
  "realityCheck": "What they ACTUALLY need to know about their current readiness",
  "marketCompetitiveness": "How they compare to other candidates realistically",
  "timeToReadiness": "6-12 weeks" | "3-6 months" | "6-12 months" | "1-2 years" | "2+ years",
  "criticalGaps": ["Most important gap 1", "Most important gap 2", "Most important gap 3"],
  "competitiveAdvantages": ["Advantage 1", "Advantage 2"] or []
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        { role: 'system', content: 'You are a brutally honest career advisor who tells hard truths to help people make realistic career decisions.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1200,
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    console.log(`[AI Processing] ✅ Career fit analysis completed: ${result.fitLevel} (${result.fitPercentage}%)`);
    return result;
  } catch (error) {
    console.error('[AI Processing] ❌ Error assessing career fit:', error);
    return {
      fitLevel: "PARTIAL_FIT",
      fitPercentage: 60,
      honestAssessment: "Unable to complete comprehensive career fit analysis due to processing error.",
      realityCheck: "Analysis incomplete - consider retaking assessment for better insights.",
      marketCompetitiveness: "Competitive analysis unavailable",
      timeToReadiness: "Unable to determine",
      criticalGaps: ["Analysis incomplete"],
      competitiveAdvantages: []
    };
  }
}

// ENHANCED: Process recommendations with resume context
export async function processRecommendations(
  responses: any, 
  assessmentType: string, 
  resumeText: string = '', 
  personalInfo: any = {}
) {
  console.log('[AI Processing] 💡 Processing recommendations with resume context');
  
  const targetRole = personalInfo.jobPosition || 'Not specified';
  
  try {
    const prompt = `
PERSONALIZED CAREER RECOMMENDATIONS WITH EVIDENCE BASE

Target Role: ${targetRole}
Assessment Type: ${assessmentType.toUpperCase()}

RESPONSES: ${JSON.stringify(responses)}

${resumeText ? `
RESUME CONTEXT: 
${resumeText}

Base recommendations on ACTUAL experience and gaps identified from resume analysis.
` : 'NOTE: Limited context - no resume provided. Recommendations will be more generic.'}

REQUIREMENTS:
Provide SPECIFIC, ACTIONABLE recommendations that address:

1. Critical gaps between current capability and target role requirements
2. Skills mentioned in responses but not evidenced in resume
3. Experience deficits that impact competitiveness
4. Industry-specific knowledge or certifications needed
5. Practical steps with realistic timelines

Each recommendation must be:
- Specific to their actual situation (not generic advice)
- Actionable with clear steps
- Realistic about time and effort required
- Prioritized by impact on career goals

Return ONLY valid JSON array of 3-5 recommendations:
[
  {
    "title": "Specific recommendation addressing actual gap identified",
    "explanation": "Why this specific gap matters for ${targetRole} and their career progression",
    "steps": ["Specific actionable step 1", "Specific actionable step 2", "Specific actionable step 3"],
    "timeframe": "2-4 weeks" | "1-3 months" | "3-6 months" | "6-12 months",
    "priority": "HIGH" | "MEDIUM" | "LOW",
    "successMetrics": ["How to measure progress 1", "How to measure progress 2"]
  }
]
`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        { role: 'system', content: 'You are a career advisor who provides specific, actionable recommendations based on actual gaps and evidence.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    const content = completion.choices[0]?.message?.content || '[]';
    
    // Handle both array and object responses
    let result;
    try {
      const parsed = JSON.parse(content);
      result = Array.isArray(parsed) ? parsed : (parsed.recommendations || []);
    } catch {
      result = [];
    }
    
    console.log('[AI Processing] ✅ Recommendations processed successfully:', result.length);
    return result.length > 0 ? result : createFallbackRecommendations(assessmentType);
  } catch (error) {
    console.error('[AI Processing] ❌ Error processing recommendations:', error);
    return createFallbackRecommendations(assessmentType);
  }
}

// Simple versions to avoid additional API calls
async function processStrengthsSimple(responses: any, assessmentType: string, resumeText: string): Promise<string[]> {
  if (resumeText && resumeText.length > 100) {
    return [
      "Provides supporting documentation (resume) for assessment validation",
      "Demonstrates thorough approach to career planning and preparation",
      "Shows self-awareness by seeking professional career assessment"
    ];
  } else {
    return [
      "Demonstrates self-awareness about career development needs",
      "Takes initiative to assess career readiness",
      "Shows interest in professional growth and advancement"
    ];
  }
}

async function processImprovementsSimple(responses: any, assessmentType: string, resumeText: string): Promise<string[]> {
  if (!resumeText || resumeText.length < 100) {
    return [
      "Provide supporting documentation (resume/portfolio) for better assessment accuracy",
      "Develop more specific examples of achievements and impact",
      "Build stronger evidence base for claimed competencies"
    ];
  } else {
    return [
      "Align experience more closely with target role requirements",
      "Strengthen technical skills specific to desired position",
      "Expand professional network in target industry"
    ];
  }
}

// ENHANCED: Generate honest summary with career fit context
function generateEnhancedSummary(
  overallScore: number, 
  readinessLevel: string, 
  assessmentType: string, 
  careerFit: any,
  resumeAnalysis: any
): string {
  const typeNames: Record<string, string> = {
    fjrl: 'first job readiness',
    ijrl: 'ideal job readiness', 
    cdrl: 'career development readiness',
    ccrl: 'career comeback readiness',
    ctrl: 'career transition readiness',
    rrl: 'retirement readiness',
    irl: 'internship readiness'
  };
  
  const typeName = typeNames[assessmentType.toLowerCase()] || 'career readiness';
  
  let honestFeedback = '';
  
  if (overallScore >= 85) {
    honestFeedback = `Excellent work! Your ${typeName} assessment shows exceptional preparation. You demonstrate strong competencies across key areas and are well-positioned for success.`;
  } else if (overallScore >= 70) {
    honestFeedback = `Good foundation! Your ${typeName} shows solid preparation with room for targeted improvements. Focus on strengthening the specific areas identified to become truly competitive.`;
  } else if (overallScore >= 50) {
    honestFeedback = `Honest feedback: Your ${typeName} indicates you're in the development phase. While you have some foundation, significant work is needed in key areas before you'll be market-ready.`;
  } else {
    honestFeedback = `Reality check: Your ${typeName} shows substantial gaps that must be addressed. Consider this assessment a roadmap for development rather than a green light - focused improvement is essential before pursuing your target role.`;
  }
  
  if (careerFit && careerFit.honestAssessment) {
    honestFeedback += ` ${careerFit.honestAssessment}`;
  }
  
  if (resumeAnalysis && resumeAnalysis.credibilityScore < 70) {
    honestFeedback += ` Your resume analysis suggests some gaps between claimed skills and demonstrated experience - focus on building stronger evidence for your capabilities.`;
  }
  
  return honestFeedback;
}

function validateAndAdjustScores(scores: any, responses: any, resumeText: string): any {
  const scoreValues = Object.entries(scores)
    .filter(([key]) => !['overallScore', 'resumeConsistency', 'evidenceLevel'].includes(key))
    .map(([_, value]) => Number(value));
  
  // Check for unrealistic uniformity
  const uniqueScores = new Set(scoreValues);
  if (uniqueScores.size === 1 && scoreValues.length > 3) {
    console.warn('Detected uniform scores - adding realistic variation');
    const baseScore = scoreValues[0];
    let adjustment = 0;
    Object.keys(scores).forEach(key => {
      if (!['overallScore', 'resumeConsistency', 'evidenceLevel'].includes(key)) {
        adjustment = Math.floor(Math.random() * 20) - 10;
        scores[key] = Math.max(15, Math.min(95, baseScore + adjustment));
      }
    });
  }
  
  // Apply reality check for overly generous scoring
  const avgScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
  if (avgScore > 80 && !resumeText) {
    console.warn('High scores without resume evidence - applying conservative adjustment');
    Object.keys(scores).forEach(key => {
      if (!['overallScore', 'resumeConsistency', 'evidenceLevel'].includes(key)) {
        scores[key] = Math.max(25, scores[key] - 12);
      }
    });
  }
  
  // Recalculate overall score
  const adjustedScoreValues = Object.entries(scores)
    .filter(([key]) => !['overallScore', 'resumeConsistency', 'evidenceLevel'].includes(key))
    .map(([_, value]) => Number(value));
  
  scores.overallScore = Math.round(
    adjustedScoreValues.reduce((sum, score) => sum + score, 0) / adjustedScoreValues.length
  );
  
  // Set default value for resumeConsistency
  if (!scores.resumeConsistency) {
    scores.resumeConsistency = resumeText ? 75 : 50;
  }
  
  return scores;
}

// Calculate readiness level from score
export function calculateReadinessLevel(score: number): string {
  if (score < 50) return "Early Development";
  if (score < 70) return "Developing Competency";
  if (score < 85) return "Approaching Readiness";
  return "Fully Prepared";
}

// Helper function to get categories
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

// Fallback functions
function createFallbackScores(assessmentType: string) {
  const categories = getCategories(assessmentType);
  const scores: Record<string, number> = {};
  
  categories.forEach(category => {
    scores[category] = Math.floor(50 + Math.random() * 25);
  });
  
  const sum = Object.values(scores).reduce((total, score) => total + score, 0);
  scores.overallScore = Math.round(sum / categories.length);
  scores.resumeConsistency = 50;
  
  return scores;
}

function createFallbackRecommendations(assessmentType: string) {
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
          ],
          timeframe: "1-3 months",
          priority: "HIGH",
          successMetrics: ["Portfolio website created", "LinkedIn profile optimized", "3+ recommendations obtained"]
        },
        {
          title: "Enhance Interview Skills Through Practice",
          explanation: "Effective interview performance is crucial for securing your first job.",
          steps: [
            "Research common interview questions in your field and practice responses",
            "Participate in mock interviews through your university career center",
            "Prepare specific examples demonstrating your skills and problem-solving abilities"
          ],
          timeframe: "2-4 weeks",
          priority: "HIGH",
          successMetrics: ["5+ mock interviews completed", "STAR method responses prepared", "Company research template created"]
        }
      ];
    case 'cdrl':
      return [
        {
          title: "Develop Strategic Leadership Skills",
          explanation: "Leadership capabilities are essential for career advancement and senior roles.",
          steps: [
            "Enroll in leadership development program or executive education course",
            "Seek leadership opportunities within current role or volunteer organizations",
            "Find a mentor who has successfully advanced to senior leadership positions"
          ],
          timeframe: "3-6 months",
          priority: "HIGH",
          successMetrics: ["Leadership program completed", "Team leadership role secured", "Mentor relationship established"]
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
          ],
          timeframe: "1-3 months",
          priority: "HIGH",
          successMetrics: ["Career plan documented", "Skill development plan created", "Progress tracking system established"]
        }
      ];
  }
}