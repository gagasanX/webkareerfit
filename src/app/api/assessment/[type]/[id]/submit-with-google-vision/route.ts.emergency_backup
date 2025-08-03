import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import {
  analyzeResumeWithGoogleVision,
  calculateFinalAssessmentScore,
  isGoogleVisionConfigured,
  type AssessmentContext
} from '@/lib/google-vision-resume-analyzer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string, id: string }> }
) {
  console.log('=== GOOGLE VISION RESUME ANALYSIS ENDPOINT ===');

  let assessmentId: string | null = null;

  try {
    // Await params for Next.js 15
    const resolvedParams = await params;
    const { type, id } = resolvedParams;

    console.log('Google Vision endpoint called with params:', { type, id });

    if (!type || !id) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    assessmentId = id;

    // Check if Google Vision is configured
    if (!isGoogleVisionConfigured()) {
      console.error('❌ Google Vision API not configured');
      return NextResponse.json({
        error: 'Google Vision API is not properly configured. Please check GOOGLE_VISION_API_KEY.',
        details: 'Missing Google Vision API key'
      }, { status: 500 });
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

    // Parse form data
    const formData = await request.formData();
    let responses = {};
    let personalInfo = {};
    
    // ✅ DIPERBETULKAN: Berikan jenis eksplisit untuk formScoring
    let formScoring: { formContribution?: number; weight?: number } = {};

    try {
      const formDataJson = formData.get('formData');
      if (formDataJson && typeof formDataJson === 'string') {
        const parsed = JSON.parse(formDataJson);
        responses = parsed.responses || parsed;
        personalInfo = parsed.personalInfo || {
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          personality: formData.get('personality'),
          jobPosition: formData.get('position')
        };

        // 🔥 EXTRACT FORM SCORING from frontend calculation
        formScoring = parsed._internalScoring?.formScoring || {};
      }
    } catch (parseError) {
      console.error('Error parsing form data:', parseError);
      return NextResponse.json({ error: 'Invalid form data format' }, { status: 400 });
    }

    // Get uploaded file
    const resumeFile = formData.get('resume') as File;

    if (!resumeFile || resumeFile.size === 0) {
      return NextResponse.json({
        error: 'Resume file is required for Google Vision analysis'
      }, { status: 400 });
    }

    console.log(`📄 Processing file with Google Vision: ${resumeFile.name} (${resumeFile.size} bytes, ${resumeFile.type})`);

    // Update assessment to processing status
    await prisma.assessment.update({
      where: { id },
      data: {
        status: 'processing',
        data: {
          ...(assessment.data as Record<string, any> || {}),
          responses,
          personalInfo,
          formScoring,
          submittedAt: new Date().toISOString(),
          processingMethod: 'google_vision_api',
          aiAnalysisStarted: true,
          aiAnalysisStartedAt: new Date().toISOString(),
          showProcessingScreen: true,
          processingMessage: 'Analyzing resume with Google Vision AI + OpenAI...'
        }
      }
    });

    // 🚀 PROCESS WITH GOOGLE VISION + OPENAI
    console.log('🚀 Starting Google Vision + OpenAI processing...');

    // Prepare assessment context
    const assessmentContext: AssessmentContext = {
      assessmentType: type,
      targetRole: (personalInfo as any).jobPosition || 'Not specified',
      personality: (personalInfo as any).personality || 'Not provided',
      responses,
      personalInfo,
      formScoring: {
        formContribution: formScoring.formContribution || 0,
        weight: formScoring.weight || 60
      }
    };

    // Analyze resume with Google Vision + OpenAI
    const analysisResult = await analyzeResumeWithGoogleVision(resumeFile, assessmentContext);

    if (analysisResult.success && analysisResult.analysis) {
      console.log('✅ Google Vision + OpenAI analysis successful');
      console.log(`📊 Resume Score: ${analysisResult.analysis.scores.overallResumeScore}%`);
      console.log(`🔍 Processing Method: ${analysisResult.processingMethod}`);

      // 🎯 CALCULATE FINAL SCORES (Form + Resume)
      const formContribution = formScoring.formContribution || 0;
      const resumeScore = analysisResult.analysis.scores.overallResumeScore;
      const formWeight = formScoring.weight || 60;

      const finalScoring = calculateFinalAssessmentScore(
        formContribution,
        resumeScore,
        formWeight
      );

      console.log(`🎯 Final Scoring:`, finalScoring);

      // 🔥 CREATE COMPREHENSIVE ASSESSMENT DATA
      const finalData = {
        ...(assessment.data as Record<string, any> || {}),
        responses,
        personalInfo,

        // 🎯 UNIFIED SCORING SYSTEM
        scores: {
          // Individual category scores (mapped from resume analysis)
          resumeQuality: analysisResult.analysis.scores.resumeQuality,
          experienceRelevance: analysisResult.analysis.scores.experienceRelevance,
          skillsMatch: analysisResult.analysis.scores.skillsMatch,
          professionalPresentation: analysisResult.analysis.scores.professionalPresentation,

          // Final combined score
          overallScore: finalScoring.finalScore,
          resumeConsistency: analysisResult.analysis.scores.overallResumeScore,
          evidenceLevel: analysisResult.analysis.scores.evidenceLevel
        },

        // Enhanced analysis results from Google Vision + OpenAI
        resumeAnalysis: analysisResult.analysis.resumeAnalysis,
        careerFit: analysisResult.analysis.careerFit,
        documentAnalysis: {
          type: resumeFile.type,
          processingMethod: analysisResult.processingMethod,
          extractedText: analysisResult.extractedText,
          textLength: analysisResult.extractedText?.length || 0,
          keyFindings: analysisResult.analysis.resumeAnalysis.keyFindings,
          experienceLevel: analysisResult.analysis.resumeAnalysis.experienceLevel,
          documentQuality: analysisResult.analysis.scores.resumeQuality >= 80 ? 'EXCELLENT' :
                          analysisResult.analysis.scores.resumeQuality >= 70 ? 'GOOD' :
                          analysisResult.analysis.scores.resumeQuality >= 60 ? 'AVERAGE' : 'POOR',
          credibilityScore: analysisResult.analysis.resumeAnalysis.credibilityScore
        },

        // Final readiness assessment
        readinessLevel: finalScoring.readinessLevel,

        // Generate enhanced summary
        summary: generateEnhancedSummary(
          finalScoring.finalScore,
          finalScoring.readinessLevel,
          type,
          analysisResult.analysis.careerFit,
          analysisResult.analysis.resumeAnalysis,
          analysisResult.processingMethod
        ),

        // Enhanced recommendations combining form + resume insights
        recommendations: generateCombinedRecommendations(
          analysisResult.analysis.resumeAnalysis.recommendations,
          analysisResult.analysis.careerFit.criticalGaps,
          type
        ),

        // Strengths and improvements
        strengths: generateStrengths(analysisResult.analysis, analysisResult.processingMethod),
        improvements: generateImprovements(analysisResult.analysis, analysisResult.processingMethod),

        // 🔥 PROCESSING METADATA
        aiProcessed: true,
        aiProcessedAt: new Date().toISOString(),
        aiAnalysisStarted: true,
        aiAnalysisStartedAt: (assessment.data as any)?.aiAnalysisStartedAt,
        showProcessingScreen: false,
        processingMessage: null,
        processingMethod: 'google_vision_openai',

        // Google Vision specific metadata
        googleVisionData: {
          processingMethod: analysisResult.processingMethod,
          processingTime: analysisResult.processingTime,
          textExtracted: !!analysisResult.extractedText,
          textLength: analysisResult.extractedText?.length || 0,
          fileProcessed: resumeFile.name
        },

        // Scoring breakdown
        scoringBreakdown: {
          formContribution: finalScoring.formContribution,
          resumeContribution: finalScoring.resumeContribution,
          formWeight: formWeight,
          resumeWeight: 100 - formWeight,
          finalScore: finalScoring.finalScore,
          method: 'google_vision_combined'
        },

        // File metadata
        resumeFileName: resumeFile.name,
        resumeFileSize: resumeFile.size,
        resumeFileType: resumeFile.type,
        hasResumeContent: true,
        submittedAt: new Date().toISOString()
      };

      // Update assessment with final results
      await prisma.assessment.update({
        where: { id },
        data: {
          status: 'completed',
          data: finalData
        }
      });

      console.log('💾 Assessment updated with Google Vision + OpenAI results');

    } else {
      console.error('❌ Google Vision + OpenAI processing failed:', analysisResult.error);

      // Update with error status
      await prisma.assessment.update({
        where: { id },
        data: {
          status: 'error',
          data: {
            ...(assessment.data as Record<string, any> || {}),
            responses,
            personalInfo,
            aiError: analysisResult.error,
            aiProcessed: false,
            showProcessingScreen: false,
            processingMessage: null,
            processingMethod: 'google_vision_failed'
          }
        }
      });

      return NextResponse.json({
        error: 'Google Vision analysis failed',
        details: analysisResult.error
      }, { status: 500 });
    }

    // 🎯 DETERMINE REDIRECT PATH
    console.log('=== PROCESSING DECISION LOGIC ===');

    const assessmentAny = assessment as any;
    const isManualProcessing = assessmentAny.tier === 'standard' ||
                              assessmentAny.tier === 'premium' ||
                              assessmentAny.manualProcessing === true;

    let redirectUrl;

    if (isManualProcessing) {
      // Manual processing path (for premium/standard tiers)
      if (assessmentAny.tier === 'premium') {
        redirectUrl = `/assessment/${type}/premium-results/${id}`;
      } else {
        redirectUrl = `/assessment/${type}/standard-results/${id}`;
      }

      console.log(`Manual processing tier detected → ${redirectUrl}`);
    } else {
      // AI processing completed - go to results
      redirectUrl = `/assessment/${type}/results/${id}`;
      console.log(`AI processing completed → ${redirectUrl}`);
    }

    const response = {
      success: true,
      message: 'Assessment processed successfully with analysis',
      redirectUrl,
      debug: {
        tier: assessmentAny.tier,
        price: assessmentAny.price,
        processingMethod: 'google_vision_openai',
        manualProcessing: isManualProcessing,
        fileProcessed: true,
        processingTime: analysisResult.processingTime,
        visionMethod: analysisResult.processingMethod,
        textExtracted: !!analysisResult.extractedText,
        finalScore: analysisResult.analysis?.scores.overallResumeScore
      }
    };

    console.log('Sending success response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('=== GOOGLE VISION SUBMIT ERROR ===');
    console.error('Server error:', error);

    // Enhanced error handling with safe assessment update
    if (assessmentId) {
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
                aiError: error instanceof Error ? error.message : 'Google Vision processing failed',
                aiProcessed: false,
                showProcessingScreen: false,
                processingMessage: null,
                errorTimestamp: new Date().toISOString(),
                processingMethod: 'google_vision_error'
              }
            }
          });

          console.log(`Updated assessment ${assessmentId} with error status`);
        }
      } catch (updateError) {
        console.error('Failed to update assessment with error:', updateError);
      }
    }

    return NextResponse.json({
      error: 'Server error during Google Vision processing',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * 📝 Generate enhanced summary with Google Vision context
 */
function generateEnhancedSummary(
  finalScore: number,
  readinessLevel: string,
  assessmentType: string,
  careerFit: any,
  resumeAnalysis: any,
  processingMethod?: string
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
  const visionMethod = processingMethod === 'google_vision_pdf' ? 'PDF processing' :
                      processingMethod === 'google_vision_image' ? 'image analysis' :
                      'document processing';

  let summary = '';

  if (finalScore >= 85) {
    summary = `Excellent work! Your ${typeName} assessment shows exceptional preparation with a score of ${finalScore}%. Our Ultra Vision AI ${visionMethod} confirms strong professional documentation that aligns well with your assessment responses.`;
  } else if (finalScore >= 70) {
    summary = `Good foundation! Your ${typeName} shows solid preparation (${finalScore}%) with room for targeted improvements. Vision analysis of your resume provides valuable insights for enhancing your competitive position.`;
  } else if (finalScore >= 50) {
    summary = `Honest feedback: Your ${typeName} indicates you're in the development phase (${finalScore}%). Our AI-powered resume analysis using Ultra Vision reveals specific areas where focused improvement will strengthen your market readiness.`;
  } else {
    summary = `Reality check: Your ${typeName} shows substantial gaps (${finalScore}%) that must be addressed. Ultra Vision analysis provides a clear roadmap for development - use these insights as your improvement strategy.`;
  }

  if (careerFit?.honestAssessment) {
    summary += ` ${careerFit.honestAssessment}`;
  }

  if (resumeAnalysis?.credibilityScore < 70) {
    summary += ` Resume analysis suggests optimizing your document format and content for better ATS compatibility and professional presentation.`;
  }

  return summary;
}

/**
 * 💡 Generate combined recommendations from multiple sources
 */
function generateCombinedRecommendations(
  resumeRecommendations: string[],
  criticalGaps: string[],
  assessmentType: string
): any[] {
  const recommendations = [];

  // Add resume-specific recommendations
  if (resumeRecommendations && resumeRecommendations.length > 0) {
    recommendations.push({
      title: "Optimize Resume Based on AI Analysis",
      explanation: "Vision analysis identified specific areas for resume improvement",
      steps: resumeRecommendations.slice(0, 3),
      timeframe: "2-6 weeks",
      priority: "HIGH",
      successMetrics: ["Updated resume created", "ATS compatibility improved", "Professional presentation enhanced"]
    });
  }

  // Add career fit recommendations
  if (criticalGaps && criticalGaps.length > 0) {
    recommendations.push({
      title: "Address Critical Skill Gaps",
      explanation: "AI analysis identified key areas that impact your career readiness",
      steps: criticalGaps.slice(0, 3).map(gap => `Develop ${gap.toLowerCase()}`),
      timeframe: "1-3 months",
      priority: "HIGH",
      successMetrics: ["Skills developed", "Competency demonstrated", "Portfolio updated"]
    });
  }

  // Add assessment-specific recommendation
  const assessmentRecommendations = {
    ccrl: {
      title: "Strengthen Comeback Strategy",
      explanation: "Build confidence and market relevance for successful career re-entry",
      steps: [
        "Update industry knowledge through current trends research",
        "Reconnect with professional network and mentors",
        "Consider short-term projects to demonstrate current capabilities"
      ],
      timeframe: "3-6 months",
      priority: "MEDIUM",
      successMetrics: ["Network connections rebuilt", "Industry knowledge updated", "Confidence level improved"]
    },
    fjrl: {
      title: "Build First Job Foundation",
      explanation: "Develop essential skills and experience for entry-level positions",
      steps: [
        "Complete relevant internships or volunteer projects",
        "Build portfolio showcasing academic and project work",
        "Practice interview skills and professional communication"
      ],
      timeframe: "2-4 months",
      priority: "HIGH",
      successMetrics: ["Portfolio completed", "Interview practice sessions done", "Professional references secured"]
    }
  };

  const typeSpecific = assessmentRecommendations[assessmentType as keyof typeof assessmentRecommendations];
  if (typeSpecific) {
    recommendations.push(typeSpecific);
  }

  return recommendations.slice(0, 3); // Limit to top 3 recommendations
}

/**
 * ⚡ Generate strengths based on analysis
 */
function generateStrengths(analysis: any, processingMethod?: string): string[] {
  const strengths = [];

  // Add processing-specific strength
  if (processingMethod === 'google_vision_pdf') {
    strengths.push("Provided professional PDF resume for comprehensive AI analysis");
  } else if (processingMethod === 'google_vision_image') {
    strengths.push("Successfully submitted resume for advanced image-based analysis");
  }

  // Add analysis-based strengths
  if (analysis.scores.overallResumeScore >= 75) {
    strengths.push("Demonstrates strong professional documentation and presentation");
  }

  if (analysis.resumeAnalysis.credibilityScore >= 75) {
    strengths.push("Shows consistent and credible professional experience");
  }

  if (analysis.careerFit.competitiveAdvantages && analysis.careerFit.competitiveAdvantages.length > 0) {
    strengths.push(...analysis.careerFit.competitiveAdvantages.slice(0, 2));
  }

  // Ensure we have at least some strengths
  if (strengths.length === 0) {
    strengths.push(
      "Takes proactive approach to career development through comprehensive assessment",
      "Demonstrates commitment to professional growth and self-improvement",
      "Provides complete documentation for thorough career analysis"
    );
  }

  return strengths.slice(0, 4); // Limit to 4 strengths
}

/**
 * 🔧 Generate improvements based on analysis
 */
function generateImprovements(analysis: any, processingMethod?: string): string[] {
  const improvements = [];

  // Add resume-specific improvements
  if (analysis.scores.resumeQuality < 70) {
    improvements.push("Enhance resume formatting and structure for better professional presentation");
  }

  if (analysis.scores.skillsMatch < 70) {
    improvements.push("Better align resume content with target role requirements");
  }

  if (analysis.resumeAnalysis.skillsValidation.missing.length > 0) {
    improvements.push(`Address missing skills: ${analysis.resumeAnalysis.skillsValidation.missing.slice(0, 2).join(', ')}`);
  }

  // Add career fit improvements
  if (analysis.careerFit.criticalGaps && analysis.careerFit.criticalGaps.length > 0) {
    improvements.push(...analysis.careerFit.criticalGaps.slice(0, 2));
  }

  // Ensure we have at least some improvements
  if (improvements.length === 0) {
    improvements.push(
      "Continue building relevant experience in target industry",
      "Strengthen professional network and industry connections",
      "Develop specific examples of achievements with quantifiable results"
    );
  }

  return improvements.slice(0, 4); // Limit to 4 improvements
}