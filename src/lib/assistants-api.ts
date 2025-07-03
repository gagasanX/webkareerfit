// /src/lib/assistants-api.ts
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔥 ASSISTANTS API CONFIGURATION
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID; // Create assistant in OpenAI dashboard
const MAX_FILE_SIZE = 512 * 1024 * 1024; // 512MB (OpenAI limit)

// Auto-create assistant if not exists
async function getOrCreateAssistant(): Promise<string> {
  try {
    // Check if assistant exists
    if (ASSISTANT_ID) {
      try {
        await openai.beta.assistants.retrieve(ASSISTANT_ID);
        console.log(`[Assistants API] ✅ Using existing assistant: ${ASSISTANT_ID}`);
        return ASSISTANT_ID;
      } catch (error) {
        console.warn(`[Assistants API] ⚠️ Assistant ${ASSISTANT_ID} not found, creating new one...`);
      }
    }
    
    // Create new assistant
    console.log(`[Assistants API] 🔄 Creating new assistant...`);
    const assistant = await openai.beta.assistants.create({
      name: "Career Assessment Analyzer",
      description: "Expert career assessment analyzer for resume and document analysis",
      model: "gpt-4o",
      instructions: `You are a BRUTALLY HONEST career assessment expert specializing in career readiness evaluations.

CRITICAL CAPABILITIES:
- Analyze uploaded documents (PDF, Word, images) with high accuracy
- Extract and understand resume content, certificates, portfolios
- Validate claims against documented evidence
- Provide realistic, evidence-based career assessments

CORE PRINCIPLES:
- Be honest about gaps and weaknesses - don't sugarcoat
- Validate every claim with document evidence
- Provide specific, actionable recommendations
- Give realistic scores based on actual capability demonstrated
- Focus on career fit for target role

Always provide thorough analysis with supporting evidence from uploaded documents.
Return responses in valid JSON format as requested.`,
      tools: [{ type: "file_search" }],
      temperature: 0.3
    });
    
    console.log(`[Assistants API] ✅ Created new assistant: ${assistant.id}`);
    console.log(`[Assistants API] 🚨 UPDATE YOUR .env.local: OPENAI_ASSISTANT_ID=${assistant.id}`);
    
    return assistant.id;
    
  } catch (error) {
    console.error('[Assistants API] ❌ Failed to get or create assistant:', error);
    throw new Error('Assistant not available');
  }
}

// Supported file types for Assistants API
const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

export interface AssessmentContext {
  assessmentType: string;
  targetRole: string;
  personality: string;
  responses: Record<string, any>;
  personalInfo: any;
}

export interface ProcessingResult {
  success: boolean;
  threadId: string;
  fileId?: string;
  analysis?: any;
  error?: string;
  processingTime?: number;
}

/**
 * 🚀 MAIN FUNCTION: Process assessment with file via Assistants API
 */
export async function processAssessmentWithAssistants(
  file: File,
  context: AssessmentContext
): Promise<ProcessingResult> {
  const startTime = Date.now();
  
  try {
    console.log(`[Assistants API] 🚀 Starting assessment processing for ${context.assessmentType}`);
    console.log(`[Assistants API] 📄 File: ${file.name} (${file.size} bytes)`);
    
    // 1. Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return {
        success: false,
        threadId: '',
        error: validation.error
      };
    }
    
    // 2. Upload file to OpenAI
    console.log(`[Assistants API] 📤 Uploading file to OpenAI...`);
    const uploadedFile = await uploadFileToOpenAI(file);
    console.log(`[Assistants API] ✅ File uploaded: ${uploadedFile.id}`);
    
    // 3. Create thread
    console.log(`[Assistants API] 🧵 Creating thread...`);
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: generateAssessmentPrompt(context),
          attachments: [
            {
              file_id: uploadedFile.id,
              tools: [{ type: "file_search" }]
            }
          ]
        }
      ]
    });
    console.log(`[Assistants API] ✅ Thread created: ${thread.id}`);
    
    // 4. Run assistant (with auto-creation)
    console.log(`[Assistants API] 🤖 Getting/creating assistant...`);
    const assistantId = await getOrCreateAssistant();
    
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
      instructions: getAssistantInstructions(context.assessmentType)
    });
    
    // 5. Wait for completion
    console.log(`[Assistants API] ⏳ Waiting for completion...`);
    const completedRun = await waitForRunCompletion(thread.id, run.id);
    
    if (completedRun.status !== 'completed') {
      throw new Error(`Assistant run failed with status: ${completedRun.status}`);
    }
    
    // 6. Get response
    console.log(`[Assistants API] 📥 Getting response...`);
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data
      .filter(msg => msg.role === 'assistant')
      .sort((a, b) => b.created_at - a.created_at)[0];
    
    if (!assistantMessage) {
      throw new Error('No assistant response found');
    }
    
    // 7. Parse response
    const analysis = parseAssistantResponse(assistantMessage);
    
    const processingTime = Date.now() - startTime;
    console.log(`[Assistants API] ✅ Processing completed in ${processingTime}ms`);
    
    return {
      success: true,
      threadId: thread.id,
      fileId: uploadedFile.id,
      analysis,
      processingTime
    };
    
  } catch (error) {
    console.error('[Assistants API] ❌ Processing failed:', error);
    return {
      success: false,
      threadId: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * 📤 Upload file to OpenAI
 */
async function uploadFileToOpenAI(file: File) {
  try {
    const fileResponse = await openai.files.create({
      file: file,
      purpose: 'assistants'
    });
    
    return fileResponse;
  } catch (error) {
    console.error('[Assistants API] Upload failed:', error);
    throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * ⏳ Wait for assistant run to complete
 */
async function waitForRunCompletion(threadId: string, runId: string, maxWaitTime = 300000) {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const run = await openai.beta.threads.runs.retrieve(threadId, runId);
      
      console.log(`[Assistants API] Run status: ${run.status}`);
      
      if (run.status === 'completed') {
        return run;
      }
      
      if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
        throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
    } catch (error) {
      console.error('[Assistants API] Poll error:', error);
      throw error;
    }
  }
  
  throw new Error('Assistant run timeout');
}

/**
 * 📝 Generate assessment prompt for assistant
 */
function generateAssessmentPrompt(context: AssessmentContext): string {
  return `
COMPREHENSIVE CAREER ASSESSMENT ANALYSIS

Please analyze the uploaded resume/document along with the assessment responses provided below:

**ASSESSMENT TYPE:** ${context.assessmentType.toUpperCase()}
**TARGET ROLE:** ${context.targetRole}
**PERSONALITY:** ${context.personality}

**ASSESSMENT RESPONSES:**
${JSON.stringify(context.responses, null, 2)}

**PERSONAL INFORMATION:**
${JSON.stringify(context.personalInfo, null, 2)}

REQUIREMENTS:
1. **ANALYZE THE UPLOADED DOCUMENT** thoroughly for:
   - Professional experience and skills
   - Education and qualifications  
   - Career progression and achievements
   - Technical competencies demonstrated
   - Leadership and project experience
   - Industry knowledge and certifications

2. **VALIDATE RESPONSES** against document evidence:
   - Compare claimed skills with demonstrated experience
   - Identify consistencies and inconsistencies
   - Assess credibility of responses based on documented evidence

3. **PROVIDE HONEST ASSESSMENT** with realistic scoring:
   - Entry level: typically 40-65%
   - Mid-level: typically 55-75%  
   - Senior level: typically 65-85%
   - Only 85-100% for exceptional evidence

4. **CAREER FIT ANALYSIS** for target role:
   - Realistic readiness assessment
   - Market competitiveness evaluation
   - Timeline for role readiness
   - Critical gaps identification

Please provide your analysis in the following JSON format:
{
  "documentAnalysis": {
    "type": "document type identified",
    "keyFindings": ["finding1", "finding2", "finding3"],
    "experienceLevel": "ENTRY|JUNIOR|MID|SENIOR|EXECUTIVE",
    "documentQuality": "EXCELLENT|GOOD|AVERAGE|POOR",
    "credibilityScore": number (0-100)
  },
  "scores": {
    "category1": number (0-100),
    "category2": number (0-100),
    "category3": number (0-100),
    "category4": number (0-100),
    "overallScore": number (0-100),
    "documentConsistency": number (0-100),
    "evidenceLevel": "STRONG|MODERATE|WEAK|INSUFFICIENT"
  },
  "readinessLevel": "Early Development|Developing Competency|Approaching Readiness|Fully Prepared",
  "careerFit": {
    "fitLevel": "EXCELLENT_FIT|GOOD_FIT|PARTIAL_FIT|POOR_FIT|WRONG_CAREER_PATH",
    "fitPercentage": number (0-100),
    "honestAssessment": "detailed assessment",
    "marketCompetitiveness": "comparison analysis",
    "timeToReadiness": "realistic timeline",
    "criticalGaps": ["gap1", "gap2", "gap3"],
    "competitiveAdvantages": ["advantage1", "advantage2"]
  },
  "recommendations": [
    {
      "title": "specific recommendation",
      "explanation": "why this matters",
      "steps": ["step1", "step2", "step3"],
      "timeframe": "timeline",
      "priority": "HIGH|MEDIUM|LOW",
      "successMetrics": ["metric1", "metric2"]
    }
  ],
  "summary": "comprehensive summary with honest feedback",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"]
}
`;
}

/**
 * 📋 Get assistant instructions based on assessment type
 */
function getAssistantInstructions(assessmentType: string): string {
  const instructions = `You are a BRUTALLY HONEST career assessment expert specializing in ${assessmentType.toUpperCase()} evaluations.

CRITICAL CAPABILITIES:
- Analyze uploaded documents (PDF, Word, images) with high accuracy
- Extract and understand resume content, certificates, portfolios
- Validate claims against documented evidence
- Provide realistic, evidence-based career assessments

CORE PRINCIPLES:
- Be honest about gaps and weaknesses - don't sugarcoat
- Validate every claim with document evidence
- Provide specific, actionable recommendations
- Give realistic scores based on actual capability demonstrated
- Focus on career fit for target role

DOCUMENT ANALYSIS EXPERTISE:
- Read and understand resume formats and structures
- Extract key information from various document types
- Identify relevant experience, skills, and qualifications
- Assess document quality and professional presentation
- Cross-reference document content with assessment responses

Always provide thorough analysis with supporting evidence from the uploaded documents.`;

  return instructions;
}

/**
 * 📄 Validate file before upload
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed (512MB)`
    };
  }
  
  // Check file type
  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not supported. Supported types: PDF, Word, Text, Images`
    };
  }
  
  return { valid: true };
}

/**
 * 🔍 Parse assistant response
 */
function parseAssistantResponse(message: any): any {
  try {
    // Get text content from message
    const textContent = message.content
      .filter((content: any) => content.type === 'text')
      .map((content: any) => content.text.value)
      .join('\n');
    
    // Extract JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in assistant response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!parsed.scores || !parsed.readinessLevel) {
      throw new Error('Invalid response structure from assistant');
    }
    
    return parsed;
    
  } catch (error) {
    console.error('[Assistants API] Parse error:', error);
    throw new Error(`Failed to parse assistant response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 🗑️ Cleanup: Delete file and thread (optional)
 */
export async function cleanupAssistantResources(fileId?: string, threadId?: string) {
  try {
    if (fileId) {
      await openai.files.del(fileId);
      console.log(`[Assistants API] 🗑️ Deleted file: ${fileId}`);
    }
    
    if (threadId) {
      await openai.beta.threads.del(threadId);
      console.log(`[Assistants API] 🗑️ Deleted thread: ${threadId}`);
    }
  } catch (error) {
    console.warn('[Assistants API] Cleanup warning:', error);
  }
}

/**
 * 🔧 Helper: Check if Assistants API is configured (auto-creation enabled)
 */
export function isAssistantsAPIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY && 
         process.env.OPENAI_API_KEY.startsWith('sk-');
}

/**
 * 📊 Get categories for assessment type
 */
export function getAssessmentCategories(assessmentType: string): string[] {
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