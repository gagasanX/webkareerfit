// app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import DashboardClient from './dashboard-client';
import { User, Assessment } from '@/app/types';

export default async function DashboardPage() {
  // Auth check on the server
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/login?callbackUrl=/dashboard');
  }

  // Use type assertion to handle the extended user properties
  const userData = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    include: {
      assessments: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { payment: true },
      },
      affiliateStats: true,
    },
  });

  if (!userData) {
    redirect('/login');
  }

  // Data is loaded server-side, but we'll render the UI client-side
  return <DashboardClient />;
}