import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // This will trigger the JWT callback with trigger: "update"
    // which will fetch fresh data from database
    return NextResponse.json({ 
      success: true, 
      message: 'Session refresh triggered' 
    });
    
  } catch (error) {
    console.error('Error refreshing session:', error);
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    );
  }
}