import { prisma } from '@/lib/db';
import { sendAssessmentEmail as sendEmail } from './brevoService';
import type { AssessmentEmailData } from './brevoService';

// Assessment type labels
const assessmentTypeLabels: Record<string, string> = {
  fjrl: 'First Job Readiness Level',
  ijrl: 'Ideal Job Readiness Level',
  cdrl: 'Career Development Readiness Level',
  ccrl: 'Career Comeback Readiness Level',
  ctrl: 'Career Transition Readiness Level',
  rrl: 'Retirement Readiness Level',
  irl: 'Internship Readiness Level',
};

interface SendAssessmentEmailParams {
  userId: string;
  assessmentId: string;
  assessmentType: string;
}

export async function sendAssessmentEmail(params: SendAssessmentEmailParams): Promise<boolean> {
  try {
    console.log(`Sending assessment email for assessment: ${params.assessmentId}`);
    
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { name: true, email: true }
    });
    
    if (!user || !user.email) {
      console.error('User not found or no email:', params.userId);
      return false;
    }
    
    const assessmentName = assessmentTypeLabels[params.assessmentType] || params.assessmentType;
    
    const emailData: AssessmentEmailData = {
      userName: user.name || 'Valued User',
      email: user.email,
      assessmentType: params.assessmentType,
      assessmentId: params.assessmentId,
      assessmentName
    };
    
    const sent = await sendEmail(emailData);
    
    if (sent) {
      console.log(`Assessment email sent successfully for: ${params.assessmentId}`);
    } else {
      console.error(`Failed to send assessment email for: ${params.assessmentId}`);
    }
    
    return sent;
  } catch (error) {
    console.error('Error sending assessment email:', error);
    return false;
  }
}

// Alternative function for backward compatibility
export async function sendAssessmentCompletionEmail(
  userEmail: string, 
  userName: string, 
  assessmentType: string, 
  assessmentId: string
): Promise<boolean> {
  const assessmentName = assessmentTypeLabels[assessmentType] || assessmentType;
  
  const emailData: AssessmentEmailData = {
    userName,
    email: userEmail,
    assessmentType,
    assessmentId,
    assessmentName
  };
  
  return sendEmail(emailData);
}