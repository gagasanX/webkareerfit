import { NextResponse } from 'next/server';

export async function GET() {
  const processorUrl = process.env.ASSESSMENT_PROCESSOR_URL;
  const apiKey = process.env.PROCESSOR_API_KEY;
  
  console.log("Testing connection to processor at:", processorUrl);
  
  if (!processorUrl || !apiKey) {
    console.error("Missing configuration: ASSESSMENT_PROCESSOR_URL or PROCESSOR_API_KEY");
    return NextResponse.json(
      { error: 'Processor URL or API Key not configured' },
      { status: 500 }
    );
  }
  
  try {
    // Uji koneksi ke endpoint health
    const response = await fetch(`${processorUrl}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store' // Pastikan tidak menggunakan cache
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from processor: ${response.status}`, errorText);
      return NextResponse.json(
        { success: false, error: `Error from processor: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log("Processor health check successful:", data);
    
    return NextResponse.json({ 
      success: true, 
      message: "Connection to processor successful", 
      data 
    });
    
  } catch (error) {
    console.error("Failed to connect to processor:", error);
    // Fix: Tangani error dengan benar untuk TypeScript
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { success: false, error: 'Failed to connect to processor', details: errorMessage },
      { status: 500 }
    );
  }
}