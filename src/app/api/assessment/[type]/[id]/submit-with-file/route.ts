// app/api/assessment/[type]/[id]/submit-with-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { saveFormDataWithFile } from '@/lib/upload';

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string, id: string } }
) {
  console.log('Submit endpoint called with params:', params);
  
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
    
    // Parse form data
    const { fields, filePath } = await saveFormDataWithFile(request);
    
    let formData;
    try {
      formData = JSON.parse(fields.formData);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid form data format' }, { status: 400 });
    }
    
    // Extract form components
    const { personalInfo, ...answers } = formData;
    
    // Create a new data object safely
    const newData: Record<string, any> = {};
    
    // Safely add existing data if it exists
    if (assessment.data && typeof assessment.data === 'object') {
      Object.assign(newData, assessment.data as Record<string, any>);
    }
    
    // Add new data
    newData.personalInfo = personalInfo;
    newData.answers = answers;
    newData.resumePath = filePath || null;
    newData.completedAt = new Date().toISOString();
    newData.submittedAt = new Date().toISOString();
    
    // Update assessment
    const updatedAssessment = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'completed',
        data: newData
      }
    });
    
    return NextResponse.json({
      message: 'Assessment submitted successfully',
      redirectTo: `/assessment/${assessmentType}/results/${assessmentId}`
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}