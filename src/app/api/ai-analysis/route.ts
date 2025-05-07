import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Extract request body
    const body = await request.json();
    const { 
      success, 
      assessmentId, 
      results, 
      error, 
      fallbackRecommendations 
    } = body;
    
    console.log(`[Webhook] Received webhook for assessment ${assessmentId}, success: ${success}`);
    
    if (!assessmentId) {
      return NextResponse.json({ error: 'Missing assessmentId parameter' }, { status: 400 });
    }
    
    // Get the assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    
    if (!assessment) {
      console.error(`[Webhook] Assessment ${assessmentId} not found`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    const assessmentData = assessment.data as any || {};
    
    if (success) {
      // Process successful results
      console.log(`[Webhook] Processing successful results for ${assessmentId}`);
      
      // Update assessment with AI results
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
            aiProcessing: false,
            analysisStatus: 'completed',
            processing_status: 'completed',
            microserviceProcessing: false,
            microserviceCompleted: true,
            microserviceCompletedAt: new Date().toISOString()
          }
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Assessment updated successfully with AI results' 
      });
      
    } else {
      // Process error case with fallback
      console.log(`[Webhook] Processing error results with fallback for ${assessmentId}`);
      
      // Update assessment with fallback recommendations
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'completed',
          data: {
            ...assessmentData,
            recommendations: fallbackRecommendations || [],
            aiProcessed: true,
            aiProcessedAt: new Date().toISOString(),
            aiProcessing: false,
            analysisStatus: 'completed',
            processing_status: 'completed',
            microserviceProcessing: false,
            microserviceCompleted: true,
            microserviceCompletedAt: new Date().toISOString(),
            usedFallback: true,
            fallbackReason: error || 'Microservice processing failed'
          }
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Assessment updated with fallback recommendations' 
      });
    }
    
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}