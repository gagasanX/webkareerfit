import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

// Commission structure mapping
const COMMISSION_STRUCTURE = {
  50: 10,   // RM50 -> RM10 commission
  100: 30,  // RM100 -> RM30 commission
  250: 50,  // RM250 -> RM50 commission
};

export async function GET(request: NextRequest) {
  try {
    // Check user authentication and admin permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user is an admin
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Get query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const affiliateType = url.searchParams.get('type') || 'all'; // 'individual', 'institution', 'all'
    
    // Base where clause for affiliates only
    const where: any = {
      isAffiliate: true
    };
    
    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { affiliateCode: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Add affiliate type filter (future enhancement)
    if (affiliateType !== 'all') {
      where.affiliateType = affiliateType;
    }
    
    // Fetch affiliates with stats
    const affiliates = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        affiliateCode: true,
        createdAt: true,
        updatedAt: true,
        affiliateType: true, // Will add this field to schema
        affiliateStats: {
          select: {
            totalReferrals: true,
            totalEarnings: true,
            totalPaid: true
          }
        },
        affiliateTransactions: {
          where: {
            status: 'pending'
          },
          select: {
            amount: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Calculate stats and format data
    const formattedAffiliates = affiliates.map(affiliate => {
      const stats = affiliate.affiliateStats || {
        totalReferrals: 0,
        totalEarnings: 0,
        totalPaid: 0
      };
      
      const pendingPayout = affiliate.affiliateTransactions.reduce(
        (sum, transaction) => sum + transaction.amount, 
        0
      );
      
      const conversionRate = stats.totalReferrals > 0 
        ? (stats.totalEarnings / (stats.totalReferrals * 100)) * 100 
        : 0;
      
      return {
        id: affiliate.id,
        userId: affiliate.id,
        userName: affiliate.name || 'Unknown',
        email: affiliate.email,
        affiliateCode: affiliate.affiliateCode,
        affiliateType: affiliate.affiliateType || 'individual',
        totalReferrals: stats.totalReferrals,
        totalEarnings: stats.totalEarnings,
        conversionRate: Math.round(conversionRate * 100) / 100,
        pendingPayout,
        lastActive: affiliate.updatedAt.toISOString()
      };
    });
    
    // Calculate overall stats
    const totalAffiliates = affiliates.length;
    const totalRevenue = affiliates.reduce((sum, affiliate) => 
      sum + (affiliate.affiliateStats?.totalEarnings || 0), 0
    );
    
    // Get pending applications count
    const pendingApplications = await prisma.affiliateApplication.count({
      where: { status: 'pending' }
    });
    
    const avgConversionRate = formattedAffiliates.length > 0
      ? formattedAffiliates.reduce((sum, affiliate) => sum + affiliate.conversionRate, 0) / formattedAffiliates.length
      : 0;
    
    return NextResponse.json({
      affiliates: formattedAffiliates,
      stats: {
        totalAffiliates,
        totalRevenue,
        pendingApplications,
        conversionRate: Math.round(avgConversionRate * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching affiliates:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching affiliates' },
      { status: 500 }
    );
  }
}

// POST - Create institution affiliate (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check user authentication and admin permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user is an admin
    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      name, 
      email, 
      password, 
      affiliateType = 'institution',
      institutionName,
      contactPerson,
      phone,
      address
    } = body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ 
        message: 'Name, email, and password are required' 
      }, { status: 400 });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json({ 
        message: 'User with this email already exists' 
      }, { status: 400 });
    }
    
    // Generate affiliate code
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    const affiliateCode = `${affiliateType === 'institution' ? 'INST' : 'KF'}-${randomString}`;
    
    // Hash password (you'll need to import bcrypt or your preferred hashing library)
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create institution affiliate user
    const newAffiliate = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isAffiliate: true,
        affiliateCode,
        affiliateType,
        // Add custom fields for institution
        bio: institutionName ? `Institution: ${institutionName}` : null,
        phone: phone || null,
      }
    });
    
    // Create affiliate stats
    await prisma.affiliateStats.create({
      data: {
        userId: newAffiliate.id,
        totalReferrals: 0,
        totalEarnings: 0,
        totalPaid: 0,
      }
    });
    
    // Create affiliate application record for tracking
    await prisma.affiliateApplication.create({
      data: {
        userId: newAffiliate.id,
        fullName: name,
        email,
        phone: phone || '',
        website: '',
        socialMedia: '',
        howPromote: `Institution affiliate created by admin. ${institutionName ? `Institution: ${institutionName}` : ''}`,
        status: 'approved',
        notes: `Created directly by admin as ${affiliateType} affiliate`
      }
    });
    
    return NextResponse.json({
      message: 'Institution affiliate created successfully',
      affiliate: {
        id: newAffiliate.id,
        name: newAffiliate.name,
        email: newAffiliate.email,
        affiliateCode: newAffiliate.affiliateCode,
        affiliateType
      }
    });
  } catch (error) {
    console.error('Error creating institution affiliate:', error);
    return NextResponse.json(
      { message: 'An error occurred while creating the affiliate' },
      { status: 500 }
    );
  }
}

// Helper function to calculate commission based on price
export function calculateCommission(price: number): number {
  const roundedPrice = Math.round(price);
  return COMMISSION_STRUCTURE[roundedPrice as keyof typeof COMMISSION_STRUCTURE] || 0;
}