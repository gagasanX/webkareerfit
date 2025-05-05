// app/api/assessment/[type]/[id]/submit-with-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { getOpenAIInstance, isOpenAIConfigured } from '@/lib/openai';

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  console.log('Submit-with-file endpoint called with params:', params);
  
  if (!params || !params.id || !params.type) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }
  
  const assessmentId = params.id;
  const assessmentType = params.type;
  
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { user: true }
    });
    
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    if (assessment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    // Parse form data directly in memory
    const formData = await request.formData();
    let formDataContent = '';
    let responses = {};
    
    try {
      // Get form data JSON
      const formDataJson = formData.get('formData');
      if (formDataJson && typeof formDataJson === 'string') {
        const parsedData = JSON.parse(formDataJson);
        responses = parsedData;
        formDataContent = formDataJson;
      }
    } catch (parseError) {
      console.error('Error parsing form data:', parseError);
      return NextResponse.json({ error: 'Invalid form data format' }, { status: 400 });
    }
    
    // Get any file content (resume) - not saving to filesystem
    const file = formData.get('resume') as File | null;
    let fileContent = '';
    
    if (file) {
      // Process file in memory
      const buffer = Buffer.from(await file.arrayBuffer());
      fileContent = buffer.toString('utf-8').substring(0, 5000); // Get first 5000 chars only
    }
    
    // Update assessment with submitted data
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'submitted',
        data: {
          ...(assessment.data as Record<string, any> || {}),
          responses,
          submittedAt: new Date().toISOString(),
          hasFileContent: !!fileContent,
          analysisStatus: 'pending'
        }
      }
    });
    
    // CRITICAL: Check if assessment is for manual or AI processing based on tier
    const isManualProcessing = 
      assessment.tier === 'standard' || 
      assessment.tier === 'premium' || 
      assessment.price >= 100;
    
    // IMPORTANT: For manual processing tiers, NO AI processing is needed
    if (isManualProcessing) {
      console.log(`Assessment ${assessmentId} is for manual processing - tier: ${assessment.tier}`);
      
      // Update status for manual processing
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { 
          status: 'pending_review',
          manualProcessing: true
        }
      });
      
      // Determine redirect URL based on tier
      let redirectUrl;
      if (assessment.tier === 'premium' || assessment.price >= 250) {
        redirectUrl = `/assessment/${assessmentType}/premium-results/${assessmentId}`;
      } else {
        redirectUrl = `/assessment/${assessmentType}/standard-results/${assessmentId}`;
      }
      
      return NextResponse.json({
        success: true,
        message: 'Assessment submitted for expert review',
        redirectUrl: redirectUrl
      });
    }
    
    // For basic tier (RM50), do AI processing in a separate endpoint
    // Just return success and redirect to processing page
    console.log(`Assessment ${assessmentId} is for AI processing - tier: ${assessment.tier}`);
    
    return NextResponse.json({
      success: true, 
      message: 'Assessment submitted for AI processing',
      redirectUrl: `/assessment/${assessmentType}/processing/${assessmentId}`
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}