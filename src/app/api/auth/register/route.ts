import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateReferralCode } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const { name, email, phone, password, referralCode } = await request.json();

    console.log('Registration request:', { name, email, phone, referralCode });

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Nama, email, dan kata laluan diperlukan" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email telah digunakan" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);
    
    // Generate affiliate code for this user (everyone gets one for potential future use)
    const userAffiliateCode = generateReferralCode();

    // Prepare user data
    const userData: any = {
      name,
      email,
      phone: phone || "",
      password: hashedPassword,
      affiliateCode: userAffiliateCode,
    };

    // Handle referral code if provided
    let referringAffiliate = null;
    if (referralCode && referralCode.trim()) {
      console.log('Processing referral code:', referralCode);
      
      try {
        // Find the affiliate with this code
        const affiliate = await prisma.user.findUnique({
          where: { 
            affiliateCode: referralCode.trim(),
            isAffiliate: true 
          },
          select: {
            id: true,
            name: true,
            email: true,
            affiliateCode: true
          }
        });
        
        if (affiliate) {
          userData.referredBy = referralCode.trim();
          referringAffiliate = affiliate;
          console.log(`User ${email} referred by affiliate ${affiliate.name} (${affiliate.id})`);
        } else {
          console.log('Invalid or inactive referral code:', referralCode);
          // Don't fail registration, just log the invalid code
        }
      } catch (referralError) {
        console.error('Error processing referral code:', referralError);
        // Don't fail registration due to referral processing error
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: userData,
    });

    // Create affiliate stats for this user (for potential future affiliate use)
    await prisma.affiliateStats.create({
      data: {
        userId: user.id,
        totalReferrals: 0,
        totalEarnings: 0,
        totalPaid: 0,
      },
    });

    console.log('User created successfully:', {
      id: user.id,
      email: user.email,
      hasReferral: !!user.referredBy,
      referredBy: user.referredBy
    });

    // Log referral success
    if (referringAffiliate) {
      console.log(`✅ Referral successful: ${user.email} referred by ${referringAffiliate.name} (${referringAffiliate.affiliateCode})`);
    }

    return NextResponse.json({
      message: "Akaun telah berjaya didaftarkan",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hasReferral: !!user.referredBy,
        referralInfo: referringAffiliate ? {
          affiliateName: referringAffiliate.name,
          affiliateCode: referringAffiliate.affiliateCode
        } : null
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Terdapat ralat semasa pendaftaran" },
      { status: 500 }
    );
  }
}