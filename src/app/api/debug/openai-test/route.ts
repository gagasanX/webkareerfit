// app/api/debug/openai-test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIInstance, isOpenAIConfigured } from '@/lib/openai';

export async function GET(request: NextRequest) {
  try {
    console.log("Testing OpenAI connection...");
    
    // Check if OpenAI is configured
    const apiKeyConfigured = isOpenAIConfigured();
    console.log("API Key configured:", apiKeyConfigured);
    
    if (!apiKeyConfigured) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key is not configured',
        apiKeyConfigured: false
      }, { status: 500 });
    }
    
    // Try to get the OpenAI instance
    const openai = getOpenAIInstance();
    
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
      apiKeySet: isOpenAIConfigured()
    }, { status: 500 });
  }
}