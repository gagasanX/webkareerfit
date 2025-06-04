// app/api/assessment/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/utils";

type TierType = 'basic' | 'standard' | 'premium';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('Assessment creation failed: No session');
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    const userId = getUserId(session);
    if (!userId) {
      console.log('Assessment creation failed: Invalid user ID');
      return NextResponse.json({ message: "Invalid user session" }, { status: 401 });
    }

    // Parse JSON data from request
    const data = await request.json();
    console.log('Assessment creation request data:', data);
    
    const type = data.type as string;
    const requestedTier = data.tier as TierType;
    const affiliateCode = data.affiliateCode as string | undefined;
    
    if (!type) {
      console.log('Assessment creation failed: No assessment type provided');
      return NextResponse.json(
        { message: "Assessment type is required" },
        { status: 400 }
      );
    }

    // Validate and normalize tier
    const validTiers: TierType[] = ['basic', 'standard', 'premium'];
    const tier: TierType = validTiers.includes(requestedTier) ? requestedTier : 'basic';
    
    if (requestedTier && !validTiers.includes(requestedTier)) {
      console.warn(`Invalid tier requested: ${requestedTier}, defaulting to basic`);
    }

    // CRITICAL: Explicitly set manualProcessing and prices
    const tierConfig = {
      'basic': { price: 50, manualProcessing: false },
      'standard': { price: 100, manualProcessing: true },
      'premium': { price: 250, manualProcessing: true }
    };
    
    const config = tierConfig[tier];
    const price = config.price;
    const manualProcessing = config.manualProcessing;
    
    console.log(`Creating assessment with config:`, {
      type,
      tier,
      price,
      manualProcessing,
      userId,
      requestedTier
    });

    // Find affiliate user if code provided
    let affiliateId = null;
    if (affiliateCode) {
      try {
        const affiliateUser = await prisma.user.findFirst({
          where: { affiliateCode },
        });
        
        if (affiliateUser) {
          affiliateId = affiliateUser.id;
          console.log(`Affiliate found: ${affiliateUser.id} for code: ${affiliateCode}`);
        } else {
          console.log(`No affiliate found for code: ${affiliateCode}`);
        }
      } catch (affiliateError) {
        console.error('Error finding affiliate:', affiliateError);
        // Continue without affiliate - don't fail the assessment creation
      }
    }

    // Create assessment with explicit values
    const assessmentData = {
      type,
      userId,
      tier,
      price,
      manualProcessing,
      status: "pending" as const,
      data: { 
        tier,
        price,
        manualProcessing,
        affiliateId: affiliateId || null,
        createdAt: new Date().toISOString(),
        packageType: tier // Additional field for clarity
      },
    };

    console.log('Creating assessment with data:', assessmentData);

    const assessment = await prisma.assessment.create({
      data: assessmentData,
    });

    console.log('Assessment created in database:', {
      id: assessment.id,
      type: assessment.type,
      tier: assessment.tier,
      price: assessment.price,
      manualProcessing: assessment.manualProcessing,
      status: assessment.status
    });

    // Create pending payment
    const paymentData = {
      userId,
      amount: price,
      method: "pending" as const,
      status: "pending" as const,
      assessmentId: assessment.id,
    };

    console.log('Creating payment with data:', paymentData);

    const payment = await prisma.payment.create({
      data: paymentData,
    });

    console.log('Payment created:', {
      id: payment.id,
      amount: payment.amount,
      assessmentId: payment.assessmentId
    });

    // Verify the created assessment by fetching it back
    const verifyAssessment = await prisma.assessment.findUnique({
      where: { id: assessment.id },
      select: {
        id: true,
        type: true,
        tier: true,
        price: true,
        manualProcessing: true,
        status: true
      }
    });

    console.log('Verification - Assessment in DB:', verifyAssessment);

    // Return comprehensive response
    const response = {
      message: "Assessment created successfully",
      id: assessment.id,
      assessmentId: assessment.id, // Compatibility
      paymentId: payment.id,
      type: assessment.type,
      tier: assessment.tier,
      price: assessment.price,
      manualProcessing: assessment.manualProcessing,
      status: assessment.status,
      // Debug info (remove in production)
      debug: {
        requestedTier,
        finalTier: tier,
        configUsed: config,
        verification: verifyAssessment
      }
    };

    console.log('Sending response:', response);

    return NextResponse.json(response);
    
  } catch (error) {
    console.error("Assessment creation error:", error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json(
      { 
        message: "Error creating assessment", 
        error: error instanceof Error ? error.message : String(error),
        // Include some debug info (remove in production)
        debug: {
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.constructor.name : typeof error
        }
      },
      { status: 500 }
    );
  }
}