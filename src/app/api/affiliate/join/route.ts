import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

interface AffiliateApplicationData {
  fullName: string;
  email: string;
  phone: string;
  website?: string;
  socialMedia?: string;
  howPromote: string;
  acceptTerms: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (existingUser.isAffiliate) {
      return NextResponse.json({
        success: true,
        message: 'User is already an affiliate',
        affiliateCode: existingUser.affiliateCode,
        alreadyAffiliate: true
      });
    }
    
    const data: AffiliateApplicationData = await request.json();
    
    if (!data.fullName || !data.email || !data.phone || !data.howPromote || !data.acceptTerms) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    const affiliateCode = `KF-${randomString}`;
    
    console.log(`Creating affiliate for user ${userId} with code ${affiliateCode}`);
    
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          isAffiliate: true,
          affiliateCode: affiliateCode,
        },
      });
      
      await tx.affiliateApplication.create({
        data: {
          userId,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          website: data.website || '',
          socialMedia: data.socialMedia || '',
          howPromote: data.howPromote,
          status: 'approved',
          notes: 'Auto-approved individual affiliate'
        }
      });
      
      const existingStats = await tx.affiliateStats.findUnique({
        where: { userId }
      });
      
      if (!existingStats) {
        await tx.affiliateStats.create({
          data: {
            userId,
            totalReferrals: 0,
            totalEarnings: 0,
            totalPaid: 0,
          }
        });
      }
    });
    
    console.log(`Successfully created affiliate ${affiliateCode} for user ${userId}`);
    
    // 🚀 EXPERT FIX: Return session refresh instruction
    return NextResponse.json({
      success: true,
      message: 'Affiliate registration completed successfully',
      affiliateCode,
      sessionRefresh: true // Signal for client to refresh session
    });
    
  } catch (error) {
    console.error('Error processing affiliate join:', error);
    return NextResponse.json(
      { error: 'Failed to submit affiliate application' },
      { status: 500 }
    );
  }
}