'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

// Type definitions for affiliate data
type AffiliateStats = {
  totalReferrals: number;
  totalEarnings: number;
  totalPaid: number;
  pendingAmount: number;
  affiliateCode: string;
};

type ReferralData = {
  id: string;
  referredEmail: string;
  status: string;
  createdAt: string;
  amount: number;
  paidStatus: string;
};

// Extended session user type
type ExtendedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  isAffiliate?: boolean;
  referredBy?: string | null;
};

export default function AffiliateDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAffiliateData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/affiliate/stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch affiliate data');
        }
        
        const data = await response.json();
        setStats(data.stats);
        setReferrals(data.referrals || []);
      } catch (err) {
        console.error('Error fetching affiliate data:', err);
        setError('Failed to load affiliate data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchAffiliateData();
    }
  }, [session]);

  const copyReferralLink = () => {
    if (!stats?.affiliateCode) return;
    
    const referralLink = `${window.location.origin}/register?ref=${stats.affiliateCode}`;
    navigator.clipboard.writeText(referralLink);
    
    // Show a temporary "Copied" notification
    const copyBtn = document.getElementById('copyLinkBtn');
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        if (copyBtn) copyBtn.textContent = originalText;
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-700 text-center">
        <p>{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Affiliate Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 shadow-sm">
          <h2 className="text-sm text-gray-500">Total Referrals</h2>
          <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
        </Card>
        
        <Card className="p-4 shadow-sm">
          <h2 className="text-sm text-gray-500">Total Earnings</h2>
          <p className="text-2xl font-bold">{formatPrice(stats?.totalEarnings || 0)}</p>
        </Card>
        
        <Card className="p-4 shadow-sm">
          <h2 className="text-sm text-gray-500">Paid</h2>
          <p className="text-2xl font-bold">{formatPrice(stats?.totalPaid || 0)}</p>
        </Card>
        
        <Card className="p-4 shadow-sm">
          <h2 className="text-sm text-gray-500">Pending</h2>
          <p className="text-2xl font-bold">{formatPrice(stats?.pendingAmount || 0)}</p>
        </Card>
      </div>
      
      {/* Referral Link */}
      <Card className="p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Your Referral Code</h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="flex-1 bg-gray-100 p-3 rounded-lg">
            <p className="font-medium">{stats?.affiliateCode || 'Loading...'}</p>
            <p className="text-sm text-gray-500 mt-1">
              Share this code or your referral link to earn commission
            </p>
          </div>
          <Button 
            id="copyLinkBtn"
            variant="outline" 
            onClick={copyReferralLink}
            className="whitespace-nowrap"
          >
            Copy Link
          </Button>
        </div>
      </Card>
      
      {/* Recent Referrals */}
      <Card className="shadow-sm overflow-hidden">
        <div className="p-6 border-b border-solid border-gray-300">
          <h2 className="text-lg font-medium">Recent Referrals</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {referrals.length > 0 ? (
                referrals.map((referral) => (
                  <tr key={referral.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {referral.referredEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        referral.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {referral.status === 'completed' ? 'Completed' : 'Incomplete'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(referral.createdAt).toLocaleDateString('en-US')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatPrice(referral.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        referral.paidStatus === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {referral.paidStatus === 'paid' ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                    No referrals found. Share your referral code to start earning commission!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* How it Works */}
      <Card className="p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-4">How the Program Works</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Share your referral code or link with friends, family, or anyone.</li>
          <li>When they register and complete an assessment using your referral code, you will receive % of their payment amount.</li>
          <li>You can withdraw your commission after reaching a minimum amount of RM30.</li>
        </ol>
        <div className="mt-4">
          <Link href="/affiliate/faq">
            <Button variant="outline">FAQ</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}