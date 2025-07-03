// app/api/assessment/[type]/[id]/submit-with-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { 
  processAssessmentWithAssistants, 
  isAssistantsAPIConfigured,
  AssessmentContext 
} from '@/lib/assistants-api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string, id: string }> }
) {
  console.log('=== SUBMIT WITH FILE ENDPOINT (ASSISTANTS API) ===');
  
  let assessmentId: string | null = null;
  
  try {
    // Await params for Next.js 15 with immediate validation
    const resolvedParams = await params;
    const { type, id } = resolvedParams;
    
    console.log('Submit-with-file endpoint called with params:', { type, id });
    
    if (!type || !id) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    // Store for error handling
    assessmentId = id;
    
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
      }
    } catch (parseError) {
      console.error('Error parsing form data:', parseError);
      return NextResponse.json({ error: 'Invalid form data format' }, { status: 400 });
    }
    
    // Get uploaded file
    const resumeFile = formData.get('resume') as File;
    
    if (!resumeFile || resumeFile.size === 0) {
      return NextResponse.json({ 
        error: 'Resume file is required for comprehensive analysis' 
      }, { status: 400 });
    }
    
    console.log(`📄 Processing file: ${resumeFile.name} (${resumeFile.size} bytes)`);
    
    // Check if Assistants API is configured
    if (!isAssistantsAPIConfigured()) {
      console.error('❌ Assistants API not configured');
      return NextResponse.json({
        error: 'AI processing service is not properly configured'
      }, { status: 500 });
    }
    
    // 🚀 PROCESS WITH ASSISTANTS API
    console.log('🚀 Starting Assistants API processing...');
    
    // Prepare assessment context
    const assessmentContext: AssessmentContext = {
      assessmentType: type,
      targetRole: (personalInfo as any).jobPosition || 'Not specified',
      personality: (personalInfo as any).personality || 'Not provided',
      responses,
      personalInfo
    };
    
    // Update assessment to processing status
    await prisma.assessment.update({
      where: { id },
      data: {
        status: 'processing',
        data: {
          ...(assessment.data as Record<string, any> || {}),
          responses,
          personalInfo,
          submittedAt: new Date().toISOString(),
          processingMethod: 'assistants_api',
          aiAnalysisStarted: true,
          aiAnalysisStartedAt: new Date().toISOString(),
          showProcessingScreen: true,
          processingMessage: 'Analyzing with OpenAI Assistants API...'
        }
      }
    });
    
    // Process with Assistants API
    const processingResult = await processAssessmentWithAssistants(resumeFile, assessmentContext);
    
    if (processingResult.success && processingResult.analysis) {
      console.log('✅ Assistants API processing successful');
      
      // Update assessment with results
      const finalData = {
        ...(assessment.data as Record<string, any> || {}),
        responses,
        personalInfo,
        
        // Assistants API results
        ...processingResult.analysis,
        
        // Processing metadata
        aiProcessed: true,
        aiProcessedAt: new Date().toISOString(),
        aiAnalysisStarted: true,
        aiAnalysisStartedAt: (assessment.data as any)?.aiAnalysisStartedAt,
        showProcessingScreen: false,
        processingMessage: null,
        processingMethod: 'assistants_api',
        threadId: processingResult.threadId,
        fileId: processingResult.fileId,
        processingTimeMs: processingResult.processingTime,
        
        // File metadata
        resumeFileName: resumeFile.name,
        resumeFileSize: resumeFile.size,
        resumeFileType: resumeFile.type,
        hasResumeContent: true,
        submittedAt: new Date().toISOString()
      };
      
      await prisma.assessment.update({
        where: { id },
        data: {
          status: 'completed',
          data: finalData
        }
      });
      
      console.log('💾 Assessment updated with Assistants API results');
      
    } else {
      console.error('❌ Assistants API processing failed:', processingResult.error);
      
      // Update with error status
      await prisma.assessment.update({
        where: { id },
        data: {
          status: 'error',
          data: {
            ...(assessment.data as Record<string, any> || {}),
            responses,
            personalInfo,
            aiError: processingResult.error,
            aiProcessed: false,
            showProcessingScreen: false,
            processingMessage: null,
            processingMethod: 'assistants_api_failed'
          }
        }
      });
      
      return NextResponse.json({
        error: 'AI processing failed',
        details: processingResult.error
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
      message: 'Assessment processed successfully with AI document analysis',
      redirectUrl,
      debug: {
        tier: assessmentAny.tier,
        price: assessmentAny.price,
        processingMethod: 'assistants_api',
        manualProcessing: isManualProcessing,
        fileProcessed: true,
        processingTime: processingResult.processingTime
      }
    };
    
    console.log('Sending success response:', response);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('=== SUBMIT ERROR ===');
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
                aiError: error instanceof Error ? error.message : 'Processing failed',
                aiProcessed: false,
                showProcessingScreen: false,
                processingMessage: null,
                errorTimestamp: new Date().toISOString()
              }
            }
          });
          
          console.log(`Updated assessment ${assessmentId} with error status`);
        }
      } catch (updateError) {
        console.error('Failed to update assessment with error:', updateError);
      }
    } else {
      console.warn('Cannot update assessment - no valid ID available');
    }
    
    return NextResponse.json({ 
      error: 'Server error during processing',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}