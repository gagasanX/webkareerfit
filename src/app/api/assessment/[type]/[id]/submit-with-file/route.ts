// app/api/assessment/[type]/[id]/submit-with-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export const maxDuration = 60; // Use Edge Runtime with longer timeouts

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  console.log('Submit-with-file endpoint called with params:', params);
  
  // Check if params exist
  if (!params || typeof params.id !== 'string' || typeof params.type !== 'string') {
    console.error('Invalid parameters:', params);
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }
  
  const assessmentId = params.id.trim();
  const assessmentType = params.type.trim();
  
  console.log(`Processing assessment ID: "${assessmentId}" of type: "${assessmentType}"`);
  
  try {
    // Find assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { payment: true } // Include payment info to check tier
    });
    
    if (!assessment) {
      console.error('Assessment not found with ID:', assessmentId);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (assessment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    // Parse form data - use multipart form without saving files
    const formData = await request.formData();
    
    let formDataJson;
    try {
      const formDataField = formData.get('formData');
      if (typeof formDataField !== 'string') {
        return NextResponse.json({ error: 'Invalid form data format' }, { status: 400 });
      }
      formDataJson = JSON.parse(formDataField);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid form data format' }, { status: 400 });
    }
    
    // Extract form components
    const { personalInfo, ...answers } = formDataJson;
    
    // Create a new data object safely
    const newData: Record<string, any> = {};
    
    // Safely add existing data if it exists
    if (assessment.data && typeof assessment.data === 'object') {
      Object.assign(newData, assessment.data as Record<string, any>);
    }
    
    // Add new data
    newData.personalInfo = personalInfo;
    newData.answers = answers;
    newData.submittedAt = new Date().toISOString();
    
    // Check if this is a manual processing tier (RM100 or RM250)
    // CRITICAL FIX: Check both tier and price to determine processing path
    const isManualProcessing = assessment.tier === 'standard' || 
                              assessment.tier === 'premium' || 
                              assessment.price >= 100;
                              
    if (isManualProcessing) {
      // Update assessment status to pending_review for manual processing
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'pending_review',
          manualProcessing: true,
          data: newData
        }
      });
      
      // Determine the redirect URL based on tier
      let redirectUrl;
      
      if (assessment.tier === 'premium' || assessment.price >= 250) {
        redirectUrl = `/assessment/${assessmentType}/premium-results/${assessmentId}`;
        console.log(`Premium tier detected, redirecting to: ${redirectUrl}`);
      } else {
        redirectUrl = `/assessment/${assessmentType}/standard-results/${assessmentId}`;
        console.log(`Standard tier detected, redirecting to: ${redirectUrl}`);
      }
      
      return NextResponse.json({
        message: 'Assessment submitted for expert review',
        redirectUrl: redirectUrl
      });
    } else {
      // For Basic tier (RM50) - update to submitted status
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'submitted',
          data: newData
        }
      });
      
      // Return response to user immediately with a special URL for the waiting/loading page
      return NextResponse.json({
        message: 'Assessment submitted successfully',
        redirectUrl: `/assessment/${assessmentType}/processing/${assessmentId}`
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}