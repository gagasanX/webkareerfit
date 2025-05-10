import { NextResponse } from 'next/server';

export async function GET() {
  const processorUrl = process.env.ASSESSMENT_PROCESSOR_URL;
  const apiKey = process.env.PROCESSOR_API_KEY;
  
  console.log("Testing fallback recommendations endpoint");
  
  if (!processorUrl || !apiKey) {
    console.error("Missing configuration: ASSESSMENT_PROCESSOR_URL or PROCESSOR_API_KEY");
    return NextResponse.json(
      { error: 'Processor URL or API Key not configured' },
      { status: 500 }
    );
  }
  
  try {
    // Panggil endpoint fallback-recommendations-test
    const response = await fetch(`${processorUrl}/api/fallback-recommendations-test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assessmentId: 'test-id',
        assessmentType: 'FJRL'
      }),
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from fallback endpoint: ${response.status}`, errorText);
      return NextResponse.json(
        { success: false, error: `Error from fallback endpoint: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log("Fallback test successful:", data);
    
    return NextResponse.json({ 
      success: true, 
      message: "Fallback endpoint test successful", 
      data 
    });
    
  } catch (error) {
    console.error("Failed to test fallback endpoint:", error);
    // Fix: Tangani error dengan benar untuk TypeScript
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { success: false, error: 'Failed to test fallback endpoint', details: errorMessage },
      { status: 500 }
    );
  }
}