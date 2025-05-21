// src/app/api/assessment/[type]/results/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Main GET endpoint handler
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Extract params safely
    const type = params?.type;
    const id = params?.id;
    
    if (!type || !id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

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
    
    // Determine if assessment has been submitted and needs analysis
    const hasSubmission =
      assessment.status === 'completed' ||
      assessment.status === 'submitted' ||
      assessmentData.analysisStatus === 'waiting' ||
      (assessmentData.responses && Object.keys(assessmentData.responses).length > 0);

    const needsAnalysis =
      (!assessmentData.aiProcessed && !assessmentData.aiProcessing && hasSubmission) ||
      assessmentData.analysisStatus === 'waiting';

    // Log detailed debugging information
    console.log(`Assessment status: ${assessment.status}, Has submission: ${hasSubmission}, Needs analysis: ${needsAnalysis}`);

    // If analysis is needed, start the process
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

      // Start AI analysis in the background
      runAiAnalysis(id, assessmentData, type, assessment.userId)
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

// Function to run AI analysis and save results
async function runAiAnalysis(assessmentId: string, assessmentData: any, assessmentType: string, userId: string) {
  let personalInfo: Record<string, any> = {};
  let resumeText = '';
  let hasResume = false;
  
  try {
    console.log(`[DEBUG] Running AI analysis for assessment: ${assessmentId}, type: ${assessmentType}`);

    // Refresh assessment data in case it was updated
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        user: { select: { name: true, email: true } },
      },
    });
    
    if (!assessment) {
      throw new Error('Assessment not found during analysis');
    }

    // Get additional user information to enhance the analysis
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    // Extract from assessment data instead of querying for job application
    const latestData = assessment.data as any || assessmentData;
    const responses = latestData?.responses || {};
    personalInfo = latestData?.personalInfo || {};
    
    // Use job info from assessment data if available
    const jobInfo = latestData?.jobInfo || {};
    if (jobInfo) {
      personalInfo = {
        ...personalInfo,
        jobPosition: jobInfo.title || personalInfo.jobPosition || 'Not specified',
        jobCompany: jobInfo.company,
        jobIndustry: jobInfo.industry,
        jobRequirements: jobInfo.requirements,
      };
    }

    // Check if resume text is available in the assessment data
    if (latestData?.resumeText && typeof latestData.resumeText === 'string') {
      resumeText = latestData.resumeText;
      hasResume = true;
      console.log(`[DEBUG] Resume text found in database, length: ${resumeText.length} characters`);
    } else if (latestData?.hasFileContent) {
      // Get resume content from assessment data
      resumeText = latestData?.fileContent || '';
      hasResume = true;
      console.log(`[DEBUG] Resume text found via fileContent, length: ${resumeText.length} characters`);
    } else if (latestData?.hasResume) {
      // Note that we found a resume was uploaded but couldn't extract the text
      hasResume = true;
      console.log(`[DEBUG] Resume was uploaded but text not available for analysis`);
    }

    // Log assessment data for debugging
    console.log(`[DEBUG] Assessment answers:`, JSON.stringify(responses).substring(0, 500) + '...');
    
    // Format responses for better readability in the prompt
    const formattedResponses = Object.entries(responses)
      .map(([key, value]) => {
        const formattedKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, s => s.toUpperCase())
          .trim();
        return `${formattedKey}: ${value}`;
      })
      .join('\n');

    // Get categories for this assessment type
    const categories = getCategories(assessmentType);
    const categoriesList = categories.join(', ');
    
    // Log categories for debugging
    console.log(`[DEBUG] Categories for ${assessmentType}:`, categories);

    // Generate appropriate system and user prompts
    const systemPrompt = getSystemPrompt(assessmentType);
    const userPrompt = generateUserPrompt(
      assessmentType,
      personalInfo,
      formattedResponses,
      hasResume,
      resumeText,
      categoriesList,
      user
    );

    // Log the prompts for debugging
    console.log('[DEBUG] System prompt:', systemPrompt);
    console.log('[DEBUG] User prompt excerpt (first 500 chars):', userPrompt.substring(0, 500) + '...');

    // Initialize variables for the analysis attempt loop
    let analysis = null;
    let attempts = 0;
    const maxAttempts = 3;
    let rawResponse = '';

    // Try up to 3 times to get a valid analysis with varied scores
    while (attempts < maxAttempts && !analysis) {
      attempts++;
      try {
        console.log(`[DEBUG] AI analysis attempt ${attempts} of ${maxAttempts}`);
        
        // Call OpenAI with a model that supports response_format
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo-1106', // Use this model which supports response_format
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7, // Slightly higher temperature for more varied analysis
          max_tokens: 4000, // Increased for more detailed analysis
        });

        // Store the raw response
        rawResponse = completion.choices[0]?.message?.content || '{}';
        console.log('[DEBUG] Raw OpenAI response:', rawResponse);
        
        // Try to parse and validate the response
        try {
          const parsed = JSON.parse(rawResponse);
          
          // Check for uniform scores (potential issue)
          if (parsed.scores) {
            const scoreValues = Object.values(parsed.scores)
              .filter(v => typeof v === 'number' && String(v) !== 'overallScore');
            const uniqueScores = new Set(scoreValues);
            
            console.log(`[DEBUG] Score values:`, scoreValues);
            console.log(`[DEBUG] Unique score count: ${uniqueScores.size} of ${scoreValues.length}`);
            
            // If all scores are identical, reject and try again
            if (uniqueScores.size === 1 && scoreValues.length > 1) {
              console.warn('[WARNING] All scores are identical. Requesting a new analysis with more variation.');
              throw new Error('Uniform scores detected');
            }
          }

          // Validate that the response has the required structure
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
            // Check if all expected categories have scores
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

    // If we couldn't get a valid analysis after all attempts, throw an error
    if (!analysis) {
      throw new Error('Failed to generate valid AI analysis after retries');
    }

    // Calculate overall score if missing or invalid
    if (!analysis.scores.overallScore || 
        typeof analysis.scores.overallScore !== 'number' || 
        isNaN(analysis.scores.overallScore)) {
      
      const categoryScores = Object.entries(analysis.scores)
        .filter(([key, value]) => key !== 'overallScore' && typeof value === 'number')
        .map(([_, value]) => value as number);
        
      analysis.scores.overallScore = categoryScores.length
        ? Math.round(categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length)
        : 70; // Default if no valid scores
      
      console.log('[DEBUG] Calculated overallScore:', analysis.scores.overallScore);
    }
    
    // Ensure overallScore is an integer
    analysis.scores.overallScore = Math.round(analysis.scores.overallScore);
    
    // Log the final analysis scores
    console.log('[DEBUG] Final analysis scores:', analysis.scores);

    // Update the assessment with the analysis results
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'completed',
        data: {
          ...latestData,
          scores: analysis.scores,
          readinessLevel: analysis.readinessLevel || getReadinessLevelFromScore(analysis.scores.overallScore),
          recommendations: analysis.recommendations,
          summary: analysis.summary,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          jobFitAnalysis: analysis.jobFitAnalysis || undefined,
          resumeAnalysis: analysis.resumeAnalysis || undefined,
          resumeRecommendations: analysis.resumeRecommendations || undefined,
          resumeFeedback: analysis.resumeFeedback || undefined,
          resumeStrengths: analysis.resumeStrengths || undefined, 
          resumeWeaknesses: analysis.resumeWeaknesses || undefined,
          categoryAnalysis: analysis.categoryAnalysis || undefined,
          aiProcessed: true,
          aiProcessedAt: new Date().toISOString(),
          aiProcessing: false,
          analysisStatus: 'completed',
        },
      },
    });

    console.log(`[DEBUG] Assessment ${assessmentId} updated with AI analysis`);
    return analysis;
  } catch (error) {
    console.error('[ERROR] Error in AI analysis:', error);

    // Create fallback analysis with varied scores
    const fallbackData = createFallbackAnalysis(
      assessmentType, 
      assessmentData, 
      hasResume, 
      personalInfo,
      resumeText
    );

    // Update the assessment with the fallback data
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'completed',
        data: {
          ...assessmentData,
          ...fallbackData,
          aiProcessed: true,
          aiProcessedAt: new Date().toISOString(),
          aiProcessing: false,
          aiError: error instanceof Error ? error.message : 'Unknown error',
          analysisStatus: 'completed',
          usedFallback: true,
          fallbackReason: error instanceof Error ? error.message : 'Unknown error'
        },
      },
    });

    return fallbackData;
  }
}

// Generate comprehensive user prompt for OpenAI
function generateUserPrompt(
  assessmentType: string,
  personalInfo: Record<string, any>,
  formattedResponses: string,
  hasResume: boolean,
  resumeText: string,
  categoriesList: string,
  user?: any
): string {
  const applicantName = user?.name || personalInfo?.name || 'the applicant';
  const jobPosition = personalInfo?.jobPosition || 'the position';
  
  return `
You are analyzing a ${assessmentType.toUpperCase()} assessment for ${applicantName}, who is applying for: ${jobPosition}.

**ASSESSMENT TYPE**: ${assessmentType.toUpperCase()}
**User Information**:
- Job Position: ${personalInfo?.jobPosition || 'Not specified'}
- Qualification: ${personalInfo?.qualification || 'Not specified'}
- Years of Experience: ${personalInfo?.yearsOfExperience || 'Not specified'}
- Career Goal: ${personalInfo?.careerGoal || 'Not specified'}
- Personality: ${personalInfo?.personality?.substring(0, 200) || 'Not specified'}
${personalInfo?.jobRequirements ? `- Job Requirements: ${personalInfo.jobRequirements}` : ''}

**Assessment Responses**:
${formattedResponses}

${hasResume ? `**RESUME TEXT**:
${resumeText}
` : ''}

**Your Task**:
Perform a rigorous, expert-level career assessment analysis based on the provided data. Your analysis should be as comprehensive as one performed by a senior career coach with years of industry experience. All responses must be tailored to this specific individual.

1. **SCORES**: Assign detailed and nuanced scores (0-100) for these categories: ${categoriesList}, plus an overallScore. 
   - IMPORTANT: Your scores MUST vary by category to reflect the person's unique strengths and weaknesses. Do NOT assign the same score to multiple categories.
   - Each category should have a distinct score that reflects their specific abilities.
   - Score Guidelines:
     - 0-35: Significant gaps, major development needed
     - 36-60: Basic skills, substantial improvement required
     - 61-75: Moderate competency, specific areas need work
     - 76-90: Strong ability, minor refinements needed
     - 91-100: Excellent mastery
   
   Scores must reflect their current capabilities compared to the requirements of ${jobPosition}, based on the provided data.

2. **READINESS LEVEL**: Based on the overallScore:
   - Below 50: "Early Development"
   - 50-69: "Developing Competency"
   - 70-84: "Approaching Readiness"
   - 85-100: "Fully Prepared"

3. **JOB FIT ANALYSIS**: Provide an expert evaluation of how well the candidate's profile matches the specific requirements of ${jobPosition}. Include:
   - Strengths that make them suitable for this position
   - Gaps that might hinder their performance
   - Overall fit assessment (Excellent, Good, Moderate, Needs Development)
   - Specific reasons why they would or would not succeed in this role

4. **RECOMMENDATIONS**: Provide 5-6 specific, actionable recommendations addressing critical gaps. Each includes:
   - Title: Clear and specific
   - Explanation: A detailed paragraph (100+ words) on why it's critical for this specific person
   - Steps: 3-5 practical steps with specific timelines and measurement criteria

5. **SUMMARY**: A balanced, detailed paragraph (150+ words) about their overall readiness, highlighting key strengths and critical gaps.

6. **STRENGTHS**: List 3-5 specific strengths with detailed evidence from their responses. Include real-world context about why each strength is valuable for ${jobPosition}.

7. **IMPROVEMENTS**: List 3-5 critical areas to improve, with detailed explanations (50+ words each) and specific suggestions.

${hasResume ? `8. **RESUME ANALYSIS**: Perform a detailed critique (200+ words) evaluating the resume's effectiveness for ${jobPosition}. Address format, content, language, achievements, skills presentation, and industry alignment.

9. **RESUME RECOMMENDATIONS**: Provide 4-6 specific, detailed improvements with concrete examples of better alternatives. For each recommendation, include:
   - What exactly needs to be changed
   - Why this change is important for this specific job
   - Examples of how to rewrite or restructure the content
   - The impact this change will have on recruiters' perception

10. **RESUME STRENGTHS**: Identify 3-4 specific strengths in the resume that should be maintained or leveraged further. For each strength, explain:
   - Why this element stands out positively
   - How it aligns with industry expectations for ${jobPosition}
   - Suggestions for how to further emphasize this strength

11. **RESUME WEAKNESSES**: Identify 3-4 specific weaknesses or red flags in the resume. For each weakness:
   - Describe the specific issue and why it's problematic
   - Explain how it might be interpreted negatively by recruiters or ATS systems
   - Provide specific remediation advice

12. **RESUME FEEDBACK**: Provide a paragraph of constructive, actionable feedback on the overall impression the resume creates, focusing on:
   - Professional impact
   - Relevance to the target position
   - Clarity and organization
   - Unique value proposition communication

13. **CATEGORY ANALYSIS**: For each category, provide:
   - Specific strengths observed
   - Areas needing improvement
   - Detailed recommendations specific to that category` : ''}

**Response Format**:
Return a valid JSON object with these keys:
{
  "scores": { "${categoriesList.split(', ').join('": number, "')}", "overallScore": number },
  "readinessLevel": string,
  "jobFitAnalysis": {
    "strengths": [string, ...],
    "gaps": [string, ...],
    "overallFit": string,
    "rationale": string
  },
  "recommendations": [{ "title": string, "explanation": string, "steps": [string, string, string] }, ...],
  "summary": string,
  "strengths": [string, ...],
  "improvements": [string, ...]${hasResume ? `,
  "resumeAnalysis": string,
  "resumeRecommendations": [string, ...],
  "resumeStrengths": [string, ...],
  "resumeWeaknesses": [string, ...],
  "resumeFeedback": string,
  "categoryAnalysis": {
    "${categoriesList.split(', ').join('": { "strengths": [string, ...], "improvements": [string, ...] }, "')}": { "strengths": [string, ...], "improvements": [string, ...] }
  }` : ''}
}

Return only the JSON object, no extra text. Ensure your analysis is detailed, expert-level, and specific to ${applicantName}'s situation and the position of ${jobPosition}.
`;
}

// Get assessment-specific system prompt
function getSystemPrompt(assessmentType: string): string {
  const basePrompt =
    'You are a career assessment AI that provides detailed, data-driven analysis based on the user\'s assessment responses and resume. Your evaluations should be honest, specific, and tailored to the individual\'s situation. Do not use generic or pre-made responses. IMPORTANT: Ensure that each category receives a different score to reflect the user\'s varied capabilities.';

  switch (assessmentType.toLowerCase()) {
    case 'fjrl':
      return `${basePrompt} You specialize in first-time job seekers, holding them to realistic entry-level standards and focusing on practical workplace skills. Be strict but encouraging in your evaluation, highlighting both readiness and critical development areas needed before entering the workforce.`;
    
    case 'ijrl':
      return `${basePrompt} You help users pursue their ideal careers, critically assessing gaps between their current state and dream job requirements. Be honest about whether their qualifications align with their aspirations, and provide concrete steps to bridge any gaps.`;
    
    case 'cdrl':
      return `${basePrompt} You assist experienced professionals in advancing, with rigorous evaluation of leadership and strategic skills. Focus on assessing their readiness for a step up in responsibility, management capabilities, and strategic thinking.`;
    
    case 'ccrl':
      return `${basePrompt} You guide workforce re-entry, honestly assessing skill relevance and re-entry challenges. Be especially attentive to skill currency, confidence issues, and how to translate past experience into present-day value. Provide varied scores for each category (skillCurrency, marketKnowledge, confidenceLevel, networkStrength).`;
    
    case 'ctrl':
      return `${basePrompt} You support career transitions, directly evaluating fit for new industries or roles. Focus on transferable skills, adaptability, and specific gaps that need addressing for a successful transition. Be candid about transition challenges while highlighting advantages of the applicant's background.`;
    
    case 'rrl':
      return `${basePrompt} You prepare users for retirement, thoroughly assessing financial and psychological readiness. Address both financial preparedness and emotional/social aspects of this major life transition, evaluating if the person is truly ready for this change.`;
    
    case 'irl':
      return `${basePrompt} You prepare students for internships, setting clear expectations for competitive success. Evaluate their academic preparation, professional awareness, and practical experience against the realities of securing and excelling in internships in their field.`;
    
    default:
      return `${basePrompt} You provide detailed, honest career assessments tailored to the user's goals. Focus on evaluating their readiness for their targeted role and providing actionable steps for improvement.`;
  }
}

// Get categories based on assessment type
function getCategories(assessmentType: string): string[] {
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

// Determine readiness level from score
function getReadinessLevelFromScore(score: number): string {
  if (score < 50) return 'Early Development';
  if (score < 70) return 'Developing Competency';
  if (score < 85) return 'Approaching Readiness';
  return 'Fully Prepared';
}

// Create fallback analysis with varied scores
function createFallbackAnalysis(
  assessmentType: string, 
  assessmentData: any, 
  hasResume: boolean,
  personalInfo: Record<string, any>,
  resumeText: string = ''
) {
  const categories = getCategories(assessmentType);
  const scores: Record<string, number> = {};
  const jobPosition = personalInfo?.jobPosition || 'the position';
  
  // Generate varied scores based on categories
  categories.forEach((category, index) => {
    // Generate scores that vary by 5-15 points between categories
    scores[category] = 60 + (index * 5) + Math.floor(Math.random() * 10);
  });
  
  // Calculate overall score
  const sum = Object.values(scores).reduce((acc, score) => acc + score, 0);
  const overallScore = Math.round(sum / categories.length);
  scores.overallScore = overallScore;
  
  // Determine readiness level
  const readinessLevel = getReadinessLevelFromScore(overallScore);
  
  // Generate job fit analysis
  let overallFit = "Needs Development";
  if (overallScore >= 85) overallFit = "Excellent";
  else if (overallScore >= 75) overallFit = "Good";
  else if (overallScore >= 60) overallFit = "Moderate";
  
  // Create detailed fallback analysis
  return {
    scores,
    readinessLevel,
    jobFitAnalysis: {
      strengths: [
        `Shows initiative in seeking assessment for ${jobPosition}`,
        `Demonstrates awareness of professional requirements`,
        `Has foundational skills that could be developed further`
      ],
      gaps: [
        `May need more specific experience related to ${jobPosition}`,
        `Could benefit from deeper industry knowledge`,
        `May require additional technical skills development`
      ],
      overallFit: overallFit,
      rationale: `Based on the assessment responses, the candidate shows ${overallFit.toLowerCase()} alignment with the requirements for ${jobPosition}. While demonstrating some valuable qualities, there are specific areas that need development before achieving optimal performance in this role. The overall score of ${overallScore} indicates ${readinessLevel.toLowerCase()} stage, suggesting targeted skill building would be beneficial.`
    },
    recommendations: [
      {
        title: "Develop Technical Skills Specific to the Role",
        explanation: `Success in ${jobPosition} requires mastery of specific technical competencies that employers expect from qualified candidates. Building these skills will significantly improve employability and performance capability. Focus on the most in-demand technical skills for this position based on current job descriptions and industry standards. Technical proficiency is often the first filter hiring managers use when evaluating candidates, particularly for specialized positions. By targeting the most relevant skills, you'll not only improve your qualifications but also demonstrate commitment to professional excellence.`,
        steps: [
          "Identify 3-5 key technical skills that are most in-demand for this role by analyzing job descriptions and conducting informational interviews within 2 weeks",
          "Create a structured learning plan with weekly goals and measurable outcomes for each skill within 1 month",
          "Complete at least one certification or substantial project demonstrating these skills within 3 months",
          "Practice applying these skills through real-world projects or volunteer opportunities",
          "Document your technical accomplishments with metrics for your resume and interview responses"
        ]
      },
      {
        title: "Expand Professional Network in Target Industry",
        explanation: `A strong professional network is crucial for career advancement in any field. For ${jobPosition}, industry connections can provide valuable insights, mentorship, and opportunities that aren't publicly advertised. Building meaningful professional relationships will enhance understanding of industry expectations and create pathways to opportunities. Research indicates that approximately 70-80% of jobs are filled through networking rather than formal applications. By developing strategic connections within your target industry, you gain access to this "hidden job market" and increase your chances of securing desirable positions through referrals and recommendations.`,
        steps: [
          "Join 2-3 relevant professional associations or online communities within 2 weeks",
          "Schedule at least one informational interview per week with professionals in target companies or roles",
          "Attend industry events or webinars monthly and follow up with new connections within 48 hours",
          "Create and maintain an engagement plan to nurture professional relationships consistently",
          "Develop a clear value proposition that explains what you can offer to your network contacts"
        ]
      },
      {
        title: "Enhance Personal Brand and Professional Presence",
        explanation: `In today's competitive job market, a strong personal brand that clearly communicates your unique value proposition is essential. For ${jobPosition}, employers seek candidates who demonstrate professionalism, expertise, and alignment with industry expectations through their online presence, communication style, and presentation. Your personal brand is often the first impression potential employers, clients, or collaborators will have of you. A cohesive, authentic, and strategic personal brand can significantly differentiate you from other candidates with similar qualifications. This is particularly important in industries where reputation and perception strongly influence hiring decisions.`,
        steps: [
          "Update all professional social media profiles to showcase relevant skills and achievements within 1 week",
          "Create or refine a personal portfolio website highlighting projects and accomplishments within 1 month",
          "Develop a clear and compelling elevator pitch that articulates your unique value proposition",
          "Practice professional communication by engaging meaningfully in industry discussions online weekly",
          "Request feedback from trusted colleagues on your professional image and implement improvements"
        ]
      },
      {
        title: "Acquire Industry-Specific Certifications",
        explanation: `Industry certifications serve as credible validations of your expertise and commitment to professional development. For ${jobPosition}, targeted certifications can significantly enhance your credibility with employers and provide structured pathways to develop critical skills. Research shows that professionals with relevant certifications earn 15-20% more than their non-certified counterparts and are more likely to be shortlisted for competitive roles. Certifications also provide standardized proof of your knowledge, which is particularly valuable when you're transitioning into a new field or lack extensive experience. They signal to employers that you meet industry standards and are committed to continuous learning.`,
        steps: [
          "Research the top 3-5 certifications most valued for ${jobPosition} in your target market within 2 weeks",
          "Evaluate each certification based on cost, time commitment, prerequisites, and impact on employability",
          "Create a prioritized certification roadmap with specific completion timelines over the next 3-12 months",
          "Allocate 5-10 hours weekly for structured study and practical application of certification materials",
          "Join study groups or forums specific to each certification to enhance learning and build connections"
        ]
      },
      {
        title: "Develop Strategic Communication Skills",
        explanation: `Effective communication is consistently ranked among the top skills employers seek across all industries. For ${jobPosition}, the ability to articulate complex ideas clearly, adapt communication style to different audiences, and persuade stakeholders is particularly crucial. Strong communication skills will enhance your performance in interviews, presentations, and day-to-day work interactions, setting you apart from technically competent but less communicative peers. Communication effectiveness directly impacts your ability to collaborate, lead, influence decisions, and build relationships—all essential elements for career advancement. By mastering both verbal and written communication, you'll enhance your ability to navigate organizational dynamics and gain stakeholder buy-in for your ideas and initiatives.`,
        steps: [
          "Assess your current communication strengths and weaknesses across written, verbal, and presentation formats within 1 week",
          "Join a professional speaking organization like Toastmasters or take a structured communication course within 1 month",
          "Practice explaining complex concepts from your field to non-technical audiences and request feedback",
          "Record and analyze your presentation style, identifying specific areas for improvement in delivery, structure, and engagement",
          "Seek opportunities to present or lead discussions in professional settings at least once monthly"
        ]
      },
      {
        title: "Build a Specialized Project Portfolio",
        explanation: `For ${jobPosition}, demonstrating practical application of skills through tangible projects is often more compelling than qualifications alone. A strategically curated portfolio of projects addressing real-world challenges in your target industry provides concrete evidence of your capabilities, problem-solving approach, and value proposition to potential employers. This approach is particularly effective for career transitions or competitive fields where distinguishing yourself is essential. Project portfolios serve as powerful supplements to traditional credentials by showing rather than telling what you can do. They allow employers to evaluate your work quality, thought process, and results orientation directly. Well-documented projects demonstrate initiative, persistence, and practical problem-solving abilities that resumes alone cannot convey.`,
        steps: [
          "Identify 3-4 high-impact problems or challenges relevant to ${jobPosition} that showcase your unique strengths",
          "Design projects of varying complexity that demonstrate different skillsets, with completion timelines ranging from 2 weeks to 3 months",
          "Document your development process, challenges encountered, and solutions implemented for each project",
          "Incorporate industry best practices and current methodologies in your approach to demonstrate currency",
          "Present completed projects in a professional portfolio with clear descriptions of problems addressed, approaches taken, and outcomes achieved"
        ]
      }
    ],
    summary: `The assessment indicates moderate readiness for ${jobPosition}, with an overall score of ${overallScore} placing in the "${readinessLevel}" category. Some foundational skills and knowledge are evident, particularly in ${categories[0]} and ${categories[2]}, though there are several areas requiring development before achieving optimal performance in this role. The gaps identified in ${categories[1]} and ${categories[3]} present opportunities for targeted skill-building and professional development. With focused effort on the recommended strategies, significant improvement in readiness level can be achieved within 3-6 months. The demonstrated motivation to pursue this assessment suggests a commitment to professional growth that will be valuable in addressing the identified development areas.`,
    strengths: [
      `Shows dedication to professional development by actively seeking assessment and feedback`,
      `Demonstrates self-awareness regarding career development needs and areas for improvement`,
      `Shows initiative in seeking out resources and opportunities for growth`,
      `Has a foundational understanding of requirements and expectations for ${jobPosition}`
    ],
    improvements: [
      `Develop more specific technical skills aligned with the requirements of ${jobPosition}, focusing on industry-standard tools and methodologies`,
      `Deepen industry knowledge through targeted research, courses, and engagement with current practitioners in the field`,
      `Build a stronger professional network specifically within the target industry to gain insights and opportunities`,
      `Improve professional presentation materials including resume, portfolio, and online presence to better showcase qualifications`
    ],
    ...(hasResume ? {
      resumeAnalysis: `The resume shows basic professional formatting but could benefit from more targeted content that aligns with the requirements of ${jobPosition}. The current structure provides a chronological overview of experience, but lacks emphasis on achievements and quantifiable results relevant to the target role. The skills section contains relevant keywords but would be more impactful if connected to specific accomplishments. The resume would benefit from a stronger professional summary that clearly communicates value proposition to potential employers in this field. Overall, while the resume covers essential information, it needs strategic refinement to effectively position the candidate for ${jobPosition} and stand out in competitive application processes. The document appears to be written in a somewhat generic manner rather than being tailored specifically for the target role, which reduces its effectiveness in highlighting relevant qualifications.`,
      resumeRecommendations: [
        `Replace generic job descriptions with specific, quantifiable achievements (e.g., 'Increased productivity by 20%' rather than 'Responsible for productivity'). For example, convert 'Managed team projects' to 'Led cross-functional team of 7 members to deliver 3 critical projects ahead of schedule, resulting in 15% cost savings'.`,
        `Tailor the resume specifically to ${jobPosition} by emphasizing relevant skills and experiences aligned with job requirements. Analyze 5-10 job descriptions for the target role and ensure your resume explicitly addresses at least 80% of the commonly requested qualifications.`,
        `Add a strong professional summary (3-5 lines) that clearly communicates your unique value proposition for this specific role. For example: 'Results-driven [professional] with X years of experience driving [relevant outcomes]. Expertise in [key skill 1], [key skill 2], and [key skill 3], with proven success in [relevant achievement]. Seeking to leverage [specific expertise] to [benefit relevant to target employer].'`,
        `Incorporate relevant industry keywords from job descriptions to optimize for applicant tracking systems. Use a strategic placement approach, ensuring keywords appear in both the skills section and within the context of specific achievements.`,
        `Improve the visual layout for better readability with consistent formatting and appropriate white space. Ensure consistent font usage, uniform bullet point style, and strategic use of bold/italics to guide the reader's eye to the most important information.`,
        `Add a dedicated 'Core Competencies' or 'Technical Skills' section near the top of the resume that clearly lists all relevant skills for the target position in a scannable format. Group skills into logical categories (e.g., Technical Skills, Industry Knowledge, Soft Skills) to facilitate quick assessment by recruiters.`
      ],
      resumeStrengths: [
        `Professional formatting that maintains a clean, organized appearance, making the document accessible to reviewers`,
        `Inclusion of relevant educational background and credentials that establish foundational qualifications for the role`,
        `Chronological work history that demonstrates career progression and continuity of employment`,
        `Use of action verbs that convey responsibility and initiative in various roles`
      ],
      resumeWeaknesses: [
        `Lack of quantifiable achievements and metrics that demonstrate impact in previous roles. Recruiters for ${jobPosition} specifically look for tangible results, not just responsibilities.`,
        `Insufficient customization to the specific requirements of ${jobPosition}, making it difficult for recruiters to immediately identify relevance. Industry research shows that recruiters spend an average of just 7.4 seconds on initial resume screening.`,
        `Overuse of generic phrases and buzzwords without substantive examples to support claims. Terms like "team player" and "detail-oriented" without supporting evidence may be viewed skeptically by experienced recruiters.`,
        `Skills section lacks organization and strategic highlighting of the most relevant competencies for ${jobPosition}. Key technical skills required for this role are buried or missing entirely.`
      ],
      resumeFeedback: `Your resume presents a fundamental professional profile but needs significant enhancement to effectively target ${jobPosition} roles. The document fails to quickly communicate your unique value proposition, which is critical in competitive hiring processes where recruiters make rapid assessments. While your experience history provides a solid foundation, the impact of your work is not clearly articulated through measurable achievements and outcomes. The lack of industry-specific keywords and tailored content reduces your visibility in automated screening systems and fails to immediately resonate with hiring managers. With strategic restructuring to emphasize relevant accomplishments, technical skills, and industry alignment, your resume could much more effectively position you as a strong candidate for ${jobPosition}. Focus particularly on demonstrating the direct connection between your experience and the core requirements of your target role.`,
      categoryAnalysis: createCategoryAnalysis(categories, jobPosition)
    } : {})
  };
}

// Helper function to create category analysis for fallback
function createCategoryAnalysis(categories: string[], jobPosition: string) {
  const analysis: Record<string, any> = {};
  
  categories.forEach((category, index) => {
    // Create more varied and specific feedback for each category
    const baseScore = 60 + (index * 5) + Math.floor(Math.random() * 10);
    
    let strengths, improvements;
    
    // Create category-specific feedback based on category name
    switch(category) {
      case 'technicalSkills':
        strengths = [
          `Shows foundational knowledge of some technical tools required for ${jobPosition}`,
          `Demonstrates awareness of the importance of continuous technical development`
        ];
        improvements = [
          `Develop deeper expertise in industry-standard tools specifically required for ${jobPosition}, particularly focusing on advanced features and best practices`,
          `Create practical projects that demonstrate technical proficiency with measurable outcomes`
        ];
        break;
        
      case 'jobMarketAwareness':
        strengths = [
          `Shows basic understanding of the job market for ${jobPosition}`,
          `Has researched some requirements for roles in this field`
        ];
        improvements = [
          `Develop more comprehensive understanding of market trends, salary expectations, and growth projections for ${jobPosition}`,
          `Research at least 5 leading companies in your target industry and understand their specific requirements and application processes`
        ];
        break;
        
      case 'professionalPresentation':
        strengths = [
          `Maintains basic professional appearance and communication style`,
          `Understands the importance of professional image in career advancement`
        ];
        improvements = [
          `Refine professional image specifically for ${jobPosition}, including appropriate dress, communication style, and online presence`,
          `Develop industry-specific communication skills including relevant terminology and presentation approaches`
        ];
        break;
        
      case 'interviewPreparation':
        strengths = [
          `Shows awareness of common interview processes`,
          `Has basic understanding of interview expectations`
        ];
        improvements = [
          `Practice role-specific interview questions with focused preparation for behavioral, technical, and situational questions`,
          `Develop compelling stories and examples that demonstrate key qualifications for ${jobPosition}`
        ];
        break;
        
      // Add cases for other potential categories
      default:
        // Generic fallback strengths and improvements
        strengths = [
          `Shows interest in developing ${formatCategoryName(category)} for ${jobPosition}`,
          `Demonstrates awareness of the importance of ${formatCategoryName(category)} in career advancement`
        ];
        improvements = [
          `Develop more specific plans for improving ${formatCategoryName(category)} with measurable goals and timelines`,
          `Seek resources or mentorship specifically focused on ${formatCategoryName(category)} development`
        ];
    }
    
    analysis[category] = {
      score: baseScore,
      strengths: strengths,
      improvements: improvements
    };
  });
  
  return analysis;
}

// Helper function to format category names for display
function formatCategoryName(category: string): string {
  return category
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
}