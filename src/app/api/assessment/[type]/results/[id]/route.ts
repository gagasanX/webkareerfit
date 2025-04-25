// src/app/api/assessment/[type]/results/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';
import * as fs from 'fs/promises';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!params || !params.type || !params.id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { type, id } = params;
    console.log(`Fetching results for assessment: ${type}/${id}`);

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const isOwner = assessment.userId === session.user.id;
    const isAdmin = session.user.isAdmin === true;
    const isClerk = session.user.isClerk === true;

    if (!isOwner && !isAdmin && !isClerk) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let assessmentData = assessment.data as any || {};
    const hasSubmission =
      assessment.status === 'completed' ||
      assessment.status === 'submitted' ||
      assessmentData.analysisStatus === 'waiting' ||
      (assessmentData.answers && Object.keys(assessmentData.answers).length > 0);

    const needsAnalysis =
      (!assessmentData.aiProcessed && !assessmentData.aiProcessing && hasSubmission) ||
      assessmentData.analysisStatus === 'waiting';

    console.log(`Assessment status: ${assessment.status}, Has submission: ${hasSubmission}, Needs analysis: ${needsAnalysis}`);

    if (needsAnalysis) {
      console.log('AI analysis needed, starting process');
      await prisma.assessment.update({
        where: { id },
        data: {
          data: {
            ...assessmentData,
            aiProcessing: true,
            aiProcessingStarted: new Date().toISOString(),
            analysisStatus: 'processing',
          },
        },
      });

      runAiAnalysis(id, assessmentData, type)
        .then(() => console.log(`Analysis completed for assessment: ${id}`))
        .catch(error => console.error(`Error during AI analysis for assessment ${id}:`, error));
    }

    return NextResponse.json({
      ...assessment,
      _debug: {
        isResultsPage: true,
        hasSubmission,
        needsAnalysis,
        status: assessment.status,
      },
    });
  } catch (error) {
    console.error('Error fetching assessment results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment results', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Enhanced version of runAiAnalysis with improved debugging and score validation
async function runAiAnalysis(assessmentId: string, assessmentData: any, assessmentType: string) {
  // Define variables at the top of the function to fix scope issues
  let resumeText = '';
  let hasResume = false;
  
  try {
    console.log(`[DEBUG] Running AI analysis for assessment: ${assessmentId}, type: ${assessmentType}`);

    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!assessment) {
      throw new Error('Assessment not found during analysis');
    }

    const latestData = assessment.data as any || assessmentData;
    const answers = latestData?.answers || {};
    const personalInfo = latestData?.personalInfo || {};

    // Log the answers for debugging (truncated to avoid excessive logs)
    console.log(`[DEBUG] Assessment answers:`, JSON.stringify(answers).substring(0, 500) + '...');
    
    const formattedAnswers = Object.entries(answers)
      .map(([key, value]) => {
        const formattedKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, s => s.toUpperCase())
          .trim();
        return `${formattedKey}: ${value}`;
      })
      .join('\n');

    const resumePath = latestData?.resumePath;

    if (resumePath && typeof resumePath === 'string') {
      try {
        await fs.access(resumePath);
        const fileContent = await fs.readFile(resumePath, 'utf8');
        resumeText = fileContent.slice(0, 5000); // Truncate to avoid token limits
        hasResume = true;
        console.log(`[DEBUG] Resume text extracted, length: ${resumeText.length} characters`);
      } catch (error) {
        console.error('[DEBUG] Failed to read resume file:', error);
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const categories = getCategories(assessmentType);
    const categoriesList = categories.join(', ');
    
    // Log categories for debugging
    console.log(`[DEBUG] Categories for ${assessmentType}:`, categories);

    const systemPrompt = getSystemPrompt(assessmentType);
    
    // Enhanced prompt to specifically request varied scores
    const userPrompt = `
You are analyzing a ${assessmentType.toUpperCase()} career assessment.

**ASSESSMENT TYPE**: ${assessmentType.toUpperCase()}
**User Information**:
- Job Position: ${personalInfo?.jobPosition || 'Not specified'}
- Qualification: ${personalInfo?.qualification || 'Not specified'}
- Years of Experience: ${personalInfo?.yearsOfExperience || 'Not specified'}
- Career Goal: ${personalInfo?.careerGoal || 'Not specified'}
- Personality: ${personalInfo?.personality?.substring(0, 200) || 'Not specified'}

**Assessment Responses**:
${formattedAnswers}

${hasResume ? `**RESUME TEXT**:
${resumeText}
` : ''}

**Your Task**:
Perform a rigorous, honest, and comprehensive career assessment analysis based on the provided data. Be brutally honest—do not sugarcoat weaknesses or exaggerate strengths. Responses must be 100% tailored to the user's data, with no generic or pre-made content.

1. **SCORES**: Assign scores (0-100) for these categories: ${categoriesList}, plus an overallScore. 
   - IMPORTANT: Your scores MUST vary by category to reflect the user's unique strengths and weaknesses. Do NOT assign the same score to multiple categories.
   - Each category should have a distinct score that reflects the user's specific abilities in that area.
   - Use these guidelines as a reference:
     - 0-35: Significant gaps, major development needed
     - 36-60: Basic skills, substantial improvement required
     - 61-75: Moderate competency, specific areas need work
     - 76-90: Strong ability, minor refinements needed
     - 91-100: Excellent mastery
   
   Scores must reflect the user's current capabilities compared to their career goal, based solely on the provided data. If a resume is provided, incorporate its evaluation into the scores, especially for categories like professionalPresentation and experience.

2. **READINESS LEVEL**: Based on the overallScore:
   - Below 50: "Early Development"
   - 50-69: "Developing Competency"
   - 70-84: "Approaching Readiness"
   - 85-100: "Fully Prepared"

3. **RECOMMENDATIONS**: Provide 3-5 specific, actionable recommendations addressing critical gaps. Each includes:
   - Title: Clear and specific
   - Explanation: Why it's critical for this user's career goal
   - Steps: 3 practical steps with timelines

4. **SUMMARY**: A balanced, honest paragraph about readiness, highlighting strengths and gaps.

5. **STRENGTHS**: List 3-4 specific strengths with evidence from the responses or resume.

6. **IMPROVEMENTS**: List 3-4 critical areas to improve, with explanations and suggestions.

${hasResume ? `7. **RESUME ANALYSIS**: Critically evaluate the resume's effectiveness for the career goal. Note specific strengths, weaknesses, and alignment with industry standards.
8. **RESUME RECOMMENDATIONS**: Provide 3-5 specific improvements with examples.` : ''}

**Response Format**:
Return a valid JSON object with these keys:
{
  "scores": { "${categoriesList.split(', ').join('": number, "')}", "overallScore": number },
  "readinessLevel": string,
  "recommendations": [{ "title": string, "explanation": string, "steps": [string, string, string] }, ...],
  "summary": string,
  "strengths": [string, ...],
  "improvements": [string, ...]${hasResume ? `,
  "resumeAnalysis": string,
  "resumeRecommendations": [string, ...]` : ''}
}

Return only the JSON object, no extra text.
`;

    // Log the prompts for debugging (truncated)
    console.log('[DEBUG] System prompt:', systemPrompt);
    console.log('[DEBUG] User prompt excerpt (first 500 chars):', userPrompt.substring(0, 500) + '...');

    let analysis = null;
    let attempts = 0;
    const maxAttempts = 3;
    let rawResponse = ''; // Store the raw response

    while (attempts < maxAttempts && !analysis) {
      attempts++;
      try {
        console.log(`[DEBUG] AI analysis attempt ${attempts} of ${maxAttempts}`);
        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7, // Increased from 0.2 to encourage more variation
          max_tokens: 4000,
        });

        // Store the raw response for debugging
        rawResponse = completion.choices[0]?.message?.content || '{}';
        
        // Log the raw response for debugging
        console.log('[DEBUG] Raw OpenAI response:', rawResponse);
        
        try {
          const parsed = JSON.parse(rawResponse);
          
          // Check for uniform scores (potential issue)
          if (parsed.scores) {
            const scoreValues = Object.values(parsed.scores)
              .filter(v => typeof v === 'number' && String(v) !== 'overallScore');
            const uniqueScores = new Set(scoreValues);
            
            console.log(`[DEBUG] Score values:`, scoreValues);
            console.log(`[DEBUG] Unique score count: ${uniqueScores.size} of ${scoreValues.length}`);
            
            if (uniqueScores.size === 1 && scoreValues.length > 1) {
              console.warn('[WARNING] All scores are identical. Requesting a new analysis with more variation.');
              throw new Error('Uniform scores detected');
            }
          }

          // Validate the response structure
          if (
            parsed.scores &&
            typeof parsed.scores === 'object' &&
            parsed.readinessLevel &&
            Array.isArray(parsed.recommendations) &&
            parsed.summary &&
            Array.isArray(parsed.strengths) &&
            Array.isArray(parsed.improvements) &&
            (!hasResume || (parsed.resumeAnalysis && Array.isArray(parsed.resumeRecommendations)))
          ) {
            // Check if all categories have scores
            const missingCategories = categories.filter(cat => !parsed.scores.hasOwnProperty(cat));
            if (missingCategories.length === 0) {
              analysis = parsed;
              console.log('[DEBUG] Valid analysis received with all categories scored');
            } else {
              console.warn(`[WARNING] Missing scores for categories: ${missingCategories.join(', ')}`);
              throw new Error('Incomplete scores');
            }
          } else {
            console.warn('[WARNING] Invalid response structure');
            throw new Error('Invalid response structure');
          }
        } catch (parseError) {
          console.error('[ERROR] Failed to parse or validate analysis:', parseError);
          throw parseError;
        }
      } catch (error) {
        console.error(`[ERROR] Attempt ${attempts} failed:`, error);
        if (attempts === maxAttempts) {
          throw error;
        }
      }
    }

    if (!analysis) {
      throw new Error('Failed to generate valid AI analysis after retries');
    }

    // Ensure overallScore is calculated correctly as an average
    if (!analysis.scores.overallScore) {
      const categoryScores = Object.entries(analysis.scores)
        .filter(([key, value]) => key !== 'overallScore' && typeof value === 'number')
        .map(([_, value]) => value as number);
        
      analysis.scores.overallScore = categoryScores.length
        ? Math.round(categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length)
        : null;
      
      console.log('[DEBUG] Calculated overallScore:', analysis.scores.overallScore);
    }
    
    // Log the final analysis scores for debugging
    console.log('[DEBUG] Final analysis scores:', analysis.scores);

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        data: {
          ...latestData,
          scores: analysis.scores,
          readinessLevel: analysis.readinessLevel || (analysis.scores.overallScore ? getReadinessLevelFromScore(analysis.scores.overallScore) : null),
          recommendations: analysis.recommendations,
          summary: analysis.summary,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          resumeText: hasResume ? resumeText : undefined,
          resumeAnalysis: analysis.resumeAnalysis || undefined,
          resumeRecommendations: analysis.resumeRecommendations || undefined,
          aiProcessed: true,
          aiProcessedAt: new Date().toISOString(),
          aiProcessing: false,
          analysisStatus: 'completed',
          
          // Store debug information temporarily
          _debug_info: {
            promptUsed: userPrompt.substring(0, 500) + '...',
            aiResponseExcerpt: rawResponse.substring(0, 500) + '...',
            analysisAttempts: attempts
          }
        },
      },
    });

    console.log(`[DEBUG] Assessment ${assessmentId} updated with AI analysis`);
    return analysis;
  } catch (error) {
    console.error('[ERROR] Error in AI analysis:', error);

    // Minimal fallback without default scores
    const fallbackData = {
      scores: null,
      readinessLevel: null,
      recommendations: [],
      summary: 'Unable to generate analysis due to technical issues. Please try again later.',
      strengths: [],
      improvements: [],
      resumeAnalysis: hasResume ? 'Unable to analyze resume.' : undefined,
      resumeRecommendations: hasResume ? [] : undefined,
    };

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        data: {
          ...assessmentData, // Using assessmentData instead of latestData since latestData is not in scope
          ...fallbackData,
          aiProcessed: false,
          aiProcessing: false,
          aiError: error instanceof Error ? error.message : 'Unknown error',
          analysisStatus: 'error',
        },
      },
    });

    return fallbackData;
  }
}

// Enhanced category getter with additional debugging
function getCategories(assessmentType: string): string[] {
  let categories: string[];
  
  switch (assessmentType.toLowerCase()) {
    case 'fjrl':
      categories = ['technicalSkills', 'jobMarketAwareness', 'professionalPresentation', 'interviewPreparation'];
      break;
    case 'ijrl':
      categories = ['careerGoalClarity', 'qualificationGap', 'industryKnowledge', 'networkDevelopment'];
      break;
    case 'cdrl':
      categories = ['leadershipPotential', 'strategicThinking', 'domainExpertise', 'changeManagement'];
      break;
    case 'ccrl':
      // For Career Comeback Readiness Level 
      // Renamed fields to match what's shown in the UI
      categories = ['skillCurrency', 'marketKnowledge', 'confidenceLevel', 'networkStrength'];
      break;
    case 'ctrl':
      categories = ['transferableSkills', 'targetIndustryKnowledge', 'adaptability', 'transitionStrategy'];
      break;
    case 'rrl':
      categories = ['financialPreparation', 'psychologicalReadiness', 'postRetirementPlan', 'knowledgeTransfer'];
      break;
    case 'irl':
      categories = ['academicPreparation', 'professionalAwareness', 'practicalExperience', 'learningOrientation'];
      break;
    default:
      categories = ['careerPlanning', 'skillsDevelopment', 'professionalNetworking', 'industryKnowledge'];
      break;
  }
  
  console.log(`[DEBUG] Assessment type '${assessmentType}' maps to categories:`, categories);
  return categories;
}

// Map internal categories to UI display names for consistent presentation
function mapCategoryToUiName(category: string): string {
  // This mapping should match what's being used in the frontend
  const categoryMap: Record<string, string> = {
    // CCRL categories
    'skillCurrency': 'skillRenewal',
    'marketKnowledge': 'qualification',
    'confidenceLevel': 'confidenceReadiness',
    'networkStrength': 'networkingRelationships',
    
    // Other categories can be added here
  };
  
  return categoryMap[category] || category;
}

function getSystemPrompt(assessmentType: string): string {
  const basePrompt =
    'You are a career assessment AI that provides detailed, data-driven analysis based on the user\'s assessment responses and resume. Your evaluations should be honest, specific, and tailored to the individual\'s situation. Do not use generic or pre-made responses. IMPORTANT: Ensure that each category receives a different score to reflect the user\'s varied capabilities.';

  switch (assessmentType.toLowerCase()) {
    case 'fjrl':
      return `${basePrompt} You specialize in first-time job seekers, holding them to realistic entry-level standards and focusing on practical workplace skills.`;
    case 'ijrl':
      return `${basePrompt} You help users pursue their ideal careers, critically assessing gaps between their current state and dream job requirements.`;
    case 'cdrl':
      return `${basePrompt} You assist experienced professionals in advancing, with rigorous evaluation of leadership and strategic skills.`;
    case 'ccrl':
      return `${basePrompt} You guide workforce re-entry, honestly assessing skill relevance and re-entry challenges. Provide varied scores for each category (skillCurrency, marketKnowledge, confidenceLevel, networkStrength).`;
    case 'ctrl':
      return `${basePrompt} You support career transitions, directly evaluating fit for new industries or roles.`;
    case 'rrl':
      return `${basePrompt} You prepare users for retirement, thoroughly assessing financial and psychological readiness.`;
    case 'irl':
      return `${basePrompt} You prepare students for internships, setting clear expectations for competitive success.`;
    default:
      return `${basePrompt} You provide detailed, honest career assessments tailored to the user's goals.`;
  }
}

function getReadinessLevelFromScore(score: number): string {
  if (score < 50) return 'Early Development';
  if (score < 70) return 'Developing Competency';
  if (score < 85) return 'Approaching Readiness';
  return 'Fully Prepared';
}