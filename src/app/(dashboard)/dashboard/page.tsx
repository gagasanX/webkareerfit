import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  // Auth check on the server
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/login?callbackUrl=/dashboard');
  }

  try {
    // Fetch user data with assessments and affiliate stats
    const userData = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      include: {
        assessments: {
          orderBy: { createdAt: 'desc' },
          include: { payment: true },
        },
        affiliateStats: true,
      },
    });

    if (!userData) {
      redirect('/login');
    }

    // The client component will handle its own data fetching
    return <DashboardClient />;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return <DashboardClient />;
  }
}