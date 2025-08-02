// 🧪 SIMPLE TEST - Add this to your test API route or create a new one
// File: src/app/api/email/test-fixed/route.ts

import { NextRequest, NextResponse } from 'next/server';

// Simple test function with correct Enginemailer parameters
async function testEngineMailerFixed(email: string) {
  try {
    const userKey = process.env.ENGINEMAILER_USER_KEY;
    const apiUrl = 'https://api.enginemailer.com/RESTAPI/Submission/SendEmail';
    
    if (!userKey) {
      throw new Error('ENGINEMAILER_USER_KEY not configured');
    }

    console.log('🧪 Testing with correct Enginemailer parameters...');
    
    // ✅ Using CORRECT parameter names according to Enginemailer documentation
    const payload = {
      UserKey: userKey,
      ToEmail: email,                                    // ✅ Correct: ToEmail (not To)
      Subject: 'KareerFit - Test Email (Fixed Parameters)',
      SubmittedContent: `
        <h1>Test Email - Fixed Parameters!</h1>
        <p>Hello! This is a test email using the correct Enginemailer API parameters.</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p>If you receive this, the email service is working correctly!</p>
        <hr>
        <p><small>KareerFit Team</small></p>
      `,                                                 // ✅ Correct: SubmittedContent (not HTMLPart)
      SenderEmail: process.env.DEFAULT_FROM_EMAIL || 'noreply@kareerfit.com', // ✅ Correct: SenderEmail (not FromEmail)
      SenderName: process.env.DEFAULT_FROM_NAME || 'KareerFit',               // ✅ Correct: SenderName (not FromName)
      CampaignName: 'KareerFit Test Campaign'
    };

    console.log('📧 Payload with correct parameters:', {
      ToEmail: payload.ToEmail,
      Subject: payload.Subject,
      SenderEmail: payload.SenderEmail,
      SenderName: payload.SenderName,
      HasUserKey: !!payload.UserKey,
      UserKeyLength: payload.UserKey?.length,
      ContentLength: payload.SubmittedContent?.length
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('📧 Response status:', response.status);
    console.log('📧 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP Error:', errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        payload: payload
      };
    }

    const result = await response.json();
    console.log('📧 API Response:', JSON.stringify(result, null, 2));

    // Check for success
    if (result.Success || result.success || result.MessageId || result.Id) {
      return {
        success: true,
        messageId: result.MessageId || result.Id || result.messageId,
        result: result
      };
    }

    // Check for Result object success
    if (result.Result && (result.Result.StatusCode === '200' || result.Result.StatusCode === '202')) {
      return {
        success: true,
        messageId: result.Result.MessageId,
        result: result
      };
    }

    // If we reach here, it's likely an error
    return {
      success: false,
      error: 'Unexpected response format',
      result: result
    };

  } catch (error) {
    console.error('❌ Test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email') || 'test@example.com';

  console.log('🧪 Starting fixed email test...');
  
  const result = await testEngineMailerFixed(email);
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    testEmail: email,
    ...result,
    note: 'This test uses the correct Enginemailer API parameter names'
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 });
    }

    const result = await testEngineMailerFixed(email);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      testEmail: email,
      ...result
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}