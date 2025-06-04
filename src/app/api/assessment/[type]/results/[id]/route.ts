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

    // CRITICAL: For manual processing assessments (standard/premium) - NO RESULTS PAGE ACCESS
    if (isManualProcessing) {
      console.log('🚫 MANUAL PROCESSING ASSESSMENT - NO RESULTS PAGE ACCESS');
      console.log('User should be redirected to appropriate thank you page');
      
      // Return redirect instruction - ResultsClient will handle the redirect
      return NextResponse.json({
        ...assessment,
        data: {
          ...data,
          // Clear indicators this should redirect
          manualProcessingOnly: true,
          redirectRequired: true,
          redirectMessage: 'This assessment is being processed by our experts. Please check your thank you page.',
          // Provide proper redirect URL
          properRedirectUrl: assessment.tier === 'premium' 
            ? `/assessment/${type}/premium-results/${id}`
            : `/assessment/${type}/standard-results/${id}`
        }
      });
    }

    // ONLY for basic tier (RM50) - AI processing allowed
    console.log('✅ BASIC TIER - AI ANALYSIS ALLOWED');

    // For basic tier, check if analysis needed and start if required
    if (hasSubmission && !data.aiProcessed && !data.aiAnalysisStarted) {
      console.log('Basic tier - attempting to start AI analysis');
      
      try {
        // FIXED: Check if AI processing module exists before importing
        let aiProcessingAvailable = false;
        try {
          // Try to import the AI processing module
          const aiModule = await import('@/lib/ai-processing');
          if (aiModule && typeof aiModule.processAssessmentWithAI === 'function') {
            aiProcessingAvailable = true;
            
            // Mark as started
            await prisma.assessment.update({
              where: { id },
              data: {
                data: {
                  ...data,
                  aiAnalysisStarted: true,
                  aiAnalysisStartedAt: new Date().toISOString()
                }
              }
            });
            
            // Process in background for basic tier only
            aiModule.processAssessmentWithAI(id, type).catch((error: Error) => {
              console.error(`AI processing failed for basic tier ${id}:`, error);
              // Update assessment with error info
              prisma.assessment.update({
                where: { id },
                data: {
                  data: {
                    ...data,
                    aiError: error.message,
                    aiAnalysisStarted: false
                  }
                }
              }).catch(console.error);
            });
            
            console.log(`AI analysis started for basic tier assessment: ${id}`);
          }
        } catch (importError) {
          console.warn('AI processing module not available:', importError);
        }
        
        if (!aiProcessingAvailable) {
          console.warn('AI processing not available - basic tier will show placeholder results');
          // Update assessment to indicate AI is not available
          await prisma.assessment.update({
            where: { id },
            data: {
              data: {
                ...data,
                aiError: 'AI processing module not available',
                aiAnalysisStarted: false
              }
            }
          });
        }
      } catch (error) {
        console.error('Error handling AI analysis for basic tier:', error);
        // Update assessment with error
        await prisma.assessment.update({
          where: { id },
          data: {
            data: {
              ...data,
              aiError: error instanceof Error ? error.message : 'Unknown error',
              aiAnalysisStarted: false
            }
          }
        }).catch(console.error);
      }
    }

    // Return assessment data for basic tier
    return NextResponse.json(assessment);

  } catch (error) {
    console.error('Error in results endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}