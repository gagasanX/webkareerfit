import { NextRequest, NextResponse } from 'next/server';
import { createOpenAIClient, testOpenAIConnection } from '@/lib/openai-client';

export async function GET(request: NextRequest) {
  try {
    console.log("[openai-test] Testing OpenAI connection...");
    
    // Check if API key is set
    const apiKey = process.env.OPENAI_API_KEY;
    console.log("[openai-test] API Key set:", !!apiKey);
    console.log("[openai-test] API Key prefix:", apiKey?.substring(0, 7) + "..." || "none");
    
    // Test connection
    const result = await testOpenAIConnection();
    
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || 'not-vercel'
    });
  } catch (error) {
    console.error("[openai-test] Error:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      apiKeySet: !!process.env.OPENAI_API_KEY,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || 'not-vercel'
    }, { status: 500 });
  }
}