// src/app/clerk/layout.tsx
import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth';
import ClerkSidebar from '@/components/clerk/ClerkSidebar';

export const metadata: Metadata = {
  title: 'Clerk Dashboard',
  description: 'Manage application data as a clerk',
};

export default async function ClerkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verify user is authenticated and has clerk permissions on the server side
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }
  
  // Change from role check to isClerk/isAdmin check
  if (!session.user.isClerk && !session.user.isAdmin) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <ClerkSidebar />
      <div className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Clerk Dashboard</h1>
          <p className="text-gray-600">Manage application users and assessments</p>
        </div>
        <main className="bg-white rounded-lg shadow-md p-6">
          {children}
        </main>
      </div>
    </div>
  );
}