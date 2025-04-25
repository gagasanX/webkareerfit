// Create this file: src/app/api/debug/openai-test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function GET() {
  try {
    console.log("Testing OpenAI connection...");
    console.log("API Key set:", !!process.env.OPENAI_API_KEY);
    console.log("API Key prefix:", process.env.OPENAI_API_KEY?.substring(0, 3) + "..." || "none");
    
    // Simple test of OpenAI connectivity
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say hello" }],
      max_tokens: 10
    });
    
    return NextResponse.json({
      success: true,
      response: completion.choices[0]?.message?.content,
      model: completion.model,
      apiKeyWorking: true
    });
  } catch (error) {
    console.error("OpenAI test error:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      apiKeyWorking: false,
      apiKeySet: !!process.env.OPENAI_API_KEY
    }, { status: 500 });
  }
}