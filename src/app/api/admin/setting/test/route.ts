import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.templateId || !data.email) {
      return NextResponse.json(
        { error: 'Template ID and email address are required' },
        { status: 400 }
      );
    }
    
    // Fetch email template
    const template = await prisma.emailTemplate.findUnique({
      where: { id: data.templateId },
    });
    
    if (!template) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }
    
    // Create test data with placeholder values
    const testData = {
      userName: 'Test User',
      receiptNumber: 'TEST-20250423-1234',
      assessmentType: 'fjrl',
      assessmentName: 'First Job Readiness Level',
      assessmentId: 'test-assessment-id',
      date: new Date(),
      formattedDate: new Date().toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      amount: 99.00,
      gateway: 'Test Payment Gateway',
      paymentId: 'test-payment-id',
      discount: 10.00,
      couponCode: 'TESTCODE',
    };
    
    // Replace placeholders in template
    let htmlContent = template.htmlContent;
    let subject = template.subject;
    
    // Replace all possible placeholders in the template
    Object.entries(testData).forEach(([key, value]) => {
      const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      htmlContent = htmlContent.replace(placeholder, String(value));
      subject = subject.replace(placeholder, String(value));
    });
    
    // Send test email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'myda100.directadminhostserver.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER || 'admin@kareerfit.com',
        pass: process.env.SMTP_PASSWORD,
      },
    });
    
    await transporter.sendMail({
      from: `"KareerFit" <${process.env.SMTP_USER || 'admin@kareerfit.com'}>`,
      to: data.email,
      subject: `[TEST] ${subject}`,
      html: htmlContent,
    });
    
    return NextResponse.json({ 
      message: 'Test email sent successfully' 
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}