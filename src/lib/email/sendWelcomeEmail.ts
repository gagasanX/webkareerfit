import { engineMailer } from './enginemailerService';

interface SendWelcomeEmailParams {
  userName: string;
  userEmail: string;
  hasReferral?: boolean;
}

export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<boolean> {
  try {
    console.log(`Sending welcome email to: ${params.userEmail}`);
    
    const sent = await engineMailer.sendWelcomeEmail({
      userName: params.userName,
      email: params.userEmail,
      hasReferral: params.hasReferral
    });
    
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