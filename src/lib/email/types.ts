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

export interface EmailConfig {
  userKey: string;
  apiUrl: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}