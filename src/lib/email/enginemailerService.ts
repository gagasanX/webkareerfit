import { getReceiptTemplate } from './templates/receiptTemplate';

interface EngineMailerConfig {
  userKey: string;
  apiUrl: string;
  fromEmail: string;
  fromName: string;
}

interface EmailData {
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  fromEmail?: string;
  fromName?: string;
  templateId?: string;
  templateData?: Record<string, any>;
}

// 🚀 EXPORT INTERFACES FOR USE IN OTHER FILES
export interface ReceiptEmailData {
  userName: string;
  email: string;
  receiptNumber: string;
  assessmentType: string;
  assessmentName: string;
  date: Date;
  amount: number;
  gateway: string;
  paymentId: string;
  discount?: number;
  couponCode?: string;
}

export interface AssessmentEmailData {
  userName: string;
  email: string;
  assessmentType: string;
  assessmentId: string;
  assessmentName: string;
}

export interface WelcomeEmailData {
  userName: string;
  email: string;
  hasReferral?: boolean;
}

class EngineMailerService {
  private config: EngineMailerConfig;

  constructor() {
    this.config = {
      userKey: process.env.ENGINEMAILER_USER_KEY!,
      apiUrl: 'https://api.enginemailer.com/RESTAPI/Submission/SendEmail',
      fromEmail: process.env.DEFAULT_FROM_EMAIL || 'noreply@kareerfit.com',
      fromName: process.env.DEFAULT_FROM_NAME || 'KareerFit'
    };

    // Validate required environment variables
    if (!this.config.userKey) {
      console.error('ENGINEMAILER_USER_KEY is not configured');
    }
  }

  // Core email sending method
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.config.userKey) {
        throw new Error('Enginemailer API key not configured');
      }

      const payload = {
        UserKey: this.config.userKey,
        To: emailData.to,
        Subject: emailData.subject,
        HTMLPart: emailData.htmlBody || '',
        TextPart: emailData.textBody || '',
        FromEmail: emailData.fromEmail || this.config.fromEmail,
        FromName: emailData.fromName || this.config.fromName,
        // Template support
        ...(emailData.templateId && {
          TemplateId: emailData.templateId,
          TemplateData: emailData.templateData || {}
        })
      };

      console.log('Sending email via Enginemailer:', {
        to: emailData.to,
        subject: emailData.subject,
        hasTemplate: !!emailData.templateId
      });

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Email sending failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Email sent successfully:', result);
      
      return { 
        success: true, 
        messageId: result.MessageId || result.id || 'sent'
      };
    } catch (error) {
      console.error('EngineMailer error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Assessment completion email
  async sendAssessmentEmail(data: AssessmentEmailData): Promise<boolean> {
    const resultsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/assessment/${data.assessmentType}/results/${data.assessmentId}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; background: linear-gradient(to right, #38b6ff, #7e43f1); color: white; border-radius: 8px;">
          <h1 style="margin: 0; font-size: 24px;">Assessment Complete!</h1>
        </div>
        
        <div style="padding: 30px; background-color: #fff; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hello ${data.userName},</p>
          <p>Congratulations! You have successfully completed your <strong>${data.assessmentName}</strong> assessment.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resultsUrl}" 
               style="background-color: #7e43f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              View Your Results
            </a>
          </div>
          
          <p>Your personalized career readiness report is now available in your dashboard. This comprehensive analysis includes:</p>
          <ul>
            <li>Detailed readiness level assessment</li>
            <li>Personalized recommendations</li>
            <li>Action steps for improvement</li>
            <li>Professional development insights</li>
          </ul>
          
          <p>If you have any questions about your results, please contact our support team at 
             <a href="mailto:support@kareerfit.com">support@kareerfit.com</a></p>
          
          <p>Best regards,<br>The KareerFit Team</p>
        </div>
      </div>
    `;

    const textBody = `
      Hello ${data.userName},
      
      Congratulations! You have successfully completed your ${data.assessmentName} assessment.
      
      Your results are now available at: ${resultsUrl}
      
      Your personalized career readiness report includes detailed analysis, recommendations, and action steps.
      
      If you have questions, contact us at support@kareerfit.com
      
      Best regards,
      The KareerFit Team
    `;

    const result = await this.sendEmail({
      to: data.email,
      subject: `Your ${data.assessmentName} Results Are Ready!`,
      htmlBody,
      textBody
    });

    return result.success;
  }

  // Payment receipt email
  async sendReceiptEmail(data: ReceiptEmailData): Promise<boolean> {
    const htmlBody = getReceiptTemplate({
      userName: data.userName,
      receiptNumber: data.receiptNumber,
      assessmentType: data.assessmentType,
      assessmentName: data.assessmentName,
      formattedDate: data.date.toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      amount: data.amount,
      gateway: data.gateway,
      paymentId: data.paymentId,
      discount: data.discount,
      couponCode: data.couponCode
    });

    const textBody = `
      KareerFit Payment Receipt
      
      Hello ${data.userName},
      
      Thank you for your payment. Here are your receipt details:
      
      Receipt Number: ${data.receiptNumber}
      Date: ${data.date.toLocaleDateString()}
      Assessment: ${data.assessmentName}
      Amount: RM ${data.amount.toFixed(2)}
      Payment Method: ${data.gateway}
      Transaction ID: ${data.paymentId}
      
      ${data.discount ? `Discount Applied: -RM ${data.discount.toFixed(2)}` : ''}
      ${data.couponCode ? `Coupon Code: ${data.couponCode}` : ''}
      
      Your assessment is now available in your KareerFit dashboard.
      
      Contact us: support@kareerfit.com
      
      Best regards,
      The KareerFit Team
    `;

    const result = await this.sendEmail({
      to: data.email,
      subject: 'Your KareerFit Payment Receipt',
      htmlBody,
      textBody
    });

    return result.success;
  }

  // Welcome email for new users
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; background: linear-gradient(to right, #38b6ff, #7e43f1); color: white; border-radius: 8px;">
          <h1 style="margin: 0; font-size: 24px;">Welcome to KareerFit!</h1>
        </div>
        
        <div style="padding: 30px; background-color: #fff; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hello ${data.userName},</p>
          <p>Welcome to KareerFit! We're excited to help you on your career journey.</p>
          
          ${data.hasReferral ? `
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1976d2;">
                🎉 <strong>Special Welcome!</strong> You've been referred by one of our partners. 
                You'll receive exclusive benefits on your first assessment!
              </p>
            </div>
          ` : ''}
          
          <p>With KareerFit, you can:</p>
          <ul>
            <li>Assess your career readiness level</li>
            <li>Get personalized recommendations</li>
            <li>Track your professional development</li>
            <li>Access expert career insights</li>
          </ul>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/assessment" 
               style="background-color: #7e43f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Start Your First Assessment
            </a>
          </div>
          
          <p>Need help getting started? Contact our support team at 
             <a href="mailto:support@kareerfit.com">support@kareerfit.com</a></p>
          
          <p>Best regards,<br>The KareerFit Team</p>
        </div>
      </div>
    `;

    const textBody = `
      Welcome to KareerFit!
      
      Hello ${data.userName},
      
      Welcome to KareerFit! We're excited to help you on your career journey.
      
      ${data.hasReferral ? 'Special Welcome! You\'ve been referred by one of our partners and will receive exclusive benefits on your first assessment!' : ''}
      
      With KareerFit, you can:
      - Assess your career readiness level
      - Get personalized recommendations  
      - Track your professional development
      - Access expert career insights
      
      Start your first assessment: ${process.env.NEXT_PUBLIC_APP_URL}/assessment
      
      Need help? Contact us: support@kareerfit.com
      
      Best regards,
      The KareerFit Team
    `;

    const result = await this.sendEmail({
      to: data.email,
      subject: 'Welcome to KareerFit - Start Your Career Journey!',
      htmlBody,
      textBody
    });

    return result.success;
  }
}

// Helper function to generate receipt numbers
export function generateReceiptNumber(paymentId: string): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const shortId = paymentId.slice(-6).toUpperCase();
  return `KF${year}${month}${shortId}`;
}

// Export singleton instance
export const engineMailer = new EngineMailerService();

// Export individual functions for compatibility
export async function sendReceiptEmail(data: ReceiptEmailData): Promise<boolean> {
  return engineMailer.sendReceiptEmail(data);
}

export async function sendAssessmentEmail(data: AssessmentEmailData): Promise<boolean> {
  return engineMailer.sendAssessmentEmail(data);
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  return engineMailer.sendWelcomeEmail(data);
}