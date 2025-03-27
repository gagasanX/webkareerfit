import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { ExtendedUser, getUserId } from "@/lib/utils";

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

    const formData = await request.formData();
    const type = formData.get("type") as string;
    const answersJson = formData.get("answers") as string;
    const affiliateCode = formData.get("affiliateCode") as string | null;
    
    if (!type || !answersJson) {
      return NextResponse.json(
        { message: "Type and answers are required" },
        { status: 400 }
      );
    }

    const answers = JSON.parse(answersJson);

    // Process resume file if exists
    let resumeUrl = null;
    const resume = formData.get("resume") as File | null;
    
    if (resume) {
      // In a real app, you would upload to cloud storage
      // This is a placeholder
      resumeUrl = `uploads/${Date.now()}_${resume.name}`;
    }

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
        data: { 
          answers,
          resumeUrl,
          affiliateId
        },
        price: 50.00, // Default price
        status: "pending",
      },
    });

    // Create pending payment
    const payment = await prisma.payment.create({
      data: {
        userId: userId,
        amount: 50.00, // Default price
        method: "pending", // This will be updated when the user selects a payment method
        status: "pending",
        assessmentId: assessment.id, // Connect to assessment via assessmentId
      },
    });

    return NextResponse.json({
      message: "Assessment created successfully",
      assessmentId: assessment.id,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error("Assessment creation error:", error);
    return NextResponse.json(
      { message: "Error creating assessment" },
      { status: 500 }
    );
  }
}