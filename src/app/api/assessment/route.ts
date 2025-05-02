// app/api/assessment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/utils";

// Define valid tier types
type TierType = 'basic' | 'standard' | 'premium';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get the user ID safely using our utility function
    const userId = getUserId(session);
    
    if (!userId) {
      return NextResponse.json({ message: "Invalid user session" }, { status: 401 });
    }

    // Parse JSON data from request
    const data = await request.json();
    const type = data.type as string;
    const tier = data.tier as TierType || 'basic';
    const affiliateCode = data.affiliateCode as string | undefined;
    
    if (!type) {
      return NextResponse.json(
        { message: "Assessment type is required" },
        { status: 400 }
      );
    }

    // Set price based on tier
    const tierPrices: Record<TierType, number> = {
      basic: 50.00,
      standard: 100.00,
      premium: 250.00
    };
    
    const price = tierPrices[tier as TierType] || 50.00;
    
    // Set manualProcessing based on tier (standard and premium use manual processing)
    const manualProcessing = tier === 'standard' || tier === 'premium';

    // Find affiliate user if code provided
    let affiliateId = null;
    if (affiliateCode) {
      const affiliateUser = await prisma.user.findFirst({
        where: { affiliateCode },
      });
      
      if (affiliateUser) {
        affiliateId = affiliateUser.id;
      }
    }

    // Create assessment
    const assessment = await prisma.assessment.create({
      data: {
        type,
        userId: userId,
        tier: tier,
        price: price,
        manualProcessing,
        status: "pending",
        data: { 
          tier,
          affiliateId: affiliateId || null,
        },
      },
    });

    // Create pending payment
    const payment = await prisma.payment.create({
      data: {
        userId: userId,
        amount: price,
        method: "pending",
        status: "pending",
        assessmentId: assessment.id,
      },
    });

    // Return the id as both id and assessmentId to ensure frontend can access it
    return NextResponse.json({
      message: "Assessment created successfully",
      id: assessment.id,
      assessmentId: assessment.id, // Add this for compatibility
      paymentId: payment.id,
      tier: tier,
      price: price,
    });
  } catch (error) {
    console.error("Assessment creation error:", error);
    return NextResponse.json(
      { message: "Error creating assessment", error: String(error) },
      { status: 500 }
    );
  }
}