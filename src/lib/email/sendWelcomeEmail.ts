import { sendWelcomeEmail as sendEmail } from '@/lib/email';
import type { WelcomeEmailData } from './brevoService';

interface SendWelcomeEmailParams {
  userName: string;
  userEmail: string;
  hasReferral?: boolean;
}

export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<boolean> {
  try {
    console.log(`Sending welcome email to: ${params.userEmail}`);
    
    const emailData: WelcomeEmailData = {
      userName: params.userName,
      email: params.userEmail,
      hasReferral: params.hasReferral
    };
    
    const sent = await sendEmail(emailData);
    
    if (sent) {
      console.log(`Welcome email sent successfully to: ${params.userEmail}`);
    } else {
      console.error(`Failed to send welcome email to: ${params.userEmail}`);
    }
    
    return sent;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}