import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import AffiliateDashboardClient from './AffiliateDashboardClient';

export default async function AffiliatePage() {
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect('/login?callbackUrl=/affiliate');
  }

  return <AffiliateDashboardClient />;
}