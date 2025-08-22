// Brevo (formerly Sendinblue) Email Service
import * as Brevo from '@getbrevo/brevo';

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
}

interface AssessmentEmailData {
  userName: string;
  email: string;
  assessmentType: string;
  assessmentId: string;
  assessmentName: string;
}

interface ReceiptEmailData {
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

interface WelcomeEmailData {
  userName: string;
  email: string;
  hasReferral?: boolean;
}

class BrevoService {
  private client: Brevo.TransactionalEmailsApi;
  private defaultSender: Brevo.SendSmtpEmailSender;

  constructor() {
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!);
    
    this.client = apiInstance;
    this.defaultSender = {
      email: 'noreply@kareerfit.com',
      name: 'KareerFit'
    };
  }

  async sendEmail(data: EmailData): Promise<boolean> {
    try {
      const sendSmtpEmail = new Brevo.SendSmtpEmail();
      
      sendSmtpEmail.sender = {
        email: data.fromEmail || this.defaultSender.email,
        name: data.fromName || this.defaultSender.name
      };
      
      sendSmtpEmail.to = [{email: data.to}];
      sendSmtpEmail.subject = data.subject;
      sendSmtpEmail.htmlContent = data.html;
      sendSmtpEmail.textContent = data.text;

      await this.client.sendTransacEmail(sendSmtpEmail);
      return true;
    } catch (error) {
      console.error('Failed to send email via Brevo:', error);
      return false;
    }
  }

  async sendAssessmentEmail(data: AssessmentEmailData): Promise<boolean> {
    const resultsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/assessment/${data.assessmentType}/results/${data.assessmentId}`;
    
    const htmlContent = `
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

    return this.sendEmail({
      to: data.email,
      subject: `Your ${data.assessmentName} Results Are Ready!`,
      html: htmlContent
    });
  }

  async sendReceiptEmail(data: ReceiptEmailData): Promise<boolean> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; background: linear-gradient(to right, #38b6ff, #7e43f1); color: white; border-radius: 8px;">
          <h1 style="margin: 0; font-size: 24px;">Payment Receipt</h1>
        </div>
        
        <div style="padding: 30px; background-color: #fff; border: 1px solid #ddd; border-radius: 8px;">
          <p>Hello ${data.userName},</p>
          <p>Thank you for your payment. Here are your receipt details:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Receipt Number:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${data.receiptNumber}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Date:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.date.toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Assessment:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.assessmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Amount:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">RM ${data.amount.toFixed(2)}</td>
            </tr>
            ${data.discount ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Discount:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">-RM ${data.discount.toFixed(2)}</td>
            </tr>
            ` : ''}
            ${data.couponCode ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Coupon Code:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.couponCode}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Payment Method:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.gateway}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Transaction ID:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.paymentId}</td>
            </tr>
          </table>
          
          <p>Your assessment is now available in your KareerFit dashboard.</p>
          
          <p style="margin-top: 30px;">Best regards,<br>The KareerFit Team</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: data.email,
      subject: 'Your KareerFit Payment Receipt',
      html: htmlContent
    });
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const htmlContent = `
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

    return this.sendEmail({
      to: data.email,
      subject: 'Welcome to KareerFit - Start Your Career Journey!',
      html: htmlContent
    });
  }
}

export const brevoMailer = new BrevoService();

// Export helper functions
export function generateReceiptNumber(paymentId: string): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const shortId = paymentId.slice(-6).toUpperCase();
  return `KF${year}${month}${shortId}`;
}

// Export individual functions
export async function sendReceiptEmail(data: ReceiptEmailData): Promise<boolean> {
  return brevoMailer.sendReceiptEmail(data);
}

export async function sendAssessmentEmail(data: AssessmentEmailData): Promise<boolean> {
  return brevoMailer.sendAssessmentEmail(data);
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  return brevoMailer.sendWelcomeEmail(data);
}

export type { EmailData, AssessmentEmailData, ReceiptEmailData, WelcomeEmailData };
