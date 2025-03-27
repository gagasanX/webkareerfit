'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Define types
interface AffiliateStats {
  totalReferrals: number;
  totalEarnings: number;
  conversionRate: number;
  pendingPayouts: number;
}

interface ReferralData {
  id: string;
  date: string;
  userName: string;
  assessmentType: string;
  status: 'completed' | 'pending' | 'cancelled';
  commission: number;
}

export default function AffiliateDashboardClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AffiliateStats>({
    totalReferrals: 0,
    totalEarnings: 0,
    conversionRate: 0,
    pendingPayouts: 0
  });
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [affiliateCode, setAffiliateCode] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showCopyMessage, setShowCopyMessage] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/affiliate');
      return;
    }

    if (status === 'authenticated') {
      fetchAffiliateData();
    }
  }, [status, router]);

  const fetchAffiliateData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/affiliate/dashboard');
      
      if (!response.ok) {
        if (response.status === 403) {
          // User is not an affiliate yet
          setIsAffiliate(false);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch affiliate data');
      }
      
      const data = await response.json();
      setIsAffiliate(true);
      setStats(data.stats);
      setReferrals(data.referrals || []);
      setAffiliateCode(data.affiliateCode || '');
      setError(null);
    } catch (err) {
      console.error('Error fetching affiliate data:', err);
      setError('Failed to load affiliate data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      const affiliateUrl = `${window.location.origin}?ref=${affiliateCode}`;
      await navigator.clipboard.writeText(affiliateUrl);
      setCopySuccess(true);
      setShowCopyMessage(true);
      setTimeout(() => setShowCopyMessage(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading affiliate dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-800">Error Loading Affiliate Dashboard</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <button 
                onClick={fetchAffiliateData}
                className="px-6 py-2 bg-[#7e43f1] text-white rounded-lg hover:bg-[#6a38d1]"
              >
                Try Again
              </button>
              <Link 
                href="/dashboard"
                className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAffiliate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Affiliate Program</h1>
            <Link 
              href="/dashboard"
              className="px-4 py-2 bg-white text-[#7e43f1] border border-[#7e43f1] rounded-lg hover:bg-purple-50 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
          
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-8 text-white">
              <h1 className="text-3xl font-bold mb-2">Become a KareerFit Affiliate</h1>
              <p className="text-white/90">
                Join our affiliate program and earn commission for every user who takes an assessment through your referral.
              </p>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 p-6 rounded-xl">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Share & Earn</h3>
                  <p className="text-sm text-gray-600">
                    Get a unique referral code to share with your network. Earn commission when they complete an assessment.
                  </p>
                </div>
                
                <div className="bg-purple-50 p-6 rounded-xl">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Competitive Rates</h3>
                  <p className="text-sm text-gray-600">
                    Earn up to 25% commission on every successful referral. Monthly payouts for your earnings.
                  </p>
                </div>
                
                <div className="bg-green-50 p-6 rounded-xl">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Trusted Partnership</h3>
                  <p className="text-sm text-gray-600">
                    Join a trusted platform helping people discover their ideal career paths and professional development.
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-xl mb-8">
                <h3 className="text-lg font-semibold mb-4">How It Works</h3>
                <ol className="space-y-4">
                  <li className="flex">
                    <span className="w-6 h-6 rounded-full bg-[#7e43f1] text-white flex items-center justify-center mr-3 flex-shrink-0">1</span>
                    <div>
                      <p className="font-medium">Apply to become an affiliate</p>
                      <p className="text-sm text-gray-600">Fill out the application form with your details.</p>
                    </div>
                  </li>
                  <li className="flex">
                    <span className="w-6 h-6 rounded-full bg-[#7e43f1] text-white flex items-center justify-center mr-3 flex-shrink-0">2</span>
                    <div>
                      <p className="font-medium">Get your unique referral code</p>
                      <p className="text-sm text-gray-600">Once approved, you'll receive a unique referral code and link.</p>
                    </div>
                  </li>
                  <li className="flex">
                    <span className="w-6 h-6 rounded-full bg-[#7e43f1] text-white flex items-center justify-center mr-3 flex-shrink-0">3</span>
                    <div>
                      <p className="font-medium">Share with your network</p>
                      <p className="text-sm text-gray-600">Share your link on social media, your website, or directly with friends.</p>
                    </div>
                  </li>
                  <li className="flex">
                    <span className="w-6 h-6 rounded-full bg-[#7e43f1] text-white flex items-center justify-center mr-3 flex-shrink-0">4</span>
                    <div>
                      <p className="font-medium">Earn commissions</p>
                      <p className="text-sm text-gray-600">Earn commission every time someone completes an assessment through your link.</p>
                    </div>
                  </li>
                </ol>
              </div>
              
              <div className="text-center">
                <Link 
                  href="/affiliate/join" 
                  className="inline-block px-8 py-3 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white font-medium rounded-lg hover:shadow-lg transition-shadow"
                >
                  Apply to Become an Affiliate
                </Link>
                <p className="mt-4 text-sm text-gray-500">
                  Already a member? <Link href="/login" className="text-[#7e43f1] hover:underline">Sign in</Link> to access your affiliate dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Affiliate dashboard for existing affiliates
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Affiliate Dashboard</h1>
          <Link 
            href="/dashboard"
            className="px-4 py-2 bg-white text-[#7e43f1] border border-[#7e43f1] rounded-lg hover:bg-purple-50 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-gray-500 text-xs uppercase">Total Referrals</h3>
            <div className="mt-1 text-2xl font-bold text-[#7e43f1]">{stats.totalReferrals}</div>
            <div className="mt-2 text-xs text-gray-500">People who used your referral code</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-gray-500 text-xs uppercase">Total Earnings</h3>
            <div className="mt-1 text-2xl font-bold text-green-600">RM {stats.totalEarnings.toFixed(2)}</div>
            <div className="mt-2 text-xs text-gray-500">Commissions from completed assessments</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-gray-500 text-xs uppercase">Conversion Rate</h3>
            <div className="mt-1 text-2xl font-bold text-[#38b6ff]">{stats.conversionRate.toFixed(2)}%</div>
            <div className="mt-2 text-xs text-gray-500">Percentage of referrals that completed an assessment</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-gray-500 text-xs uppercase">Pending Payouts</h3>
            <div className="mt-1 text-2xl font-bold text-orange-500">RM {stats.pendingPayouts.toFixed(2)}</div>
            <div className="mt-2 text-xs text-gray-500">Earnings awaiting payout</div>
          </div>
        </div>
        
        {/* Referral Code Section */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 className="font-medium text-gray-700 mb-4">Your Referral Link</h3>
          
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1 font-mono text-sm truncate">{window.location.origin}?ref={affiliateCode}</div>
              <button
                onClick={copyToClipboard}
                className="ml-2 p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Copy to clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
              {showCopyMessage && (
                <span className="ml-2 text-xs text-green-600">Copied!</span>
              )}
            </div>
            
            <div className="flex space-x-2">
              <a 
                href={`https://wa.me/?text=Check%20out%20KareerFit!%20Discover%20your%20ideal%20career%20path%20with%20their%20AI-powered%20assessments.%20Use%20my%20referral%20code:%20${affiliateCode}%20${window.location.origin}?ref=${affiliateCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Share on WhatsApp
              </a>
              
              <a 
                href={`https://twitter.com/intent/tweet?text=Check%20out%20KareerFit!%20Discover%20your%20ideal%20career%20path%20with%20their%20AI-powered%20assessments.%20Use%20my%20referral%20code:%20${affiliateCode}&url=${window.location.origin}?ref=${affiliateCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
                Share on Twitter
              </a>
            </div>
          </div>
        </div>
        
        {/* Referrals List */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-700">Recent Referrals</h3>
          </div>
          
          {referrals.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto h-16 w-16 text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h4 className="mt-2 text-gray-700 font-medium">No referrals yet</h4>
              <p className="mt-1 text-sm text-gray-500">Share your referral link to start earning commissions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {referrals.map((referral, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(referral.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{referral.userName}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{referral.assessmentType}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${
                          referral.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : referral.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {referral.status === 'completed' 
                            ? 'Completed' 
                            : referral.status === 'cancelled'
                            ? 'Cancelled'
                            : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${
                          referral.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {referral.status === 'completed' 
                            ? `RM ${referral.commission.toFixed(2)}` 
                            : referral.status === 'cancelled'
                            ? '-'
                            : 'Pending'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}