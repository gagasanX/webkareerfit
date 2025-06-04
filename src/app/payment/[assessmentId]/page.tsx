import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import PaymentClient from './PaymentClient';

// CRITICAL FIX: Proper Next.js 15 async params handling
export default async function PaymentPage({ 
  params 
}: { 
  params: Promise<{ assessmentId: string }> 
}) {
  const session = await getServerSession(authOptions);
  
  // FIXED: Properly await params for Next.js 15
  const resolvedParams = await params;
  const assessmentId = resolvedParams.assessmentId;

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

  // CRITICAL FIX: Use proper tier-based pricing from single source of truth
  const TIER_PRICES = {
    basic: 50,
    standard: 100,
    premium: 250,
  };
  
  // Get base price from tier (most reliable method)
  let basePrice = TIER_PRICES[assessment.tier as keyof typeof TIER_PRICES] || TIER_PRICES.basic;
  
  // CRITICAL FIX: Only use assessment.price if it matches expected tier pricing
  // This prevents overwrites and ensures consistency
  const expectedPrice = TIER_PRICES[assessment.tier as keyof typeof TIER_PRICES];
  if (assessment.price && assessment.price === expectedPrice) {
    basePrice = assessment.price;
    console.log(`[PaymentPage] Using assessment price (matches tier): ${assessment.price}`);
  } else if (assessment.price && assessment.price !== expectedPrice) {
    console.log(`[PaymentPage] Price mismatch - Tier: ${assessment.tier} expects ${expectedPrice}, DB has ${assessment.price}. Using tier price.`);
    // Update assessment price to match tier
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { price: basePrice }
    });
  }
  
  console.log(`[PaymentPage] Final pricing - ID: ${assessment.id}, Tier: ${assessment.tier}, Price: ${basePrice}`);
  
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

  // FIXED: Update any existing pending payment to match the tier price
  if (assessment.payment && assessment.payment.status === 'pending' && assessment.payment.amount !== basePrice) {
    console.log(`Updating existing payment from ${assessment.payment.amount} to ${basePrice} (tier-based)`);
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