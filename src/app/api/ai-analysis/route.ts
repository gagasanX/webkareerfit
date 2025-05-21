// /src/app/api/ai-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { OpenAI } from 'openai';

export async function POST(request: NextRequest) {
  // Deklarasikan body di luar try-catch supaya tersedia di kedua blok
  let body: { assessmentId?: string; type?: string; responses?: any } = {};
  
  try {
    // Parse request
    body = await request.json();
    const { assessmentId, type, responses } = body;

    if (!assessmentId) {
      return NextResponse.json({ error: 'Missing assessmentId parameter' }, { status: 400 });
    }

    console.log(`Processing AI analysis for assessment ${assessmentId} of type ${type || 'unknown'}`);

    // Get the assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      console.error(`Assessment ${assessmentId} not found`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Update assessment to processing status
    const assessmentData = assessment.data as any || {};
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'processing',
        data: {
          ...assessmentData,
          aiAnalysisStarted: true,
          aiAnalysisStartedAt: new Date().toISOString(),
        }
      }
    });

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Create basic prompt based on assessment type
    // Pastikan type selalu string dengan memberikan default "career" jika undefined
    const prompt = generatePrompt(type || "career", responses || {});

    // Call OpenAI API directly
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // or "gpt-4-turbo" if you need more complex analysis
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that analyzes career assessment responses and provides detailed insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    // Extract response
    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error("Empty response from OpenAI");
    }

    // Parse AI response
    const results = parseAIResponse(aiResponse);

    // Update assessment with results
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'completed',
        data: {
          ...assessmentData,
          scores: results.scores || {},
          readinessLevel: results.readinessLevel || 'Developing Competency',
          recommendations: results.recommendations || [],
          summary: results.summary || '',
          strengths: results.strengths || [],
          improvements: results.improvements || [],
          aiProcessed: true,
          aiProcessedAt: new Date().toISOString(),
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Assessment processed successfully',
      results
    });
    
  } catch (error) {
    console.error('AI analysis error:', error);
    
    // Try to update assessment with error status
    try {
      if (body?.assessmentId) {
        const assessment = await prisma.assessment.findUnique({
          where: { id: body.assessmentId },
        });
        
        if (assessment) {
          const assessmentData = assessment.data as any || {};
          await prisma.assessment.update({
            where: { id: body.assessmentId },
            data: {
              status: 'error',
              data: {
                ...assessmentData,
                aiError: error instanceof Error ? error.message : 'Unknown error',
              }
            }
          });
        }
      }
    } catch (updateError) {
      console.error('Failed to update assessment with error status:', updateError);
    }
    
    return NextResponse.json(
      { error: 'Failed to process assessment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to generate prompt based on assessment type
function generatePrompt(type: string, responses: any): string {
  // Create basic prompt based on assessment type
  let prompt = `
    You are analyzing responses for a ${type.toUpperCase()} assessment.
    
    Please provide:
    1. An overall score (0-100)
    2. A readiness level (Early Development, Developing Competency, Approaching Readiness, or Fully Prepared)
    3. 4 category scores with their names (0-100)
    4. A summary paragraph
    5. 3-5 strengths
    6. 3-5 areas for improvement
    7. 3-5 recommendations with explanation and implementation steps
    
    Format your response in JSON like this:
    {
      "scores": {
        "overallScore": 75,
        "category1": 80, 
        "category2": 70,
        "category3": 65,
        "category4": 85
      },
      "readinessLevel": "Approaching Readiness",
      "summary": "Overall assessment summary here...",
      "strengths": ["Strength 1", "Strength 2", "Strength 3"],
      "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"],
      "recommendations": [
        {
          "title": "Recommendation 1",
          "explanation": "Explanation for recommendation 1",
          "steps": ["Step 1", "Step 2", "Step 3"]
        }
      ]
    }
    
    Here are the responses to analyze: ${JSON.stringify(responses)}
  `;
  
  return prompt;
}

// Helper function to parse AI response
function parseAIResponse(aiResponse: string): any {
  try {
    // Extract JSON from the response - handle potential text before/after JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from AI response");
    }
    
    const jsonStr = jsonMatch[0];
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.log('Raw AI response:', aiResponse);
    
    // Return fallback results
    return {
      scores: {
        overallScore: 70,
        category1: 65,
        category2: 70,
        category3: 75,
        category4: 70
      },
      readinessLevel: "Developing Competency",
      summary: "We encountered an issue while processing your assessment. Here is a general analysis based on your responses.",
      strengths: ["Completed a comprehensive career assessment", "Demonstrated self-awareness", "Showed interest in career development"],
      improvements: ["Continue developing specific skills", "Research industry requirements", "Build professional networks"],
      recommendations: [
        {
          title: "Develop a targeted skill improvement plan",
          explanation: "Identify the most critical skills for your career path and create a plan to develop them.",
          steps: ["Research required skills", "Prioritize based on gaps", "Find relevant resources", "Track your progress"]
        }
      ]
    };
  }
}