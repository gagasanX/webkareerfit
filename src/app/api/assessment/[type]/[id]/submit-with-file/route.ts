// app/api/assessment/[type]/[id]/submit-with-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

// CRITICAL FIX: Proper Next.js 15 async params handling
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string, id: string }> }
) {
  console.log('=== SUBMIT WITH FILE ENDPOINT ===');
  
  try {
    // FIXED: Properly await params for Next.js 15
    const resolvedParams = await params;
    const { type, id } = resolvedParams;
    
    console.log('Submit-with-file endpoint called with params:', { type, id });
    
    if (!type || !id) {
      console.log('Invalid parameters provided');
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    const assessmentId = id;
    const assessmentType = type;
    
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('Authentication failed - no session or user ID');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log(`User authenticated: ${session.user.id}`);
    
    // Get assessment with detailed logging
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { user: true }
    });
    
    if (!assessment) {
      console.log(`Assessment not found: ${assessmentId}`);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    console.log('Assessment found:', {
      id: assessment.id,
      type: assessment.type,
      tier: assessment.tier,
      price: assessment.price,
      manualProcessing: assessment.manualProcessing,
      status: assessment.status,
      userId: assessment.userId
    });
    
    if (assessment.userId !== session.user.id) {
      console.log(`Unauthorized access - assessment belongs to ${assessment.userId}, user is ${session.user.id}`);
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
        console.log('Form data parsed successfully, response count:', Object.keys(responses).length);
      }
    } catch (parseError) {
      console.error('Error parsing form data:', parseError);
      return NextResponse.json({ error: 'Invalid form data format' }, { status: 400 });
    }
    
    // Get any file content (resume) - not saving to filesystem
    const file = formData.get('resume') as File | null;
    let fileContent = '';
    
    if (file) {
      console.log(`File uploaded: ${file.name} (${Math.round(file.size / 1024)} KB)`);
      // Process file in memory
      const buffer = Buffer.from(await file.arrayBuffer());
      fileContent = buffer.toString('utf-8').substring(0, 5000); // Get first 5000 chars only
    } else {
      console.log('No file uploaded');
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
    
    console.log('Assessment updated to submitted status');
    
    // CRITICAL DECISION LOGIC: Manual vs AI Processing
    console.log('=== PROCESSING DECISION LOGIC ===');
    
    // CRITICAL FIX: Simplified tier-based decision
    const isManualProcessing = assessment.tier === 'standard' || 
                              assessment.tier === 'premium' || 
                              assessment.manualProcessing === true;
    
    console.log('Manual processing check:', {
      tier: assessment.tier,
      price: assessment.price,
      manualProcessingFlag: assessment.manualProcessing,
      finalDecision: isManualProcessing
    });
    
    // MANUAL PROCESSING PATH (RM100 and RM250)
    if (isManualProcessing) {
      console.log(`=== MANUAL PROCESSING PATH ===`);
      console.log(`Assessment ${assessmentId} is for manual processing - tier: ${assessment.tier}, price: ${assessment.price}`);
      
      // Update status for manual processing
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { 
          status: 'pending_review',
          manualProcessing: true
        }
      });
      
      console.log('Assessment status updated to pending_review');
      
      // CRITICAL FIX: Tier-based redirect URL determination
      let redirectUrl;
      
      if (assessment.tier === 'premium') {
        redirectUrl = `/assessment/${assessmentType}/premium-results/${assessmentId}`;
        console.log(`PREMIUM tier detected → redirecting to: ${redirectUrl}`);
      } else if (assessment.tier === 'standard') {
        redirectUrl = `/assessment/${assessmentType}/standard-results/${assessmentId}`;
        console.log(`STANDARD tier detected → redirecting to: ${redirectUrl}`);
      } else {
        // Fallback - shouldn't happen but just in case
        redirectUrl = `/assessment/${assessmentType}/standard-results/${assessmentId}`;
        console.log(`FALLBACK for manual processing → redirecting to: ${redirectUrl}`);
      }
      
      const response = {
        success: true,
        message: 'Assessment submitted for expert review',
        redirectUrl: redirectUrl,
        debug: {
          tier: assessment.tier,
          price: assessment.price,
          manualProcessing: true,
          redirectReason: assessment.tier === 'premium' ? 'premium' : 'standard'
        }
      };
      
      console.log('Sending manual processing response:', response);
      return NextResponse.json(response);
    }
    
    // AI PROCESSING PATH (RM50 Basic)
    console.log(`=== AI PROCESSING PATH ===`);
    console.log(`Assessment ${assessmentId} is for AI processing - tier: ${assessment.tier}, price: ${assessment.price}`);
    
    const redirectUrl = `/assessment/${assessmentType}/processing/${assessmentId}`;
    
    const response = {
      success: true, 
      message: 'Assessment submitted for AI processing',
      redirectUrl: redirectUrl,
      debug: {
        tier: assessment.tier,
        price: assessment.price,
        manualProcessing: false,
        redirectReason: 'ai_processing'
      }
    };
    
    console.log('Sending AI processing response:', response);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('=== SUBMIT ERROR ===');
    console.error('Server error:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}