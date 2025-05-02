import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

// Set Edge runtime for longer execution
export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  console.log('[submit-with-file] Endpoint called with params:', params);
  
  // Check if params exist
  if (!params || typeof params.id !== 'string' || typeof params.type !== 'string') {
    console.error('[submit-with-file] Invalid parameters:', params);
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }
  
  const assessmentId = params.id.trim();
  const assessmentType = params.type.trim();
  
  console.log(`[submit-with-file] Processing assessment ID: "${assessmentId}" of type: "${assessmentType}"`);
  
  try {
    // Find assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { payment: true }
    });
    
    if (!assessment) {
      console.error('[submit-with-file] Assessment not found with ID:', assessmentId);
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
    
    // Parse form data
    const formData = await request.formData();
    
    // Extract form data JSON
    let formDataJson;
    try {
      const formDataField = formData.get('formData');
      if (typeof formDataField !== 'string') {
        return NextResponse.json({ error: 'Invalid form data format' }, { status: 400 });
      }
      formDataJson = JSON.parse(formDataField);
    } catch (error) {
      console.error('[submit-with-file] Error parsing form data:', error);
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
    const isManualProcessing = assessment.tier === 'standard' || 
                              assessment.tier === 'premium' || 
                              assessment.price >= 100;
    
    console.log(`[submit-with-file] Assessment tier: ${assessment.tier}, price: ${assessment.price}, manualProcessing: ${isManualProcessing}`);
    
    if (isManualProcessing) {
      // Update assessment for manual processing
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
        console.log(`[submit-with-file] Premium tier detected, redirecting to: ${redirectUrl}`);
      } else {
        redirectUrl = `/assessment/${assessmentType}/standard-results/${assessmentId}`;
        console.log(`[submit-with-file] Standard tier detected, redirecting to: ${redirectUrl}`);
      }
      
      return NextResponse.json({
        message: 'Assessment submitted for expert review',
        redirectUrl: redirectUrl
      });
    } else {
      // For Basic tier (RM50) - direct AI processing
      console.log('[submit-with-file] Basic tier assessment - preparing for AI analysis');
      
      // First update the assessment to submitted status
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'submitted',
          data: newData
        }
      });
      
      try {
        // Call the AI analysis endpoint directly
        const baseUrl = request.headers.get('origin') || process.env.NEXTAUTH_URL || '';
        console.log(`[submit-with-file] Calling AI analysis API at ${baseUrl}/api/ai-analysis`);
        
        const aiResponse = await fetch(`${baseUrl}/api/ai-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assessmentId,
            type: assessmentType,
            responses: answers,
          }),
        });
        
        if (!aiResponse.ok) {
          console.error(`[submit-with-file] AI analysis API returned error: ${aiResponse.status}`);
          const errorData = await aiResponse.json().catch(() => ({}));
          console.error('[submit-with-file] AI error details:', errorData);
          
          // Even if AI analysis fails, still redirect to processing page
          return NextResponse.json({
            message: 'Assessment submitted, but AI analysis encountered an issue',
            redirectUrl: `/assessment/${assessmentType}/processing/${assessmentId}`
          });
        }
        
        console.log('[submit-with-file] AI analysis initiated successfully');
      } catch (aiError) {
        console.error('[submit-with-file] Error calling AI analysis:', aiError);
        // Continue to redirect to processing page even if initial AI call fails
      }
      
      // Return redirect to processing page
      return NextResponse.json({
        message: 'Assessment submitted successfully',
        redirectUrl: `/assessment/${assessmentType}/processing/${assessmentId}`
      });
    }
  } catch (error) {
    console.error('[submit-with-file] Server error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}