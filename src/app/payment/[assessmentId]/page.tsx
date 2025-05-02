import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import PaymentClient from './PaymentClient';

export default async function PaymentPage({ params }: { params: { assessmentId: string } }) {
  const session = await getServerSession(authOptions);
  const assessmentId = params.assessmentId; // Extract it once to avoid multiple access

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect(`/login?callbackUrl=/payment/${assessmentId}`);
  }

  // Get assessment details - FORCE DATABASE REFRESH
  console.log(`Loading assessment ${assessmentId} for payment page`);
  
  // Fetch the assessment directly - avoid any caching issues
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      payment: {
        include: { coupon: true }
      }
    }
  });

  console.log(`Assessment loaded: ${JSON.stringify({
    id: assessment?.id,
    type: assessment?.type,
    tier: assessment?.tier,
    price: assessment?.price,
    status: assessment?.status
  })}`);

  // If assessment doesn't exist or doesn't belong to user, redirect to dashboard
  if (!assessment || assessment.userId !== session.user.id) {
    console.log("Assessment not found or doesn't belong to user, redirecting to dashboard");
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

  // Critical fix: Set the base price according to the tier
  // Explicitly check the tier value and map to the corresponding price
  let basePrice = 50; // Default to basic price
  
  if (assessment.tier === 'basic') {
    basePrice = 50;
  } else if (assessment.tier === 'standard') {
    basePrice = 100;
  } else if (assessment.tier === 'premium') {
    basePrice = 250;
  }
  
  // Important: If the assessment's price is already set and differs from our calculated basePrice,
  // use the assessment's price instead to ensure consistency
  if (assessment.price && assessment.price !== basePrice) {
    console.log(`Assessment already has a price (${assessment.price}) that differs from calculated basePrice (${basePrice}). Using assessment price.`);
    basePrice = assessment.price;
  }
  
  console.log(`[PaymentPage] ID: ${assessment.id}, Tier: ${assessment.tier}, Setting basePrice: ${basePrice}`);
  
  const assessmentType = assessment.type as keyof typeof assessmentLabels;
  const assessmentLabel = assessmentLabels[assessmentType] || assessment.type;

  // Package labels for display
  const packageLabels = {
    basic: 'Basic Analysis',
    standard: 'Basic Report',
    premium: 'Full Report + Interview'
  };

  // Get the package label
  const packageLabel = packageLabels[assessment.tier as keyof typeof packageLabels] || 'Custom Package';

  // Update any existing pending payment to match the current price
  if (assessment.payment && assessment.payment.status === 'pending' && assessment.payment.amount !== basePrice) {
    console.log(`Updating existing payment from ${assessment.payment.amount} to ${basePrice}`);
    await prisma.payment.update({
      where: { id: assessment.payment.id },
      data: { amount: basePrice }
    });
  }

  // Debug output
  console.log(`Ready to render payment page with: 
    - Assessment ID: ${assessment.id}
    - Type: ${assessment.type} (${assessmentLabel})
    - Tier: ${assessment.tier} (${packageLabel})
    - Price: ${basePrice}`);

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