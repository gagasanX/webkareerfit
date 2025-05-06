// /src/app/api/assessment/[type]/[id]/initiate-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  try {
    const { type, id } = params;
    console.log(`[Initiate Analysis] Starting for assessment ${id} of type ${type}`);
    
    // 1. Fetch assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });
    
    if (!assessment) {
      console.error(`[Initiate Analysis] Assessment ${id} not found`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    const assessmentData = assessment.data as any || {};
    const responses = assessmentData.responses || assessmentData.answers || {};
    
    // 2. Define chunks based on assessment type
    const chunks = [
      { type: 'scores', status: 'pending' },
      { type: 'recommendations', status: 'pending' },
      { type: 'strengths', status: 'pending' },
      { type: 'improvements', status: 'pending' }
    ];
    
    // 3. Update assessment with chunk info
    await prisma.assessment.update({
      where: { id },
      data: {
        data: {
          ...assessmentData,
          aiAnalysisStarted: true,
          aiProcessing: true,
          processingStartedAt: new Date().toISOString(),
          analysisStatus: 'processing',
          processing_status: 'processing',
          current_chunk: 0,
          total_chunks: chunks.length,
          chunk_results: chunks
        }
      }
    });
    
    // 4. Start processing first chunk asynchronously
    console.log(`[Initiate Analysis] Triggering first chunk processing for ${id}`);
    
    // Use fetch to trigger async processing of first chunk
    // Don't await this to avoid timeout
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://my.kareerfit.com'}/api/assessment/${type}/${id}/process-chunk?chunk=0`, {
      method: 'POST',
    }).catch(err => console.error('Error starting first chunk:', err));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Analysis initiated', 
      totalChunks: chunks.length 
    });
  } catch (error) {
    console.error('[Initiate Analysis] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}