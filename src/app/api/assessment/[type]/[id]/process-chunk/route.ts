// /src/app/api/assessment/[type]/[id]/process-chunk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  processScores, 
  processRecommendations, 
  processStrengths, 
  processImprovements 
} from '@/lib/ai-processing';

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  try {
    const { type, id } = params;
    const chunkIndex = parseInt(request.nextUrl.searchParams.get('chunk') || '0');
    
    console.log(`[Process Chunk] Processing chunk ${chunkIndex} for assessment ${id}`);
    
    // 1. Fetch assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });
    
    if (!assessment) {
      console.error(`[Process Chunk] Assessment ${id} not found`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    const assessmentData = assessment.data as any || {};
    const responses = assessmentData.responses || assessmentData.answers || {};
    const chunks = assessmentData.chunk_results || [];
    
    if (chunkIndex >= chunks.length) {
      console.error(`[Process Chunk] Invalid chunk index ${chunkIndex}`);
      return NextResponse.json({ error: 'Invalid chunk index' }, { status: 400 });
    }
    
    // 2. Process chunk based on type
    let result;
    const chunkType = chunks[chunkIndex].type;
    
    console.log(`[Process Chunk] Processing ${chunkType} for assessment ${id}`);
    
    try {
      switch (chunkType) {
        case 'scores':
          result = await processScores(responses, type);
          break;
        case 'recommendations':
          result = await processRecommendations(responses, type);
          break;
        case 'strengths':
          result = await processStrengths(responses, type);
          break;
        case 'improvements':
          result = await processImprovements(responses, type);
          break;
        default:
          throw new Error(`Unknown chunk type: ${chunkType}`);
      }
      
      // 3. Update chunk status and save result
      chunks[chunkIndex].status = 'completed';
      chunks[chunkIndex].result = result;
      chunks[chunkIndex].completedAt = new Date().toISOString();
      
      // 4. Update assessment
      await prisma.assessment.update({
        where: { id },
        data: {
          data: {
            ...assessmentData,
            current_chunk: chunkIndex + 1,
            chunk_results: chunks,
            processing_progress: Math.round(((chunkIndex + 1) / chunks.length) * 100)
          }
        }
      });
      
      // 5. If more chunks, process next chunk asynchronously
      if (chunkIndex + 1 < chunks.length) {
        console.log(`[Process Chunk] Triggering next chunk ${chunkIndex + 1} for ${id}`);
        
        // No await - don't block this request
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://my.kareerfit.com'}/api/assessment/${type}/${id}/process-chunk?chunk=${chunkIndex + 1}`, {
          method: 'POST',
        }).catch(err => console.error(`Error starting chunk ${chunkIndex + 1}:`, err));
      } else {
        // All chunks completed, combine results
        console.log(`[Process Chunk] All chunks completed for ${id}, combining results`);
        
        // No await - don't block this request
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://my.kareerfit.com'}/api/assessment/${type}/${id}/combine-results`, {
          method: 'POST',
        }).catch(err => console.error('Error combining results:', err));
      }
      
      return NextResponse.json({
        success: true,
        message: `Chunk ${chunkIndex} (${chunkType}) processed successfully`,
        nextChunk: chunkIndex + 1,
        isComplete: chunkIndex + 1 >= chunks.length
      });
    } catch (error) {
      console.error(`[Process Chunk] Error processing ${chunkType}:`, error);
      
      // Mark chunk as failed but continue with next chunk
      chunks[chunkIndex].status = 'error';
      chunks[chunkIndex].error = error instanceof Error ? error.message : 'Unknown error';
      
      await prisma.assessment.update({
        where: { id },
        data: {
          data: {
            ...assessmentData,
            current_chunk: chunkIndex + 1,
            chunk_results: chunks
          }
        }
      });
      
      // Try to continue with next chunk despite error
      if (chunkIndex + 1 < chunks.length) {
        console.log(`[Process Chunk] Continuing with next chunk ${chunkIndex + 1} despite error`);
        
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://my.kareerfit.com'}/api/assessment/${type}/${id}/process-chunk?chunk=${chunkIndex + 1}`, {
          method: 'POST',
        }).catch(err => console.error(`Error starting chunk ${chunkIndex + 1}:`, err));
      }
      
      return NextResponse.json({
        success: false,
        error: `Error processing chunk ${chunkIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextChunk: chunkIndex + 1
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Process Chunk] Critical error:', error);
    return NextResponse.json(
      { error: 'Failed to process chunk', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}