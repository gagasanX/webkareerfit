import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import axios from 'axios';

// Microservice URL from environment variables
const PROCESSOR_URL = process.env.ASSESSMENT_PROCESSOR_URL || 'https://processor.kareerfit.com';

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
    
    // 2. Update assessment status to processing
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
          microserviceProcessing: true
        }
      }
    });
    
    // 3. Application URL for webhook callback
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://my.kareerfit.com');
    
    // 4. Send assessment data to microservice for processing
    try {
      console.log(`[Initiate Analysis] Sending to microservice: ${PROCESSOR_URL}`);
      
      const response = await axios.post(`${PROCESSOR_URL}/api/process-assessment`, {
        assessmentId: id,
        assessmentType: type,
        data: responses,
        webhookUrl: `${appUrl}/api/webhook/ai-analysis`
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.PROCESSOR_API_KEY || ''
        },
        timeout: 8000 // 8 seconds timeout to respect Vercel limits
      });
      
      console.log(`[Initiate Analysis] Microservice response:`, response.data);
      
      // 5. Update assessment with microservice processing ID (if provided)
      if (response.data.processingId) {
        await prisma.assessment.update({
          where: { id },
          data: {
            data: {
              ...assessmentData,
              microserviceProcessingId: response.data.processingId
            }
          }
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Analysis initiated on external processor',
        processingId: response.data.processingId || null
      });
      
    } catch (microserviceError) {
      console.error(`[Initiate Analysis] Microservice error:`, microserviceError);
      
      // 6. Fallback to legacy chunking method if microservice fails
      console.log(`[Initiate Analysis] Microservice failed, falling back to legacy chunking`);
      
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
            microserviceError: microserviceError instanceof Error ? microserviceError.message : 'Unknown error',
            current_chunk: 0,
            total_chunks: chunks.length,
            chunk_results: chunks
          }
        }
      });
      
      // Start processing first chunk asynchronously (legacy approach)
      fetch(`${appUrl}/api/assessment/${type}/${id}/process-chunk?chunk=0`, {
        method: 'POST',
      }).catch(err => console.error('Error starting first chunk:', err));
      
      return NextResponse.json({ 
        success: true, 
        message: 'Microservice unavailable, falling back to legacy processing', 
        totalChunks: chunks.length,
        usingFallback: true
      });
    }
    
  } catch (error) {
    console.error('[Initiate Analysis] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}