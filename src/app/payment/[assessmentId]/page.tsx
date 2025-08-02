// /src/app/payment/[assessmentId]/page.tsx - COMPLETELY FIXED
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { getTierPrice } from '@/lib/utils/priceCalculation';
import MinimalPaymentClient from './MinimalPaymentClient';

// 🔥 FORCE STATIC PROPS TYPE
interface PageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function PaymentPage({ params }: PageProps) {
  try {
    // 🔥 FIX: Await params properly
    const resolvedParams = await params;
    const { assessmentId } = resolvedParams;
    
    // 🔥 FIX: Check session first
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      redirect(`/login?callbackUrl=/payment/${assessmentId}`);
    }

    // 🔥 FIX: Validate assessment with proper error handling
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        type: true,
        tier: true,
        userId: true,
        status: true
      }
    });

    if (!assessment || assessment.userId !== session.user.id) {
      redirect('/dashboard');
    }

    // 🔥 FIX: Use centralized price calculation
    const basePrice = getTierPrice(assessment.tier);

    return (
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-md mx-auto">
          <MinimalPaymentClient 
            assessmentId={assessment.id}
            assessmentType={assessment.type}
            tier={assessment.tier}
            basePrice={basePrice}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Payment page error:', error);
    redirect('/dashboard');
  }
}