// src/app/assessment/choose-package/[assessmentId]/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import PackageSelection from '@/components/PackageSelection';
import AssessmentDebugHelper from '@/components/AssessmentDebugHelper';

export default async function ChoosePackagePage({ params }: { params: { assessmentId: string } }) {
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect(`/login?callbackUrl=/assessment/choose-package/${params.assessmentId}`);
  }

  console.log(`ChoosePackagePage: assessmentId=${params.assessmentId}, userId=${session.user.id}`);

  // Get assessment details
  const assessment = await prisma.assessment.findUnique({
    where: { id: params.assessmentId },
  });

  console.log(`Assessment: ${JSON.stringify(assessment)}`);

  // If assessment doesn't exist or doesn't belong to user, redirect to dashboard
  if (!assessment || assessment.userId !== session.user.id) {
    console.log(`Redirecting to /dashboard: assessment=${!!assessment}, userMatch=${assessment?.userId === session.user.id}`);
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6">
            <h1 className="text-2xl font-bold text-white">Select Your Package</h1>
            <p className="text-white/80 mt-1">
              Choose the package that best fits your career development needs
            </p>
          </div>
          
          <div className="p-6">
            <PackageSelection 
              assessmentId={assessment.id} 
              assessmentType={assessment.type} 
              initialTier={assessment.tier || 'basic'} 
            />
            
            {/* Only show in development mode */}
            {process.env.NODE_ENV === 'development' && (
              <AssessmentDebugHelper
                assessmentId={assessment.id}
                assessmentType={assessment.type}
                currentTier={assessment.tier || 'basic'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}