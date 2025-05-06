// app/api/assessment/[type]/[id]/check-status/route.ts - UPDATED for chunk progress
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  try {
    // Check if params exist
    if (!params || typeof params.id !== 'string' || typeof params.type !== 'string') {
      console.error('Invalid parameters:', params);
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    const assessmentId = params.id.trim();
    
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Find assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    
    if (!assessment) {
      console.error('Assessment not found with ID:', assessmentId);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    if (assessment.userId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    // Check if this is a manual processing assessment
    if (assessment.manualProcessing || 
        assessment.tier === 'standard' || 
        assessment.tier === 'premium' || 
        assessment.price >= 100) {
      
      // For manual processing assessments, return appropriate status
      return NextResponse.json({
        status: assessment.status,
        manualProcessing: true,
        progress: assessment.status === 'completed' ? 100 : 50,
        redirectUrl: assessment.tier === 'premium' || assessment.price >= 250
          ? `/assessment/${params.type}/premium-results/${assessmentId}`
          : `/assessment/${params.type}/standard-results/${assessmentId}`
      });
    }
    
    // Get assessment data
    const data = assessment.data as Record<string, any> || {};
    
    // Determine status and progress
    let status = assessment.status;
    let progress = 0;
    let analysisStatus = data.analysisStatus || 'waiting';
    
    // Check for chunked processing data
    const totalChunks = data.total_chunks || 0;
    const currentChunk = data.current_chunk || 0;
    const processingProgress = data.processing_progress || 0;
    
    // Calculate progress based on status
    if (status === 'completed' || analysisStatus === 'completed') {
      progress = 100;
      status = 'completed';
      analysisStatus = 'completed';
    } else if (status === 'error' || analysisStatus === 'error') {
      progress = 0;
      status = 'error';
    } else if (status === 'processing' || status === 'submitted' || 
               analysisStatus === 'processing' || analysisStatus === 'pending') {
      
      // If we have chunk data, use that for progress calculation
      if (totalChunks > 0) {
        progress = Math.round((currentChunk / totalChunks) * 80) + 10; // 10% start, max 90%
        console.log(`Calculated progress from chunks: ${progress}% (${currentChunk}/${totalChunks})`);
      } else if (processingProgress > 0) {
        // Use processingProgress if available
        progress = processingProgress;
        console.log(`Using explicit processing progress: ${progress}%`);
      } else {
        // If processing has started, set progress to at least 30%
        progress = 30;
        
        // If analysis is processing, set progress to at least 50%
        if (analysisStatus === 'processing') {
          progress = 50;
        }
        
        // If we have a processingStartedAt timestamp, calculate progress based on time elapsed
        if (data.processingStartedAt || data.aiProcessingStarted) {
          const startTime = new Date(data.processingStartedAt || data.aiProcessingStarted).getTime();
          const currentTime = new Date().getTime();
          const elapsedSeconds = (currentTime - startTime) / 1000;
          
          // Assume processing takes about 60 seconds max
          // Add progress based on time elapsed (up to 40% more)
          const timeProgress = Math.min(40, Math.floor(elapsedSeconds / 60 * 40));
          progress = Math.min(90, progress + timeProgress);
        }
      }
      
      // Check if processing has been running too long (over 5 minutes)
      // This prevents the page from being stuck in processing forever
      if (data.processingStartedAt || data.aiProcessingStarted) {
        const startTime = new Date(data.processingStartedAt || data.aiProcessingStarted).getTime();
        const currentTime = new Date().getTime();
        const elapsedMinutes = (currentTime - startTime) / (1000 * 60);
        
        if (elapsedMinutes > 5) {
          console.log(`Assessment ${assessmentId} processing timeout - force trigger combine-results`);
          
          // Force combine results to complete assessment
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://my.kareerfit.com'}/api/assessment/${params.type}/${assessmentId}/combine-results`, {
            method: 'POST',
          }).catch(err => console.error('Error triggering combine-results:', err));
          
          // Return in-process status for now - next check should show completed
          return NextResponse.json({
            status: 'processing',
            analysisStatus: 'processing',
            progress: 95,
            message: 'Finalizing assessment (timeout)'
          });
        }
      }
    }
    
    // If the assessment needs processing, start it
    if ((analysisStatus === 'waiting' || analysisStatus === 'pending') && 
        status !== 'completed' && 
        !data.aiProcessing) {
      
      try {
        // Initiate AI processing without waiting for response
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://my.kareerfit.com'}/api/ai-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assessmentId,
            type: params.type,
            responses: data.responses || {}
          }),
        })
        .then(res => console.log('AI analysis initiated:', res.status))
        .catch(err => console.error('Error initiating AI analysis:', err));
        
        // Update status to processing
        await prisma.assessment.update({
          where: { id: assessmentId },
          data: {
            data: {
              ...data,
              aiAnalysisStarted: true,
              aiProcessing: true,
              processingStartedAt: new Date().toISOString(),
              analysisStatus: 'processing'
            }
          }
        });
        
        analysisStatus = 'processing';
        progress = 30;
      } catch (processError) {
        console.error('Error initiating AI analysis:', processError);
      }
    }
    
    // Include chunk information in response if available
    const response: any = {
      status,
      analysisStatus,
      progress,
      message: `Assessment status: ${status}, Analysis status: ${analysisStatus}`
    };
    
    if (totalChunks > 0) {
      response.chunkProgress = {
        current: currentChunk,
        total: totalChunks,
        percent: Math.round((currentChunk / totalChunks) * 100)
      };
    }
    
    // Return status information
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error checking assessment status:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}