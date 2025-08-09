// /src/lib/google-vision-resume-analyzer.ts - NO FAKE RESULTS VERSION
// ✅ HONEST: Return errors instead of fake analysis

import { openai } from '@/lib/openai';

// Google Vision REST API configuration
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
const GOOGLE_VISION_API_BASE = 'https://vision.googleapis.com/v1';

// ✅ TEXT EXTRACTION RESULT (no fake results)
export interface TextExtractionResult {
  success: boolean;
  extractedText?: string;
  processingMethod?: 'google_vision_pdf' | 'google_vision_image' | 'fallback';
  error?: string;
  processingTime?: number;
}

// ✅ ANALYSIS RESULT (real results only)
export interface ResumeAnalysisResult {
  success: boolean;
  extractedText?: string;
  analysis?: {
    scores: {
      resumeQuality: number;
      experienceRelevance: number;
      skillsMatch: number;
      professionalPresentation: number;
      overallResumeScore: number;
      evidenceLevel: 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT';
    };
    resumeAnalysis: {
      analysis: string;
      keyFindings: string[];
      experienceLevel: 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'EXECUTIVE';
      skillsValidation: {
        claimed: string[];
        evidenced: string[];
        missing: string[];
      };
      gapAnalysis: string[];
      credibilityScore: number;
      recommendations: string[];
    };
    careerFit: {
      fitLevel: 'EXCELLENT_FIT' | 'GOOD_FIT' | 'PARTIAL_FIT' | 'POOR_FIT' | 'WRONG_CAREER_PATH';
      fitPercentage: number;
      honestAssessment: string;
      realityCheck: string;
      marketCompetitiveness: string;
      timeToReadiness: string;
      criticalGaps: string[];
      competitiveAdvantages: string[];
    };
  };
  processingMethod?: 'google_vision_pdf' | 'google_vision_image' | 'fallback';
  error?: string;
  processingTime?: number;
}

export interface AssessmentContext {
  assessmentType: string;
  targetRole: string;
  personality: string;
  responses: Record<string, any>;
  personalInfo: any;
  formScoring?: {
    formContribution: number;
    weight: number;
  };
}

/**
 * ✅ TEXT EXTRACTION ONLY (5-8 seconds max)
 * This function ONLY extracts text, NO fake results
 */
export async function extractTextWithGoogleVision(file: File): Promise<TextExtractionResult> {
  const startTime = Date.now();
  
  try {
    console.log(`[Vision] 📄 Text extraction ONLY: ${file.name} (${file.size} bytes)`);
    
    // Step 1: Validate file
    const validation = validateResumeFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        processingTime: Date.now() - startTime
      };
    }
    
    // Step 2: Extract text using Google Vision
    console.log(`[Vision] 🔍 Extracting text from ${file.type}`);
    const extractionResult = await extractTextFromFile(file);
    
    if (!extractionResult.success || !extractionResult.text) {
      return {
        success: false,
        error: extractionResult.error || 'Failed to extract text from file',
        processingMethod: extractionResult.method,
        processingTime: Date.now() - startTime
      };
    }
    
    console.log(`[Vision] ✅ Text extraction completed in ${Date.now() - startTime}ms`);
    
    return {
      success: true,
      extractedText: extractionResult.text,
      processingMethod: extractionResult.method,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('[Vision] ❌ Text extraction failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during text extraction',
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * ✅ SEPARATE OpenAI ANALYSIS FUNCTION - NO FAKE RESULTS
 * Call this SEPARATELY after text extraction, will throw error if fails
 */
export async function analyzeExtractedTextSeparately(
  extractedText: string, 
  context: AssessmentContext
): Promise<any> {
  try {
    console.log('[Vision] 🤖 Starting OpenAI analysis - NO FALLBACK MODE');
    
    const prompt = generateResumeAnalysisPrompt(extractedText, context);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a BRUTALLY HONEST resume analysis expert. Provide realistic, evidence-based assessment of resumes for career readiness evaluations. Be thorough, specific, and honest about strengths and weaknesses.

CRITICAL INSTRUCTIONS:
- Focus ONLY on the resume content analysis and career insights
- Do NOT mention any AI services, processing tools, or extraction methods
- Provide direct professional analysis without technical processing references
- Your response should read like a human career expert's assessment`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000,
    });
    
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('Empty response from OpenAI - analysis could not be completed');
    }
    
    let analysis;
    try {
      analysis = JSON.parse(responseContent);
    } catch (parseError) {
      throw new Error('Invalid response format from AI analysis service');
    }
    
    // ✅ VALIDATE: Ensure we got real, complete results
    if (!analysis || !analysis.scores || typeof analysis.scores.overallResumeScore !== 'number') {
      throw new Error('AI analysis returned incomplete results');
    }
    
    // ✅ VALIDATE: Ensure all required fields exist
    const requiredFields = ['scores', 'resumeAnalysis', 'careerFit'];
    for (const field of requiredFields) {
      if (!analysis[field]) {
        throw new Error(`AI analysis missing required field: ${field}`);
      }
    }
    
    console.log('[Vision] ✅ OpenAI analysis completed successfully with complete results');
    
    // Validate and enhance the analysis (but no fake data)
    return validateAnalysisResults(analysis, context);
    
  } catch (error) {
    console.error('[Vision] ❌ OpenAI analysis failed:', error);
    
    // ✅ NO FAKE RESULTS - Throw error instead
    throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * ✅ LEGACY: Full analysis - kept for backward compatibility but NO FAKE RESULTS
 */
export async function analyzeResumeWithGoogleVision(
  file: File,
  context: AssessmentContext
): Promise<ResumeAnalysisResult> {
  const startTime = Date.now();
  
  try {
    console.log(`[Vision] 🚀 LEGACY: Full analysis for ${file.name} - NO FAKE RESULTS`);
    
    // Step 1: Extract text (5-8 seconds)
    const textResult = await extractTextWithGoogleVision(file);
    
    if (!textResult.success || !textResult.extractedText) {
      return {
        success: false,
        error: textResult.error,
        processingMethod: textResult.processingMethod,
        processingTime: Date.now() - startTime
      };
    }
    
    // Step 2: Analyze with OpenAI (NO FALLBACK)
    console.log(`[Vision] 🤖 Analyzing extracted text (${textResult.extractedText.length} chars) - NO FALLBACK`);
    
    try {
      const analysis = await analyzeExtractedTextSeparately(textResult.extractedText, context);
      
      console.log(`[Vision] ✅ Full analysis completed in ${Date.now() - startTime}ms`);
      
      return {
        success: true,
        extractedText: textResult.extractedText,
        analysis,
        processingMethod: textResult.processingMethod,
        processingTime: Date.now() - startTime
      };
      
    } catch (analysisError) {
      // ✅ NO FAKE RESULTS - Return error instead
      return {
        success: false,
        extractedText: textResult.extractedText,
        error: analysisError instanceof Error ? analysisError.message : 'AI analysis failed',
        processingMethod: textResult.processingMethod,
        processingTime: Date.now() - startTime
      };
    }
    
  } catch (error) {
    console.error('[Vision] ❌ Full analysis failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during analysis',
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * 📄 Extract text from file using Google Vision API
 */
async function extractTextFromFile(file: File): Promise<{
  success: boolean;
  text?: string;
  method?: 'google_vision_pdf' | 'google_vision_image' | 'fallback';
  error?: string;
}> {
  try {
    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();
    const content = Buffer.from(fileBuffer);
    
    // Method 1: Try PDF processing first (if PDF)
    if (file.type === 'application/pdf') {
      console.log('[Vision] 📄 Attempting PDF processing...');
      
      try {
        const pdfResult = await extractTextFromPDF(content);
        if (pdfResult.success && pdfResult.text && pdfResult.text.length > 50) {
          console.log(`[Vision] ✅ PDF processing successful (${pdfResult.text.length} chars)`);
          return {
            success: true,
            text: pdfResult.text,
            method: 'google_vision_pdf'
          };
        }
      } catch (pdfError) {
        console.warn('[Vision] ⚠️ PDF processing failed, trying image fallback:', pdfError);
      }
    }
    
    // Method 2: Image processing (for images or PDF fallback)
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      console.log('[Vision] 🖼️ Attempting image processing...');
      
      try {
        const imageResult = await extractTextFromImage(content);
        if (imageResult.success && imageResult.text && imageResult.text.length > 20) {
          console.log(`[Vision] ✅ Image processing successful (${imageResult.text.length} chars)`);
          return {
            success: true,
            text: imageResult.text,
            method: 'google_vision_image'
          };
        }
      } catch (imageError) {
        console.error('[Vision] ❌ Image processing failed:', imageError);
      }
    }
    
    // ✅ NO FAKE TEXT - Return error instead
    return {
      success: false,
      error: 'Could not extract readable text from file. Please ensure the file contains clear, readable text.',
      method: 'fallback'
    };
    
  } catch (error) {
    console.error('[Vision] ❌ Text extraction failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Text extraction failed'
    };
  }
}

/**
 * 📄 Extract text from PDF using Google Vision REST API
 */
async function extractTextFromPDF(content: Buffer): Promise<{
  success: boolean;
  text?: string;
  error?: string;
}> {
  try {
    const requestBody = {
      requests: [
        {
          inputConfig: {
            content: content.toString('base64'),
            mimeType: 'application/pdf',
          },
          features: [
            {
              type: 'DOCUMENT_TEXT_DETECTION',
            },
          ],
          pages: [1], // Process first page only for faster processing
        },
      ],
    };
    
    console.log('[Vision] 📄 Calling REST API for PDF...');
    
    const response = await fetch(`${GOOGLE_VISION_API_BASE}/files:annotate?key=${GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Vision API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const result = await response.json();
    
    if (!result.responses || result.responses.length === 0) {
      throw new Error('No responses from Vision API');
    }
    
    const fileResponse = result.responses[0];
    if (!fileResponse.responses || fileResponse.responses.length === 0) {
      throw new Error('No page responses from Vision API');
    }
    
    // Extract text from first page
    const pageResponse = fileResponse.responses[0];
    const extractedText = pageResponse.fullTextAnnotation?.text || '';
    
    if (!extractedText || extractedText.length < 10) {
      throw new Error('Insufficient text extracted from PDF - document may be image-based or corrupted');
    }
    
    console.log(`[Vision] ✅ PDF text extracted: ${extractedText.length} characters`);
    
    return {
      success: true,
      text: cleanExtractedText(extractedText)
    };
    
  } catch (error) {
    console.error('[Vision] ❌ PDF processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF processing failed'
    };
  }
}

/**
 * 🖼️ Extract text from image using Google Vision REST API
 */
async function extractTextFromImage(content: Buffer): Promise<{
  success: boolean;
  text?: string;
  error?: string;
}> {
  try {
    console.log('[Vision] 🖼️ Calling REST API for image...');
    
    const requestBody = {
      requests: [
        {
          image: {
            content: content.toString('base64'),
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 1,
            },
          ],
        },
      ],
    };
    
    const response = await fetch(`${GOOGLE_VISION_API_BASE}/images:annotate?key=${GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Vision API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const result = await response.json();
    
    if (!result.responses || result.responses.length === 0) {
      throw new Error('No responses from Vision API');
    }
    
    const imageResponse = result.responses[0];
    const textAnnotations = imageResponse.textAnnotations;
    
    if (!textAnnotations || textAnnotations.length === 0) {
      throw new Error('No text detected in image - document may be unreadable or corrupted');
    }
    
    // First annotation contains the full text
    const fullText = textAnnotations[0].description || '';
    
    if (!fullText || fullText.length < 10) {
      throw new Error('Insufficient text detected in image - document may be low quality or unreadable');
    }
    
    console.log(`[Vision] ✅ Image text extracted: ${fullText.length} characters`);
    
    return {
      success: true,
      text: cleanExtractedText(fullText)
    };
    
  } catch (error) {
    console.error('[Vision] ❌ Image processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Image processing failed'
    };
  }
}

/**
 * 🧹 Clean and normalize extracted text
 */
function cleanExtractedText(text: string): string {
  return text
    .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
    .replace(/\s{3,}/g, ' ')    // Remove excessive spaces
    .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters except newlines
    .trim();
}

/**
 * 📝 Generate comprehensive resume analysis prompt
 */
function generateResumeAnalysisPrompt(extractedText: string, context: AssessmentContext): string {
  return `
COMPREHENSIVE RESUME ANALYSIS

**IMPORTANT CONTEXT:** All analysis must be performed from the perspective of the job market in **Malaysia**. Consider local industry norms, expectations for career progression, and the value of local educational institutions and companies.

**ASSESSMENT CONTEXT:**
- Assessment Type: ${context.assessmentType.toUpperCase()}
- Target Role: ${context.targetRole}
- Personality: ${context.personality}
- Form Contribution: ${context.formScoring?.formContribution || 'N/A'}% (weight: ${context.formScoring?.weight || 60}%)

**ASSESSMENT RESPONSES:**
${JSON.stringify(context.responses, null, 2)}

**EXTRACTED RESUME TEXT:**
${extractedText}

**ANALYSIS REQUIREMENTS:**

1. **RESUME QUALITY ASSESSMENT (0-100 scoring)**:
   - Professional presentation and formatting quality, considering Malaysian standards.
   - Clarity of achievements and impact metrics.
   - Use of industry-relevant keywords and terminology specific to the region.
   - Overall document credibility and completeness.

2. **EXPERIENCE RELEVANCE ANALYSIS**:
   - Direct relevance to target role: ${context.targetRole}.
   - Career progression and growth trajectory, evaluated against Malaysian industry benchmarks.
   - Leadership and responsibility evolution.
   - Quantifiable achievements and impact.

3. **SKILLS VALIDATION**:
   - Technical skills mentioned vs demonstrated.
   - Soft skills evidenced through achievements.
   - Skills claimed in assessment vs proven in resume.
   - Relevance of local certifications and education.

4. **CAREER FIT ASSESSMENT**:
   - Realistic suitability for the target role within the Malaysian job market.
   - Market competitiveness evaluation against other potential Malaysian candidates.
   - Time to readiness estimation.
   - Critical gaps identification.

5. **HONEST SCORING** (be realistic, based on Malaysian context):
   - Entry level: typically 40-65%
   - Mid-level: typically 55-75%
   - Senior level: typically 65-85%
   - Only 85-100% for exceptional evidence

**REQUIRED JSON RESPONSE:**
{
  "scores": {
    "resumeQuality": number (0-100),
    "experienceRelevance": number (0-100),
    "skillsMatch": number (0-100),
    "professionalPresentation": number (0-100),
    "overallResumeScore": number (0-100),
    "evidenceLevel": "STRONG" | "MODERATE" | "WEAK" | "INSUFFICIENT"
  },
  "resumeAnalysis": {
    "analysis": "2-3 sentence honest assessment of resume quality and career readiness, from a Malaysian perspective.",
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
  },
  "careerFit": {
    "fitLevel": "EXCELLENT_FIT" | "GOOD_FIT" | "PARTIAL_FIT" | "POOR_FIT" | "WRONG_CAREER_PATH",
    "fitPercentage": number (0-100),
    "honestAssessment": "Brutally honest assessment of suitability for target role in the Malaysian market.",
    "realityCheck": "What they ACTUALLY need to know about their readiness in Malaysia.",
    "marketCompetitiveness": "How they compare to other candidates realistically in the Malaysian job market.",
    "timeToReadiness": "6-12 weeks" | "3-6 months" | "6-12 months" | "1-2 years" | "2+ years",
    "criticalGaps": ["Most important gap 1", "Most important gap 2", "Most important gap 3"],
    "competitiveAdvantages": ["Advantage 1", "Advantage 2"] or []
  }
}

**IMPORTANT**: Base all analysis on ACTUAL EVIDENCE from the extracted resume text. Be honest about gaps and realistic about readiness levels, always within the **Malaysian context**.
`;
}

/**
 * ✅ Validate analysis results (ensure completeness, no fake data)
 */
function validateAnalysisResults(analysis: any, context: AssessmentContext) {
  // Ensure all required fields exist with proper validation
  const validatedAnalysis = {
    scores: {
      resumeQuality: validateScore(analysis.scores?.resumeQuality),
      experienceRelevance: validateScore(analysis.scores?.experienceRelevance),
      skillsMatch: validateScore(analysis.scores?.skillsMatch),
      professionalPresentation: validateScore(analysis.scores?.professionalPresentation),
      overallResumeScore: 0, // Will be calculated
      evidenceLevel: validateEvidenceLevel(analysis.scores?.evidenceLevel)
    },
    resumeAnalysis: {
      analysis: analysis.resumeAnalysis?.analysis || 'Resume analysis completed successfully.',
      keyFindings: Array.isArray(analysis.resumeAnalysis?.keyFindings) ? analysis.resumeAnalysis.keyFindings : [],
      experienceLevel: validateExperienceLevel(analysis.resumeAnalysis?.experienceLevel),
      skillsValidation: {
        claimed: Array.isArray(analysis.resumeAnalysis?.skillsValidation?.claimed) ? analysis.resumeAnalysis.skillsValidation.claimed : [],
        evidenced: Array.isArray(analysis.resumeAnalysis?.skillsValidation?.evidenced) ? analysis.resumeAnalysis.skillsValidation.evidenced : [],
        missing: Array.isArray(analysis.resumeAnalysis?.skillsValidation?.missing) ? analysis.resumeAnalysis.skillsValidation.missing : []
      },
      gapAnalysis: Array.isArray(analysis.resumeAnalysis?.gapAnalysis) ? analysis.resumeAnalysis.gapAnalysis : [],
      credibilityScore: validateScore(analysis.resumeAnalysis?.credibilityScore),
      recommendations: Array.isArray(analysis.resumeAnalysis?.recommendations) ? analysis.resumeAnalysis.recommendations : []
    },
    careerFit: {
      fitLevel: validateFitLevel(analysis.careerFit?.fitLevel),
      fitPercentage: validateScore(analysis.careerFit?.fitPercentage),
      honestAssessment: analysis.careerFit?.honestAssessment || 'Career fit assessment completed.',
      realityCheck: analysis.careerFit?.realityCheck || 'Continue developing relevant skills and experience.',
      marketCompetitiveness: analysis.careerFit?.marketCompetitiveness || 'Building competitive position in target market.',
      timeToReadiness: validateTimeToReadiness(analysis.careerFit?.timeToReadiness),
      criticalGaps: Array.isArray(analysis.careerFit?.criticalGaps) ? analysis.careerFit.criticalGaps : [],
      competitiveAdvantages: Array.isArray(analysis.careerFit?.competitiveAdvantages) ? analysis.careerFit.competitiveAdvantages : []
    }
  };
  
  // Calculate overall resume score
  const { resumeQuality, experienceRelevance, skillsMatch, professionalPresentation } = validatedAnalysis.scores;
  validatedAnalysis.scores.overallResumeScore = Math.round(
    (resumeQuality + experienceRelevance + skillsMatch + professionalPresentation) / 4
  );
  
  return validatedAnalysis;
}

/**
 * 🔧 Helper validation functions - NO DEFAULTS, throw errors if invalid
 */
function validateScore(score: any): number {
  const num = Number(score);
  if (isNaN(num) || num < 0 || num > 100) {
    throw new Error(`Invalid score value: ${score}. Must be a number between 0-100.`);
  }
  return Math.round(num);
}

function validateEvidenceLevel(level: any): 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT' {
  const validLevels = ['STRONG', 'MODERATE', 'WEAK', 'INSUFFICIENT'];
  if (!validLevels.includes(level)) {
    throw new Error(`Invalid evidence level: ${level}. Must be one of: ${validLevels.join(', ')}`);
  }
  return level;
}

function validateExperienceLevel(level: any): 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'EXECUTIVE' {
  const validLevels = ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'EXECUTIVE'];
  if (!validLevels.includes(level)) {
    throw new Error(`Invalid experience level: ${level}. Must be one of: ${validLevels.join(', ')}`);
  }
  return level;
}

function validateFitLevel(level: any): 'EXCELLENT_FIT' | 'GOOD_FIT' | 'PARTIAL_FIT' | 'POOR_FIT' | 'WRONG_CAREER_PATH' {
  const validLevels = ['EXCELLENT_FIT', 'GOOD_FIT', 'PARTIAL_FIT', 'POOR_FIT', 'WRONG_CAREER_PATH'];
  if (!validLevels.includes(level)) {
    throw new Error(`Invalid fit level: ${level}. Must be one of: ${validLevels.join(', ')}`);
  }
  return level;
}

function validateTimeToReadiness(time: any): string {
  const validTimes = ['6-12 weeks', '3-6 months', '6-12 months', '1-2 years', '2+ years'];
  if (!validTimes.includes(time)) {
    throw new Error(`Invalid time to readiness: ${time}. Must be one of: ${validTimes.join(', ')}`);
  }
  return time;
}

/**
 * 🛡️ Validate resume file
 */
function validateResumeFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 15 * 1024 * 1024; // 15MB limit
  const ALLOWED_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg', 
    'image/webp',
    'image/gif'
  ];
  
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds 15MB limit`
    };
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not supported. Supported: PDF, PNG, JPEG, WebP, GIF`
    };
  }
  
  return { valid: true };
}

/**
 * 🔧 Check if Google Vision API Key is configured
 */
export function isGoogleVisionConfigured(): boolean {
  return !!GOOGLE_VISION_API_KEY && GOOGLE_VISION_API_KEY.length > 0;
}

/**
 * 🎯 Calculate final assessment score (Form + Resume)
 */
export function calculateFinalAssessmentScore(
  formContribution: number,
  resumeScore: number,
  formWeight: number = 60
): {
  formContribution: number;
  resumeContribution: number;
  finalScore: number;
  readinessLevel: string;
} {
  const resumeWeight = 100 - formWeight;
  const resumeContribution = Math.round((resumeScore * resumeWeight) / 100);
  const finalScore = formContribution + resumeContribution;
  
  // Calculate readiness level
  let readinessLevel = "Early Development";
  if (finalScore >= 85) readinessLevel = "Exceptional Readiness";
  else if (finalScore >= 75) readinessLevel = "Strong Readiness";
  else if (finalScore >= 65) readinessLevel = "Moderate Readiness";
  else if (finalScore >= 55) readinessLevel = "Developing Readiness";
  else if (finalScore >= 45) readinessLevel = "Basic Readiness";
  
  return {
    formContribution,
    resumeContribution,
    finalScore,
    readinessLevel
  };
}