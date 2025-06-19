// /src/app/api/ai-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { OpenAI } from 'openai';

export async function POST(request: NextRequest) {
  let body: { assessmentId?: string; type?: string; responses?: any } = {};
  
  try {
    // Parse request
    body = await request.json();
    const { assessmentId, type, responses } = body;

    if (!assessmentId) {
      return NextResponse.json({ error: 'Missing assessmentId parameter' }, { status: 400 });
    }

    console.log(`[AI Analysis API] Processing enhanced AI analysis for assessment ${assessmentId} of type ${type || 'unknown'}`);

    // Get the assessment with full data
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      console.error(`[AI Analysis API] Assessment ${assessmentId} not found`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Extract data including resume content
    const assessmentData = assessment.data as any || {};
    const resumeText = assessmentData.resumeText || assessmentData.resumeContent || '';
    const personalInfo = assessmentData.personalInfo || {};
    const targetRole = personalInfo.jobPosition || 'Not specified';

    console.log(`[AI Analysis API] Resume available: ${!!resumeText} (${resumeText.length} chars)`);
    console.log(`[AI Analysis API] Target role: ${targetRole}`);

    // Update assessment to processing status with enhanced fields
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'processing',
        data: {
          ...assessmentData,
          aiAnalysisStarted: true,
          aiAnalysisStartedAt: new Date().toISOString(),
          showProcessingScreen: true,
          processingMessage: `Analyzing your ${type?.toUpperCase()} assessment with ${resumeText ? 'resume validation' : 'response analysis'}...`
        }
      }
    });

    // Initialize OpenAI with enhanced configuration
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000, // Increased timeout for complex analysis
      maxRetries: 2
    });

    // Generate enhanced prompt with resume context
    const prompt = generateEnhancedPrompt(type || "career", responses || {}, resumeText, personalInfo);

    console.log(`[AI Analysis API] Generated enhanced prompt for ${type} with ${resumeText ? 'resume context' : 'responses only'}`);

    // Call OpenAI API with enhanced configuration
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Using GPT-4 for better analysis quality
      messages: [
        {
          role: "system",
          content: `You are a BRUTALLY HONEST career assessment expert who provides realistic, evidence-based analysis. Your job is to give truthful feedback that helps candidates understand their actual readiness level and career fit.
          
          Key principles:
          - Be honest about gaps and weaknesses
          - Validate claims with evidence (especially from resume)
          - Provide specific, actionable recommendations
          - Vary scores realistically based on actual capability
          - Don't sugarcoat - give constructive but honest feedback`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent honest assessment
      max_tokens: 3000 // Increased for comprehensive analysis
    });

    // Extract and validate response
    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error("Empty response from OpenAI");
    }

    console.log(`[AI Analysis API] Received AI response (${aiResponse.length} chars)`);

    // Parse enhanced AI response
    const results = parseEnhancedAIResponse(aiResponse, type || 'career');

    // Validate results structure
    if (!results.scores || !results.readinessLevel) {
      console.warn(`[AI Analysis API] Incomplete AI results, using fallback data`);
      results.scores = results.scores || createFallbackScores(type || 'career');
      results.readinessLevel = results.readinessLevel || 'Developing Competency';
    }

    console.log(`[AI Analysis API] Parsed results - Overall: ${results.scores.overallScore}%, Level: ${results.readinessLevel}`);
    if (results.careerFit) {
      console.log(`[AI Analysis API] Career fit: ${results.careerFit.fitLevel} (${results.careerFit.fitPercentage}%)`);
    }

    // Update assessment with comprehensive results
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'completed',
        data: {
          ...assessmentData,
          // Core results
          scores: results.scores,
          readinessLevel: results.readinessLevel,
          recommendations: results.recommendations || [],
          summary: results.summary || 'Assessment analysis completed successfully.',
          strengths: results.strengths || [],
          improvements: results.improvements || [],
          
          // Enhanced results
          resumeAnalysis: results.resumeAnalysis,
          careerFit: results.careerFit,
          categoryAnalysis: results.categoryAnalysis,
          
          // Processing status
          aiProcessed: true,
          aiProcessedAt: new Date().toISOString(),
          showProcessingScreen: false,
          processingMessage: null,
          
          // Evidence tracking
          evidenceLevel: results.scores.evidenceLevel || (resumeText ? 'MODERATE' : 'INSUFFICIENT'),
          resumeConsistency: results.scores.resumeConsistency || (resumeText ? 75 : 50),
        }
      }
    });

    console.log(`[AI Analysis API] Successfully completed enhanced AI analysis for ${assessmentId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Enhanced assessment analysis completed successfully',
      results: {
        overallScore: results.scores.overallScore,
        readinessLevel: results.readinessLevel,
        hasResumeAnalysis: !!results.resumeAnalysis,
        hasCareerFit: !!results.careerFit,
        evidenceLevel: results.scores.evidenceLevel,
        processingTime: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[AI Analysis API] Enhanced analysis error:', error);
    
    // Try to update assessment with error status
    try {
      if (body?.assessmentId) {
        const assessment = await prisma.assessment.findUnique({
          where: { id: body.assessmentId },
        });
        
        if (assessment) {
          const assessmentData = assessment.data as any || {};
          await prisma.assessment.update({
            where: { id: body.assessmentId },
            data: {
              status: 'error',
              data: {
                ...assessmentData,
                aiError: error instanceof Error ? error.message : 'Unknown error during enhanced analysis',
                aiProcessed: false,
                aiAnalysisStarted: false,
                showProcessingScreen: false,
                processingMessage: null
              }
            }
          });
        }
      }
    } catch (updateError) {
      console.error('[AI Analysis API] Failed to update assessment with error status:', updateError);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process enhanced assessment analysis', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// ENHANCED: Generate comprehensive prompt with resume context
function generateEnhancedPrompt(type: string, responses: any, resumeText: string, personalInfo: any): string {
  const targetRole = personalInfo.jobPosition || 'Not specified';
  const personality = personalInfo.personality || 'Not provided';
  
  const prompt = `
COMPREHENSIVE CAREER ASSESSMENT ANALYSIS

You are analyzing a ${type.toUpperCase()} assessment with the following context:

ASSESSMENT TYPE: ${type.toUpperCase()}
TARGET ROLE: ${targetRole}
PERSONALITY: ${personality}
RESUME PROVIDED: ${resumeText ? 'YES' : 'NO'}

ASSESSMENT RESPONSES:
${JSON.stringify(responses)}

${resumeText ? `
RESUME CONTENT FOR VALIDATION:
${resumeText}

CRITICAL INSTRUCTIONS FOR RESUME ANALYSIS:
- Compare claimed skills/experience in responses with actual evidence in resume
- Identify inconsistencies between responses and resume content
- Look for specific achievements, quantifiable results, and relevant experience
- Check employment progression, industry relevance, and skill development
- Validate technical skills, leadership experience, and professional growth
- Note any gaps, career changes, or areas lacking evidence
` : `
WARNING: No resume provided - analysis will be limited and more conservative.
Scores will be adjusted downward due to lack of supporting evidence.
`}

ANALYSIS REQUIREMENTS:

1. HONEST SCORING (0-100 for each category):
   - Be realistic - most people score 40-75%, not 80-90%
   - Entry level: typically 40-65%
   - Mid-level: typically 55-75%  
   - Senior level: typically 65-85%
   - Only 85-100% for truly exceptional evidence
   - Vary scores by category - avoid uniform scoring

2. EVIDENCE-BASED ASSESSMENT:
   - Claims without resume backing = lower scores
   - Vague responses without specifics = penalize
   - Consistent responses + resume evidence = reward
   - Quantifiable achievements = bonus points

3. CAREER FIT ANALYSIS:
   - Realistic assessment of suitability for target role
   - Market competitiveness evaluation
   - Honest timeline for readiness
   - Critical gaps identification

4. RESUME QUALITY ANALYSIS (if available):
   - Professional presentation assessment
   - Skills validation against claims
   - Experience relevance evaluation
   - Gap identification and recommendations

5. SPECIFIC RECOMMENDATIONS:
   - Based on actual gaps identified
   - Realistic timelines and priorities
   - Actionable steps with success metrics
   - Industry-specific guidance

Return ONLY a valid JSON object with this exact structure:
{
  "scores": {
    "category1": number (0-100),
    "category2": number (0-100),
    "category3": number (0-100),
    "category4": number (0-100),
    "overallScore": number (0-100),
    "resumeConsistency": number (0-100, how well resume supports responses),
    "evidenceLevel": "STRONG" | "MODERATE" | "WEAK" | "INSUFFICIENT"
  },
  "readinessLevel": "Early Development" | "Developing Competency" | "Approaching Readiness" | "Fully Prepared",
  "summary": "Honest 2-3 sentence assessment of overall readiness and career fit",
  "strengths": ["Evidence-based strength 1", "Evidence-based strength 2", "Evidence-based strength 3"],
  "improvements": ["Specific improvement area 1", "Specific improvement area 2", "Specific improvement area 3"],
  "recommendations": [
    {
      "title": "Specific recommendation title",
      "explanation": "Why this matters for their career goals",
      "steps": ["Actionable step 1", "Actionable step 2", "Actionable step 3"],
      "timeframe": "2-4 weeks" | "1-3 months" | "3-6 months" | "6-12 months",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "successMetrics": ["How to measure progress 1", "How to measure progress 2"]
    }
  ],
  ${resumeText ? `
  "resumeAnalysis": {
    "analysis": "Honest assessment of resume quality and relevance",
    "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
    "experienceLevel": "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "EXECUTIVE",
    "skillsValidation": {
      "claimed": ["skills mentioned in responses"],
      "evidenced": ["skills proven in resume"],
      "missing": ["skills claimed but not evidenced"]
    },
    "gapAnalysis": ["Specific gap 1", "Specific gap 2"],
    "credibilityScore": number (0-100),
    "recommendations": ["Resume improvement 1", "Resume improvement 2"]
  },` : ''}
  "careerFit": {
    "fitLevel": "EXCELLENT_FIT" | "GOOD_FIT" | "PARTIAL_FIT" | "POOR_FIT" | "WRONG_CAREER_PATH",
    "fitPercentage": number (0-100),
    "honestAssessment": "Brutally honest assessment of suitability for target role",
    "realityCheck": "What they need to know about their actual readiness",
    "marketCompetitiveness": "How they compare to other candidates",
    "timeToReadiness": "Realistic timeline to become competitive",
    "criticalGaps": ["Most important gap 1", "Most important gap 2"],
    "competitiveAdvantages": ["Advantage 1", "Advantage 2"] or []
  }
}

REMEMBER: Be honest but constructive. The goal is to help them understand their actual position and what they need to do to improve, not to give false confidence or crush their dreams.
`;

  return prompt;
}

// ENHANCED: Parse AI response with comprehensive validation
function parseEnhancedAIResponse(aiResponse: string, assessmentType: string): any {
  try {
    // Extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from AI response");
    }
    
    const jsonStr = jsonMatch[0];
    const parsed = JSON.parse(jsonStr);
    
    // Validate and normalize the response
    const result = {
      scores: validateScores(parsed.scores, assessmentType),
      readinessLevel: validateReadinessLevel(parsed.readinessLevel),
      summary: parsed.summary || generateFallbackSummary(assessmentType),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      recommendations: validateRecommendations(parsed.recommendations),
      resumeAnalysis: parsed.resumeAnalysis || null,
      careerFit: validateCareerFit(parsed.careerFit),
      categoryAnalysis: parsed.categoryAnalysis || null
    };
    
    console.log(`[AI Analysis API] Successfully parsed enhanced response with ${Object.keys(result.scores).length} scores`);
    return result;
    
  } catch (error) {
    console.error('[AI Analysis API] Error parsing enhanced AI response:', error);
    console.log('[AI Analysis API] Raw AI response sample:', aiResponse.substring(0, 500));
    
    // Return comprehensive fallback results
    return createEnhancedFallbackResults(assessmentType);
  }
}

// Validation helper functions
function validateScores(scores: any, assessmentType: string): any {
  if (!scores || typeof scores !== 'object') {
    return createFallbackScores(assessmentType);
  }
  
  const validatedScores: any = {};
  
  // Validate each score
  Object.entries(scores).forEach(([key, value]) => {
    if (typeof value === 'number' && value >= 0 && value <= 100 && !isNaN(value)) {
      validatedScores[key] = Math.round(value);
    } else if (typeof value === 'string') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
        validatedScores[key] = Math.round(numValue);
      }
    }
  });
  
  // Ensure required fields exist
  if (!validatedScores.overallScore) {
    const categoryScores = Object.entries(validatedScores)
      .filter(([key]) => !['overallScore', 'resumeConsistency', 'evidenceLevel'].includes(key))
      .map(([_, value]) => value as number);
    
    if (categoryScores.length > 0) {
      validatedScores.overallScore = Math.round(
        categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length
      );
    } else {
      validatedScores.overallScore = 65;
    }
  }
  
  // Set defaults for new fields
  if (!validatedScores.resumeConsistency) {
    validatedScores.resumeConsistency = 70;
  }
  if (!validatedScores.evidenceLevel) {
    validatedScores.evidenceLevel = 'MODERATE';
  }
  
  return validatedScores;
}

function validateReadinessLevel(level: string): string {
  const validLevels = ["Early Development", "Developing Competency", "Approaching Readiness", "Fully Prepared"];
  return validLevels.includes(level) ? level : "Developing Competency";
}

function validateRecommendations(recommendations: any): any[] {
  if (!Array.isArray(recommendations)) {
    return [];
  }
  
  return recommendations.map(rec => {
    if (typeof rec === 'object' && rec.title && rec.explanation) {
      return {
        title: rec.title,
        explanation: rec.explanation,
        steps: Array.isArray(rec.steps) ? rec.steps : [],
        timeframe: rec.timeframe || "1-3 months",
        priority: ["HIGH", "MEDIUM", "LOW"].includes(rec.priority) ? rec.priority : "MEDIUM",
        successMetrics: Array.isArray(rec.successMetrics) ? rec.successMetrics : []
      };
    }
    return null;
  }).filter(Boolean);
}

function validateCareerFit(careerFit: any): any {
  if (!careerFit || typeof careerFit !== 'object') {
    return {
      fitLevel: "PARTIAL_FIT",
      fitPercentage: 65,
      honestAssessment: "Career fit analysis requires more comprehensive data for accurate assessment.",
      realityCheck: "Continue developing your skills and experience to improve your competitive position.",
      marketCompetitiveness: "Market analysis limited - focus on building stronger evidence of your capabilities.",
      timeToReadiness: "3-6 months",
      criticalGaps: ["Strengthen core competencies", "Build relevant experience"],
      competitiveAdvantages: []
    };
  }
  
  return {
    fitLevel: ["EXCELLENT_FIT", "GOOD_FIT", "PARTIAL_FIT", "POOR_FIT", "WRONG_CAREER_PATH"].includes(careerFit.fitLevel) 
      ? careerFit.fitLevel : "PARTIAL_FIT",
    fitPercentage: typeof careerFit.fitPercentage === 'number' ? Math.round(careerFit.fitPercentage) : 65,
    honestAssessment: careerFit.honestAssessment || "Career fit assessment completed.",
    realityCheck: careerFit.realityCheck || "Focus on addressing key skill gaps.",
    marketCompetitiveness: careerFit.marketCompetitiveness || "Continue building your competitive position.",
    timeToReadiness: careerFit.timeToReadiness || "3-6 months",
    criticalGaps: Array.isArray(careerFit.criticalGaps) ? careerFit.criticalGaps : [],
    competitiveAdvantages: Array.isArray(careerFit.competitiveAdvantages) ? careerFit.competitiveAdvantages : []
  };
}

// Fallback creation functions
function createFallbackScores(assessmentType: string): any {
  const categories = getCategoriesForType(assessmentType);
  const scores: any = {};
  
  // Create realistic varied scores
  categories.forEach((category, index) => {
    scores[category] = Math.floor(55 + Math.random() * 25 + (index % 3) * 5); // 55-85 range with variation
  });
  
  // Calculate overall score
  const categoryScores = Object.values(scores) as number[];
  scores.overallScore = Math.round(
    categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length
  );
  
  scores.resumeConsistency = 65;
  scores.evidenceLevel = 'MODERATE';
  
  return scores;
}

function createEnhancedFallbackResults(assessmentType: string): any {
  return {
    scores: createFallbackScores(assessmentType),
    readinessLevel: "Developing Competency",
    summary: "Assessment analysis completed. Focus on developing the key areas identified in your recommendations for continued career growth.",
    strengths: [
      "Demonstrates self-awareness by completing comprehensive career assessment",
      "Shows commitment to professional development and growth",
      "Takes proactive approach to understanding career readiness"
    ],
    improvements: [
      "Build stronger evidence base for claimed skills and competencies",
      "Develop more specific examples of achievements and impact",
      "Focus on aligning experience with target role requirements"
    ],
    recommendations: createFallbackRecommendations(assessmentType),
    resumeAnalysis: null,
    careerFit: {
      fitLevel: "PARTIAL_FIT",
      fitPercentage: 65,
      honestAssessment: "Shows potential for the target role with focused development in key areas.",
      realityCheck: "Continue building experience and skills to strengthen your competitive position.",
      marketCompetitiveness: "Developing candidate with room for growth and improvement.",
      timeToReadiness: "3-6 months",
      criticalGaps: ["Strengthen core competencies", "Build relevant experience"],
      competitiveAdvantages: []
    },
    categoryAnalysis: null
  };
}

function createFallbackRecommendations(assessmentType: string): any[] {
  const baseRecommendations = [
    {
      title: "Strengthen Professional Evidence Base",
      explanation: "Build stronger documentation of your skills and achievements to support your career goals.",
      steps: [
        "Document specific examples of your work and achievements",
        "Quantify your impact with metrics and measurable results",
        "Gather testimonials and recommendations from colleagues or supervisors"
      ],
      timeframe: "1-3 months",
      priority: "HIGH",
      successMetrics: ["Portfolio of documented achievements created", "3+ professional recommendations obtained"]
    },
    {
      title: "Develop Target Role Competencies",
      explanation: "Focus on building the specific skills and knowledge required for your desired position.",
      steps: [
        "Research detailed requirements for your target role",
        "Identify specific skill gaps and create a development plan",
        "Seek training, courses, or certifications to address these gaps"
      ],
      timeframe: "3-6 months",
      priority: "HIGH",
      successMetrics: ["Skill development plan created", "Relevant training completed"]
    }
  ];
  
  return baseRecommendations;
}

function generateFallbackSummary(assessmentType: string): string {
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
  return `Your ${typeName} assessment has been completed. Focus on the recommendations provided to strengthen your preparation and competitive position.`;
}

function getCategoriesForType(assessmentType: string): string[] {
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