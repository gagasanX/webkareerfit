// app/api/ai-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { openai } from '@/lib/openai';

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

    // Create prompt for OpenAI with enhanced recommendation instructions
    const prompt = `
You are analyzing a ${assessmentType.toUpperCase()} career assessment for a professional.

User Information:
- Job Position: ${personalInfo?.jobPosition || 'Not specified'}
- Qualification: ${personalInfo?.qualification || 'Not specified'}

Assessment Responses:
${formattedAnswers}

Provide a detailed professional analysis with:

1. SCORES: Score each assessment category on a scale of 0-100, where higher scores indicate better readiness.
   - Be critical and nuanced in scoring based on the specific responses
   - Vary the scores meaningfully to reflect actual strengths and weaknesses

2. OVERALL SCORE: Calculate an overall score as a weighted average of the categories.

3. DETAILED RECOMMENDATIONS: Provide 5 specific, actionable recommendations tailored to their responses. For each recommendation:
   - Write a clear, concise title for the recommendation
   - Provide a detailed explanation of why this recommendation is important for this specific person
   - Include 2-3 practical implementation steps for how they can actually accomplish this recommendation

4. SUMMARY: Write a brief, insightful summary of their career readiness (2-3 sentences).

5. STRENGTHS: List 3-4 specific strengths based on their responses.

6. IMPROVEMENTS: List 3-4 specific areas for improvement.

Format your response as a valid JSON object with these keys:
{
  "scores": { 
    "categoryName1": score, 
    "categoryName2": score, 
    "overallScore": number 
  },
  "recommendations": [
    {
      "title": "Clear actionable recommendation title",
      "explanation": "Detailed explanation of why this is important for this person",
      "steps": ["Step 1 to implement this recommendation", "Step 2", "Step 3"]
    },
    ...more recommendations
  ],
  "summary": "Insightful summary here",
  "strengths": ["specific strength 1", "specific strength 2", ...],
  "improvements": ["improvement area 1", "improvement area 2", ...]
}
`;

    console.log('Sending request to OpenAI...');
    
    // Call OpenAI API with increased token limit
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are a professional career assessment analyzer with expertise in providing personalized, actionable insights. You always give critical but constructive feedback with detailed, practical implementation guidance."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 3000 // Increased from 2000 to 3000
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
            aiProcessed: true,
            aiProcessedAt: new Date().toISOString()
          }
        }
      });
      
      console.log(`Assessment ${assessmentId} updated with enhanced AI analysis`);
      
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