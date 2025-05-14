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
    
    // Define chunks based on assessment type (legacy approach)
    const chunks = [
      { type: 'scores', status: 'pending' },
      { type: 'recommendations', status: 'pending' },
      { type: 'strengths', status: 'pending' },
      { type: 'improvements', status: 'pending' }
    ];
    
    // Update assessment with chunk info
    await prisma.assessment.update({
      where: { id },
      data: {
        data: {
          ...assessmentData,
          microserviceProcessing: false,
          current_chunk: 0,
          total_chunks: chunks.length,
          chunk_results: chunks,
          aiAnalysisStarted: true,
          aiProcessing: true,
          processingStartedAt: new Date().toISOString(),
          analysisStatus: 'processing',
          processing_status: 'processing'
        }
      }
    });
    
    // Application URL for internal processing
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://my.kareerfit.com');
    
    // Start processing first chunk asynchronously (legacy approach)
    fetch(`${appUrl}/api/assessment/${type}/${id}/process-chunk?chunk=0`, {
      method: 'POST',
    }).catch(err => console.error('Error starting first chunk:', err));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Analysis initiated using legacy processing', 
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