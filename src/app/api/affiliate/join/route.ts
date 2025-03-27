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
      return NextResponse.json(
        { error: 'User is already an affiliate' },
        { status: 400 }
      );
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
    
    // Step 1: Update user to be an affiliate
    await prisma.user.update({
      where: { id: userId },
      data: {
        isAffiliate: true,
        affiliateCode: affiliateCode,
      },
    });
    
    // Step 2: Create affiliate application record - using direct SQL for reliability
    try {
      await prisma.$executeRaw`
        INSERT INTO "AffiliateApplication" (
          "id", "createdAt", "updatedAt", "userId", "fullName", 
          "email", "phone", "website", "socialMedia", "howPromote", "status"
        ) 
        VALUES (
          ${crypto.randomUUID()}, ${new Date()}, ${new Date()}, 
          ${userId}, ${data.fullName}, ${data.email}, 
          ${data.phone}, ${data.website || null}, ${data.socialMedia || null}, 
          ${data.howPromote}, 'pending'
        )
      `;
    } catch (appError) {
      // Non-critical: continue even if this fails
      console.error('Error creating application record:', appError);
    }
    
    // Step 3: Create or update affiliate stats
    try {
      const existingStats = await prisma.affiliateStats.findUnique({
        where: { userId }
      });
      
      if (existingStats) {
        // Stats already exist, no need to create
      } else {
        // Create new stats record
        await prisma.affiliateStats.create({
          data: {
            userId,
            totalReferrals: 0,
            totalEarnings: 0,
            totalPaid: 0,
          }
        });
      }
    } catch (statsError) {
      // Non-critical: continue even if this fails
      console.error('Error creating affiliate stats:', statsError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Affiliate application submitted successfully',
      affiliateCode
    });
    
  } catch (error) {
    console.error('Error processing affiliate join:', error);
    return NextResponse.json(
      { error: 'Failed to submit affiliate application' },
      { status: 500 }
    );
  }
}