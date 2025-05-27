import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

// Define interface for application data
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
    // Get session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Check if user is already an affiliate
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
    
    // Parse request data
    const data: AffiliateApplicationData = await request.json();
    
    // Validate required fields
    if (!data.fullName || !data.email || !data.phone || !data.howPromote || !data.acceptTerms) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Generate affiliate code
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    const affiliateCode = `KF-${randomString}`;
    
    console.log(`Creating affiliate for user ${userId} with code ${affiliateCode}`);
    
    // Transaction to ensure all operations succeed together
    await prisma.$transaction(async (tx) => {
      // Step 1: Update user to be an affiliate
      await tx.user.update({
        where: { id: userId },
        data: {
          isAffiliate: true,
          affiliateCode: affiliateCode,
        },
      });
      
      // Step 2: Create affiliate application record
      await tx.affiliateApplication.create({
        data: {
          userId,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          website: data.website || '',
          socialMedia: data.socialMedia || '',
          howPromote: data.howPromote,
          status: 'approved', // Auto approve for now
          notes: 'Auto-approved individual affiliate'
        }
      });
      
      // Step 3: Create affiliate stats record
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
    
    return NextResponse.json({
      success: true,
      message: 'Affiliate registration completed successfully',
      affiliateCode,
      requiresRefresh: true // Signal that session needs refresh
    });
    
  } catch (error) {
    console.error('Error processing affiliate join:', error);
    return NextResponse.json(
      { error: 'Failed to submit affiliate application' },
      { status: 500 }
    );
  }
}