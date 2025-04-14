// src/app/clerk/dashboard/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import StatCard from '@/components/clerk/StatCard';
import RecentAssessmentsTable from '@/components/clerk/RecentAssessmentsTable';

export default async function ClerkDashboardPage() {
  // Verify clerk permissions on server
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }
  
  // Check for role or isClerk/isAdmin for backward compatibility
  const hasClerkAccess = 
    session.user.role === 'CLERK' || 
    session.user.role === 'ADMIN' || 
    session.user.isClerk || 
    session.user.isAdmin;
    
  if (!hasClerkAccess) {
    redirect('/');
  }

  // Fetch dashboard stats - Use role enum instead of isClerk
  const whereCondition: any = {
    role: 'USER', // Only count regular users
  };

  const totalUsersCount = await prisma.user.count({
    where: whereCondition,
  });

  const totalAssessmentsCount = await prisma.assessment.count();

  const pendingAssessmentsCount = await prisma.assessment.count({
    where: {
      status: 'pending',
    },
  });

  const recentAssessments = await prisma.assessment.findMany({
    take: 10,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Total Users" 
          value={totalUsersCount} 
          description="Registered users" 
          icon="users" 
          color="blue"
        />
        <StatCard 
          title="Total Assessments" 
          value={totalAssessmentsCount} 
          description="All assessments" 
          icon="clipboard-check" 
          color="green"
        />
        <StatCard 
          title="Pending Assessments" 
          value={pendingAssessmentsCount} 
          description="Require attention" 
          icon="clock" 
          color="amber"
        />
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">Recent Assessments</h3>
        </div>
        <RecentAssessmentsTable assessments={recentAssessments} />
      </div>
    </div>
  );
}