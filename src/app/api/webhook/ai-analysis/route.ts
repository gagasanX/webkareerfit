// src/app/api/webhook/ai-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Extract request data
    const data = await request.json();
    
    // Validate required fields
    if (!data.assessmentId || !data.analysisResult) {
      console.error('[Webhook] Missing required fields', data);
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { assessmentId, analysisResult, secret } = data;
    
    // Security check - verify webhook is from Make.com
    const webhookSecret = process.env.MAKE_WEBHOOK_SECRET;
    if (webhookSecret && secret !== webhookSecret) {
      console.error('[Webhook] Invalid webhook secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch the assessment to get existing data
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    
    if (!assessment) {
      console.error(`[Webhook] Assessment ${assessmentId} not found`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    console.log(`[Webhook] Received analysis for assessment ${assessmentId}`);
    
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
          aiProcessed: true,
          aiProcessedAt: new Date().toISOString(),
          aiAnalysisStarted: true,
          aiProcessing: false,
          analysisStatus: 'completed'
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'AI analysis results saved successfully'
    });
  } catch (error) {
    console.error('[Webhook] Error processing AI analysis webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}