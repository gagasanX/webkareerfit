// app/api/ai-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { openai } from '@/lib/openai';
import * as fs from 'fs/promises';
import * as path from 'path';

interface RecommendationWithDetails {
  title: string;
  explanation: string;
  steps: string[];
}

interface AnalysisResult {
  scores: Record<string, number>;
  recommendations: RecommendationWithDetails[];
  summary: string;
  strengths: string[];
  improvements: string[];
  resumeAnalysis?: string;
  resumeRecommendations?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const data = await request.json();
    const { assessmentId, assessmentType, answers, personalInfo, userId } = data;

    if (!assessmentType || !answers || !assessmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`Processing AI analysis for assessment: ${assessmentId}`);

    // Verify assessment exists
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Verify userId if provided
    if (userId && assessment.userId !== userId) {
      return NextResponse.json({ error: 'User mismatch' }, { status: 403 });
    }

    // Format answers for prompt
    const formattedAnswers = Object.entries(answers)
      .map(([key, value]) => {
        const formattedKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, s => s.toUpperCase())
          .trim();
        return `${formattedKey}: ${value}`;
      })
      .join('\n');

    // Extract resume text if available
    let resumeText = "";
    let hasResume = false;
    
    if (assessment.data && typeof assessment.data === 'object') {
      const assessmentData = assessment.data as Record<string, any>;
      const resumePath = assessmentData.resumePath;
      
      if (resumePath && typeof resumePath === 'string') {
        try {
          // Ensure the path is absolute and secure
          const fullPath = path.isAbsolute(resumePath) 
            ? resumePath 
            : path.join(process.cwd(), resumePath);
          
          console.log(`Reading resume from: ${fullPath}`);
          
          // Read and process the resume file
          const fileContent = await fs.readFile(fullPath, 'utf8');
          resumeText = fileContent.slice(0, 10000); // Limit size for API
          hasResume = true;
          
          console.log(`Resume text extracted, length: ${resumeText.length} characters`);
        } catch (readError) {
          console.error('Failed to read resume file:', readError);
          // Continue with analysis even if resume reading fails
        }
      }
    }

    // Create dynamic prompt for OpenAI based on assessment type
    const prompt = `
You are analyzing a ${assessmentType.toUpperCase()} career assessment.

ASSESSMENT TYPE: ${assessmentType.toUpperCase()}
User Information:
- Job Position: ${personalInfo?.jobPosition || 'Not specified'}
- Qualification: ${personalInfo?.qualification || 'Not specified'}
- Personality: ${personalInfo?.personality?.substring(0, 200) || 'Not specified'}

Assessment Responses:
${formattedAnswers}

${hasResume ? `RESUME TEXT:
${resumeText}
` : ''}

CONTEXTUAL GUIDANCE BASED ON ASSESSMENT TYPE:
${getContextualGuidance(assessmentType)}

You should evaluate the responses ${hasResume ? 'and the resume ' : ''}and provide a comprehensive analysis with:

1. SCORES: Score each assessment category on a scale of 0-100 based on these guidelines:
   - 0-35: Significant development needed
   - 36-60: Basic proficiency but improvement required
   - 61-75: Moderate competency with specific areas needing attention
   - 76-90: Strong capability with minor refinements needed
   - 91-100: Excellent mastery level

   Adapt your scoring approach to match the context of this specific assessment type. The scoring should reflect both:
   - The candidate's current level in each area
   - The level typically required for success in the target position/situation
   
   If there's a significant gap between their qualifications and their target position, reflect this honestly in your scoring.

2. OVERALL SCORE: Calculate an overall readiness score and assign one of these readiness levels:
   - Below 50: "Early Development" - Significant preparation needed
   - 50-69: "Developing Competency" - Building foundational skills but not yet ready
   - 70-84: "Approaching Readiness" - Key competencies in place with specific gaps to address
   - 85-100: "Fully Prepared" - Ready to succeed in the target role/situation

3. GAP ANALYSIS: Based on the specific assessment type, evaluate:
   - Key gaps between current qualifications/skills and what's needed
   - How these gaps might impact success in their target situation
   - Realistic timeline and approach to address these gaps

4. DETAILED RECOMMENDATIONS: Provide 5 specific, actionable recommendations that:
   - Address the most critical gaps identified
   - Are realistic and contextually appropriate for their situation
   - For each recommendation:
     * Provide a clear, specific title
     * Explain why this recommendation matters for their situation
     * Include 3 practical implementation steps with timeframes where appropriate

5. SUMMARY: Write a balanced assessment of their readiness that:
   - Acknowledges their current strengths
   - Addresses key gaps and development needs
   - Provides an honest but encouraging perspective on their path forward
   - Is appropriate to their assessment type and career stage

6. STRENGTHS: List 3-4 genuine strengths valuable for their specific situation.

7. IMPROVEMENTS: List 3-4 critical development areas to address.

${hasResume ? `8. RESUME ANALYSIS: Analyze their resume in detail:
   - The effectiveness and impact of their resume presentation
   - How well their resume aligns with their target position/career goals
   - Strengths and weaknesses in their resume format, content, and focus
   - Provide clear, specific feedback for improvement

9. RESUME RECOMMENDATIONS: Provide 3-5 specific recommendations to improve their resume, including:
   - How to better highlight their relevant experiences
   - How to address any gaps or weaknesses
   - How to better align their resume with their target position/industry standards
   - Specific formatting or content improvements
` : ''}

Format your response as a valid JSON object with these keys:
{
  "scores": { 
    "categoryName1": score, 
    "categoryName2": score, 
    "overallScore": number,
    "readinessLevel": "one of: [Early Development, Developing Competency, Approaching Readiness, Fully Prepared]"
  },
  "recommendations": [
    {
      "title": "Clear recommendation title",
      "explanation": "Explanation of why this matters for their specific situation",
      "steps": ["Step 1 with timeline if appropriate", "Step 2", "Step 3"]
    },
    ...more recommendations
  ],
  "summary": "Balanced assessment of their readiness",
  "strengths": ["Specific strength 1", "strength 2", ...],
  "improvements": ["Development area 1", "improvement 2", ...]${hasResume ? `,
  "resumeAnalysis": "Detailed analysis of their resume",
  "resumeRecommendations": ["Resume improvement 1", "Resume improvement 2", ...]` : ''}
}
`;

    console.log('Sending request to OpenAI...');
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: getSystemPrompt(assessmentType)
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 3500 // Increased token limit to account for resume analysis
    });
    
    // Parse response
    const responseText = completion.choices[0]?.message?.content || "{}";
    console.log('OpenAI response length:', responseText.length);
    
    try {
      const analysis = JSON.parse(responseText) as AnalysisResult;
      console.log('Analysis parsed successfully');
      
      // Ensure overallScore exists
      if (!analysis.scores.overallScore) {
        const scoreValues = Object.values(analysis.scores).filter(
          (value): value is number => typeof value === 'number'
        );
        
        if (scoreValues.length > 0) {
          analysis.scores.overallScore = Math.round(
            scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
          );
        } else {
          analysis.scores.overallScore = 70;
        }
      }
      
      // Update the assessment with the analysis results
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          data: {
            ...(assessment.data as any),
            scores: analysis.scores,
            recommendations: analysis.recommendations,
            summary: analysis.summary,
            strengths: analysis.strengths,
            improvements: analysis.improvements,
            resumeText: hasResume ? resumeText : undefined,
            resumeAnalysis: analysis.resumeAnalysis || undefined,
            resumeRecommendations: analysis.resumeRecommendations || undefined,
            aiProcessed: true,
            aiProcessedAt: new Date().toISOString()
          }
        }
      });
      
      console.log(`Assessment ${assessmentId} updated with contextual AI analysis${hasResume ? ' including resume analysis' : ''}`);
      
      return NextResponse.json({ success: true, analysis });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      
      // Update assessment with error info
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          data: {
            ...(assessment.data as any),
            aiError: 'Failed to parse AI response',
            aiProcessed: false
          }
        }
      });
      
      return NextResponse.json({ 
        error: 'Invalid AI response format',
        raw: responseText.substring(0, 500) + '...'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error analyzing assessment with AI:', error);
    
    // Try to update assessment with error if we have an ID
    try {
      const assessmentId = (await request.json()).assessmentId;
      if (assessmentId) {
        await prisma.assessment.update({
          where: { id: assessmentId },
          data: {
            data: {
              aiError: error instanceof Error ? error.message : 'Unknown error',
              aiProcessed: false
            }
          }
        });
      }
    } catch (updateError) {
      console.error('Failed to update assessment with error:', updateError);
    }
    
    return NextResponse.json({ 
      error: 'Failed to analyze assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Function to get system prompt based on assessment type
function getSystemPrompt(assessmentType: string): string {
  const type = assessmentType.toLowerCase();
  
  if (type === 'fjrl') { // First Job Readiness Level
    return "You are an encouraging career advisor specializing in helping recent graduates and first-time job seekers. You balance honesty with positive reinforcement, understanding that first-time job seekers need both realistic guidance and confidence-building support. You provide constructive feedback while recognizing the unique challenges of entering the workforce for the first time.";
  }
  
  if (type === 'ijrl') { // Ideal Job Readiness Level
    return "You are an insightful career advisor who helps people pursue their ideal careers. You provide balanced analysis that weighs aspirations against current capabilities, helping people understand what's realistically possible while also encouraging meaningful pursuit of career goals. You offer honest assessment of gaps while still validating their career dreams.";
  }
  
  if (type === 'cdrl') { // Career Development Readiness Level
    return "You are a professional career development specialist who helps experienced professionals advance their careers. You provide direct, candid feedback on skill gaps and development needs, focusing on what it takes to reach the next level. You're straightforward about requirements for advancement while offering strategic pathways for growth.";
  }
  
  if (type === 'ccrl') { // Career Comeback Readiness Level
    return "You are a supportive career advisor specializing in helping people return to the workforce after a career break. You balance acknowledging the challenges of career gaps with recognizing transferable skills and potential. You provide constructive guidance on rebuilding professional identity while being realistic about market expectations.";
  }
  
  if (type === 'ctrl') { // Career Transition Readiness Level
    return "You are a strategic career transition expert who helps professionals change industries or roles. You provide clear, direct assessment of transition challenges while identifying transferable strengths. You're honest about potential obstacles and qualification gaps while offering practical pathways to successful transitions.";
  }
  
  if (type === 'rrl') { // Retirement Readiness Level
    return "You are a thoughtful retirement planning advisor who helps professionals prepare for career conclusion and transition to retirement. You balance financial readiness with emotional/psychological preparedness, providing holistic guidance on this major life transition with sensitivity to both practical considerations and personal fulfillment.";
  }
  
  if (type === 'irl') { // Internship Readiness Level
    return "You are an encouraging educational advisor who helps students and early-career individuals prepare for internships. You provide supportive guidance while being clear about employer expectations, focusing on developmental opportunities and learning potential. You balance pointing out areas for growth with recognizing that internships themselves are learning experiences.";
  }
  
  // Default prompt if assessment type not recognized
  return "You are a professional career assessment advisor who provides personalized, actionable insights. You balance honesty with constructiveness, tailoring your feedback to the individual's situation while providing realistic guidance for their career development.";
}

// Function to get contextual guidance based on assessment type
function getContextualGuidance(assessmentType: string): string {
  const type = assessmentType.toLowerCase();
  
  if (type === 'fjrl') { // First Job Readiness Level
    return `
This assessment evaluates a first-time job seeker's readiness to enter the workforce. Key considerations:
- They may have limited or no professional experience
- Academic achievements should be considered valuable, while noting gaps in practical workplace skills
- Entry-level expectations should be the benchmark, not experienced professional standards
- Focus on foundational workplace competencies and potential to grow
- Be encouraging but honest about development needs
- Provide guidance that builds confidence while setting realistic expectations
- Recommendations should include entry-level skill development and early career navigation strategies`;
  }
  
  if (type === 'ijrl') { // Ideal Job Readiness Level
    return `
This assessment evaluates a person's readiness to pursue their ideal career or dream job. Key considerations:
- Focus on the gap between current qualifications and those needed for their target role
- Consider both technical qualifications and softer "fit" factors
- Provide a realistic assessment of the feasibility of their goal given their background
- Identify the most efficient pathway to build necessary qualifications and experience
- Be honest about timeline and potential challenges while validating their aspirations
- Recommendations should include both short-term preparation steps and long-term career positioning
- Balance honesty about current readiness with strategies to achieve their ideal job`;
  }
  
  if (type === 'cdrl') { // Career Development Readiness Level
    return `
This assessment evaluates an experienced professional's readiness for career advancement. Key considerations:
- Evaluate higher-level competencies expected for management/leadership roles
- Assess strategic thinking and leadership capabilities more critically
- Be direct about skill gaps that could impede promotion or advancement
- Compare their profile against typical requirements for their target position
- Provide clear benchmarks for skills and experiences needed at their target level
- Be candid about development needs while recognizing demonstrated expertise
- Recommendations should be sophisticated and targeted at senior-level skill development
- Focus on strategies for demonstrating readiness for greater responsibility`;
  }
  
  if (type === 'ccrl') { // Career Comeback Readiness Level
    return `
This assessment evaluates the readiness of someone returning to the workforce after a career break. Key considerations:
- Recognize the challenges of career gaps while identifying transferable skills
- Balance acknowledgment of potential skill atrophy with recognition of other valuable experiences
- Consider both technical skill updates needed and confidence/readiness factors
- Assess current industry knowledge and awareness of changes during their absence
- Provide strategies for explaining career gaps constructively
- Be supportive while realistic about potential obstacles to re-entry
- Recommendations should include both skill refreshment and career positioning strategies
- Focus on rebuilding professional identity and confidence alongside practical skills`;
  }
  
  if (type === 'ctrl') { // Career Transition Readiness Level
    return `
This assessment evaluates readiness for a significant career transition to a new industry or role type. Key considerations:
- Focus on transferable skills while honestly assessing industry/role-specific gaps
- Compare their background with typical requirements in their target field
- Be direct about qualification mismatches and credential needs
- Consider both technical skills and cultural fit in the new environment
- Assess realistic timelines for successful transition given their background
- Be candid about transition challenges while highlighting transferable strengths
- Recommendations should include concrete steps to build credibility in the new field
- Strategic positioning and translation of past experience should be emphasized`;
  }
  
  if (type === 'rrl') { // Retirement Readiness Level
    return `
This assessment evaluates readiness for retirement and career conclusion. Key considerations:
- Focus on knowledge transfer, succession planning, and legacy-building
- Consider both financial preparedness and psychological/emotional readiness
- Assess completeness of career accomplishments and unfinished professional goals
- Evaluate preparation for identity transition from career to retirement
- Be sensitive to the emotional aspects of ending a career while remaining practical
- Recommendations should include both pre-retirement actions and post-retirement planning
- Balance financial guidance with fulfillment and purpose considerations
- Focus on creating a positive conclusion while preparing for the next life stage`;
  }
  
  if (type === 'irl') { // Internship Readiness Level
    return `
This assessment evaluates readiness for internship opportunities. Key considerations:
- Focus on foundational professional skills and learning orientation
- Expectations should be appropriate for someone with limited work experience
- Assess academic preparation alongside professional potential
- Consider enthusiasm, adaptability, and willingness to learn as key factors
- Be encouraging while providing clear guidance on workplace expectations
- Recommendations should focus on maximizing learning and development during internships
- Balance professionalism requirements with recognition that internships are learning experiences
- Emphasize growth mindset and strategies for making the most of internship opportunities`;
  }
  
  // Default guidance if assessment type not recognized
  return `
This career assessment evaluates the individual's readiness for their stated professional goals. Provide a balanced analysis that:
- Honestly evaluates their current capabilities against their target position requirements
- Identifies strengths that will contribute to their success
- Pinpoints critical gaps that need addressing
- Offers practical, actionable recommendations appropriate to their specific situation`;
}