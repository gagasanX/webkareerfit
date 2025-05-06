// File: src/app/api/user/payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Fetch user's payments with assessment details
    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        assessment: {
          select: {
            id: true,
            type: true,
            tier: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error fetching user payments:', error);
    return NextResponse.json(
      { message: 'Failed to fetch payment data' },
      { status: 500 }
    );
  }
}