import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth, logAdminAction, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import { sendEmail } from '@/lib/email'; // Assuming you have an email service

// ===== TYPES =====
interface TestEmailData {
  templateId: string;
  email: string;
  testData?: Record<string, any>;
}

// ===== PLACEHOLDER DATA FOR TESTING =====
const generateTestPlaceholderData = () => {
  return {
    // User data
    userName: 'John Doe',
    userEmail: 'john.doe@example.com',
    userPhone: '+60123456789',
    
    // Assessment data
    assessmentType: 'CCRL',
    assessmentId: 'ast_test123456',
    assessmentStatus: 'completed',
    assessmentTier: 'premium',
    assessmentPrice: 'RM 250.00',
    
    // Company data
    companyName: 'Assessment Pro Sdn Bhd',
    companyEmail: 'support@assessmentpro.com',
    companyPhone: '+603-12345678',
    companyAddress: 'Kuala Lumpur, Malaysia',
    
    // System data
    currentDate: new Date().toLocaleDateString('en-MY'),
    currentTime: new Date().toLocaleTimeString('en-MY'),
    currentYear: new Date().getFullYear().toString(),
    
    // Payment data
    paymentId: 'pay_test789',
    paymentAmount: 'RM 250.00',
    paymentMethod: 'Credit Card',
    paymentDate: new Date().toLocaleDateString('en-MY'),
    
    // Links (use placeholder URLs for testing)
    loginUrl: 'https://yoursite.com/login',
    dashboardUrl: 'https://yoursite.com/dashboard',
    assessmentUrl: 'https://yoursite.com/assessment/ast_test123456',
    supportUrl: 'https://yoursite.com/contact',
    unsubscribeUrl: 'https://yoursite.com/unsubscribe',
    
    // Affiliate data
    affiliateCode: 'AFF123',
    affiliateName: 'Jane Smith',
    commissionAmount: 'RM 25.00',
    
    // Additional common placeholders
    verificationCode: '123456',
    resetToken: 'token_abc123',
    expirationTime: '24 hours',
  };
};

// ===== TEMPLATE VARIABLE REPLACEMENT =====
const replacePlaceholders = (content: string, data: Record<string, any>): string => {
  let processedContent = content;
  
  // Replace {{variable}} patterns
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    processedContent = processedContent.replace(regex, String(value || ''));
  }
  
  // Replace {variable} patterns (alternative format)
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{\\s*${key}\\s*}`, 'gi');
    processedContent = processedContent.replace(regex, String(value || ''));
  }
  
  // Clean up any remaining unreplaced placeholders
  processedContent = processedContent.replace(/{{[^}]*}}/g, '[PLACEHOLDER]');
  processedContent = processedContent.replace(/{[^}]*}/g, '[PLACEHOLDER]');
  
  return processedContent;
};

// ===== POST - SEND TEST EMAIL =====
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting (stricter for email sending)
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 5, 60000)) { // Only 5 test emails per minute
      logger.warn('Admin test email rate limit exceeded', { ip: clientIp });
      return NextResponse.json(
        { error: 'Rate limit exceeded. Only 5 test emails allowed per minute.' },
        { status: 429 }
      );
    }

    // 2. Authentication & Authorization
    const authResult = await validateAdminAuth(request);
    if (!authResult.success) {
      return authResult.error!;
    }

    // 3. Parse and validate request body
    const body: TestEmailData = await request.json();
    const { templateId, email, testData = {} } = body;

    // Validation
    if (!templateId || typeof templateId !== 'string') {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // 4. Fetch email template
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        subject: true,
        htmlContent: true,
        active: true
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }

    if (!template.active) {
      return NextResponse.json(
        { error: 'Cannot send test email using inactive template' },
        { status: 400 }
      );
    }

    // 5. Prepare test data
    const placeholderData = {
      ...generateTestPlaceholderData(),
      ...testData, // Custom test data overrides defaults
      // Add test-specific data
      isTestEmail: 'true',
      testSentBy: authResult.user!.email,
      testSentAt: new Date().toISOString()
    };

    // 6. Process template content
    const processedSubject = replacePlaceholders(template.subject, placeholderData);
    const processedHtmlContent = replacePlaceholders(template.htmlContent, placeholderData);

    // 7. Add test email notice to the content
    const testNoticeHtml = `
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 16px; margin-bottom: 20px; border-radius: 8px;">
        <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 16px;">⚠️ This is a Test Email</h3>
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          This email was sent for testing purposes by <strong>${authResult.user!.email}</strong> 
          using template "<strong>${template.name}</strong>" on ${new Date().toLocaleString()}.
        </p>
      </div>
    `;

    const finalHtmlContent = testNoticeHtml + processedHtmlContent;
    const finalSubject = `[TEST] ${processedSubject}`;

    // 8. Send test email
    try {
      await sendEmail({
        to: email,
        subject: finalSubject,
        html: finalHtmlContent,
        // You might want to include a text version too
        text: `This is a test email for template: ${template.name}\n\nOriginal subject: ${processedSubject}`
      });

    } catch (emailError) {
      logger.error('Failed to send test email', {
        error: emailError instanceof Error ? emailError.message : 'Unknown email error',
        templateId: template.id,
        recipientEmail: email,
        senderEmail: authResult.user!.email
      });

      return NextResponse.json(
        { error: 'Failed to send test email. Please check email configuration.' },
        { status: 500 }
      );
    }

    // 9. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'test_email_sent',
      { 
        templateId: template.id,
        templateName: template.name,
        recipientEmail: email,
        testDataKeys: Object.keys(testData),
        timestamp: new Date().toISOString()
      },
      request
    );

    // 10. Return success response
    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${email}`,
      details: {
        templateName: template.name,
        processedSubject: finalSubject,
        recipientEmail: email,
        sentAt: new Date().toISOString(),
        placeholdersUsed: Object.keys(placeholderData)
      }
    });

  } catch (error) {
    logger.error('Test email API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    });

    return NextResponse.json(
      { error: 'Failed to send test email. Please try again later.' },
      { status: 500 }
    );
  }
}

// ===== GET - GET AVAILABLE PLACEHOLDER VARIABLES =====
export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 30, 60000)) {
      logger.warn('Admin email placeholders rate limit exceeded', { ip: clientIp });
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Authentication & Authorization
    const authResult = await validateAdminAuth(request);
    if (!authResult.success) {
      return authResult.error!;
    }

    // 3. Generate placeholder data sample
    const placeholderData = generateTestPlaceholderData();

    // 4. Organize placeholders by category
    const placeholderCategories = {
      user: {
        userName: 'User\'s full name',
        userEmail: 'User\'s email address',
        userPhone: 'User\'s phone number'
      },
      assessment: {
        assessmentType: 'Assessment type (CCRL, CDRL, etc.)',
        assessmentId: 'Unique assessment ID',
        assessmentStatus: 'Assessment status',
        assessmentTier: 'Assessment tier (basic, standard, premium)',
        assessmentPrice: 'Assessment price'
      },
      payment: {
        paymentId: 'Payment transaction ID',
        paymentAmount: 'Payment amount',
        paymentMethod: 'Payment method used',
        paymentDate: 'Payment date'
      },
      company: {
        companyName: 'Company name',
        companyEmail: 'Company email',
        companyPhone: 'Company phone',
        companyAddress: 'Company address'
      },
      system: {
        currentDate: 'Current date',
        currentTime: 'Current time',
        currentYear: 'Current year'
      },
      links: {
        loginUrl: 'Login page URL',
        dashboardUrl: 'Dashboard URL',
        assessmentUrl: 'Assessment specific URL',
        supportUrl: 'Support/Contact URL',
        unsubscribeUrl: 'Unsubscribe URL'
      },
      affiliate: {
        affiliateCode: 'Affiliate referral code',
        affiliateName: 'Affiliate name',
        commissionAmount: 'Commission amount'
      },
      security: {
        verificationCode: 'Email verification code',
        resetToken: 'Password reset token',
        expirationTime: 'Token expiration time'
      }
    };

    // 5. Return placeholder information
    return NextResponse.json({
      success: true,
      placeholderCategories,
      sampleData: placeholderData,
      usage: {
        format1: '{{variableName}}',
        format2: '{variableName}',
        example: 'Hello {{userName}}, your assessment {{assessmentId}} is {{assessmentStatus}}.'
      },
      message: 'Use these placeholders in your email templates. They will be replaced with actual data when emails are sent.'
    });

  } catch (error) {
    logger.error('Email placeholders API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    });

    return NextResponse.json(
      { error: 'Failed to fetch placeholder information. Please try again later.' },
      { status: 500 }
    );
  }
}