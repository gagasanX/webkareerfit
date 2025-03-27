import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import PaymentClient from './PaymentClient';

export default async function PaymentPage({ params }: { params: { assessmentId: string } }) {
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect(`/login?callbackUrl=/payment/${params.assessmentId}`);
  }

  // Get assessment details
  const assessment = await prisma.assessment.findUnique({
    where: { id: params.assessmentId },
    include: {
      payment: {
        include: { coupon: true }
      }
    }
  });

  // If assessment doesn't exist or doesn't belong to user, redirect to dashboard
  if (!assessment || assessment.userId !== session.user.id) {
    redirect('/dashboard');
  }

  // Get assessment type label
  const assessmentLabels = {
    fjrl: 'First Job Readiness Level',
    ijrl: 'Ideal Job Readiness Level',
    cdrl: 'Career Development Readiness Level',
    ccrl: 'Career Comeback Readiness Level',
    ctrl: 'Career Transition Readiness Level',
    rrl: 'Retirement Readiness Level',
    irl: 'Internship Readiness Level',
  };

  // Determine price based on tier
  const tierPrices = {
    basic: 50,       // Basic Analysis
    standard: 100,   // Basic Report
    premium: 250     // Full Report + Interview
  };

  // Get the base price based on the tier, defaulting to the assessment's current price if tier not found
  const assessmentTier = assessment.tier as keyof typeof tierPrices || 'basic';
  const basePrice = tierPrices[assessmentTier] || assessment.price;
  
  const assessmentType = assessment.type as keyof typeof assessmentLabels;
  const assessmentLabel = assessmentLabels[assessmentType] || assessment.type;

  // Package labels for display
  const packageLabels = {
    basic: 'Basic Analysis',
    standard: 'Basic Report',
    premium: 'Full Report + Interview'
  };

  // Get the package label
  const packageLabel = packageLabels[assessmentTier as keyof typeof packageLabels] || 'Custom Package';

  // No type conversion needed - pass the session user directly
  return (
    <PaymentClient 
      assessment={assessment} 
      basePrice={basePrice}
      assessmentLabel={assessmentLabel}
      packageLabel={packageLabel}
      user={session.user}
    />
  );
}