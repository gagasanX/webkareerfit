import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateReferralCode } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const { name, email, phone, password } = await request.json();

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
    
    // Generate affiliate code
    const affiliateCode = generateReferralCode();

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || "",
        password: hashedPassword,
        affiliateCode,
      },
    });

    // Create affiliate stats
    await prisma.affiliateStats.create({
      data: {
        userId: user.id,
      },
    });

    return NextResponse.json({
      message: "Akaun telah berjaya didaftarkan",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
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