// app/api/assessment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/utils";

// Define valid tier types
type TierType = 'basic' | 'standard' | 'premium';

// Define assessment data interface for type safety
interface AssessmentData {
  tier?: string;
  affiliateId?: string | null;
  questionnaire_completed?: boolean;
  responses?: Record<string, any>;
  submittedAt?: string;
  [key: string]: any;
}

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

    // Validate assessment type
    const validTypes = ['fjrl', 'ijrl', 'cdrl', 'ccrl', 'ctrl', 'rrl', 'irl'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { message: "Invalid assessment type" },
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

    // ✅ CRITICAL FIX: Create assessment with 'draft' status
    const assessment = await prisma.assessment.create({
      data: {
        type,
        userId: userId,
        tier: tier,
        price: price,
        manualProcessing,
        status: "draft", // ✅ START with draft, NOT pending
        data: { 
          tier,
          affiliateId: affiliateId || null,
          questionnaire_completed: false, // ✅ Track questionnaire completion
        } as AssessmentData, // ✅ Type assertion for data field
      },
    });

    // Create pending payment record (for later)
    const payment = await prisma.payment.create({
      data: {
        userId: userId,
        amount: price,
        method: "pending",
        status: "pending",
        assessmentId: assessment.id,
      },
    });

    console.log('✅ Assessment created successfully:', {
      id: assessment.id,
      type: assessment.type,
      tier: assessment.tier,
      price: assessment.price,
      status: assessment.status,
      manualProcessing: assessment.manualProcessing
    });

    // ✅ CRITICAL FIX: Return questionnaire URL, NOT payment URL
    return NextResponse.json({
      success: true,
      message: "Assessment created successfully. Please complete the questionnaire first.",
      id: assessment.id,
      assessmentId: assessment.id,
      paymentId: payment.id,
      tier: tier,
      price: price,
      // ✅ CRITICAL: Redirect to questionnaire page
      redirectUrl: `/assessment/${type}/${assessment.id}`,
      nextStep: "questionnaire"
    });
  } catch (error) {
    console.error("Assessment creation error:", error);
    return NextResponse.json(
      { message: "Error creating assessment", error: String(error) },
      { status: 500 }
    );
  }
}

// ✅ GET method to fetch assessments for dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = getUserId(session);
    
    if (!userId) {
      return NextResponse.json({ message: "Invalid user session" }, { status: 401 });
    }

    // ✅ FIXED: Use lowercase 'payment' instead of 'Payment'
    const assessments = await prisma.assessment.findMany({
      where: { userId: userId },
      include: {
        payment: { // ✅ FIXED: lowercase 'payment'
          select: {
            id: true,
            status: true,
            amount: true,
            createdAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform assessments for frontend
    const transformedAssessments = assessments.map(assessment => {
      // ✅ FIXED: Properly cast assessment.data to access properties
      const assessmentData = assessment.data as AssessmentData | null;
      
      return {
        id: assessment.id,
        type: assessment.type,
        tier: assessment.tier,
        price: assessment.price,
        status: assessment.status,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
        payment: assessment.payment || null,
        questionnaire_completed: assessmentData?.questionnaire_completed || false, // ✅ FIXED: proper type casting
      };
    });

    return NextResponse.json(transformedAssessments);
  } catch (error) {
    console.error("Error fetching assessments:", error);
    return NextResponse.json(
      { message: "Error fetching assessments", error: String(error) },
      { status: 500 }
    );
  }
}