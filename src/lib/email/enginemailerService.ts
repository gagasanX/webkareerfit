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
      console.error('❌ ENGINEMAILER_USER_KEY is not configured');
    }
  }

  // 🔧 FIXED: Correct Enginemailer API parameter names and proper error handling
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.config.userKey) {
        throw new Error('Enginemailer API key not configured');
      }

      // Validate required fields
      const missingFields = [];
      if (!emailData.to) missingFields.push('to');
      if (!emailData.subject) missingFields.push('subject');
      if (!emailData.htmlBody && !emailData.textBody) missingFields.push('htmlBody or textBody');
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailData.to)) {
        throw new Error(`Invalid email address: ${emailData.to}`);
      }

      // 🔧 FIXED: Use correct Enginemailer API parameter names
      const payload = {
        UserKey: this.config.userKey,
        ToEmail: emailData.to,                                    // ✅ Correct: ToEmail (not To)
        Subject: emailData.subject,
        SubmittedContent: emailData.htmlBody || emailData.textBody || '', // ✅ Correct: SubmittedContent (not HTMLPart)
        SenderEmail: emailData.fromEmail || this.config.fromEmail, // ✅ Correct: SenderEmail (not FromEmail)
        SenderName: emailData.fromName || this.config.fromName,   // ✅ Correct: SenderName (not FromName)
        
        // Optional: Add campaign name for tracking
        CampaignName: 'KareerFit Transactional Emails',
        
        // Template support (if using templates)
        ...(emailData.templateId && {
          TemplateId: emailData.templateId,
          SubstitutionTags: emailData.templateData ? 
            Object.entries(emailData.templateData).map(([key, value]) => ({
              Key: key,
              Value: String(value)
            })) : []
        })
      };

      console.log('📧 Sending email via Enginemailer with correct parameters:', {
        ToEmail: payload.ToEmail,
        Subject: payload.Subject,
        SenderEmail: payload.SenderEmail,
        SenderName: payload.SenderName,
        HasContent: !!payload.SubmittedContent,
        ContentLength: payload.SubmittedContent?.length,
        HasTemplate: !!emailData.templateId,
        HasUserKey: !!payload.UserKey,
        UserKeyLength: payload.UserKey?.length
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
        console.error('❌ HTTP Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📧 Enginemailer API response:', result);
      
      // 🔧 FIXED: Check for various success indicators
      
      // Direct success indicators
      if (result.Success || result.success || result.MessageId || result.Id) {
        console.log('✅ Email sent successfully via Enginemailer (direct success)');
        return { 
          success: true, 
          messageId: result.MessageId || result.Id || result.messageId || `sent_${Date.now()}`
        };
      }
      
      // Check for Result object (as seen in your logs)
      if (result.Result) {
        const statusCode = result.Result.StatusCode;
        const status = result.Result.Status;
        const errorMessage = result.Result.ErrorMessage;
        
        // Check for error status codes
        if (statusCode === '500' || statusCode === '400' || statusCode === '401' || statusCode === '403' || statusCode === '404') {
          console.error('❌ Enginemailer API Error in Result object:', {
            statusCode,
            status,
            errorMessage,
            fullResult: result
          });
          return { 
            success: false, 
            error: `Enginemailer API Error (${statusCode}): ${errorMessage || status || 'Unknown error'}`
          };
        }
        
        // Success status codes
        if (statusCode === '200' || statusCode === '202' || status === 'OK' || status === 'Success') {
          console.log('✅ Email sent successfully via Enginemailer (Result object)');
          return { 
            success: true, 
            messageId: result.Result.MessageId || result.MessageId || `sent_${Date.now()}`
          };
        }
        
        // Log unexpected status code but don't fail immediately
        console.warn(`⚠️ Unexpected status code in Result: ${statusCode} - ${status}`);
      }
      
      // Check for direct error indicators
      if (result.Error || result.error || result.ErrorMessage) {
        const errorMessage = result.Error || result.error || result.ErrorMessage || 'Unknown API error';
        console.error('❌ Enginemailer API Error (direct):', errorMessage);
        return { 
          success: false, 
          error: `Enginemailer API Error: ${errorMessage}`
        };
      }
      
      // If we reach here, treat as unexpected response but don't necessarily fail
      console.warn('⚠️ Unexpected Enginemailer response format:', result);
      
      // Try to determine if it's actually successful despite unexpected format
      const resultString = JSON.stringify(result).toLowerCase();
      if (resultString.includes('success') || resultString.includes('sent') || resultString.includes('delivered')) {
        console.log('✅ Email likely sent successfully (inferred from response content)');
        return { 
          success: true, 
          messageId: `inferred_success_${Date.now()}`
        };
      }
      
      return { 
        success: false, 
        error: `Unexpected API response format: ${JSON.stringify(result)}`
      };
      
    } catch (error) {
      console.error('❌ EngineMailer sendEmail error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Assessment completion email
  async sendAssessmentEmail(data: AssessmentEmailData): Promise<boolean> {
    try {
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

      if (!result.success) {
        console.error('Failed to send assessment email:', result.error);
      }

      return result.success;
    } catch (error) {
      console.error('Error in sendAssessmentEmail:', error);
      return false;
    }
  }

  // Payment receipt email
  async sendReceiptEmail(data: ReceiptEmailData): Promise<boolean> {
    try {
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

      if (!result.success) {
        console.error('Failed to send receipt email:', result.error);
      }

      return result.success;
    } catch (error) {
      console.error('Error in sendReceiptEmail:', error);
      return false;
    }
  }

  // Welcome email for new users
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    try {
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

      if (!result.success) {
        console.error('Failed to send welcome email:', result.error);
      }

      return result.success;
    } catch (error) {
      console.error('Error in sendWelcomeEmail:', error);
      return false;
    }
  }

  // 🧪 Test connection method
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🧪 Testing Enginemailer connection...');
      
      const result = await this.sendEmail({
        to: 'test@kareerfit.com',
        subject: 'Enginemailer Connection Test',
        htmlBody: '<h1>Test Email</h1><p>This is a test email to verify Enginemailer connection with correct parameters.</p>',
        textBody: 'Test Email - This is a test email to verify Enginemailer connection with correct parameters.'
      });
      
      console.log('🧪 Connection test result:', result);
      return result;
    } catch (error) {
      console.error('🧪 Connection test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
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

// 🧪 Test function export
export async function testEngineMailerConnection(): Promise<{ success: boolean; error?: string }> {
  return engineMailer.testConnection();
}