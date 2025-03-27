import { Resend } from 'resend';

// Initialize the Resend client with your API key
// You'll need to install resend first: npm install resend
const resend = new Resend(process.env.RESEND_API_KEY || '');

interface SendAssessmentEmailParams {
  to: string;
  name: string;
  assessmentType: string;
  assessmentId: string;
  pdfUrl?: string;
}

/**
 * Sends an assessment completion email to the user
 * @param params Email parameters including recipient, name, and assessment details
 * @returns Promise resolving to the email send result
 */
export async function sendAssessmentEmail(params: SendAssessmentEmailParams) {
  const { to, name, assessmentType, assessmentId, pdfUrl } = params;

  const assessmentTypeLabels: Record<string, string> = {
    fjrl: 'First Job Readiness Level',
    ijrl: 'Ideal Job Readiness Level',
    cdrl: 'Career Development Readiness Level',
    ccrl: 'Career Comeback Readiness Level',
    ctrl: 'Career Transition Readiness Level',
    rrl: 'Retirement Readiness Level',
    irl: 'Internship Readiness Level',
  };

  const assessmentName = assessmentTypeLabels[assessmentType] || assessmentType;
  const resultsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/assessment/${assessmentType}/results/${assessmentId}`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Kareerfit <no-reply@kareerfit.com>',
      to: [to],
      subject: `Your ${assessmentName} Assessment Results`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4f46e5;">Your Assessment Results</h1>
          <p>Hello ${name},</p>
          <p>Thank you for completing the ${assessmentName} assessment. Your results are now available.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resultsUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              View Your Results
            </a>
          </div>
          
          ${pdfUrl ? `<p>You can also <a href="${pdfUrl}">download your results as a PDF</a>.</p>` : ''}
          
          <p>If you have any questions about your results, please contact our support team.</p>
          
          <p>Best regards,<br>The Kareerfit Team</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error in sendAssessmentEmail:', error);
    return { success: false, error };
  }
}