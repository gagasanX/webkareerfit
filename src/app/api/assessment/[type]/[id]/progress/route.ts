// /src/app/api/assessment/[type]/[id]/progress/route.ts
// ✅ MISSING PROGRESS ENDPOINT - SIMPLE VERSION

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string, id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { type, id } = resolvedParams;

    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id }
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (assessment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const data = assessment.data as Record<string, any> || {};

    // ✅ SIMPLE PROGRESS RESPONSE
    const progress = {
      completed: assessment.status === 'completed' || data.aiProcessed === true,
      progress: assessment.status === 'completed' ? 100 : 
                data.aiProcessed === true ? 100 :
                data.aiAnalysisStarted === true ? 75 : 25,
      hasResume: !!(data.extractedText || data.resumeText),
      status: assessment.status,
      aiProcessed: data.aiProcessed || false,
      aiAnalysisStarted: data.aiAnalysisStarted || false,
      aiError: data.aiError || null
    };

    return NextResponse.json(progress);
    
  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    );
  }
}