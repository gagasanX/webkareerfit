import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ isAffiliate: false }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAffiliate: true }
    });
    
    return NextResponse.json({ 
      isAffiliate: user?.isAffiliate || false 
    });
  } catch (error) {
    console.error('Error checking affiliate status:', error);
    return NextResponse.json({ isAffiliate: false }, { status: 500 });
  }
}