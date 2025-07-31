// Central export file for all email services
export { engineMailer } from './enginemailerService';
export { sendPaymentReceipt } from './sendReceipt';
export { sendAssessmentEmail } from './sendAssessmentEmail';
export { sendWelcomeEmail } from './sendWelcomeEmail';
export { generateReceiptNumber } from './enginemailerService';

// 🚀 FIXED: Export types that are now properly exported from enginemailerService
export type {
  ReceiptEmailData,
  AssessmentEmailData,
  WelcomeEmailData
} from './enginemailerService';