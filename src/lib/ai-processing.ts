// /src/lib/ai-processing.ts
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Process scores
export async function processScores(responses: any, assessmentType: string) {
  console.log('[AI Processing] Processing scores');
  
  const categories = getCategories(assessmentType);
  
  try {
    // Create a simplified prompt for scores only
    const prompt = `
      Analyze this ${assessmentType.toUpperCase()} career assessment.
      
      Responses: ${JSON.stringify(responses)}
      
      Assign scores (0-100) for these categories: ${categories.join(', ')}
      Scores MUST vary by category to reflect strengths and weaknesses.
      Use these guidelines:
      - 0-35: Significant gaps
      - 36-60: Basic skills
      - 61-75: Moderate competency
      - 76-90: Strong ability
      - 91-100: Excellent mastery
      
      Return ONLY a valid JSON object with these scores and nothing else:
      {
        "${categories.join('": number,\n"')}": number,
        "overallScore": number
      }
      `;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an assessment scoring system that returns only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 1000,
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    // Validate scores - ensure all categories have values
    let isValid = true;
    for (const category of categories) {
      if (typeof result[category] !== 'number' || result[category] < 0 || result[category] > 100) {
        isValid = false;
        console.error(`[AI Processing] Invalid score for ${category}: ${result[category]}`);
        result[category] = Math.floor(60 + Math.random() * 20); // Fallback
      }
    }
    
    // Calculate overallScore if needed
    if (!result.overallScore || typeof result.overallScore !== 'number') {
      const categoryScores = categories.map(c => result[c]);
      result.overallScore = Math.round(
        categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length
      );
    }
    
    console.log('[AI Processing] Scores processed successfully:', Object.keys(result).length);
    return result;
  } catch (error) {
    console.error('[AI Processing] Error processing scores:', error);
    return createFallbackScores(assessmentType);
  }
}

// Process recommendations
export async function processRecommendations(responses: any, assessmentType: string) {
  console.log('[AI Processing] Processing recommendations');
  
  try {
    const prompt = `
      Based on these ${assessmentType.toUpperCase()} assessment responses:
      ${JSON.stringify(responses)}
      
      Provide 3-5 specific, actionable recommendations. Each recommendation should include:
      - title: Clear and specific title
      - explanation: Why it's important for career development
      - steps: 3 practical actions with timelines
      
      Return ONLY a valid JSON array of recommendations and nothing else:
      [
        {
          "title": string,
          "explanation": string,
          "steps": [string, string, string]
        }
      ]
      `;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a career assessment system that returns only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500,
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '[]');
    console.log('[AI Processing] Recommendations processed successfully:', result.length);
    return result;
  } catch (error) {
    console.error('[AI Processing] Error processing recommendations:', error);
    return createFallbackRecommendations(assessmentType);
  }
}

// Process strengths
export async function processStrengths(responses: any, assessmentType: string) {
  console.log('[AI Processing] Processing strengths');
  
  try {
    const prompt = `
      Based on these ${assessmentType.toUpperCase()} assessment responses:
      ${JSON.stringify(responses)}
      
      List 3-4 specific strengths with evidence from the responses.
      
      Return ONLY a valid JSON array of strings and nothing else:
      ["strength 1", "strength 2", "strength 3"]
      `;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a career assessment system that returns only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 1000,
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '[]');
    console.log('[AI Processing] Strengths processed successfully:', result.length);
    return result;
  } catch (error) {
    console.error('[AI Processing] Error processing strengths:', error);
    return [
      "Demonstrates self-awareness about career development needs",
      "Takes initiative to assess career readiness",
      "Shows interest in professional growth and advancement"
    ];
  }
}

// Process improvements
export async function processImprovements(responses: any, assessmentType: string) {
  console.log('[AI Processing] Processing improvements');
  
  try {
    const prompt = `
      Based on these ${assessmentType.toUpperCase()} assessment responses:
      ${JSON.stringify(responses)}
      
      List 3-4 critical areas to improve with explanations.
      
      Return ONLY a valid JSON array of strings and nothing else:
      ["improvement 1", "improvement 2", "improvement 3"]
      `;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a career assessment system that returns only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 1000,
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '[]');
    console.log('[AI Processing] Improvements processed successfully:', result.length);
    return result;
  } catch (error) {
    console.error('[AI Processing] Error processing improvements:', error);
    return [
      "Develop more detailed career plans with specific goals",
      "Focus on building core skills aligned with your career path",
      "Expand your professional network in targeted ways"
    ];
  }
}

// Calculate readiness level from score
export function calculateReadinessLevel(score: number): string {
  if (score < 50) return "Early Development";
  if (score < 70) return "Developing Competency";
  if (score < 85) return "Approaching Readiness";
  return "Fully Prepared";
}

// Helper function to get categories
export function getCategories(assessmentType: string): string[] {
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

// Fallback functions
function createFallbackScores(assessmentType: string) {
  const categories = getCategories(assessmentType);
  const scores: Record<string, number> = {};
  
  categories.forEach(category => {
    scores[category] = Math.floor(60 + Math.random() * 20);
  });
  
  const sum = Object.values(scores).reduce((total, score) => total + score, 0);
  scores.overallScore = Math.round(sum / categories.length);
  
  return scores;
}

function createFallbackRecommendations(assessmentType: string) {
  switch (assessmentType.toLowerCase()) {
    case 'fjrl':
      return [
        {
          title: "Strengthen Your Professional Portfolio",
          explanation: "A well-documented portfolio showcases your skills and achievements to potential employers.",
          steps: [
            "Create a comprehensive LinkedIn profile highlighting your education and projects",
            "Develop a personal website or digital portfolio showcasing your work",
            "Request recommendations from professors or internship supervisors"
          ]
        },
        {
          title: "Enhance Interview Skills",
          explanation: "Effective interview performance is crucial for securing your first job.",
          steps: [
            "Research common interview questions in your field and practice responses",
            "Participate in mock interviews through your university career center",
            "Prepare specific examples demonstrating your skills and problem-solving abilities"
          ]
        }
      ];
    // Add cases for other assessment types
    default:
      return [
        {
          title: "Develop a Strategic Career Plan",
          explanation: "A well-defined career plan helps guide your professional development.",
          steps: [
            "Set specific, measurable goals for the next 6, 12, and 24 months",
            "Identify skill gaps and create a learning plan to address them",
            "Schedule regular self-assessments to track your progress"
          ]
        },
        {
          title: "Expand Your Professional Network",
          explanation: "A strong network can provide opportunities, mentorship, and industry insights.",
          steps: [
            "Attend industry conferences and local professional meetups",
            "Connect with professionals in your desired field through LinkedIn",
            "Participate in online forums and communities related to your industry"
          ]
        }
      ];
  }
}