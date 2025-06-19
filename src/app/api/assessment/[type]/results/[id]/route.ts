// /src/app/api/assessment/[type]/results/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // FIXED: Properly await params for Next.js 15
    const resolvedParams = await params;
    const type = resolvedParams?.type;
    const id = resolvedParams?.id;
    
    if (!type || !id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log(`Fetching results for assessment: ${type}/${id}`);

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

    const data = assessment.data as Record<string, any> || {};
    const hasSubmission = data.responses && Object.keys(data.responses).length > 0;

    console.log(`Assessment status: ${assessment.status}, Has submission: ${hasSubmission}`);

    // CRITICAL: Simple tier-based manual processing detection
    const isManualProcessing = assessment.tier === 'standard' || 
                              assessment.tier === 'premium' || 
                              assessment.manualProcessing === true;

    console.log('Processing type determination:', {
      tier: assessment.tier,
      price: assessment.price,
      manualProcessingFlag: assessment.manualProcessing,
      finalDecision: isManualProcessing ? 'MANUAL' : 'AI'
    });

    // Helper function to create properly formatted response data
    const createResponseData = (assessmentData: any, additionalData: any = {}) => {
      return {
        id: assessment.id,
        type: assessment.type,
        status: assessment.status,
        tier: assessment.tier,
        price: assessment.price,
        manualProcessing: assessment.manualProcessing,
        createdAt: assessment.createdAt,
        completedAt: (assessment as any).completedAt || assessment.updatedAt,
        reviewNotes: (assessment as any).reviewNotes,
        reviewedAt: (assessment as any).reviewedAt,
        data: {
          ...assessmentData,
          ...additionalData,
          // Ensure new fields are explicitly included
          resumeAnalysis: assessmentData?.resumeAnalysis,
          careerFit: assessmentData?.careerFit,
          evidenceLevel: assessmentData?.evidenceLevel,
          resumeConsistency: assessmentData?.resumeConsistency,
          resumeText: assessmentData?.resumeText,
          aiProcessed: assessmentData?.aiProcessed,
          aiAnalysisStarted: assessmentData?.aiAnalysisStarted,
          aiAnalysisStartedAt: assessmentData?.aiAnalysisStartedAt,
          aiProcessedAt: assessmentData?.aiProcessedAt,
          aiError: assessmentData?.aiError,
          showProcessingScreen: assessmentData?.showProcessingScreen,
          processingMessage: assessmentData?.processingMessage,
          scores: assessmentData?.scores,
          recommendations: assessmentData?.recommendations,
          strengths: assessmentData?.strengths,
          improvements: assessmentData?.improvements,
          summary: assessmentData?.summary,
          readinessLevel: assessmentData?.readinessLevel,
          responses: assessmentData?.responses,
          personalInfo: assessmentData?.personalInfo
        }
      };
    };

    // CRITICAL: For manual processing assessments (standard/premium) - NO RESULTS PAGE ACCESS
    if (isManualProcessing) {
      console.log('🚫 MANUAL PROCESSING ASSESSMENT - NO RESULTS PAGE ACCESS');
      console.log('User should be redirected to appropriate thank you page');
      
      // Return redirect instruction - ResultsClient will handle the redirect
      return NextResponse.json(createResponseData(data, {
        // Clear indicators this should redirect
        manualProcessingOnly: true,
        redirectRequired: true,
        redirectMessage: 'This assessment is being processed by our experts. Please check your thank you page.',
        // Provide proper redirect URL
        properRedirectUrl: assessment.tier === 'premium' 
          ? `/assessment/${type}/premium-results/${id}`
          : `/assessment/${type}/standard-results/${id}`
      }));
    }

    // ONLY for basic tier (RM50) - AI processing allowed
    console.log('✅ BASIC TIER - AI ANALYSIS ALLOWED');

    // 🔥 NEW LOGIC: Check if AI analysis needed/running for basic tier
    if (hasSubmission) {
      const aiProcessed = data.aiProcessed;
      const aiAnalysisStarted = data.aiAnalysisStarted;
      const aiError = data.aiError;

      // Case 1: AI analysis not started yet - START IT and return processing status
      if (!aiProcessed && !aiAnalysisStarted && !aiError) {
        console.log('🚀 STARTING AI ANALYSIS - RETURNING PROCESSING STATUS');
        
        try {
          // Mark as started
          const updatedData = {
            ...data,
            aiAnalysisStarted: true,
            aiAnalysisStartedAt: new Date().toISOString()
          };

          await prisma.assessment.update({
            where: { id },
            data: {
              status: 'processing',
              data: updatedData
            }
          });

          // Start AI processing in background
          try {
            const aiModule = await import('@/lib/ai-processing');
            if (aiModule && typeof aiModule.processAssessmentWithAI === 'function') {
              aiModule.processAssessmentWithAI(id, type).catch((error: Error) => {
                console.error(`AI processing failed for basic tier ${id}:`, error);
                prisma.assessment.update({
                  where: { id },
                  data: {
                    data: {
                      ...updatedData,
                      aiError: error.message,
                      aiAnalysisStarted: false
                    }
                  }
                }).catch(console.error);
              });
              console.log(`🤖 AI analysis started for basic tier assessment: ${id}`);
            }
          } catch (importError) {
            console.warn('AI processing module not available:', importError);
          }
          
          // 🔥 RETURN PROCESSING STATUS instead of results
          return NextResponse.json(createResponseData(updatedData, {
            aiAnalysisStarted: true,
            aiAnalysisStartedAt: new Date().toISOString(),
            showProcessingScreen: true,
            processingMessage: 'AI analysis in progress...'
          }));

        } catch (error) {
          console.error('Error starting AI analysis:', error);
          // Fall through to return assessment data with error
        }
      }

      // Case 2: AI analysis started but not complete - return processing status
      if (!aiProcessed && aiAnalysisStarted && !aiError) {
        console.log('⏳ AI ANALYSIS IN PROGRESS - RETURNING PROCESSING STATUS');
        
        return NextResponse.json(createResponseData(data, {
          showProcessingScreen: true,
          processingMessage: 'AI analysis in progress...',
          aiAnalysisStarted: true
        }));
      }

      // Case 3: AI analysis completed - return full results
      if (aiProcessed) {
        console.log('✅ AI ANALYSIS COMPLETED - RETURNING FULL RESULTS');
        return NextResponse.json(createResponseData(data));
      }

      // Case 4: AI analysis failed - return results with fallback data
      if (aiError) {
        console.log('❌ AI ANALYSIS FAILED - RETURNING FALLBACK RESULTS');
        return NextResponse.json(createResponseData(data));
      }
    }

    // Fallback: Return assessment data (shouldn't reach here for basic tier with submissions)
    console.log('🔄 FALLBACK - RETURNING ASSESSMENT DATA');
    return NextResponse.json(createResponseData(data));

  } catch (error) {
    console.error('Error in results endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}