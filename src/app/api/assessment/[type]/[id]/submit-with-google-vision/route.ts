// /src/app/api/assessment/[type]/[id]/submit-with-google-vision/route.ts
// ✅ FIXED: Google Vision text extraction ONLY (5-8 seconds max)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { extractTextWithGoogleVision, isGoogleVisionConfigured } from '@/lib/google-vision-resume-analyzer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string, id: string }> }
) {
  console.log('=== GOOGLE VISION TEXT EXTRACTION ONLY (STEP 1) ===');

  let assessmentId: string | null = null;

  try {
    // Await params for Next.js 15
    const resolvedParams = await params;
    const { type, id } = resolvedParams;

    console.log('Google Vision extraction called with params:', { type, id });

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

        // Extract form scoring from frontend calculation
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
          processingMethod: 'google_vision_text_only',
          processingStep: 'text_extraction',
          processingMessage: 'extracting text from document with Vision AI...'
        }
      }
    });

    // ✅ STEP 1: TEXT EXTRACTION ONLY (5-8 seconds max)
    console.log('🚀 Starting Google Vision text extraction ONLY...');

    const extractionResult = await extractTextWithGoogleVision(resumeFile);

    if (extractionResult.success && extractionResult.extractedText) {
      console.log('✅ Google Vision text extraction successful');
      console.log(`📝 Extracted text length: ${extractionResult.extractedText.length} characters`);

      // ✅ SAVE TEXT EXTRACTION RESULTS ONLY
      const finalData = {
        ...(assessment.data as Record<string, any> || {}),
        responses,
        personalInfo,
        formScoring,

        // Text extraction results
        extractedText: extractionResult.extractedText,
        documentProcessed: true,
        readyForAnalysis: true,
        
        // Processing metadata
        processingMethod: extractionResult.processingMethod,
        processingStep: 'text_extracted',
        processingMessage: 'Text extracted successfully. Ready for AI analysis.',

        // Document metadata
        documentAnalysis: {
          type: resumeFile.type,
          processingMethod: extractionResult.processingMethod,
          textLength: extractionResult.extractedText.length,
          fileName: resumeFile.name,
          fileSize: resumeFile.size,
          processedAt: new Date().toISOString()
        },

        // File metadata
        resumeFileName: resumeFile.name,
        resumeFileSize: resumeFile.size,
        resumeFileType: resumeFile.type,
        hasResumeContent: true,
        submittedAt: new Date().toISOString()
      };

      // Update assessment with text extraction results
      await prisma.assessment.update({
        where: { id },
        data: {
          status: 'text_extracted', // New intermediate status
          data: finalData
        }
      });

      console.log('💾 Assessment updated with text extraction results');

      // ✅ RETURN SUCCESS WITH INSTRUCTION FOR STEP 2
      const response = {
        success: true,
        step: 'text_extraction_completed',
        message: 'Text extraction completed successfully with Vision AI',
        textExtracted: true,
        extractedTextLength: extractionResult.extractedText.length,
        processingMethod: extractionResult.processingMethod,
        readyForAnalysis: true,
        
        // Next step instructions
        nextStep: {
          instruction: 'Call process endpoint for AI analysis',
          endpoint: `/api/assessment/${type}/${id}/process`,
          method: 'POST'
        },

        debug: {
          fileProcessed: resumeFile.name,
          processingTime: extractionResult.processingTime,
          textLength: extractionResult.extractedText.length,
          visionMethod: extractionResult.processingMethod
        }
      };

      console.log('✅ Text extraction response:', response);
      return NextResponse.json(response);

    } else {
      console.error('❌ Google Vision text extraction failed:', extractionResult.error);

      // Update with error status
      await prisma.assessment.update({
        where: { id },
        data: {
          status: 'extraction_failed',
          data: {
            ...(assessment.data as Record<string, any> || {}),
            responses,
            personalInfo,
            extractionError: extractionResult.error,
            processingStep: 'text_extraction_failed',
            processingMessage: 'Document processing failed. Please try again.',
            processingMethod: 'google_vision_failed',
            canRetry: true,
            errorTimestamp: new Date().toISOString()
          }
        }
      });

      return NextResponse.json({
        error: 'Document Processing Failed',
        message: 'We could not extract text from your document. Please try again with a different file or try again in a few minutes.',
        details: extractionResult.error,
        suggestions: [
          'Ensure the document contains clear, readable text',
          'Try uploading a PDF instead of an image',
          'Check that the file is not corrupted',
          'Try again in a few minutes'
        ],
        canRetry: true,
        retryIn: '2-5 minutes'
      }, { status: 422 }); // Unprocessable Entity
    }

  } catch (error) {
    console.error('=== GOOGLE VISION TEXT EXTRACTION ERROR ===');
    console.error('Server error:', error);

    // Enhanced error handling
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
                extractionError: error instanceof Error ? error.message : 'Google Vision text extraction failed',
                processingStep: 'text_extraction_error',
                processingMessage: 'Text extraction failed. Please try again.',
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
      error: 'Document Processing Error',
      message: 'We encountered an error while processing your document. Please try again in a few minutes.',
      retryIn: '2-5 minutes',
      canRetry: true,
      suggestions: [
        'Check your internet connection',
        'Try uploading a different file format',
        'Ensure the file is not corrupted',
        'Contact support if the issue persists'
      ],
      technical: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}