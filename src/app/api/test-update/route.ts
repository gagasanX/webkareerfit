import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Find any assessment to update
    const assessment = await prisma.assessment.findFirst();
    
    if (!assessment) {
      return NextResponse.json({ error: 'No assessment found' }, { status: 404 });
    }
    
    // Try a simple update
    const updated = await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        data: { testUpdate: new Date().toISOString() }
      }
    });
    
    return NextResponse.json({
      message: 'Update test successful',
      assessment: {
        id: updated.id,
        type: updated.type
      }
    });
  } catch (error) {
    console.error('Test update failed:', error);
    return NextResponse.json({ 
      error: 'Test update failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}