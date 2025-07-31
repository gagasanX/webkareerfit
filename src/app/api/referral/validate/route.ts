import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Code parameter required' }, { status: 400 });
    }

    // Find affiliate by code
    const affiliate = await prisma.user.findFirst({
      where: {
        affiliateCode: code,
        isAffiliate: true
      },
      select: {
        id: true,
        name: true,
        affiliateCode: true
      }
    });

    if (!affiliate) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      affiliateName: affiliate.name || 'KareerFit Partner',
      code: affiliate.affiliateCode
    });

  } catch (error) {
    console.error('Error validating referral code:', error);
    return NextResponse.json(
      { error: 'Failed to validate referral code' },
      { status: 500 }
    );
  }
}