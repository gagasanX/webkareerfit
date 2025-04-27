// app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  try {
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
        // DO NOT include assignedAssessments until the database schema is updated
        // assignedAssessments: true  // This would cause the error
      },
    });

    if (!userData) {
      redirect('/login');
    }

    // Data is loaded server-side, but don't pass it to the component (it gets its own data)
    return <DashboardClient />;
    
  } catch (error) {
    console.error("Dashboard error:", error);
    
    // If the error is specifically about the missing column, handle it gracefully
    if (error instanceof Error && 
        error.message.includes("Assessment.assignedClerkId") &&
        error.message.includes("does not exist")) {
      return (
        <div className="p-8 bg-red-50 text-red-700 rounded-lg max-w-3xl mx-auto mt-8">
          <h2 className="text-xl font-bold mb-4">Database Schema Error</h2>
          <p>There appears to be a mismatch between the application code and database schema.</p>
          <p className="mt-2">Please contact the administrator to run database migrations.</p>
          <div className="mt-4 p-3 bg-white rounded-lg text-sm font-mono overflow-auto">
            {error.message}
          </div>
        </div>
      );
    }
    
    // Generic error page
    return (
      <div className="p-8 bg-red-50 text-red-700 rounded-lg max-w-3xl mx-auto mt-8">
        <h2 className="text-xl font-bold mb-4">Error Loading Dashboard</h2>
        <p>We encountered a problem loading your dashboard data.</p>
        <p className="mt-2">Please try again later or contact support.</p>
      </div>
    );
  }
}