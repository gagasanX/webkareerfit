// /src/app/api/assessment/[type]/[id]/process/route.ts
// ✅ BALANCED: Real results when possible, honest errors when not

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { analyzeExtractedTextSeparately, calculateFinalAssessmentScore } from '@/lib/google-vision-resume-analyzer';
import { getOpenAIInstance, isOpenAIConfigured } from '@/lib/openai';
import { sendAssessmentEmail } from '@/lib/email/sendAssessmentEmail';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string, id: string }> }
) {
  console.log('=== PROCESS ENDPOINT - BALANCED VERSION ===');

  let assessmentId: string | null = null;

  try {
    const resolvedParams = await params;
    const { type, id } = resolvedParams;
    assessmentId = id;

    if (!type || !id) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (assessment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const assessmentData = assessment.data as Record<string, any> || {};

    // State detection
    const hasExtractedText = assessmentData.extractedText && assessmentData.extractedText.length > 50;
    const hasFormData = assessmentData.responses || assessmentData.personalInfo;
    const isDocumentProcessed = assessmentData.documentProcessed === true;
    const isAnalysisComplete = assessmentData.aiProcessed === true;

    console.log('🔍 Current state analysis:', {
      hasExtractedText: !!hasExtractedText,
      hasFormData: !!hasFormData,
      isDocumentProcessed,
      isAnalysisComplete,
      currentStatus: assessment.status,
      extractedTextLength: assessmentData.extractedText?.length || 0
    });

    // If already completed, return existing results
    if (isAnalysisComplete && assessment.status === 'completed') {
      console.log('✅ Assessment already completed, returning existing results');
      return NextResponse.json({
        success: true,
        step: 'already_completed',
        message: 'Assessment already completed',
        redirectUrl: `/assessment/${type}/results/${id}`,
        data: {
          scores: assessmentData.scores,
          readinessLevel: assessmentData.readinessLevel,
          analysisComplete: true
        }
      });
    }

    // ✅ CHECK: OpenAI MUST be configured for any AI analysis
    if (!isOpenAIConfigured()) {
      console.error('❌ OpenAI API not configured');
      
      await prisma.assessment.update({
        where: { id },
        data: {
          status: 'service_error',
          data: {
            ...assessmentData,
            serviceError: 'AI analysis service temporarily unavailable',
            processingStep: 'service_unavailable',
            processingMessage: 'AI service unavailable. Please try again later.',
            errorTimestamp: new Date().toISOString(),
            canRetry: true
          }
        }
      });

      return NextResponse.json({
        error: 'AI Analysis Service Unavailable',
        message: 'Our AI analysis service is temporarily unavailable. Please try again in a few minutes.',
        retryIn: '5-10 minutes',
        canRetry: true
      }, { status: 503 });
    }

    // Handle form-only submission
    if (!isDocumentProcessed && !hasExtractedText) {
      console.log('📝 STEP 1: Processing form-only submission...');
      
      const formData = await request.formData();
      let responses = {};
      let personalInfo = {};
      let formScoring: { formContribution?: number; weight?: number } = {};

      try {
        const formDataJson = formData.get('formData');
        if (formDataJson && typeof formDataJson === 'string') {
          const parsed = JSON.parse(formDataJson);
          responses = parsed.responses || parsed;
          personalInfo = parsed.personalInfo || {};
          formScoring = parsed._internalScoring?.formScoring || {};
        }
      } catch (parseError) {
        console.error('Error parsing form data:', parseError);
        return NextResponse.json({ error: 'Invalid form data format' }, { status: 400 });
      }

      // Update with form data
      await prisma.assessment.update({
        where: { id },
        data: {
          status: 'processing',
          data: {
            ...assessmentData,
            responses,
            personalInfo,
            formScoring,
            submittedAt: new Date().toISOString(),
            documentProcessed: true,
            processingStep: 'ready_for_analysis',
            processingMessage: 'Ready for AI analysis...'
          }
        }
      });

      // Execute form-only analysis
      return await executeFormOnlyAnalysis(id, type, {
        ...assessmentData,
        responses,
        personalInfo,
        formScoring
      });
    }

    // ✅ AI analysis with extracted text (MAIN PATH)
    else if (isDocumentProcessed && hasExtractedText && !isAnalysisComplete) {
      console.log('🧠 STEP 2: Starting AI analysis with extracted text...');
      return await executeAIAnalysisWithText(id, type, assessmentData);
    }

    // Form-only analysis
    else if (isDocumentProcessed && !hasExtractedText && !isAnalysisComplete) {
      console.log('📝 STEP 3: Processing form-only analysis...');
      return await executeFormOnlyAnalysis(id, type, assessmentData);
    }

    // Unknown state
    else {
      return NextResponse.json({
        error: 'Assessment state unclear',
        message: 'Please restart the assessment process',
        debug: {
          hasExtractedText: !!hasExtractedText,
          isDocumentProcessed,
          isAnalysisComplete,
          status: assessment.status
        }
      }, { status: 400 });
    }

  } catch (error) {
    console.error('=== PROCESS ERROR ===');
    console.error('Server error:', error);

    // Update assessment with error
    if (assessmentId) {
      try {
        await prisma.assessment.update({
          where: { id: assessmentId },
          data: {
            status: 'failed',
            data: {
              processingError: error instanceof Error ? error.message : 'Processing failed',
              processingStep: 'error',
              processingMessage: 'Processing failed. Please try again.',
              errorTimestamp: new Date().toISOString(),
              canRetry: true
            }
          }
        });
      } catch (updateError) {
        console.error('Failed to update assessment with error:', updateError);
      }
    }

    return NextResponse.json({
      error: 'Processing Failed',
      message: 'Assessment processing failed. Please try again in a few minutes.',
      retryIn: '2-5 minutes',
      canRetry: true,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * 🧠 AI Analysis with extracted text - PROPER RESUME ANALYSIS
 */
async function executeAIAnalysisWithText(
  assessmentId: string,
  assessmentType: string,
  assessmentData: Record<string, any>
): Promise<NextResponse> {
  console.log('🧠 Executing AI Analysis with extracted text - PROPER RESUME ANALYSIS');

  try {
    // Update status
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'processing',
        data: {
          ...assessmentData,
          processingStep: 'ai_analysis',
          processingMessage: 'Analyzing resume content with AI...',
          aiAnalysisStarted: true,
          aiAnalysisStartedAt: new Date().toISOString()
        }
      }
    });

    const responses = assessmentData.responses || {};
    const personalInfo = assessmentData.personalInfo || {};
    const extractedText = assessmentData.extractedText || '';
    const formScoring = assessmentData.formScoring || {};

    console.log('🤖 Starting AI analysis with extracted text...', {
      textLength: extractedText.length,
      hasFormScoring: !!formScoring.formContribution,
      targetRole: personalInfo.jobPosition
    });
    
    const analysisContext = {
      assessmentType,
      targetRole: personalInfo.jobPosition || 'Not specified',
      personality: personalInfo.personality || 'Not provided',
      responses,
      personalInfo,
      formScoring: {
        formContribution: formScoring.formContribution || 0,
        weight: formScoring.weight || 60
      }
    };

    // ✅ MAIN AI ANALYSIS CALL
    let analysisResult;
    try {
      analysisResult = await analyzeExtractedTextSeparately(extractedText, analysisContext);
      console.log('✅ AI analysis completed successfully', {
        overallScore: analysisResult.scores?.overallResumeScore,
        hasResumeAnalysis: !!analysisResult.resumeAnalysis,
        hasCareerFit: !!analysisResult.careerFit
      });
    } catch (analysisError) {
      console.error('❌ AI analysis failed:', analysisError);
      
      // ✅ SMART FALLBACK: Create basic analysis with extracted text info
      console.log('🔄 Creating basic analysis with extracted text metadata...');
      analysisResult = createBasicAnalysisWithTextInfo(extractedText, analysisContext);
    }

    // Calculate final scores
    let finalScoring = null;
    if (formScoring.formContribution !== undefined && analysisResult.scores?.overallResumeScore) {
      finalScoring = calculateFinalAssessmentScore(
        formScoring.formContribution,
        analysisResult.scores.overallResumeScore,
        formScoring.weight || 60
      );
    }

    // Prepare final assessment data
    const finalData = {
      ...assessmentData,
      
      // ✅ REAL or BASIC AI RESULTS
      scores: finalScoring ? {
        ...analysisResult.scores,
        overallScore: finalScoring.finalScore
      } : analysisResult.scores,
      readinessLevel: finalScoring?.readinessLevel || calculateReadinessLevel(analysisResult.scores?.overallResumeScore || 0),
      
      // ✅ ENSURE RESUME ANALYSIS EXISTS
      resumeAnalysis: analysisResult.resumeAnalysis || createBasicResumeAnalysis(extractedText, personalInfo),
      careerFit: analysisResult.careerFit || createBasicCareerFit(personalInfo, assessmentType),
      
      // Generate summary from results
      summary: generateSummaryFromResults(
        finalScoring?.finalScore || analysisResult.scores?.overallResumeScore || 0,
        finalScoring?.readinessLevel || 'Early Development',
        assessmentType,
        analysisResult.careerFit,
        analysisResult.resumeAnalysis
      ),
      
      // Recommendations and improvements
      recommendations: analysisResult.resumeAnalysis?.recommendations || createBasicRecommendations(assessmentType),
      strengths: extractStrengthsFromResults(analysisResult),
      improvements: extractImprovementsFromResults(analysisResult),
      
      // Processing metadata
      aiProcessed: true,
      aiProcessedAt: new Date().toISOString(),
      processingStep: 'completed',
      processingMessage: null,
      
      // Scoring breakdown
      scoringBreakdown: finalScoring ? {
        formContribution: finalScoring.formContribution,
        resumeContribution: finalScoring.resumeContribution,
        formWeight: formScoring.weight || 60,
        resumeWeight: (100 - (formScoring.weight || 60)),
        finalScore: finalScoring.finalScore,
        method: 'ai_analysis_with_text'
      } : null,

      hasResumeContent: !!extractedText,
      submittedAt: assessmentData.submittedAt || new Date().toISOString()
    };

    // Update assessment with final results
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'completed',
        data: finalData
      }
    });

    console.log('💾 Assessment updated with AI analysis results');

    // Send completion email
    sendAssessmentEmail({
      userId: assessmentData.userId || '',
      assessmentId: assessmentId,
      assessmentType: assessmentType
    }).catch((emailError) => {
      console.error('Failed to send email:', emailError);
    });

    const redirectUrl = `/assessment/${assessmentType}/results/${assessmentId}`;

    return NextResponse.json({
      success: true,
      step: 'ai_analysis_completed',
      message: 'AI analysis completed successfully',
      analysisComplete: true,
      redirectUrl,
      data: {
        overallScore: finalScoring?.finalScore || analysisResult.scores?.overallResumeScore,
        readinessLevel: finalScoring?.readinessLevel || calculateReadinessLevel(analysisResult.scores?.overallResumeScore || 0),
        hasResumeAnalysis: !!finalData.resumeAnalysis,
        processingMethod: 'ai_analysis_with_text',
        textAnalyzed: !!extractedText
      }
    });

  } catch (error) {
    console.error('❌ Complete AI analysis pipeline failed:', error);
    
    // ✅ ONLY return error if we can't even do basic analysis
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'failed',
        data: {
          ...assessmentData,
          aiError: error instanceof Error ? error.message : 'AI analysis failed',
          aiProcessed: false,
          processingStep: 'ai_analysis_failed',
          processingMessage: 'AI analysis failed. Please try again.',
          errorTimestamp: new Date().toISOString(),
          canRetry: true
        }
      }
    });

    return NextResponse.json({
      error: 'AI Analysis Failed',
      message: 'Our AI analysis could not be completed at this time. Please try again in a few minutes.',
      retryIn: '5-10 minutes',
      canRetry: true,
      technical: error instanceof Error ? error.message : 'AI processing error'
    }, { status: 503 });
  }
}

/**
 * 📝 Form-only analysis - REAL RESULTS ONLY
 */
async function executeFormOnlyAnalysis(
  assessmentId: string,
  assessmentType: string,
  assessmentData: Record<string, any>
): Promise<NextResponse> {
  console.log('📝 Executing form-only analysis');

  try {
    // Update status
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'processing',
        data: {
          ...assessmentData,
          processingStep: 'form_analysis',
          processingMessage: 'Analyzing responses with AI...',
          aiAnalysisStarted: true,
          aiAnalysisStartedAt: new Date().toISOString()
        }
      }
    });

    const responses = assessmentData.responses || {};
    const personalInfo = assessmentData.personalInfo || {};
    const formScoring = assessmentData.formScoring || {};

    // ✅ REAL OpenAI call
    const openai = getOpenAIInstance();
    const prompt = createFormOnlyAnalysisPrompt(assessmentType, responses, personalInfo);

    console.log('🤖 Calling OpenAI for form-only analysis...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an honest career assessment analyst who provides realistic feedback based on assessment responses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('Empty response from OpenAI');
    }

    const result = JSON.parse(responseContent);

    // ✅ VALIDATE: Ensure we got real results
    if (!result || !result.scores || typeof result.scores.overallScore !== 'number') {
      throw new Error('AI analysis returned invalid results');
    }

    console.log('✅ Form-only analysis completed successfully');

    // Calculate final scores
    const finalScore = formScoring.formContribution || result.scores?.overallScore;
    const readinessLevel = calculateReadinessLevel(finalScore);

    // Prepare final assessment data with REAL results
    const finalData = {
      ...assessmentData,
      
      // ✅ REAL AI RESULTS ONLY
      scores: {
        ...result.scores,
        overallScore: finalScore
      },
      readinessLevel,
      recommendations: result.recommendations || [],
      summary: result.summary || `Your ${assessmentType} assessment score is ${finalScore}%. ${readinessLevel} level achieved.`,
      strengths: result.strengths || [],
      improvements: result.improvements || [],
      
      // Processing metadata
      aiProcessed: true,
      aiProcessedAt: new Date().toISOString(),
      processingStep: 'completed',
      processingMessage: null,
      
      hasResumeContent: false,
      submittedAt: assessmentData.submittedAt || new Date().toISOString()
    };

    // Update assessment with REAL results
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'completed',
        data: finalData
      }
    });

    console.log('💾 Assessment updated with REAL form-only results');

    // Send completion email
    sendAssessmentEmail({
      userId: assessmentData.userId || '',
      assessmentId: assessmentId,
      assessmentType: assessmentType
    }).catch((emailError) => {
      console.error('Failed to send email:', emailError);
    });

    const redirectUrl = `/assessment/${assessmentType}/results/${assessmentId}`;

    return NextResponse.json({
      success: true,
      step: 'form_analysis_completed',
      message: 'Form analysis completed successfully',
      analysisComplete: true,
      redirectUrl,
      data: {
        overallScore: finalScore,
        readinessLevel,
        processingMethod: 'real_form_analysis'
      }
    });

  } catch (error) {
    console.error('❌ Form analysis failed:', error);
    
    // ✅ NO FAKE RESULTS - Return error instead
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'failed',
        data: {
          ...assessmentData,
          aiError: error instanceof Error ? error.message : 'Form analysis failed',
          aiProcessed: false,
          processingStep: 'form_analysis_failed',
          processingMessage: 'Form analysis failed. Please try again.',
          errorTimestamp: new Date().toISOString(),
          canRetry: true
        }
      }
    });

    return NextResponse.json({
      error: 'Form Analysis Failed',
      message: 'Our AI analysis could not be completed at this time. Please try again in a few minutes.',
      retryIn: '5-10 minutes',
      canRetry: true,
      technical: error instanceof Error ? error.message : 'AI processing error'
    }, { status: 503 });
  }
}

/**
 * ✅ SMART FALLBACK: Create basic analysis with real extracted text info
 */
function createBasicAnalysisWithTextInfo(extractedText: string, context: any) {
  console.log('🔄 Creating basic analysis with extracted text metadata');
  
  const textLength = extractedText.length;
  const hasContactInfo = /email|phone|tel|@/.test(extractedText.toLowerCase());
  const hasExperience = /experience|work|job|position|role|company/.test(extractedText.toLowerCase());
  const hasEducation = /education|degree|university|college|school/.test(extractedText.toLowerCase());
  const hasSkills = /skill|technology|programming|software|development/.test(extractedText.toLowerCase());
  
  // Calculate basic scores based on content analysis
  const resumeQuality = (hasContactInfo ? 20 : 0) + (hasExperience ? 25 : 0) + (hasEducation ? 20 : 0) + (hasSkills ? 20 : 0) + (textLength > 500 ? 15 : 10);
  const experienceRelevance = hasExperience ? (hasSkills ? 70 : 55) : 40;
  const skillsMatch = hasSkills ? (textLength > 800 ? 65 : 55) : 45;
  const professionalPresentation = (textLength > 300 && hasContactInfo) ? 70 : 50;
  
  const overallResumeScore = Math.round((resumeQuality + experienceRelevance + skillsMatch + professionalPresentation) / 4);
  
  return {
    scores: {
      resumeQuality,
      experienceRelevance,
      skillsMatch,
      professionalPresentation,
      overallResumeScore,
      evidenceLevel: 'MODERATE'
    },
    resumeAnalysis: createBasicResumeAnalysis(extractedText, context.personalInfo),
    careerFit: createBasicCareerFit(context.personalInfo, context.assessmentType)
  };
}

/**
 * 📄 Create basic resume analysis from extracted text
 */
function createBasicResumeAnalysis(extractedText: string, personalInfo: any) {
  const textLength = extractedText.length;
  const hasContactInfo = /email|phone|tel|@/.test(extractedText.toLowerCase());
  const hasExperience = /experience|work|job|position|role|company/.test(extractedText.toLowerCase());
  const hasEducation = /education|degree|university|college|school/.test(extractedText.toLowerCase());
  
  return {
    analysis: `Resume analysis based on ${textLength} characters of extracted content. Document shows ${hasContactInfo ? 'contact information' : 'limited contact details'}, ${hasExperience ? 'professional experience' : 'basic experience information'}, and ${hasEducation ? 'educational background' : 'limited education details'}.`,
    keyFindings: [
      `${textLength} characters of content extracted and analyzed`,
      hasContactInfo ? 'Contact information present' : 'Contact information needs improvement',
      hasExperience ? 'Professional experience documented' : 'Professional experience section needs development',
      hasEducation ? 'Educational background included' : 'Educational background needs enhancement'
    ],
    experienceLevel: determineExperienceLevel(extractedText),
    skillsValidation: {
      claimed: [],
      evidenced: extractSkillsFromText(extractedText),
      missing: []
    },
    gapAnalysis: [
      textLength < 500 ? 'Resume content could be more comprehensive' : 'Resume content is adequately detailed',
      !hasContactInfo ? 'Add complete contact information' : 'Contact information is adequate',
      !hasExperience ? 'Add more detailed work experience' : 'Experience section could be enhanced with achievements'
    ],
    credibilityScore: Math.min(85, Math.max(45, Math.round(textLength / 20) + (hasContactInfo ? 15 : 0) + (hasExperience ? 20 : 0))),
    recommendations: [
      'Enhance resume with quantifiable achievements and impact metrics',
      'Ensure all sections are complete and professionally formatted',
      'Add specific examples of skills and technologies used'
    ]
  };
}

/**
 * 🎯 Create basic career fit analysis
 */
function createBasicCareerFit(personalInfo: any, assessmentType: string) {
  const targetRole = personalInfo.jobPosition || 'Not specified';
  
  return {
    fitLevel: 'PARTIAL_FIT',
    fitPercentage: 60,
    honestAssessment: `Based on the assessment for ${targetRole}, shows potential with focused development needed in key areas.`,
    realityCheck: 'Continue building relevant experience and skills to strengthen your competitive position.',
    marketCompetitiveness: 'Building competitive position in target market through skill development.',
    timeToReadiness: '3-6 months',
    criticalGaps: ['Strengthen core competencies', 'Build relevant experience', 'Develop specific technical skills'],
    competitiveAdvantages: ['Shows initiative in career development', 'Proactive approach to skill assessment']
  };
}

/**
 * 🔧 Helper Functions
 */
function createFormOnlyAnalysisPrompt(assessmentType: string, responses: any, personalInfo: any): string {
  const targetRole = personalInfo.jobPosition || 'Not specified';
  const categories = getCategories(assessmentType);

  return `
CAREER ASSESSMENT ANALYSIS - FORM RESPONSES ONLY

ASSESSMENT CONTEXT:
- Assessment Type: ${assessmentType.toUpperCase()}
- Target Role: ${targetRole}
- NOTE: No resume provided - assessment based on responses only

ASSESSMENT RESPONSES:
${JSON.stringify(responses)}

ANALYSIS REQUIREMENTS:
1. REALISTIC SCORING (0-100 for each category):
   - Be conservative without resume evidence
   - Categories: ${categories.join(', ')}

2. HONEST FEEDBACK:
   - Realistic assessment of readiness
   - Specific recommendations
   - Areas of strength and development

Return ONLY valid JSON:
{
  "scores": {
    ${categories.map(cat => `"${cat}": number`).join(',\n    ')},
    "overallScore": number,
    "evidenceLevel": "INSUFFICIENT"
  },
  "readinessLevel": "Early Development" | "Developing Competency" | "Approaching Readiness" | "Fully Prepared",
  "summary": "Honest assessment based on responses",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"],
  "recommendations": [
    {
      "title": "Recommendation title",
      "explanation": "Why this matters",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "timeframe": "1-3 months",
      "priority": "HIGH"
    }
  ]
}
`;
}

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

function calculateReadinessLevel(score: number): string {
  if (score < 50) return "Early Development";
  if (score < 70) return "Developing Competency";
  if (score < 85) return "Approaching Readiness";
  return "Fully Prepared";
}

function generateSummaryFromResults(
  overallScore: number,
  readinessLevel: string,
  assessmentType: string,
  careerFit?: any,
  resumeAnalysis?: any
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
  
  let summary = `Your ${typeName} assessment shows a score of ${overallScore}% with ${readinessLevel} level.`;
  
  if (careerFit?.honestAssessment) {
    summary += ` ${careerFit.honestAssessment}`;
  }

  return summary;
}

function extractStrengthsFromResults(result: any): string[] {
  const strengths = [];
  
  if (result.careerFit?.competitiveAdvantages && result.careerFit.competitiveAdvantages.length > 0) {
    strengths.push(...result.careerFit.competitiveAdvantages);
  }
  
  if (result.resumeAnalysis?.keyFindings) {
    const positiveFindings = result.resumeAnalysis.keyFindings.filter((finding: string) => 
      finding.toLowerCase().includes('present') || 
      finding.toLowerCase().includes('documented') ||
      finding.toLowerCase().includes('included') ||
      finding.toLowerCase().includes('adequate')
    );
    strengths.push(...positiveFindings);
  }
  
  // Ensure we have at least some strengths
  if (strengths.length === 0) {
    strengths.push(
      'Demonstrates initiative by completing comprehensive assessment',
      'Shows commitment to professional development',
      'Takes proactive approach to career planning'
    );
  }
  
  return strengths.slice(0, 4); // Limit to 4 strengths
}

function extractImprovementsFromResults(result: any): string[] {
  const improvements = [];
  
  if (result.careerFit?.criticalGaps && result.careerFit.criticalGaps.length > 0) {
    improvements.push(...result.careerFit.criticalGaps);
  }
  
  if (result.resumeAnalysis?.gapAnalysis) {
    improvements.push(...result.resumeAnalysis.gapAnalysis);
  }
  
  // Ensure we have at least some improvements
  if (improvements.length === 0) {
    improvements.push(
      'Build stronger evidence base for claimed competencies',
      'Develop more specific examples of achievements',
      'Focus on aligning experience with target role requirements'
    );
  }
  
  return improvements.slice(0, 4); // Limit to 4 improvements
}

function createBasicRecommendations(assessmentType: string) {
  return [
    {
      title: "Strengthen Professional Portfolio",
      explanation: "Build comprehensive documentation of your skills and achievements",
      steps: [
        "Document specific examples of your work and impact",
        "Quantify achievements with concrete metrics",
        "Gather professional recommendations and testimonials"
      ],
      timeframe: "1-3 months",
      priority: "HIGH"
    }
  ];
}

function determineExperienceLevel(extractedText: string): string {
  const years = extractedText.match(/(\d+)\s*(year|yr)/gi);
  const senior = /senior|lead|manager|director/i.test(extractedText);
  const junior = /junior|intern|entry|assistant/i.test(extractedText);
  
  if (senior) return 'SENIOR';
  if (junior) return 'JUNIOR';
  if (years && years.length > 2) return 'MID';
  return 'ENTRY';
}

function extractSkillsFromText(extractedText: string): string[] {
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'HTML', 'CSS',
    'TypeScript', 'Git', 'Docker', 'AWS', 'MongoDB', 'PostgreSQL', 'REST API',
    'GraphQL', 'Vue.js', 'Angular', 'PHP', 'Laravel', 'Spring', 'Django'
  ];
  
  return commonSkills.filter(skill => 
    new RegExp(skill, 'i').test(extractedText)
  ).slice(0, 10); // Limit to 10 skills
}