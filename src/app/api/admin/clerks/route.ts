// src/app/api/admin/clerks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerks = await prisma.user.findMany({
      where: { 
        isClerk: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        isClerk: true,
        role: true
      }
    });

    return NextResponse.json({ clerks });
  } catch (error) {
    console.error('Error fetching clerks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clerks' },
      { status: 500 }
    );
  }
}