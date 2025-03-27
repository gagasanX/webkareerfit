import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import AffiliateJoinClient from './AffiliateJoinClient';

export default async function AffiliateJoinPage() {
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect('/login?callbackUrl=/affiliate/join');
  }

  return <AffiliateJoinClient />;
}