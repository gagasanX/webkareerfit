import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('[Webhook] Received AI analysis webhook');
    
    // Extract request data
    const data = await request.json();
    console.log('[Webhook] Payload received:', JSON.stringify(data).substring(0, 200) + '...');
    
    // Validate required fields
    if (!data.assessmentId) {
      console.error('[Webhook] Missing assessmentId');
      return NextResponse.json({ error: 'Missing assessmentId' }, { status: 400 });
    }

    const { assessmentId } = data;
    
    // Fetch the assessment to get existing data
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    
    if (!assessment) {
      console.error(`[Webhook] Assessment ${assessmentId} not found`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    console.log(`[Webhook] Processing analysis for assessment ${assessmentId}`);
    
    // We're no longer using the microservice processor, so just acknowledge the webhook
    return NextResponse.json({
      success: true,
      message: 'Webhook received, but using legacy processing instead'
    });
  } catch (error) {
    console.error('[Webhook] Error processing AI analysis webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}