// /src/app/api/assessment/[type]/[id]/submit-with-google-vision/route.ts
// ✅ FIXED & ENHANCED: Includes tier-based redirect logic

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { extractTextWithGoogleVision, isGoogleVisionConfigured } from '@/lib/google-vision-resume-analyzer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string, id: string }> }
) {
  console.log('=== SUBMISSION & TEXT EXTRACTION (ENHANCED LOGIC) ===');

  let assessmentId: string | null = null;

  try {
    // Await params for Next.js 15
    const resolvedParams = await params;
    const { type, id } = resolvedParams;
    assessmentId = id;

    if (!type || !id) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Check if Google Vision is configured (still needed for the main path)
    if (!isGoogleVisionConfigured()) {
      console.error('❌ Google Vision API not configured');
      return NextResponse.json({
        error: 'Google Vision API is not properly configured. Please check GOOGLE_VISION_API_KEY.',
      }, { status: 500 });
    }

    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get assessment, including tier information
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
        formScoring = parsed._internalScoring?.formScoring || {};
      }
    } catch (parseError) {
      console.error('Error parsing form data:', parseError);
      return NextResponse.json({ error: 'Invalid form data format' }, { status: 400 });
    }

    // Get uploaded file (can be null)
    const resumeFile = formData.get('resume') as File | null;
    
    // Process form data and file (if it exists)
    if (!resumeFile || resumeFile.size === 0) {
      // Case 1: No resume file uploaded.
      // This is valid for manual processing tiers.
      console.log('📄 No resume file submitted. Updating form data only.');
      await prisma.assessment.update({
        where: { id },
        data: {
          status: 'submitted', // Use a clear status for manual review without resume
          data: {
            ...(assessment.data as Record<string, any> || {}),
            responses,
            personalInfo,
            formScoring,
            submittedAt: new Date().toISOString(),
            processingMethod: 'form_only',
            documentProcessed: false, // Explicitly mark as no document
          }
        }
      });
    } else {
      // Case 2: Resume file exists. Process with Google Vision.
      console.log(`📄 Processing file with Google Vision: ${resumeFile.name}`);
      
      // Update with form data first and set status to processing
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
          }
        }
      });

      const extractionResult = await extractTextWithGoogleVision(resumeFile);

      if (extractionResult.success && extractionResult.extractedText) {
        console.log('✅ Google Vision text extraction successful');
        
        // Update assessment with extracted text results
        await prisma.assessment.update({
          where: { id },
          data: {
            status: 'text_extracted', // New intermediate status
            data: {
                ...(assessment.data as Record<string, any> || {}),
                responses, personalInfo, formScoring,
                extractedText: extractionResult.extractedText,
                documentProcessed: true,
                readyForAnalysis: true,
                processingMethod: extractionResult.processingMethod,
                processingStep: 'text_extracted',
                // ... (other document metadata)
            }
          }
        });
        console.log('💾 Assessment updated with text extraction results');
      } else {
        // Handle extraction failure
        console.error('❌ Google Vision text extraction failed:', extractionResult.error);
        await prisma.assessment.update({
          where: { id },
          data: {
            status: 'extraction_failed',
            data: {
              // ... (data for extraction failure)
            }
          }
        });
        return NextResponse.json({
          error: 'Document Processing Failed',
          message: 'We could not extract text from your document. Please try again.',
          details: extractionResult.error,
        }, { status: 422 });
      }
    }

    // --- LOGIK BARU & PALING PENTING ADA DI SINI ---
    // Selepas semua data dikemas kini, tentukan ke mana pengguna perlu pergi.
    
    console.log('🧠 Determining redirect URL based on assessment tier...');
    
    // Semak sama ada ia proses manual berdasarkan TIER.
    const isManualProcessing = assessment.tier === 'premium' || assessment.tier === 'standard' || assessment.manualProcessing;

    let redirectUrl: string;

    if (isManualProcessing) {
      // Jika manual, terus halakan ke halaman "Terima Kasih" yang betul.
      if (assessment.tier === 'premium') {
        redirectUrl = `/assessment/${type}/premium-results/${id}`;
      } else { // 'standard'
        redirectUrl = `/assessment/${type}/standard-results/${id}`;
      }
      console.log(`✅ Manual Processing Detected. Redirecting to: ${redirectUrl}`);
    } else {
      // Jika bukan manual (contoh: 'basic'), halakan ke halaman pemprosesan AI.
      // Halaman ini akan menunjukkan animasi sementara frontend memanggil endpoint /process.
      redirectUrl = `/assessment/${type}/processing/${id}`;
      console.log(`✅ AI Processing Detected. Redirecting to processing page: ${redirectUrl}`);
    }

    // Hantar respons yang kini mengandungi redirectUrl yang betul dan muktamad.
    const finalResponse = {
      success: true,
      message: 'Submission received successfully. Redirecting...',
      redirectUrl: redirectUrl, 
      debug: {
        tier: assessment.tier,
        isManual: isManualProcessing,
        determinedRedirect: redirectUrl
      }
    };
    
    return NextResponse.json(finalResponse);

  } catch (error) {
    console.error('=== SUBMISSION/EXTRACTION ERROR ===');
    console.error('Server error:', error);

    // Enhanced error handling
    if (assessmentId) {
      try {
        const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
        if (assessment) {
          await prisma.assessment.update({
            where: { id: assessmentId },
            data: {
              status: 'error',
              data: {
                ...(assessment.data as Record<string, any> || {}),
                extractionError: error instanceof Error ? error.message : 'Submission failed',
                processingStep: 'submission_error',
              }
            }
          });
        }
      } catch (updateError) {
        console.error('Failed to update assessment with error:', updateError);
      }
    }

    return NextResponse.json({
      error: 'An unexpected error occurred',
      message: 'We encountered an error while processing your submission. Please try again in a few minutes.',
      technical: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}