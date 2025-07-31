'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ReferralWelcome() {
  const { data: session } = useSession();
  const [showWelcome, setShowWelcome] = useState(false);
  const [referralInfo, setReferralInfo] = useState<{
    referredBy: string;
    affiliateName: string;
  } | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      checkReferralStatus();
    }
  }, [session]);

  const checkReferralStatus = async () => {
    try {
      const response = await fetch('/api/user/referral-info');
      if (response.ok) {
        const data = await response.json();
        if (data.isReferred && !data.hasCompletedAssessment) {
          setReferralInfo({
            referredBy: data.referredBy,
            affiliateName: data.affiliateName
          });
          setShowWelcome(true);
        }
      }
    } catch (error) {
      console.error('Error checking referral status:', error);
    }
  };

  if (!showWelcome || !referralInfo) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">🎉 Welcome to KAREERfit!</h3>
          <p className="text-white/90 mb-3">
            You were referred by <strong>{referralInfo.affiliateName}</strong>. 
            As a special welcome, you'll receive exclusive benefits on your first career assessment!
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">✨ Priority Support</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">🎯 Personalized Guidance</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">💰 Special Pricing</span>
          </div>
        </div>
        <button
          onClick={() => setShowWelcome(false)}
          className="text-white/70 hover:text-white ml-4 text-xl"
        >
          ✕
        </button>
      </div>
    </div>
  );
}