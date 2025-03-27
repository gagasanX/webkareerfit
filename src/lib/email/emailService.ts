import nodemailer from 'nodemailer';
import { getReceiptTemplate } from './templates/receiptTemplate';

// Create transporter with your SMTP settings
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'myda100.directadminhostserver.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'admin@kareerfit.com',
    pass: process.env.SMTP_PASSWORD,
  },
});

interface ReceiptDetails {
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

/**
 * Send receipt email to user
 */
export async function sendReceiptEmail(details: ReceiptDetails): Promise<boolean> {
  try {
    // Format date
    const formattedDate = details.date.toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Generate receipt HTML
    const htmlContent = getReceiptTemplate({
      ...details,
      formattedDate,
    });
    
    // Send email
    const info = await transporter.sendMail({
      from: `"KareerFit" <${process.env.SMTP_USER || 'admin@kareerfit.com'}>`,
      to: details.email,
      subject: `Your Receipt for KareerFit Assessment #${details.receiptNumber}`,
      html: htmlContent,
    });
    
    console.log('Receipt email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending receipt email:', error);
    return false;
  }
}

/**
 * Generate a receipt number using date and payment ID
 */
export function generateReceiptNumber(paymentId: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const randomDigits = paymentId.substring(0, 4).toUpperCase();
  
  return `INV-${year}${month}${day}-${randomDigits}`;
}

/**
 * Test email connection
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('SMTP connection verified');
    return true;
  } catch (error) {
    console.error('SMTP connection failed:', error);
    return false;
  }
}