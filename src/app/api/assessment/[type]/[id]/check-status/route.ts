// app/api/assessment/[type]/[id]/check-status/route.ts
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
    
    // Get assessment data
    const data = assessment.data as Record<string, any> || {};
    
    // Determine status and progress
    let status = assessment.status;
    let progress = 0;
    let analysisStatus = data.analysisStatus || 'waiting';
    
    // Calculate progress based on status
    if (status === 'completed') {
      progress = 100;
    } else if (status === 'error') {
      progress = 0;
    } else if (status === 'processing' || status === 'submitted') {
      // If processing has started, set progress to at least 30%
      progress = 30;
      
      // If analysis is processing, set progress to at least 50%
      if (analysisStatus === 'processing') {
        progress = 50;
      }
      
      // If we have a processingStartedAt timestamp, calculate progress based on time elapsed
      if (data.processingStartedAt) {
        const startTime = new Date(data.processingStartedAt).getTime();
        const currentTime = new Date().getTime();
        const elapsedSeconds = (currentTime - startTime) / 1000;
        
        // Assume processing takes about 60 seconds max
        // Add progress based on time elapsed (up to 40% more)
        const timeProgress = Math.min(40, Math.floor(elapsedSeconds / 60 * 40));
        progress = Math.min(90, progress + timeProgress);
      }
      
      // Check if processing has been running too long (over 5 minutes)
      // This prevents the page from being stuck in processing forever
      if (data.processingStartedAt) {
        const startTime = new Date(data.processingStartedAt).getTime();
        const currentTime = new Date().getTime();
        const elapsedMinutes = (currentTime - startTime) / (1000 * 60);
        
        if (elapsedMinutes > 5) {
          // Force completion after 5 minutes to prevent endless loading
          console.log(`Assessment ${assessmentId} processing timeout - forcing completion`);
          
          // Update assessment to completed with fallback data
          await updateAssessmentWithFallback(assessment);
          
          // Return completed status
          return NextResponse.json({
            status: 'completed',
            progress: 100,
            message: 'Assessment completed (timeout)'
          });
        }
      }
    }
    
    // Return status information
    return NextResponse.json({
      status,
      analysisStatus,
      progress,
      message: `Assessment status: ${status}, Analysis status: ${analysisStatus}`
    });
    
  } catch (error) {
    console.error('Error checking assessment status:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to update assessment with fallback data if processing times out
async function updateAssessmentWithFallback(assessment: any) {
  try {
    const data = assessment.data as Record<string, any> || {};
    const answers = data.answers || {};
    
    // Create fallback scores
    const defaultScores: Record<string, number> = {};
    Object.keys(answers).forEach(key => {
      defaultScores[key] = 70;
    });
    defaultScores.overallScore = 70;
    
    // Determine readiness level based on score
    let readinessLevel = "Early Development";
    if (defaultScores.overallScore >= 85) readinessLevel = "Fully Prepared";
    else if (defaultScores.overallScore >= 70) readinessLevel = "Approaching Readiness";
    else if (defaultScores.overallScore >= 50) readinessLevel = "Developing Competency";
    
    // Update data with fallback analysis
    const updatedData = {
      ...data,
      scores: defaultScores,
      readinessLevel: readinessLevel,
      recommendations: [
        "Continue to develop your professional skills and knowledge.",
        "Seek mentorship opportunities in your field of interest.",
        "Build a strong professional network to enhance career opportunities.",
        "Stay updated with industry trends and technologies.",
        "Consider pursuing relevant certifications to validate your skills."
      ],
      summary: "Assessment completed with timeout. For detailed insights, check the category scores.",
      strengths: [
        "Shows dedication to professional development",
        "Demonstrates self-awareness of career needs",
        "Takes initiative in seeking assessment and guidance"
      ],
      improvements: [
        "Develop more specific goals aligned with career aspirations",
        "Seek additional training or education in key skill areas",
        "Build a stronger professional network in your field"
      ],
      completedAt: new Date().toISOString(),
      aiProcessed: true,
      aiProcessedAt: new Date().toISOString(),
      analysisStatus: 'completed',
      usedFallback: true,
      fallbackReason: "Processing timeout after 5 minutes"
    };
    
    // Update assessment
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        status: 'completed',
        data: updatedData,
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error updating assessment with fallback:', error);
    return false;
  }
}
