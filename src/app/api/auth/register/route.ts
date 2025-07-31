import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email/sendWelcomeEmail';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password, referralCode } = await request.json();
    
    console.log('Registration request:', { name, email, phone, referralCode });

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // VALIDATE REFERRAL CODE IF PROVIDED
    let referredBy = null;
    let affiliateUser = null;
    
    if (referralCode && referralCode.trim()) {
      affiliateUser = await prisma.user.findFirst({
        where: {
          affiliateCode: referralCode.trim(),
          isAffiliate: true
        }
      });

      if (affiliateUser) {
        referredBy = referralCode.trim();
        console.log(`Valid referral code ${referralCode} from affiliate ${affiliateUser.id}`);
      } else {
        console.log(`Invalid referral code: ${referralCode}`);
        // Don't fail registration, just ignore invalid code
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        referredBy: referredBy,
        role: 'USER'
      }
    });

    // CREATE REFERRAL RECORD IF VALID REFERRAL
    if (affiliateUser && referredBy) {
      try {
        await prisma.referral.create({
          data: {
            affiliateId: affiliateUser.id,
            userName: name,
            email: email,
            status: 'pending', // Will become 'completed' when they purchase assessment
            commission: 0 // Will be calculated when they make purchase
          }
        });

        // Update affiliate stats
        await prisma.affiliateStats.upsert({
          where: { userId: affiliateUser.id },
          update: {
            totalReferrals: { increment: 1 }
          },
          create: {
            userId: affiliateUser.id,
            totalReferrals: 1,
            totalEarnings: 0,
            totalPaid: 0
          }
        });

        console.log(`Created referral record for affiliate ${affiliateUser.id}`);
      } catch (referralError) {
        console.error('Error creating referral record:', referralError);
        // Don't fail user registration if referral creation fails
      }
    }

    console.log('User created successfully:', {
      id: user.id,
      email: user.email,
      hasReferral: !!referredBy,
      referredBy: referredBy
    });

    // 🚀 SEND WELCOME EMAIL - FIX: Handle null username
    sendWelcomeEmail({
      userName: user.name || 'Valued User', // Provide fallback for null
      userEmail: user.email,
      hasReferral: !!referredBy
    }).catch((emailError) => {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      hasReferral: !!referredBy,
      referralMessage: referredBy 
        ? `Welcome! You were referred by one of our partners. You'll receive special benefits on your first assessment.`
        : null
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create user. Please try again.' },
      { status: 500 }
    );
  }
}
