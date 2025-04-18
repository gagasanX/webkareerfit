import { NextResponse } from "next/server";
import { get } from "@vercel/edge-config";

export async function GET() {
  try {
    const loginEnabled = await get("login_enabled");
    const welcomeMessage = await get("welcome_message");
    return NextResponse.json({
      loginEnabled,
      welcomeMessage,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to read config" }, { status: 500 });
  }
}