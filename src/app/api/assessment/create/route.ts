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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ message: "Invalid user session" }, { status: 401 });
    }

    // Terima dan proses data JSON
    const data = await request.json();
    const type = data.type as string;
    const tier = data.tier as TierType;
    
    if (!type || !tier) {
      return NextResponse.json({ message: "Assessment type and tier are required" }, { status: 400 });
    }

    // Tentukan harga berdasarkan tier
    const tierPrices: Record<TierType, number> = {
      basic: 50.00,
      standard: 100.00,
      premium: 250.00
    };
    
    const price = tierPrices[tier];
    const manualProcessing = tier === 'standard' || tier === 'premium';

    // Log untuk debugging
    console.log(`Creating assessment - Type: ${type}, Tier: ${tier}, Price: ${price}`);

    // Cipta assessment dengan harga yang betul
    const assessment = await prisma.assessment.create({
      data: {
        type,
        userId,
        tier,
        price,
        manualProcessing,
        status: "pending",
        data: { tier }
      },
    });

    // Cipta rekod payment
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: price,
        method: "pending",
        status: "pending",
        assessmentId: assessment.id,
      },
    });

    // Log kejayaan
    console.log(`Assessment created successfully - ID: ${assessment.id}, Tier: ${tier}, Price: ${price}`);

    // Kembalikan respons dengan ID yang jelas
    return NextResponse.json({
      id: assessment.id,
      assessmentId: assessment.id, // Untuk keserasian
      tier: assessment.tier,
      price: assessment.price,
      status: assessment.status,
      message: "Assessment created successfully"
    });
  } catch (error) {
    console.error("Assessment creation error:", error);
    return NextResponse.json(
      { message: "Error creating assessment", error: String(error) },
      { status: 500 }
    );
  }
}