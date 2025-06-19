// app/api/assessment/[type]/[id]/submit-with-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

// CRITICAL FIX: Proper Next.js 15 async params handling
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string, id: string }> }
) {
  console.log('=== SUBMIT WITH FILE ENDPOINT ===');
  
  try {
    // FIXED: Properly await params for Next.js 15
    const resolvedParams = await params;
    const { type, id } = resolvedParams;
    
    console.log('Submit-with-file endpoint called with params:', { type, id });
    
    if (!type || !id) {
      console.log('Invalid parameters provided');
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    const assessmentId = id;
    const assessmentType = type;
    
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('Authentication failed - no session or user ID');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log(`User authenticated: ${session.user.id}`);
    
    // Get assessment with detailed logging
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { user: true }
    });
    
    if (!assessment) {
      console.log(`Assessment not found: ${assessmentId}`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    console.log('Assessment found:', {
      id: assessment.id,
      type: assessment.type,
      tier: (assessment as any).tier,
      price: (assessment as any).price,
      manualProcessing: (assessment as any).manualProcessing,
      status: assessment.status,
      userId: assessment.userId
    });
    
    if (assessment.userId !== session.user.id) {
      console.log(`Unauthorized access - assessment belongs to ${assessment.userId}, user is ${session.user.id}`);
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    // Parse form data
    const formData = await request.formData();
    let responses = {};
    
    try {
      // Get form data JSON
      const formDataJson = formData.get('formData');
      if (formDataJson && typeof formDataJson === 'string') {
        responses = JSON.parse(formDataJson);
        console.log('Form data parsed successfully, response count:', Object.keys(responses).length);
      }
    } catch (parseError) {
      console.error('Error parsing form data:', parseError);
      return NextResponse.json({ error: 'Invalid form data format' }, { status: 400 });
    }
    
    // COMPREHENSIVE: Enhanced resume processing with multiple fallback methods
    const resumeFile = formData.get('resume') as File;
    let resumeText = '';
    let resumeContent = '';
    
    // Helper function to clean resume text - ENHANCED for database safety
    const cleanResumeText = (text: string): string => {
      return text
        // Remove null bytes and other problematic Unicode characters
        .replace(/\x00/g, '') // Remove null bytes (\u0000)
        .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
        .replace(/[\uFFFD\uFFFE\uFFFF]/g, '') // Remove replacement characters
        
        // Clean PDF-specific artifacts
        .replace(/endstream\s*endobj/g, ' ') // Remove PDF stream markers
        .replace(/obj\s*<<.*?>>/g, ' ') // Remove PDF object definitions
        .replace(/\/[A-Z][a-zA-Z]*\s*/g, ' ') // Remove PDF commands like /Type /XObject
        .replace(/<<.*?>>/g, ' ') // Remove PDF dictionaries
        .replace(/\[\s*\/[A-Z][a-zA-Z]*.*?\]/g, ' ') // Remove PDF arrays
        .replace(/\d+\s+\d+\s+obj/g, ' ') // Remove object references
        .replace(/stream[\s\S]*?endstream/g, ' ') // Remove entire stream blocks
        
        // Clean meaningless character sequences
        .replace(/['"&%$#!]{3,}/g, ' ') // Remove repeated symbols
        .replace(/[^\x20-\x7E\s]/g, ' ') // Keep only printable ASCII + spaces
        
        // Normalize whitespace
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .trim();
    };

    // 🔥 ENHANCED: Extract meaningful text from PDF regex matches
    const extractMeaningfulText = (rawText: string): string => {
      // Look for text patterns that are likely to be readable content
      const meaningfulPatterns = [
        // Text in parentheses (common in PDF)
        /\(([^)]{4,})\)/g,
        // Text after common keywords
        /(?:Name|Email|Phone|Address|Experience|Education|Skills|Summary|Objective)[\s:]+([^\n\r]{10,})/gi,
        // Words with mixed case (likely real text)
        /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g,
        // Email patterns
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        // Phone patterns
        /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
        // Dates
        /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/gi,
        // Years
        /\b(19|20)\d{2}\b/g,
        // Common resume words
        /\b(?:Manager|Developer|Engineer|Analyst|Coordinator|Specialist|Director|Senior|Junior|Lead|Assistant)\b/gi
      ];

      let extractedText = '';
      
      meaningfulPatterns.forEach(pattern => {
        const matches = rawText.match(pattern) || [];
        matches.forEach(match => {
          // Clean up the match
          const cleanMatch = match
            .replace(/^\(|\)$/g, '') // Remove surrounding parentheses
            .replace(/[^\w\s@.-]/g, ' ') // Keep only word chars, spaces, @, ., -
            .trim();
          
          if (cleanMatch.length > 3 && /[a-zA-Z]/.test(cleanMatch)) {
            extractedText += cleanMatch + ' ';
          }
        });
      });

      return extractedText.trim();
    };

    // 🔥 COMPREHENSIVE: PDF Processing with multiple fallback methods
    const processResumeFileComprehensive = async (resumeFile: File | null): Promise<{
      success: boolean;
      text: string;
      method: string;
      error?: string;
    }> => {
      if (!resumeFile || resumeFile.size === 0) {
        return {
          success: false,
          text: '',
          method: 'none',
          error: 'No file provided'
        };
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB limit
      if (resumeFile.size > maxSize) {
        return {
          success: false,
          text: `[File too large: ${resumeFile.name}. Maximum size is 10MB]`,
          method: 'size-limit',
          error: 'File size exceeds limit'
        };
      }
      
      console.log(`🔄 Processing: ${resumeFile.name} (${resumeFile.size} bytes), type: ${resumeFile.type}`);
      
      // PDF Processing with multiple fallbacks
      if (resumeFile.type === 'application/pdf' || resumeFile.name.toLowerCase().endsWith('.pdf')) {
        
        // Try Method 1: pdf-parse (most reliable)
        try {
          console.log('📄 Attempting PDF processing with pdf-parse...');
          const pdfParse = await import('pdf-parse');
          const buffer = await resumeFile.arrayBuffer();
          const data = await pdfParse.default(Buffer.from(buffer));
          
          if (data.text && data.text.length > 50) {
            const cleaned = cleanResumeText(data.text);
            if (cleaned.length > 50) {
              console.log(`✅ pdf-parse success: ${cleaned.length} characters`);
              return { success: true, text: cleaned, method: 'pdf-parse' };
            }
          }
          console.log('⚠️ pdf-parse returned insufficient text');
        } catch (e) {
          console.warn('❌ pdf-parse failed:', (e as Error).message);
        }
        
        // Try Method 2: PDFjs-dist
        try {
          console.log('📄 Attempting PDF processing with PDFjs-dist...');
          const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
          
          // Disable worker for serverless environments
          pdfjsLib.GlobalWorkerOptions.workerSrc = '';
          
          const buffer = await resumeFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
          
          let fullText = '';
          console.log(`📊 PDF has ${pdf.numPages} pages`);
          
          // Extract text from all pages (limit to first 10 pages for performance)
          const maxPages = Math.min(pdf.numPages, 10);
          for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            
            fullText += pageText + '\n';
            console.log(`📄 Page ${pageNum}: ${pageText.length} characters extracted`);
          }
          
          if (fullText.length > 50) {
            const cleaned = cleanResumeText(fullText);
            console.log(`✅ PDFjs success: ${cleaned.length} characters`);
            return { success: true, text: cleaned, method: 'pdfjs-dist' };
          }
          console.log('⚠️ PDFjs returned insufficient text');
        } catch (e) {
          console.warn('❌ PDFjs-dist failed:', (e as Error).message);
        }
        
        // Try Method 3: Safe binary text extraction (last resort for PDF)
        try {
          console.log('📄 Attempting safe binary text extraction...');
          const buffer = await resumeFile.arrayBuffer();
          const uint8Array = new Uint8Array(buffer);
          let extractedText = '';
          
          // More restrictive character filtering for database safety
          for (let i = 0; i < Math.min(uint8Array.length, 30000); i++) {
            const byte = uint8Array[i];
            // Only allow safe printable ASCII characters
            if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
              extractedText += String.fromCharCode(byte);
            } else if (byte === 9) { // Tab
              extractedText += ' ';
            }
          }
          
          // Filter for meaningful words and phrases
          const words = extractedText
            .split(/\s+/)
            .filter(word => 
              word.length >= 3 && 
              word.length <= 50 &&
              /^[a-zA-Z@.-]+$/.test(word) &&
              !/^[^a-zA-Z]*$/.test(word) // Must contain at least one letter
            );
          
          if (words.length > 10) {
            const meaningfulText = words.join(' ');
            const cleaned = cleanResumeText(meaningfulText);
            if (cleaned.length > 50) {
              console.log(`✅ Safe binary extraction success: ${cleaned.length} characters`);
              return { success: true, text: cleaned, method: 'safe-binary-extraction' };
            }
          }
          console.log('⚠️ Safe binary extraction returned insufficient meaningful text');
        } catch (e) {
          console.warn('❌ Safe binary extraction failed:', (e as Error).message);
        }
        
        // Final fallback for PDF
        return {
          success: false,
          text: `[PDF File: ${resumeFile.name} - Multiple extraction methods failed. Please convert to .txt or .docx format for better results]`,
          method: 'pdf-all-failed',
          error: 'All PDF processing methods failed'
        };
      }
      
      // Word Document Processing
      if (resumeFile.type.includes('word') || 
          resumeFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          resumeFile.type === 'application/msword' ||
          resumeFile.name.toLowerCase().endsWith('.docx') || 
          resumeFile.name.toLowerCase().endsWith('.doc')) {
        
        try {
          console.log('📄 Processing Word document with mammoth...');
          const mammoth = await import('mammoth');
          const buffer = await resumeFile.arrayBuffer();
          const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
          
          if (result.value && result.value.length > 10) {
            const cleaned = cleanResumeText(result.value);
            console.log(`✅ Word processing success: ${cleaned.length} characters`);
            return { success: true, text: cleaned, method: 'mammoth' };
          }
          console.log('⚠️ Word processing returned insufficient text');
        } catch (e) {
          console.warn('❌ Word processing failed:', (e as Error).message);
          return {
            success: false,
            text: `[Word Document: ${resumeFile.name} - Processing failed. Please try converting to PDF or .txt format]`,
            method: 'word-failed',
            error: 'Word document processing failed'
          };
        }
      }
      
      // Plain Text Processing
      if (resumeFile.type === 'text/plain' || resumeFile.name.toLowerCase().endsWith('.txt')) {
        try {
          console.log('📄 Processing plain text file...');
          const text = await resumeFile.text();
          const cleaned = cleanResumeText(text);
          console.log(`✅ Text file success: ${cleaned.length} characters`);
          return { success: true, text: cleaned, method: 'plain-text' };
        } catch (e) {
          return {
            success: false,
            text: `[Text file processing failed: ${resumeFile.name}]`,
            method: 'text-failed',
            error: 'Text file processing failed'
          };
        }
      }
      
      // Unsupported format
      return {
        success: false,
        text: `[Unsupported file format: ${resumeFile.name}. Please upload PDF, Word (.docx), or Text (.txt) files]`,
        method: 'unsupported',
        error: `Unsupported file type: ${resumeFile.type}`
      };
    };

    if (resumeFile && resumeFile.size > 0) {
      try {
        const result = await processResumeFileComprehensive(resumeFile);
        
        if (result.success) {
          resumeText = result.text;
          resumeContent = result.text;
          console.log(`✅ Resume processing SUCCESS using ${result.method}: ${resumeText.length} characters`);
          
          // 🔥 CRITICAL: Additional database safety cleaning
          resumeText = resumeText
            .replace(/\x00/g, '') // Remove any remaining null bytes
            .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
            .replace(/[^\x20-\x7E\s]/g, '') // Keep only safe printable characters
            .trim();
          
          // 🔥 CRITICAL: Limit resume text size for AI processing
          if (resumeText.length > 8000) {
            console.log(`📏 Resume text too long (${resumeText.length} chars), truncating to 8000 chars`);
            resumeText = resumeText.substring(0, 8000) + '\n\n[Resume content truncated for processing...]';
          }
          
          resumeContent = resumeText;
          
          // 🔥 CRITICAL: Final safety check before database save
          if (resumeText.includes('\x00') || /[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(resumeText)) {
            console.warn('⚠️ Detected unsafe characters in resume text, applying final cleanup');
            resumeText = resumeText
              .replace(/[\x00-\x1F\x7F]/g, ' ') // Replace all control chars with spaces
              .replace(/\s+/g, ' ') // Normalize spaces
              .trim();
            resumeContent = resumeText;
          }
          
          // Log first 200 characters for debugging (if successful and safe)
          const safePreview = resumeText.substring(0, 200).replace(/[\x00-\x1F\x7F]/g, '?');
          console.log('📋 Resume text preview (safe):', safePreview + '...');
        } else {
          console.error(`❌ Resume processing FAILED: ${result.error}`);
          resumeText = result.text; // This will contain error message
          resumeContent = result.text;
        }
      } catch (error) {
        console.error('❌ Comprehensive resume processing failed:', error);
        resumeText = `[Resume processing failed for ${resumeFile.name}: ${error instanceof Error ? error.message : 'Unknown error'}]`;
        resumeContent = resumeText;
      }
    } else {
      console.log('ℹ️ No resume file uploaded');
    }
    
    // UPDATE: Assessment with proper resume text storage
    const updatedData = {
      ...(assessment.data as Record<string, any> || {}),
      responses,
      personalInfo: (responses as any).personalInfo || {},
      resumeText: resumeText,        // ✅ ENSURE THIS IS SAVED
      resumeContent: resumeContent,  // ✅ BACKUP FIELD
      resumeFileName: resumeFile?.name || '',
      resumeFileSize: resumeFile?.size || 0,
      resumeFileType: resumeFile?.type || '',
      submittedAt: new Date().toISOString(),
      hasResumeContent: !!resumeText,
      // Set processing flags for AI analysis
      aiAnalysisStarted: false,
      aiProcessed: false,
      showProcessingScreen: false,
      analysisStatus: 'pending'
    };
    
    // Update assessment with submitted data
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'submitted',
        data: updatedData
      }
    });
    
    console.log('Assessment updated with resume data:', {
      resumeTextLength: resumeText.length,
      hasResume: !!resumeText,
      fileName: resumeFile?.name
    });
    
    // CRITICAL DECISION LOGIC: Manual vs AI Processing
    console.log('=== PROCESSING DECISION LOGIC ===');
    
    // CRITICAL FIX: Simplified tier-based decision
    const assessmentAny = assessment as any;
    const isManualProcessing = assessmentAny.tier === 'standard' || 
                              assessmentAny.tier === 'premium' || 
                              assessmentAny.manualProcessing === true;
    
    console.log('Manual processing check:', {
      tier: assessmentAny.tier,
      price: assessmentAny.price,
      manualProcessingFlag: assessmentAny.manualProcessing,
      finalDecision: isManualProcessing
    });
    
    // MANUAL PROCESSING PATH (RM100 and RM250)
    if (isManualProcessing) {
      console.log(`=== MANUAL PROCESSING PATH ===`);
      console.log(`Assessment ${assessmentId} is for manual processing - tier: ${assessmentAny.tier}, price: ${assessmentAny.price}`);
      
      // Update status for manual processing
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { 
          status: 'pending_review',
          manualProcessing: true
        }
      });
      
      console.log('Assessment status updated to pending_review');
      
      // CRITICAL FIX: Tier-based redirect URL determination
      let redirectUrl;
      
      if (assessmentAny.tier === 'premium') {
        redirectUrl = `/assessment/${assessmentType}/premium-results/${assessmentId}`;
        console.log(`PREMIUM tier detected → redirecting to: ${redirectUrl}`);
      } else if (assessmentAny.tier === 'standard') {
        redirectUrl = `/assessment/${assessmentType}/standard-results/${assessmentId}`;
        console.log(`STANDARD tier detected → redirecting to: ${redirectUrl}`);
      } else {
        // Fallback - shouldn't happen but just in case
        redirectUrl = `/assessment/${assessmentType}/standard-results/${assessmentId}`;
        console.log(`FALLBACK for manual processing → redirecting to: ${redirectUrl}`);
      }
      
      const response = {
        success: true,
        message: 'Assessment submitted for expert review',
        redirectUrl: redirectUrl,
        debug: {
          tier: assessmentAny.tier,
          price: assessmentAny.price,
          manualProcessing: true,
          redirectReason: assessmentAny.tier === 'premium' ? 'premium' : 'standard',
          resumeProcessed: !!resumeText
        }
      };
      
      console.log('Sending manual processing response:', response);
      return NextResponse.json(response);
    }
    
    // AI PROCESSING PATH (RM50 Basic)
    console.log(`=== AI PROCESSING PATH ===`);
    console.log(`Assessment ${assessmentId} is for AI processing - tier: ${assessmentAny.tier}, price: ${assessmentAny.price}`);
    
    const redirectUrl = `/assessment/${assessmentType}/processing/${assessmentId}`;
    
    const response = {
      success: true, 
      message: 'Assessment submitted for AI processing',
      redirectUrl: redirectUrl,
      debug: {
        tier: assessmentAny.tier,
        price: assessmentAny.price,
        manualProcessing: false,
        redirectReason: 'ai_processing',
        resumeProcessed: !!resumeText
      }
    };
    
    console.log('Sending AI processing response:', response);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('=== SUBMIT ERROR ===');
    console.error('Server error:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}