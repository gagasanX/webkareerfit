// /src/app/affiliate/AffiliateDashboardClient.tsx - MOBILE OPTIMIZED VERSION
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AffiliateStats {
  totalReferrals: number;
  totalEarnings: number;
  conversionRate: number;
  pendingPayouts: number;
  clickCount: number;
  clickRate: number;
  topPerformingChannel: string;
  monthlyGrowth: number;
  avgCommissionPerSale: number;
  totalClicks: number;
}

interface ReferralData {
  id: string;
  date: string;
  userName: string;
  assessmentType: string;
  status: 'completed' | 'pending' | 'cancelled';
  commission: number;
  source?: string;
}

// 🚀 COPYWRITING TEMPLATES
const copywritingTemplates = {
  whatsapp: {
    formal: `🌟 *Discover Your Dream Career with AI!*

Hi! I wanted to share something amazing with you - KareerFit's AI-powered career assessment that helped me understand my true potential.

✨ What makes it special:
• AI-driven personality & skill analysis
• Personalized career recommendations
• Industry insights & salary guides
• Professional development roadmap

Use my special referral code: *{{REFERRAL_CODE}}*
👉 {{REFERRAL_LINK}}

It's been a game-changer for me - thought you might find it valuable too! 🚀`,
    
    casual: `Hey! 😊

Found this cool career assessment app called KareerFit - it's like having a career counselor in your pocket! 📱

The AI analysis blew my mind 🤯 - showed me career paths I never considered and my hidden strengths.

Wanna try it? Use my code: *{{REFERRAL_CODE}}*
{{REFERRAL_LINK}}

Let me know what you discover! 🎯`,
    
    professional: `*Career Development Opportunity*

I've been using KareerFit's professional assessment platform and wanted to recommend it to ambitious professionals like yourself.

Their AI-powered analysis provides:
📊 Comprehensive personality profiling
🎯 Data-driven career matching
💼 Industry-specific insights
📈 Skills gap analysis

Professional referral code: *{{REFERRAL_CODE}}*
Platform access: {{REFERRAL_LINK}}

Worth exploring for strategic career planning.`
  },
  
  email: {
    subject: `Unlock Your Career Potential with AI-Powered Assessment`,
    
    body: `Hi [Name],

I hope this email finds you well! I wanted to share a resource that's been incredibly valuable for my career development.

**About KareerFit:**
KareerFit is an AI-powered career assessment platform that provides personalized insights into your strengths, ideal career paths, and professional development opportunities.

**What You'll Get:**
✅ Comprehensive personality & skills analysis  
✅ AI-matched career recommendations
✅ Industry salary insights & growth projections
✅ Personalized development roadmap
✅ Professional networking guidance

**Special Access:**
I'm sharing my referral code so you can access the platform with exclusive benefits:

**Referral Code:** {{REFERRAL_CODE}}
**Access Link:** {{REFERRAL_LINK}}

**Why I'm Sharing This:**
Career clarity is one of the most valuable investments we can make. This assessment helped me understand my strengths better and identify opportunities I hadn't considered.

Feel free to reach out if you have any questions about the platform!

Best regards,
[Your Name]

P.S. The assessment takes about 20-30 minutes and the insights are surprisingly detailed!`
  },
  
  social: {
    linkedin: `🚀 Just completed an incredible AI-powered career assessment that completely shifted my perspective on professional development!

KareerFit's platform uses advanced algorithms to analyze your personality, skills, and preferences to recommend ideal career paths you might never have considered.

Key features that impressed me:
🎯 Data-driven career matching
📊 Comprehensive strengths analysis  
💡 Hidden talent discovery
📈 Industry insights & salary data

For anyone looking to gain clarity on their career direction or exploring new opportunities, this is incredibly valuable.

Use referral code: {{REFERRAL_CODE}}
👉 {{REFERRAL_LINK}}

#CareerDevelopment #AI #ProfessionalGrowth #CareerCoaching`,

    facebook: `🌟 Game-changer alert! 🌟

Just discovered KareerFit - an AI career assessment that's like having a personal career coach! 🤖💼

What blew me away:
✨ Shows career paths you never thought of
🎯 Reveals your hidden strengths  
📊 Gives industry insights & salary data
🚀 Creates a personalized development plan

Perfect for anyone feeling stuck in their career or curious about new directions! 

Try it with my referral code: {{REFERRAL_CODE}}
{{REFERRAL_LINK}}

Let me know what careers it suggests for you - might be surprised! 😊

#CareerDiscovery #AI #ProfessionalDevelopment`,

    twitter: `🧠 AI + Career Planning = Mind Blown 🤯

@kareerfit's assessment revealed career paths I never considered & strengths I didn't know I had!

Perfect for:
🎯 Career changers
📈 Professional growth
💡 Self-discovery
🚀 Students & graduates

Use code: {{REFERRAL_CODE}}
{{REFERRAL_LINK}}

#CareerAI #ProfessionalGrowth #CareerCoaching`
  }
};

export default function AffiliateDashboardClient() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AffiliateStats>({
    totalReferrals: 0,
    totalEarnings: 0,
    conversionRate: 0,
    pendingPayouts: 0,
    clickCount: 0,
    clickRate: 0,
    topPerformingChannel: 'Direct',
    monthlyGrowth: 0,
    avgCommissionPerSale: 0,
    totalClicks: 0
  });
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [affiliateCode, setAffiliateCode] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showCopyMessage, setShowCopyMessage] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Enhanced states
  const [showCopywriting, setShowCopywriting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('whatsapp');
  const [selectedStyle, setSelectedStyle] = useState('casual');
  const [activeStatsTab, setActiveStatsTab] = useState('overview');

  useEffect(() => {
    if (!session && status === 'unauthenticated') {
      router.push('/login?callbackUrl=/affiliate');
      return;
    }

    if (session && status === 'authenticated') {
      checkAffiliateAccess();
    }
  }, [session, status, router]);

  const checkAffiliateAccess = async () => {
    if (!session?.user) {
      setError('No active session found');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/affiliate/dashboard', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (!data) throw new Error('No data received from server');
        
        setIsAffiliate(true);
        setStats(prev => ({
          ...prev,
          ...(data.stats || {}),
        }));
        setReferrals(data.referrals || []);
        setAffiliateCode(data.affiliateCode || '');
        setIsLoading(false);
        return;
      }
      
      if (response.status === 403) {
        if (retryCount < 2) {
          console.log('403 detected, checking affiliate status and refreshing session...');
          
          const statusCheck = await fetch('/api/user/affiliate-status', {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!statusCheck.ok) throw new Error('Failed to check affiliate status');
          
          const statusData = await statusCheck.json();
          
          if (statusData?.isAffiliate) {
            setRetryCount(prev => prev + 1);
            await update();
            
            setTimeout(() => {
              checkAffiliateAccess();
            }, 1000);
            return;
          }
        }
        
        setIsAffiliate(false);
        setIsLoading(false);
        return;
      }
      
      throw new Error(`Failed to fetch affiliate data: ${response.status}`);
      
    } catch (err) {
      console.error('Error checking affiliate access:', err);
      setError(err instanceof Error ? err.message : 'Failed to load affiliate data. Please try again.');
      setIsLoading(false);
    }
  };

  // Enhanced copy functions
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setShowCopyMessage(true);
      setTimeout(() => setShowCopyMessage(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  const getFormattedCopywriting = (template: string, style: string) => {
    const affiliateUrl = `${window.location.origin}?ref=${affiliateCode}`;
    let content = '';
    
    if (template === 'whatsapp') {
      content = copywritingTemplates.whatsapp[style as keyof typeof copywritingTemplates.whatsapp] || '';
    } else if (template === 'email') {
      content = copywritingTemplates.email.body || '';
    } else if (template === 'social') {
      content = copywritingTemplates.social[style as keyof typeof copywritingTemplates.social] || '';
    }
    
    if (!content) {
      console.warn(`No content found for template: ${template}, style: ${style}`);
      return `Use referral code: ${affiliateCode}\n${affiliateUrl}`;
    }
    
    return content
      .replace(/{{REFERRAL_CODE}}/g, affiliateCode)
      .replace(/{{REFERRAL_LINK}}/g, affiliateUrl);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">
            {retryCount > 0 ? 'Refreshing session...' : 'Loading affiliate dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg sm:text-xl font-bold text-gray-800">Error Loading Dashboard</h2>
            <p className="mt-2 text-gray-600 text-sm sm:text-base">{error}</p>
            <div className="mt-6 flex flex-col gap-3">
              <button 
                onClick={() => {
                  setRetryCount(0);
                  checkAffiliateAccess();
                }}
                className="w-full px-4 py-2 bg-[#7e43f1] text-white rounded-lg hover:bg-[#6a38d1] text-sm sm:text-base"
              >
                Try Again
              </button>
              <Link 
                href="/dashboard"
                className="w-full px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-center text-sm sm:text-base"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Affiliate Program</h1>
            <Link 
              href="/dashboard"
              className="px-4 py-2 bg-white text-[#7e43f1] border border-[#7e43f1] rounded-lg hover:bg-purple-50 transition-colors text-center text-sm sm:text-base"
            >
              Back to Dashboard
            </Link>
          </div>
          
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 sm:p-8 text-white">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Become a KareerFit Affiliate</h1>
              <p className="text-white/90 text-sm sm:text-base">
                Join our affiliate program and earn commission for every user who takes an assessment through your referral.
              </p>
            </div>
            
            <div className="p-4 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-blue-50 p-4 sm:p-6 rounded-xl">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3 sm:mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Share & Earn</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Get a unique referral code to share with your network. Earn commission when they complete an assessment.
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 sm:p-6 rounded-xl">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-3 sm:mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Competitive Rates</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Earn up to 25% commission on every successful referral. Monthly payouts for your earnings.
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 sm:p-6 rounded-xl sm:col-span-2 lg:col-span-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-3 sm:mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Trusted Partnership</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Join a trusted platform helping people discover their ideal career paths and professional development.
                  </p>
                </div>
              </div>
              
              <div className="text-center">
                <Link 
                  href="/affiliate/join" 
                  className="inline-block w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white font-medium rounded-lg hover:shadow-lg transition-shadow text-sm sm:text-base"
                >
                  Apply to Become an Affiliate
                </Link>
                <p className="mt-4 text-xs sm:text-sm text-gray-500">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Affiliate Dashboard</h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => setShowCopywriting(!showCopywriting)}
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-shadow text-sm"
            >
              📝 Get Templates
            </button>
            <Link 
              href="/dashboard"
              className="px-3 sm:px-4 py-2 bg-white text-[#7e43f1] border border-[#7e43f1] rounded-lg hover:bg-purple-50 transition-colors text-center text-sm"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* 🚀 MOBILE-OPTIMIZED COPYWRITING MODAL */}
        {showCopywriting && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">📝 Copy Templates</h2>
                  <button
                    onClick={() => setShowCopywriting(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl p-1"
                  >
                    ×
                  </button>
                </div>
                <p className="text-gray-600 mt-2 text-sm sm:text-base">Choose platform and style, then copy & paste!</p>
              </div>
              
              <div className="p-4 sm:p-6">
                {/* Template Selection - Mobile Optimized */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setSelectedTemplate('whatsapp')}
                    className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                      selectedTemplate === 'whatsapp' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    💬 WhatsApp
                  </button>
                  <button
                    onClick={() => setSelectedTemplate('email')}
                    className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                      selectedTemplate === 'email' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    📧 Email
                  </button>
                  <button
                    onClick={() => setSelectedTemplate('social')}
                    className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                      selectedTemplate === 'social' 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    📱 Social
                  </button>
                </div>

                {/* Style Selection - Mobile Optimized */}
                {(selectedTemplate === 'whatsapp' || selectedTemplate === 'social') && (
                  <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                    {selectedTemplate === 'whatsapp' && (
                      <>
                        <button
                          onClick={() => setSelectedStyle('casual')}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            selectedStyle === 'casual' 
                              ? 'bg-green-100 text-green-700 border border-green-300' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          😊 Casual
                        </button>
                        <button
                          onClick={() => setSelectedStyle('formal')}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            selectedStyle === 'formal' 
                              ? 'bg-green-100 text-green-700 border border-green-300' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          👔 Professional
                        </button>
                        <button
                          onClick={() => setSelectedStyle('professional')}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            selectedStyle === 'professional' 
                              ? 'bg-green-100 text-green-700 border border-green-300' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          💼 Business
                        </button>
                      </>
                    )}
                    
                    {selectedTemplate === 'social' && (
                      <>
                        <button
                          onClick={() => setSelectedStyle('linkedin')}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            selectedStyle === 'linkedin' 
                              ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          💼 LinkedIn
                        </button>
                        <button
                          onClick={() => setSelectedStyle('facebook')}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            selectedStyle === 'facebook' 
                              ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          📘 Facebook
                        </button>
                        <button
                          onClick={() => setSelectedStyle('twitter')}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            selectedStyle === 'twitter' 
                              ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          🐦 Twitter
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Template Preview - Mobile Optimized */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
                  {selectedTemplate === 'email' && (
                    <div className="mb-4">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Email Subject:</label>
                      <div className="bg-white p-2 sm:p-3 rounded border border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <span className="text-xs sm:text-sm">{copywritingTemplates.email.subject}</span>
                        <button
                          onClick={() => copyToClipboard(copywritingTemplates.email.subject)}
                          className="text-blue-500 hover:text-blue-700 text-xs sm:text-sm px-2 py-1 bg-blue-50 rounded self-start sm:self-auto"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    {selectedTemplate === 'email' ? 'Email Body:' : 'Message:'}
                  </label>
                  <div className="bg-white p-3 sm:p-4 rounded border border-gray-200 min-h-[150px] sm:min-h-[200px] whitespace-pre-wrap text-xs sm:text-sm overflow-x-auto">
                    {getFormattedCopywriting(selectedTemplate, selectedStyle)}
                  </div>
                </div>

                {/* Action Buttons - Mobile Optimized */}
                <div className="flex flex-col gap-3">
                  <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
                    <div><span className="font-medium">Code:</span> {affiliateCode}</div>
                    <div className="break-all"><span className="font-medium">Link:</span> {window.location.origin}?ref={affiliateCode}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(getFormattedCopywriting(selectedTemplate, selectedStyle))}
                    className="w-full px-4 py-3 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white rounded-lg hover:shadow-lg transition-shadow text-sm sm:text-base"
                  >
                    📋 Copy Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* MOBILE-OPTIMIZED ENHANCED STATS */}
        <div className="bg-white rounded-xl shadow-sm mb-4 sm:mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              <button
                onClick={() => setActiveStatsTab('overview')}
                className={`px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                  activeStatsTab === 'overview'
                    ? 'text-[#7e43f1] border-b-2 border-[#7e43f1]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveStatsTab('performance')}
                className={`px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                  activeStatsTab === 'performance'
                    ? 'text-[#7e43f1] border-b-2 border-[#7e43f1]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🚀 Performance
              </button>
              <button
                onClick={() => setActiveStatsTab('analytics')}
                className={`px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap ${
                  activeStatsTab === 'analytics'
                    ? 'text-[#7e43f1] border-b-2 border-[#7e43f1]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📈 Analytics
              </button>
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {activeStatsTab === 'overview' && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3 sm:p-5">
                  <h3 className="text-blue-700 text-xs uppercase font-semibold">Referrals</h3>
                  <div className="mt-1 text-xl sm:text-2xl font-bold text-blue-800">{stats.totalReferrals}</div>
                  <div className="mt-1 sm:mt-2 text-xs text-blue-600">People using your code</div>
                  <div className="mt-2 sm:mt-3 flex items-center text-xs text-blue-700">
                    <span className="mr-1">📈</span>
                    +{stats.monthlyGrowth}%
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-3 sm:p-5">
                  <h3 className="text-green-700 text-xs uppercase font-semibold">Earnings</h3>
                  <div className="mt-1 text-xl sm:text-2xl font-bold text-green-800">RM {stats.totalEarnings.toFixed(2)}</div>
                  <div className="mt-1 sm:mt-2 text-xs text-green-600">From assessments</div>
                  <div className="mt-2 sm:mt-3 flex items-center text-xs text-green-700">
                    <span className="mr-1">💰</span>
                    Avg RM {stats.avgCommissionPerSale.toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-3 sm:p-5">
                  <h3 className="text-purple-700 text-xs uppercase font-semibold">Conversion</h3>
                  <div className="mt-1 text-xl sm:text-2xl font-bold text-purple-800">{stats.conversionRate.toFixed(2)}%</div>
                  <div className="mt-1 sm:mt-2 text-xs text-purple-600">Referrals → Customers</div>
                  <div className="mt-2 sm:mt-3 flex items-center text-xs text-purple-700">
                    <span className="mr-1">🎯</span>
                    {stats.conversionRate > 5 ? 'Excellent!' : 'Growing'}
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-3 sm:p-5">
                  <h3 className="text-orange-700 text-xs uppercase font-semibold">Pending</h3>
                  <div className="mt-1 text-xl sm:text-2xl font-bold text-orange-800">RM {stats.pendingPayouts.toFixed(2)}</div>
                  <div className="mt-1 sm:mt-2 text-xs text-orange-600">Awaiting payout</div>
                  <div className="mt-2 sm:mt-3 flex items-center text-xs text-orange-700">
                    <span className="mr-1">⏰</span>
                    Next: 1st
                  </div>
                </div>
              </div>
            )}

            {activeStatsTab === 'performance' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white border-2 border-blue-100 rounded-xl p-4 sm:p-5">
                  <h3 className="text-gray-700 font-semibold mb-3 sm:mb-4 text-sm sm:text-base">📊 Click Performance</h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-gray-600">Total Clicks</span>
                      <span className="font-bold text-blue-600 text-sm sm:text-base">{stats.totalClicks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-gray-600">Click Rate</span>
                      <span className="font-bold text-blue-600 text-sm sm:text-base">{stats.clickRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-gray-600">Clicks → Signups</span>
                      <span className="font-bold text-blue-600 text-sm sm:text-base">{((stats.totalReferrals / Math.max(stats.totalClicks, 1)) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-green-100 rounded-xl p-4 sm:p-5">
                  <h3 className="text-gray-700 font-semibold mb-3 sm:mb-4 text-sm sm:text-base">🎯 Top Channel</h3>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl mb-2">
                      {stats.topPerformingChannel === 'WhatsApp' ? '💬' :
                       stats.topPerformingChannel === 'Email' ? '📧' :
                       stats.topPerformingChannel === 'Social' ? '📱' : '🔗'}
                    </div>
                    <div className="font-bold text-green-600 text-sm sm:text-lg">{stats.topPerformingChannel}</div>
                    <div className="text-xs text-gray-500 mt-2">Best performing source</div>
                  </div>
                </div>

                <div className="bg-white border-2 border-purple-100 rounded-xl p-4 sm:p-5 sm:col-span-2 lg:col-span-1">
                  <h3 className="text-gray-700 font-semibold mb-3 sm:mb-4 text-sm sm:text-base">🏆 Affiliate Level</h3>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl mb-2">
                      {stats.totalReferrals >= 50 ? '💎' :
                       stats.totalReferrals >= 25 ? '🥇' :
                       stats.totalReferrals >= 10 ? '🥈' :
                       stats.totalReferrals >= 5 ? '🥉' : '🌟'}
                    </div>
                    <div className="font-bold text-purple-600 text-sm sm:text-lg">
                      {stats.totalReferrals >= 50 ? 'Diamond' :
                       stats.totalReferrals >= 25 ? 'Gold' :
                       stats.totalReferrals >= 10 ? 'Silver' :
                       stats.totalReferrals >= 5 ? 'Bronze' : 'Starter'}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {stats.totalReferrals < 50 && (
                        `${50 - stats.totalReferrals} more to next level`
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStatsTab === 'analytics' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 sm:p-6">
                  <h3 className="text-gray-700 font-semibold mb-3 sm:mb-4 text-sm sm:text-base">📈 Growth Metrics</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="text-center">
                      <div className="text-lg sm:text-2xl font-bold text-indigo-600">{stats.monthlyGrowth}%</div>
                      <div className="text-xs text-gray-600">Monthly Growth</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-2xl font-bold text-purple-600">{(stats.totalEarnings / Math.max(stats.totalReferrals, 1)).toFixed(0)}</div>
                      <div className="text-xs text-gray-600">Revenue Per Referral</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.totalClicks > 0 ? (stats.totalReferrals / stats.totalClicks * 100).toFixed(1) : '0'}%</div>
                      <div className="text-xs text-gray-600">Signup Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-2xl font-bold text-green-600">{(stats.conversionRate * stats.avgCommissionPerSale / 100).toFixed(2)}</div>
                      <div className="text-xs text-gray-600">Earnings Per Click</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
                  <h3 className="text-gray-700 font-semibold mb-3 sm:mb-4 text-sm sm:text-base">💡 Performance Tips</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex items-start p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-500 mr-2 sm:mr-3">💬</span>
                      <div>
                        <div className="font-medium text-blue-800 text-sm">Personal Touch</div>
                        <div className="text-xs text-blue-600">Share your personal experience</div>
                      </div>
                    </div>
                    <div className="flex items-start p-3 bg-green-50 rounded-lg">
                      <span className="text-green-500 mr-2 sm:mr-3">🎯</span>
                      <div>
                        <div className="font-medium text-green-800 text-sm">Target Audience</div>
                        <div className="text-xs text-green-600">Focus on career-focused people</div>
                      </div>
                    </div>
                    <div className="flex items-start p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-500 mr-2 sm:mr-3">📱</span>
                      <div>
                        <div className="font-medium text-purple-800 text-sm">Multi-Channel</div>
                        <div className="text-xs text-purple-600">Share across multiple platforms</div>
                      </div>
                    </div>
                    <div className="flex items-start p-3 bg-orange-50 rounded-lg">
                      <span className="text-orange-500 mr-2 sm:mr-3">⏰</span>
                      <div>
                        <div className="font-medium text-orange-800 text-sm">Timing Matters</div>
                        <div className="text-xs text-orange-600">Share during career seasons</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* MOBILE-OPTIMIZED Referral Code Section */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 mb-4 sm:mb-6">
          <h3 className="font-medium text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">🔗 Your Referral Tools</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Quick Share Links - Mobile Optimized */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Quick Share</label>
              <div className="flex items-center p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200 mb-3">
                <div className="flex-1 font-mono text-xs sm:text-sm truncate pr-2">{window.location.origin}?ref={affiliateCode}</div>
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}?ref=${affiliateCode}`)}
                  className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 focus:outline-none flex-shrink-0"
                  aria-label="Copy to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
                {showCopyMessage && (
                  <span className="ml-1 sm:ml-2 text-xs text-green-600 flex-shrink-0">Copied!</span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <a 
                  href={`https://wa.me/?text=Check%20out%20KareerFit!%20Discover%20your%20ideal%20career%20path%20with%20their%20AI-powered%20assessments.%20Use%20my%20referral%20code:%20${affiliateCode}%20${window.location.origin}?ref=${affiliateCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 sm:px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center text-xs sm:text-sm"
                >
                  💬 WhatsApp
                </a>
                
                <a 
                  href={`https://twitter.com/intent/tweet?text=Check%20out%20KareerFit!%20Discover%20your%20ideal%20career%20path%20with%20their%20AI-powered%20assessments.%20Use%20my%20referral%20code:%20${affiliateCode}&url=${window.location.origin}?ref=${affiliateCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 sm:px-3 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center text-xs sm:text-sm"
                >
                  🐦 Twitter
                </a>
                
                <a 
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin + '?ref=' + affiliateCode)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 sm:px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-xs sm:text-sm"
                >
                  💼 LinkedIn
                </a>
                
                <a 
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '?ref=' + affiliateCode)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 sm:px-3 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors flex items-center justify-center text-xs sm:text-sm"
                >
                  📘 Facebook
                </a>
              </div>
            </div>

            {/* Referral Code - Mobile Optimized */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Your Referral Code</label>
              <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] rounded-lg p-3 sm:p-4 text-white text-center">
                <div className="text-lg sm:text-2xl font-bold font-mono mb-2">{affiliateCode}</div>
                <div className="text-xs sm:text-sm opacity-90">Share this code with anyone!</div>
                <button
                  onClick={() => copyToClipboard(affiliateCode)}
                  className="mt-2 sm:mt-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-xs sm:text-sm"
                >
                  📋 Copy Code
                </button>
              </div>
              
              <div className="mt-3 sm:mt-4 text-center">
                <div className="bg-white border-2 border-gray-200 rounded-lg p-3 sm:p-4 inline-block">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-500">QR Code</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">QR for easy sharing</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* MOBILE-OPTIMIZED Referrals List */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2">
            <h3 className="font-medium text-gray-700 text-sm sm:text-base">Recent Referrals</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Total: {stats.totalReferrals}</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                {referrals.filter(r => r.status === 'completed').length} Converted
              </span>
            </div>
          </div>
          
          {referrals.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h4 className="mt-2 text-gray-700 font-medium text-sm sm:text-base">No referrals yet</h4>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">Use the copy templates above to start sharing!</p>
              <button
                onClick={() => setShowCopywriting(true)}
                className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-[#7e43f1] text-white rounded-lg text-xs sm:text-sm"
              >
                📝 Get Copy Templates
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {referrals.map((referral, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                          {referral.userName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{referral.userName}</div>
                          <div className="text-xs text-gray-500">{new Date(referral.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${
                        referral.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : referral.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {referral.status === 'completed' 
                          ? '✅' 
                          : referral.status === 'cancelled'
                          ? '❌'
                          : '⏳'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-xs text-gray-600">{referral.assessmentType || 'Pending'}</div>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                          {referral.source || 'Direct'}
                        </span>
                      </div>
                      <div className={`text-sm font-medium ${
                        referral.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {referral.status === 'completed' 
                          ? `RM ${referral.commission.toFixed(2)}` 
                          : referral.status === 'cancelled'
                          ? '-'
                          : 'Pending'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
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
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] rounded-full flex items-center justify-center text-white text-xs font-bold mr-3">
                              {referral.userName?.charAt(0) || 'U'}
                            </div>
                            <div className="text-sm font-medium text-gray-900">{referral.userName}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{referral.assessmentType || 'Pending'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            {referral.source || 'Direct'}
                          </span>
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
                              ? '✅ Completed' 
                              : referral.status === 'cancelled'
                              ? '❌ Cancelled'
                              : '⏳ Pending'}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}