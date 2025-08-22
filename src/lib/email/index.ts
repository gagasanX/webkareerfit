// Central export file for all email services
export {
  brevoMailer,
  sendAssessmentEmail,
  sendReceiptEmail,
  sendWelcomeEmail,
  generateReceiptNumber,
} from './brevoService';

export type {
  EmailData,
  AssessmentEmailData,
  ReceiptEmailData,
  WelcomeEmailData,
} from './brevoService';