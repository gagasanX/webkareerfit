// src/lib/google-vision-resume-analyzer.ts - FIXED VERSION
import { openai } from '@/lib/openai';

// ✅ SIMPLIFIED: Using Google Vision REST API with API Key only
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
const GOOGLE_VISION_API_BASE = 'https://vision.googleapis.com/v1';

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

// ✅ FIXED: Add proper typing for AssessmentContext
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
 * 🚀 MAIN FUNCTION: Analyze resume using Google Vision + OpenAI
 */
export async function analyzeResumeWithGoogleVision(
  file: File,
  context: AssessmentContext
): Promise<ResumeAnalysisResult> {
  const startTime = Date.now();
  
  try {
    console.log(`[Vision] 📄 Starting resume analysis: ${file.name} (${file.size} bytes)`);
    
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
    
    // Step 3: Analyze with OpenAI
    console.log(`[Vision] 🤖 Analyzing extracted text (${extractionResult.text.length} chars)`);
    const analysis = await analyzeExtractedText(extractionResult.text, context);
    
    console.log(`[Vision] ✅ Analysis completed in ${Date.now() - startTime}ms`);
    
    return {
      success: true,
      extractedText: extractionResult.text,
      analysis,
      processingMethod: extractionResult.method,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('[Vision] ❌ Analysis failed:', error);
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
    
    // 🔥 METHOD 1: Try PDF processing first (if PDF)
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
    
    // 🔥 METHOD 2: Image processing (for images or PDF fallback)
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
    
    // 🔥 METHOD 3: Fallback - return minimal info
    return {
      success: false,
      error: 'Could not extract text from file using Vision API',
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
 * 📄 Extract text from PDF using Google Vision REST API with API Key
 */
async function extractTextFromPDF(content: Buffer): Promise<{
  success: boolean;
  text?: string;
  error?: string;
}> {
  try {
    // ✅ SIMPLIFIED: Direct REST API call with API key
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
          // Process first page only for faster processing
          pages: [1],
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
      throw new Error('Insufficient text extracted from PDF');
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
      throw new Error('No text detected in image');
    }
    
    // First annotation contains the full text
    const fullText = textAnnotations[0].description || '';
    
    if (!fullText || fullText.length < 10) {
      throw new Error('Insufficient text detected in image');
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
 * 🤖 Analyze extracted text with OpenAI
 */
async function analyzeExtractedText(extractedText: string, context: AssessmentContext) {
  try {
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
- Do NOT say 'Google' names
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
      throw new Error('Empty response from OpenAI');
    }
    
    const analysis = JSON.parse(responseContent);
    
    // Validate and enhance the analysis
    return validateAndEnhanceAnalysis(analysis, context);
    
  } catch (error) {
    console.error('[Vision] ❌ OpenAI analysis failed:', error);
    
    // Return fallback analysis
    return createFallbackAnalysis(extractedText, context);
  }
}

/**
 * 📝 Generate comprehensive resume analysis prompt
 */
function generateResumeAnalysisPrompt(extractedText: string, context: AssessmentContext): string {
  return `
COMPREHENSIVE RESUME ANALYSIS WITH VISION EXTRACTED TEXT

**ASSESSMENT CONTEXT:**
- Assessment Type: ${context.assessmentType.toUpperCase()}
- Target Role: ${context.targetRole}
- Personality: ${context.personality}
- Form Contribution: ${context.formScoring?.formContribution || 'N/A'}% (weight: ${context.formScoring?.weight || 60}%)

**ASSESSMENT RESPONSES:**
${JSON.stringify(context.responses, null, 2)}

**EXTRACTED RESUME TEXT (via Ultra Vision):**
${extractedText}

**ANALYSIS REQUIREMENTS:**

1. **RESUME QUALITY ASSESSMENT (0-100 scoring)**:
   - Professional presentation and formatting quality
   - Clarity of achievements and impact metrics  
   - Industry-relevant keywords and terminology
   - Overall document credibility and completeness

2. **EXPERIENCE RELEVANCE ANALYSIS**:
   - Direct relevance to target role: ${context.targetRole}
   - Career progression and growth trajectory
   - Leadership and responsibility evolution
   - Quantifiable achievements and impact

3. **SKILLS VALIDATION**:
   - Technical skills mentioned vs demonstrated
   - Soft skills evidenced through achievements
   - Skills claimed in assessment vs proven in resume
   - Industry certifications and education relevance

4. **CAREER FIT ASSESSMENT**:
   - Realistic suitability for target role
   - Market competitiveness evaluation
   - Time to readiness estimation
   - Critical gaps identification

5. **HONEST SCORING** (be realistic):
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
    "analysis": "2-3 sentence honest assessment of resume quality and career readiness",
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
    "honestAssessment": "Brutally honest assessment of suitability for target role",
    "realityCheck": "What they ACTUALLY need to know about their readiness",
    "marketCompetitiveness": "How they compare to other candidates realistically",
    "timeToReadiness": "6-12 weeks" | "3-6 months" | "6-12 months" | "1-2 years" | "2+ years",
    "criticalGaps": ["Most important gap 1", "Most important gap 2", "Most important gap 3"],
    "competitiveAdvantages": ["Advantage 1", "Advantage 2"] or []
  }
}

**IMPORTANT**: Base all analysis on ACTUAL EVIDENCE from the extracted resume text. Be honest about gaps and realistic about readiness levels.
`;
}

/**
 * ✅ Validate and enhance analysis results
 */
function validateAndEnhanceAnalysis(analysis: any, context: AssessmentContext) {
  // Ensure all required fields exist with defaults
  const validatedAnalysis = {
    scores: {
      resumeQuality: validateScore(analysis.scores?.resumeQuality, 65),
      experienceRelevance: validateScore(analysis.scores?.experienceRelevance, 60),
      skillsMatch: validateScore(analysis.scores?.skillsMatch, 70),
      professionalPresentation: validateScore(analysis.scores?.professionalPresentation, 65),
      overallResumeScore: 0, // Will be calculated
      evidenceLevel: validateEvidenceLevel(analysis.scores?.evidenceLevel)
    },
    resumeAnalysis: {
      analysis: analysis.resumeAnalysis?.analysis || 'Resume analysis completed using Vision OCR extraction.',
      keyFindings: Array.isArray(analysis.resumeAnalysis?.keyFindings) ? analysis.resumeAnalysis.keyFindings : [
        'Resume processed via Vision API',
        'Text extraction successful',
        'Content available for analysis'
      ],
      experienceLevel: validateExperienceLevel(analysis.resumeAnalysis?.experienceLevel),
      skillsValidation: {
        claimed: Array.isArray(analysis.resumeAnalysis?.skillsValidation?.claimed) ? analysis.resumeAnalysis.skillsValidation.claimed : [],
        evidenced: Array.isArray(analysis.resumeAnalysis?.skillsValidation?.evidenced) ? analysis.resumeAnalysis.skillsValidation.evidenced : [],
        missing: Array.isArray(analysis.resumeAnalysis?.skillsValidation?.missing) ? analysis.resumeAnalysis.skillsValidation.missing : []
      },
      gapAnalysis: Array.isArray(analysis.resumeAnalysis?.gapAnalysis) ? analysis.resumeAnalysis.gapAnalysis : [],
      credibilityScore: validateScore(analysis.resumeAnalysis?.credibilityScore, 70),
      recommendations: Array.isArray(analysis.resumeAnalysis?.recommendations) ? analysis.resumeAnalysis.recommendations : []
    },
    careerFit: {
      fitLevel: validateFitLevel(analysis.careerFit?.fitLevel),
      fitPercentage: validateScore(analysis.careerFit?.fitPercentage, 65),
      honestAssessment: analysis.careerFit?.honestAssessment || 'Career fit assessment based on resume analysis.',
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
 * 🔧 Helper validation functions
 */
function validateScore(score: any, defaultValue: number): number {
  const num = Number(score);
  return isNaN(num) || num < 0 || num > 100 ? defaultValue : Math.round(num);
}

function validateEvidenceLevel(level: any): 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT' {
  const validLevels = ['STRONG', 'MODERATE', 'WEAK', 'INSUFFICIENT'];
  return validLevels.includes(level) ? level : 'MODERATE';
}

function validateExperienceLevel(level: any): 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'EXECUTIVE' {
  const validLevels = ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'EXECUTIVE'];
  return validLevels.includes(level) ? level : 'MID';
}

function validateFitLevel(level: any): 'EXCELLENT_FIT' | 'GOOD_FIT' | 'PARTIAL_FIT' | 'POOR_FIT' | 'WRONG_CAREER_PATH' {
  const validLevels = ['EXCELLENT_FIT', 'GOOD_FIT', 'PARTIAL_FIT', 'POOR_FIT', 'WRONG_CAREER_PATH'];
  return validLevels.includes(level) ? level : 'PARTIAL_FIT';
}

function validateTimeToReadiness(time: any): string {
  const validTimes = ['6-12 weeks', '3-6 months', '6-12 months', '1-2 years', '3+ years'];
  return validTimes.includes(time) ? time : '6-12 months';
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
 * 🔄 Create fallback analysis if OpenAI fails
 */
function createFallbackAnalysis(extractedText: string, context: AssessmentContext) {
  const textLength = extractedText.length;
  const hasContactInfo = /email|phone|tel|@/.test(extractedText.toLowerCase());
  const hasExperience = /experience|work|job|position|role|company/.test(extractedText.toLowerCase());
  const hasEducation = /education|degree|university|college|school/.test(extractedText.toLowerCase());
  
  // Basic scoring based on text analysis
  const resumeQuality = hasContactInfo && hasExperience && hasEducation ? 70 : 55;
  const experienceRelevance = hasExperience ? 65 : 45;
  const skillsMatch = textLength > 500 ? 65 : 50;
  const professionalPresentation = textLength > 300 && hasContactInfo ? 70 : 55;
  
  return {
    scores: {
      resumeQuality,
      experienceRelevance,
      skillsMatch,
      professionalPresentation,
      overallResumeScore: Math.round((resumeQuality + experienceRelevance + skillsMatch + professionalPresentation) / 4),
      evidenceLevel: 'MODERATE' as const
    },
    resumeAnalysis: {
      analysis: `Resume successfully processed using Vision API. Text extraction completed with ${textLength} characters of content available for analysis.`,
      keyFindings: [
        'Resume processed via Vision OCR',
        `${textLength} characters of text extracted`,
        hasContactInfo ? 'Contact information detected' : 'Limited contact information',
        hasExperience ? 'Professional experience section found' : 'Experience section needs enhancement'
      ],
      experienceLevel: 'MID' as const,
      skillsValidation: {
        claimed: [],
        evidenced: [],
        missing: ['Detailed skills validation requires manual review']
      },
      gapAnalysis: [
        'Complete analysis requires detailed review of extracted content',
        'Skills alignment assessment needed',
        'Experience relevance evaluation pending'
      ],
      credibilityScore: 70,
      recommendations: [
        'Review extracted text for accuracy and completeness',
        'Enhance resume formatting for better OCR processing',
        'Add specific achievements with quantifiable results'
      ]
    },
    careerFit: {
      fitLevel: 'PARTIAL_FIT' as const,
      fitPercentage: 65,
      honestAssessment: 'Resume analysis completed using Vision API. Further review recommended for comprehensive assessment.',
      realityCheck: 'Text extraction successful, continue building relevant experience and skills.',
      marketCompetitiveness: 'Competitive position assessment requires detailed content review.',
      timeToReadiness: '3-6 months',
      criticalGaps: ['Detailed skills assessment needed', 'Experience relevance evaluation required'],
      competitiveAdvantages: ['Resume successfully digitized', 'Content available for analysis']
    }
  };
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