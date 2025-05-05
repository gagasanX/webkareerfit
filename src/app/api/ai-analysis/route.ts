// src/app/api/ai-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { openai } from '@/lib/openai';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { assessmentId, type, responses } = body;

    console.log(`[AI Analysis] Processing assessment ${assessmentId} of type ${type}`);

    if (!assessmentId || !type) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get the assessment data
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      console.error(`[AI Analysis] Assessment ${assessmentId} not found`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Check if Make.com integration is configured
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
    
    // Update assessment to mark as processing
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        data: {
          ...(assessment.data as object || {}),
          aiAnalysisStarted: true,
          aiProcessing: true,
          aiProcessingStarted: new Date().toISOString()
        }
      }
    });

    // If Make.com webhook is configured, send to Make
    if (makeWebhookUrl) {
      try {
        // Prepare data for Make.com
        const makeData = {
          assessmentId,
          assessmentType: type,
          responses,
          categories: getCategories(type),
          callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://my.kareerfit.com'}/api/webhook/ai-analysis`,
          secret: process.env.MAKE_WEBHOOK_SECRET
        };

        // Send to Make.com
        console.log(`[AI Analysis] Sending assessment ${assessmentId} to Make.com for processing`);
        const response = await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(makeData),
        });

        if (!response.ok) {
          throw new Error(`Make.com responded with status: ${response.status}`);
        }

        // Return success to client
        return NextResponse.json({
          success: true,
          message: 'Assessment sent to processing service',
          processingStatus: 'initiated',
        });
      } catch (makeError) {
        console.error(`[AI Analysis] Make.com integration error for ${assessmentId}:`, makeError);
        // If Make.com fails, fall back to local analysis (handled below)
      }
    }
    
    // If Make.com is not configured or failed, fall back to local analysis
    // NOTE: This will likely timeout on Vercel with 10s limit, but we'll include the code
    // as a fallback anyway
    try {
      console.log(`[AI Analysis] Performing local analysis for ${assessmentId}`);
      const analysisResult = await generateAIAnalysis(assessmentId, type, responses);
      
      // Update assessment with the AI analysis
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'completed',
          data: {
            ...(assessment.data as object || {}),
            scores: analysisResult.scores,
            readinessLevel: analysisResult.readinessLevel,
            recommendations: analysisResult.recommendations,
            summary: analysisResult.summary,
            strengths: analysisResult.strengths,
            improvements: analysisResult.improvements,
            categoryAnalysis: analysisResult.categoryAnalysis,
            aiProcessed: true,
            aiProcessedAt: new Date().toISOString(),
            aiAnalysisStarted: true,
            aiProcessing: false,
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: 'AI analysis completed locally',
        analysis: analysisResult
      });
    } catch (aiError) {
      console.error(`[AI Analysis] AI processing error for ${assessmentId}:`, aiError);
      
      // Create real fallback analysis based on actual responses
      const fallbackAnalysis = createSmartFallbackAnalysis(responses, type);
      
      // Update assessment with fallback analysis
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'completed',
          data: {
            ...(assessment.data as object || {}),
            scores: fallbackAnalysis.scores,
            readinessLevel: fallbackAnalysis.readinessLevel,
            recommendations: fallbackAnalysis.recommendations,
            summary: fallbackAnalysis.summary,
            strengths: fallbackAnalysis.strengths,
            improvements: fallbackAnalysis.improvements,
            categoryAnalysis: fallbackAnalysis.categoryAnalysis,
            aiProcessed: true,
            aiProcessedAt: new Date().toISOString(),
            aiAnalysisStarted: true,
            aiProcessing: false,
            usedFallback: true,
            fallbackReason: aiError instanceof Error ? aiError.message : 'AI processing failed'
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'AI analysis completed with fallback',
        analysis: fallbackAnalysis,
        usedFallback: true
      });
    }
  } catch (error) {
    console.error('[AI Analysis] Critical error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI analysis request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Function to process AI analysis through OpenAI directly
async function generateAIAnalysis(
  assessmentId: string,
  assessmentType: string,
  responses: any
) {
  // Get categories based on assessment type
  const categories = getCategories(assessmentType);
  
  // Create a string representation of the responses for the AI
  const formattedResponses = Object.entries(responses)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  // Create the prompt for the AI
  const systemPrompt = `You are a career assessment expert specializing in ${assessmentType.toUpperCase()} evaluations. 
You provide detailed, objective analysis based on assessment responses. Generate varied scores (0-100) for each category.`;

  const userPrompt = `Analyze these ${assessmentType.toUpperCase()} assessment responses:

${formattedResponses}

Provide a comprehensive analysis with the following JSON structure:
{
  "scores": {
    ${categories.map(cat => `"${cat}": number (0-100)`).join(',\n    ')},
    "overallScore": number (0-100)
  },
  "readinessLevel": "Early Development" | "Developing Competency" | "Approaching Readiness" | "Fully Prepared",
  "recommendations": [
    {
      "title": "string",
      "explanation": "string",
      "steps": ["string", "string", "string"]
    }
  ],
  "summary": "string",
  "strengths": ["string", "string", "string"],
  "improvements": ["string", "string", "string"],
  "categoryAnalysis": {
    ${categories.map(cat => `"${cat}": {
      "score": number (0-100),
      "strengths": ["string", "string"],
      "improvements": ["string", "string"]
    }`).join(',\n    ')}
  }
}

For readiness levels:
- Below 50: "Early Development"
- 50-69: "Developing Competency"
- 70-84: "Approaching Readiness"
- 85-100: "Fully Prepared"

ENSURE:
- Each category gets a unique, appropriate score based on the actual responses
- Recommendations are specific and actionable
- Strengths and improvements are personalized to the specific responses provided
- All analysis is directly based on responses
- Your analysis must be extremely accurate, detailed and personalized, like a professional career analyst would provide
- Every insight must be derived from the actual responses, not generic templates

Return ONLY valid JSON.`;

  // Call the OpenAI API
  try {
    console.log(`[OpenAI] Sending request for assessment ${assessmentId}`);
    
    // Verify API key is present
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    // Extract the response
    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('Empty response from AI');
    }

    // Parse the JSON response
    try {
      const analysisResult = JSON.parse(responseContent);

      // Validate the response has all required fields
      if (!analysisResult.scores || !analysisResult.readinessLevel || 
          !Array.isArray(analysisResult.recommendations) || !analysisResult.summary ||
          !Array.isArray(analysisResult.strengths) || !Array.isArray(analysisResult.improvements)) {
        throw new Error('Incomplete AI response');
      }

      console.log(`[OpenAI] Successfully processed assessment ${assessmentId}`);
      return analysisResult;
    } catch (parseError) {
      console.error(`[OpenAI] JSON parse error:`, parseError);
      throw new Error('Failed to parse AI response');
    }
  } catch (apiError) {
    console.error(`[OpenAI] API error:`, apiError);
    throw new Error(`OpenAI API error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
  }
}

// Function to determine categories based on assessment type
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

// Create intelligent fallback analysis with actual response analysis
function createSmartFallbackAnalysis(responses: any, assessmentType: string) {
  const categories = getCategories(assessmentType);
  
  // This function will actually analyze responses
  function analyzeResponses(responses: any, assessmentType: string) {
    const keywords: Record<string, { positive: string[], negative: string[] }> = {
      'fjrl': {
        positive: ['experience', 'project', 'internship', 'portfolio', 'confident', 'prepared', 'skill', 'knowledge', 'learn', 'passion'],
        negative: ['nervous', 'unsure', 'confused', 'worry', 'difficult', 'struggle', 'don\'t know', 'uncertain', 'no experience']
      },
      'ijrl': {
        positive: ['research', 'goal', 'network', 'plan', 'qualification', 'skill', 'talent', 'experience', 'knowledge', 'industry'],
        negative: ['uncertain', 'unsure', 'confused', 'no plan', 'no idea', 'difficult', 'challenge', 'unclear', 'struggle']
      },
      'cdrl': {
        positive: ['leadership', 'manage', 'strategic', 'vision', 'experience', 'team', 'growth', 'advance', 'success', 'innovation'],
        negative: ['uncertain', 'challenge', 'difficult', 'lacking', 'inexperience', 'unsure', 'need help', 'struggle', 'problem']
      },
      'ccrl': {
        positive: ['updated', 'current', 'skill', 'network', 'confident', 'prepared', 'ready', 'experience', 'research', 'learning'],
        negative: ['outdated', 'gap', 'rusty', 'unsure', 'worried', 'behind', 'lost touch', 'difficult', 'challenge', 'confused']
      },
      'ctrl': {
        positive: ['transferable', 'skill', 'adapt', 'learn', 'research', 'network', 'plan', 'strategy', 'excited', 'opportunity'],
        negative: ['worried', 'unsure', 'difficult', 'challenge', 'unfamiliar', 'no experience', 'struggle', 'uncertain', 'fear']
      },
      'rrl': {
        positive: ['plan', 'financial', 'saving', 'prepare', 'hobby', 'activity', 'purpose', 'ready', 'transition', 'excited'],
        negative: ['worried', 'unsure', 'unprepared', 'anxious', 'no plan', 'uncertain', 'fear', 'struggle', 'difficult']
      },
      'irl': {
        positive: ['skill', 'learn', 'interest', 'passion', 'course', 'project', 'experience', 'knowledge', 'eager', 'prepared'],
        negative: ['unsure', 'inexperience', 'nervous', 'worried', 'don\'t know', 'difficult', 'challenge', 'uncertain', 'trouble']
      }
    };
    
    // Default to fjrl if type not found
    const keywordSet = keywords[assessmentType.toLowerCase()] || keywords['fjrl'];
    
    // Initialize sentiment counters for score calculation
    let positiveSentiments = 0;
    let negativeSentiments = 0;
    let totalSentiments = 0;
    
    // Initialize category scores with default value
    const categoryScores: Record<string, number> = {};
    categories.forEach(cat => {
      categoryScores[cat] = 65; // Default to slightly above average
    });
    
    // Arrays to store actual meaningful insights
    const strengths: string[] = [];
    const improvements: string[] = [];
    
    // Category analysis
    const categoryAnalysis: Record<string, { score: number, strengths: string[], improvements: string[] }> = {};
    
    // Analyze each response
    Object.entries(responses).forEach(([question, answer]) => {
      if (typeof answer !== 'string') return;
      
      const answerText = answer.toLowerCase();
      
      // Count positive and negative sentiment words
      let posCount = 0;
      let negCount = 0;
      
      keywordSet.positive.forEach(term => {
        if (answerText.includes(term)) posCount++;
      });
      
      keywordSet.negative.forEach(term => {
        if (answerText.includes(term)) negCount++;
      });
      
      // Calculate sentiment score (0-100)
      let sentimentScore = 50; // Neutral starting point
      const totalMatches = posCount + negCount;
      
      if (totalMatches > 0) {
        sentimentScore = Math.round((posCount / totalMatches) * 100);
        positiveSentiments += posCount;
        negativeSentiments += negCount;
        totalSentiments += totalMatches;
      }
      
      // Adjust score based on answer length (more detailed answers get better scores)
      if (answerText.length > 100) {
        sentimentScore += 10;
      } else if (answerText.length < 20 && answerText.length > 0) {
        sentimentScore -= 10;
      }
      
      // Enforce 0-100 range
      sentimentScore = Math.max(0, Math.min(100, sentimentScore));
      
      // Map question to relevant category (simplistic mapping)
      let relatedCategory = '';
      if (question.toLowerCase().includes('technical') || question.toLowerCase().includes('skill')) {
        if (assessmentType === 'fjrl') relatedCategory = 'technicalSkills';
        else if (assessmentType === 'cdrl') relatedCategory = 'domainExpertise';
        else if (assessmentType === 'ctrl') relatedCategory = 'transferableSkills';
        else if (assessmentType === 'irl') relatedCategory = 'academicPreparation';
      } 
      else if (question.toLowerCase().includes('market') || question.toLowerCase().includes('industry')) {
        if (assessmentType === 'fjrl') relatedCategory = 'jobMarketAwareness';
        else if (assessmentType === 'ijrl') relatedCategory = 'industryKnowledge';
        else if (assessmentType === 'ccrl') relatedCategory = 'marketKnowledge';
        else if (assessmentType === 'ctrl') relatedCategory = 'targetIndustryKnowledge';
      }
      else if (question.toLowerCase().includes('interview') || question.toLowerCase().includes('present')) {
        if (assessmentType === 'fjrl') relatedCategory = 'professionalPresentation';
        else if (assessmentType === 'ccrl') relatedCategory = 'confidenceLevel';
      }
      else if (question.toLowerCase().includes('network') || question.toLowerCase().includes('connect')) {
        if (assessmentType === 'ijrl') relatedCategory = 'networkDevelopment';
        else if (assessmentType === 'ccrl') relatedCategory = 'networkStrength';
      }
      
      // If we mapped to a category, update its score
      if (relatedCategory && categories.includes(relatedCategory)) {
        categoryScores[relatedCategory] = Math.round((categoryScores[relatedCategory] + sentimentScore) / 2);
        
        // Initialize category analysis if not exists
        if (!categoryAnalysis[relatedCategory]) {
          categoryAnalysis[relatedCategory] = {
            score: categoryScores[relatedCategory],
            strengths: [],
            improvements: []
          };
        }
        
        // Add category-specific analysis
        if (sentimentScore > 70) {
          // Extract useful positive phrases
          const positivePhrase = `Shows ${keywordSet.positive.find(term => answerText.includes(term)) || 'good understanding'} in ${question.toLowerCase().split(' ').slice(0, 4).join(' ')}...`;
          
          if (!strengths.includes(positivePhrase)) {
            strengths.push(positivePhrase);
          }
          
          // Add to category strengths if not too many
          if (categoryAnalysis[relatedCategory].strengths.length < 2) {
            categoryAnalysis[relatedCategory].strengths.push(positivePhrase);
          }
        }
        
        if (sentimentScore < 50) {
          // Extract useful improvement phrases
          const negativePhrase = `Consider developing ${keywordSet.negative.find(term => answerText.includes(term)) ? 'more confidence' : 'more experience'} in ${question.toLowerCase().split(' ').slice(0, 4).join(' ')}...`;
          
          if (!improvements.includes(negativePhrase)) {
            improvements.push(negativePhrase);
          }
          
          // Add to category improvements if not too many
          if (categoryAnalysis[relatedCategory].improvements.length < 2) {
            categoryAnalysis[relatedCategory].improvements.push(negativePhrase);
          }
        }
      }
    });
    
    // Calculate overall score as average of category scores
    const sum = Object.values(categoryScores).reduce((total, score) => total + score, 0);
    const overallScore = Math.round(sum / categories.length);
    
    // Add more strength insights if we don't have enough
    if (strengths.length < 3) {
      // Find the highest scoring categories
      const highCategories = Object.entries(categoryScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([cat]) => cat);
      
      highCategories.forEach(cat => {
        const displayName = getDisplayNameForCategory(cat);
        const strength = `Demonstrates good potential in ${displayName}`;
        
        if (!strengths.includes(strength)) {
          strengths.push(strength);
        }
      });
    }
    
    // Add more improvement insights if we don't have enough
    if (improvements.length < 3) {
      // Find the lowest scoring categories
      const lowCategories = Object.entries(categoryScores)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 2)
        .map(([cat]) => cat);
      
      lowCategories.forEach(cat => {
        const displayName = getDisplayNameForCategory(cat);
        const improvement = `Focus on developing stronger ${displayName}`;
        
        if (!improvements.includes(improvement)) {
          improvements.push(improvement);
        }
      });
    }
    
    // Ensure we have enough strengths and improvements
    while (strengths.length < 3) {
      const genericStrengths = [
        "Shows initiative by completing a career assessment",
        "Demonstrates self-awareness about career development needs",
        "Has started the process of career planning and reflection"
      ];
      
      for (const str of genericStrengths) {
        if (!strengths.includes(str)) {
          strengths.push(str);
          break;
        }
      }
    }
    
    while (improvements.length < 3) {
      const genericImprovements = [
        "Develop more specific goals aligned with career aspirations",
        "Create a structured plan for skill development in key areas",
        "Seek mentorship or guidance from industry professionals",
        "Research industry trends and requirements more thoroughly"
      ];
      
      for (const imp of genericImprovements) {
        if (!improvements.includes(imp)) {
          improvements.push(imp);
          break;
        }
      }
    }
    
    // Limit to 5 strengths/improvements
    strengths.splice(5);
    improvements.splice(5);
    
    // Determine readiness level based on overall score
    let readinessLevel = "Early Development";
    if (overallScore >= 85) readinessLevel = "Fully Prepared";
    else if (overallScore >= 70) readinessLevel = "Approaching Readiness";
    else if (overallScore >= 50) readinessLevel = "Developing Competency";
    
    // Create type-specific recommendations
    const recommendations = createRecommendations(assessmentType, categoryScores, overallScore);
    
    // Generate a personalized summary
    const summary = generateSummary(assessmentType, readinessLevel, strengths[0], improvements[0]);
    
    return {
      scores: { ...categoryScores, overallScore },
      readinessLevel,
      recommendations,
      summary,
      strengths,
      improvements,
      categoryAnalysis
    };
  }
  
  // Helper function to get display name for category
  function getDisplayNameForCategory(category: string): string {
    const categoryDisplayMap: Record<string, string> = {
      // CCRL - Career Comeback Readiness Level
      skillCurrency: 'Skill Renewal',
      marketKnowledge: 'Market Knowledge',
      confidenceLevel: 'Confidence Readiness',
      networkStrength: 'Networking Relationships',
      
      // FJRL - First Job Readiness Level
      technicalSkills: 'Technical Skills',
      jobMarketAwareness: 'Job Market Awareness',
      professionalPresentation: 'Professional Presentation',
      interviewPreparation: 'Interview Preparedness',
      
      // IJRL - Ideal Job Readiness Level
      careerGoalClarity: 'Career Goal Clarity',
      qualificationGap: 'Qualification Gap',
      industryKnowledge: 'Industry Knowledge',
      networkDevelopment: 'Network Development',
      
      // CDRL - Career Development Readiness Level
      leadershipPotential: 'Leadership Potential',
      strategicThinking: 'Strategic Thinking',
      domainExpertise: 'Domain Expertise',
      changeManagement: 'Change Management',
      
      // CTRL - Career Transition Readiness Level
      transferableSkills: 'Transferable Skills',
      targetIndustryKnowledge: 'Target Industry Knowledge',
      adaptability: 'Adaptability',
      transitionStrategy: 'Transition Strategy',
      
      // RRL - Retirement Readiness Level
      financialPreparation: 'Financial Preparation',
      psychologicalReadiness: 'Psychological Readiness',
      postRetirementPlan: 'Post-Retirement Plan',
      knowledgeTransfer: 'Knowledge Transfer',
      
      // IRL - Internship Readiness Level
      academicPreparation: 'Academic Preparation',
      professionalAwareness: 'Professional Awareness',
      practicalExperience: 'Practical Experience',
      learningOrientation: 'Learning Orientation',
      
      // Fallback
      careerPlanning: 'Career Planning',
      skillsDevelopment: 'Skills Development',
      professionalNetworking: 'Professional Networking',
      industryKnowledge: 'Industry Knowledge'
    };
    
    return categoryDisplayMap[category] || category;
  }
  
  // Helper function to create personalized recommendations
  function createRecommendations(
    assessmentType: string, 
    categoryScores: Record<string, number>,
    overallScore: number
  ) {
    // Find lowest scoring categories
    const sortedCategories = Object.entries(categoryScores)
      .sort(([, a], [, b]) => a - b)
      .map(([category]) => category);
    
    const weakestCategories = sortedCategories.slice(0, 2);
    
    // Create recommendations focused on weakest areas
    const recommendations = [];
    
    for (const category of weakestCategories) {
      const displayName = getDisplayNameForCategory(category);
      
      let recommendation = {
        title: `Strengthen Your ${displayName}`,
        explanation: `Developing your capabilities in ${displayName.toLowerCase()} will significantly enhance your career readiness.`,
        steps: [] as string[]
      };
      
      // Add category-specific steps
      switch (category) {
        case 'technicalSkills':
          recommendation.steps = [
            "Complete targeted online courses or certifications in your field",
            "Work on personal projects that demonstrate your technical abilities",
            "Join technical communities or forums to stay current with industry standards"
          ];
          break;
        
        case 'jobMarketAwareness':
          recommendation.steps = [
            "Research current job listings to understand required qualifications",
            "Set up job alerts on major job platforms for positions you're interested in",
            "Connect with industry professionals to learn about hiring trends"
          ];
          break;
        
        case 'professionalPresentation':
          recommendation.steps = [
            "Create or update your professional profiles (LinkedIn, portfolio website)",
            "Practice your elevator pitch and interview responses",
            "Seek feedback on your resume from industry professionals"
          ];
          break;
          
        case 'interviewPreparation':
          recommendation.steps = [
            "Research common interview questions in your industry",
            "Participate in mock interviews with friends or career services",
            "Prepare detailed examples of your achievements and experiences"
          ];
          break;
          
        case 'careerGoalClarity':
          recommendation.steps = [
            "Complete career interests and values assessments",
            "Research professionals with careers you admire and study their paths",
            "Write a detailed 1, 3, and 5-year career plan with specific milestones"
          ];
          break;
          
        case 'networkDevelopment':
          recommendation.steps = [
            "Attend industry events, conferences, or meetups",
            "Connect with alumni from your school who work in your target field",
            "Schedule informational interviews with professionals in roles you aspire to"
          ];
          break;
          
        // Add more cases for other categories
          
        default:
          recommendation.steps = [
            `Research best practices in ${displayName.toLowerCase()}`,
            `Find a mentor who can guide your ${displayName.toLowerCase()} development`,
            `Set specific, measurable goals for improving your ${displayName.toLowerCase()}`
          ];
      }
      
      recommendations.push(recommendation);
    }
    
    // Add one general recommendation based on overall score
    if (overallScore < 70) {
      recommendations.push({
        title: "Develop a Comprehensive Career Strategy",
        explanation: "A structured approach to career development will help you make steady progress toward your goals.",
        steps: [
          "Create a detailed career development plan with specific milestones",
          "Identify skills gaps and prioritize learning opportunities",
          "Build a support network of mentors and peers in your field"
        ]
      });
    } else {
      recommendations.push({
        title: "Maintain Your Career Momentum",
        explanation: "You're making good progress, but continued focus will help you reach your full potential.",
        steps: [
          "Set more challenging career goals that stretch your capabilities",
          "Look for leadership or specialized opportunities in your field",
          "Consider how to share your knowledge through mentoring or content creation"
        ]
      });
    }
    
    return recommendations;
  }
  
  // Helper function to generate personalized summary
  function generateSummary(
    assessmentType: string,
    readinessLevel: string,
    topStrength: string,
    topImprovement: string
  ): string {
    const assessmentNames: Record<string, string> = {
      'fjrl': 'First Job Readiness',
      'ijrl': 'Ideal Job Readiness',
      'cdrl': 'Career Development Readiness',
      'ccrl': 'Career Comeback Readiness',
      'ctrl': 'Career Transition Readiness',
      'rrl': 'Retirement Readiness',
      'irl': 'Internship Readiness'
    };
    
    const assessmentName = assessmentNames[assessmentType.toLowerCase()] || 'Career Readiness';
    
    let summary = `Your ${assessmentName} assessment indicates you are at the "${readinessLevel}" stage. `;
    
    switch (readinessLevel) {
      case "Early Development":
        summary += `While you're in the early stages of preparation, you ${topStrength.toLowerCase()}. To progress further, focus on areas where you can improve, particularly to ${topImprovement.toLowerCase().replace(/^[^a-z]+/i, '')}.`;
        break;
      
      case "Developing Competency":
        summary += `You're making good progress with notable strengths in how you ${topStrength.toLowerCase().replace(/^[^a-z]+/i, '')}. To advance to the next level, continue developing in key areas, especially where you can ${topImprovement.toLowerCase().replace(/^[^a-z]+/i, '')}.`;
        break;
        
      case "Approaching Readiness":
        summary += `You're well on your way to full readiness with strong capabilities in ${topStrength.toLowerCase().replace(/^[^a-z]+/i, '')}. The final steps in your preparation should focus on addressing how you can ${topImprovement.toLowerCase().replace(/^[^a-z]+/i, '')}.`;
        break;
        
      case "Fully Prepared":
        summary += `You demonstrate excellent readiness across key areas, particularly in how you ${topStrength.toLowerCase().replace(/^[^a-z]+/i, '')}. Even at this advanced stage, continuous improvement in ${topImprovement.toLowerCase().replace(/^[^a-z]+/i, '')} will help maintain your competitive edge.`;
        break;
    }
    
    return summary;
  }
  
  // Perform the actual analysis of responses
  return analyzeResponses(responses, assessmentType);
}