// Central export file for all email services
import { brevoMailer } from './brevoService';
import type { EmailData } from './brevoService';

export {
  brevoMailer as mailer,
  sendAssessmentEmail,
  sendReceiptEmail,
  sendWelcomeEmail,
  generateReceiptNumber,
} from './brevoService';

// Re-export the sendEmail function for generic emails
export const sendEmail = (data: EmailData) => brevoMailer.sendEmail(data);

export type {
  EmailData,
  AssessmentEmailData,
  ReceiptEmailData,
  WelcomeEmailData,
} from './brevoService';