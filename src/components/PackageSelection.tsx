'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PackageSelectionProps {
  assessmentId: string;
  assessmentType: string;
  initialTier?: string;
}

type Tier = 'basic' | 'standard' | 'premium';

const VALID_TIERS: Tier[] = ['basic', 'standard', 'premium'];

export default function PackageSelection({
  assessmentId,
  assessmentType,
  initialTier = 'basic',
}: PackageSelectionProps) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<Tier>(
    VALID_TIERS.includes(initialTier as Tier) ? (initialTier as Tier) : 'basic'
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTierSelect = (tier: Tier) => {
    setSelectedTier(tier);
    setError(null); // Clear any previous errors
  };

  const handleContinue = async () => {
    if (!VALID_TIERS.includes(selectedTier)) {
      setError('Please select a valid package.');
      return;
    }

    if (!assessmentId || !assessmentType) {
      setError('Invalid assessment details. Please try again.');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/assessment/${assessmentType}/${assessmentId}/update-tier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: selectedTier,
          manualProcessing: selectedTier === 'standard' || selectedTier === 'premium',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update assessment tier');
      }

      // Redirect to payment page
      router.push(`/payment/${assessmentId}`);
    } catch (error) {
      console.error('Error updating assessment tier:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update package selection. Please try again.';
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-center mb-8">Choose Your Package</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Basic Analysis - RM50 - AI Processed */}
        <div
          className={`border rounded-lg p-6 cursor-pointer transition-all ${
            selectedTier === 'basic'
              ? 'border-[#7e43f1] bg-purple-50'
              : 'border-gray-200 hover:border-[#7e43f1] hover:bg-purple-50/30'
          }`}
          onClick={() => handleTierSelect('basic')}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Basic Analysis</h2>
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedTier === 'basic' ? 'border-[#7e43f1]' : 'border-gray-300'
              }`}
            >
              {selectedTier === 'basic' && (
                <div className="w-3 h-3 rounded-full bg-[#7e43f1]"></div>
              )}
            </div>
          </div>

          <div className="text-2xl font-bold mb-3">RM 50</div>

          <p className="text-gray-600 text-sm mb-4">
            Essential insights to understand your career profile
          </p>

          <ul className="space-y-2">
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Core assessment results
            </li>
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Strength and weakness identification
            </li>
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Basic career alignment indicators
            </li>
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Digital report delivery
            </li>
            <li className="flex items-center text-sm text-blue-600 font-medium">
              <svg
                className="h-5 w-5 text-blue-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              AI-powered analysis
            </li>
          </ul>
        </div>

        {/* Basic Report - RM100 - Manual Review */}
        <div
          className={`border rounded-lg p-6 cursor-pointer transition-all ${
            selectedTier === 'standard'
              ? 'border-[#7e43f1] bg-purple-50'
              : 'border-gray-200 hover:border-[#7e43f1] hover:bg-purple-50/30'
          }`}
          onClick={() => handleTierSelect('standard')}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Basic Report</h2>
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedTier === 'standard' ? 'border-[#7e43f1]' : 'border-gray-300'
              }`}
            >
              {selectedTier === 'standard' && (
                <div className="w-3 h-3 rounded-full bg-[#7e43f1]"></div>
              )}
            </div>
          </div>

          <div className="text-2xl font-bold mb-3">RM 100</div>

          <p className="text-gray-600 text-sm mb-4">
            Comprehensive analysis with detailed recommendations
          </p>

          <ul className="space-y-2">
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              All Basic Analysis features
            </li>
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Detailed personality assessment
            </li>
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Comprehensive career recommendations
            </li>
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Development path suggestions
            </li>
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Personalized action plan
            </li>
            <li className="flex items-center text-sm text-blue-600 font-medium">
              <svg
                className="h-5 w-5 text-blue-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Expert manual review
            </li>
          </ul>
        </div>

        {/* Full Report + Interview - RM250 - Premium Manual Review */}
        <div
          className={`border rounded-lg p-6 cursor-pointer transition-all ${
            selectedTier === 'premium'
              ? 'border-[#7e43f1] bg-purple-50'
              : 'border-gray-200 hover:border-[#7e43f1] hover:bg-purple-50/30'
          }`}
          onClick={() => handleTierSelect('premium')}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Full Report + Interview</h2>
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedTier === 'premium' ? 'border-[#7e43f1]' : 'border-gray-300'
              }`}
            >
              {selectedTier === 'premium' && (
                <div className="w-3 h-3 rounded-full bg-[#7e43f1]"></div>
              )}
            </div>
          </div>

          <div className="text-2xl font-bold mb-3">RM 250</div>

          <p className="text-gray-600 text-sm mb-4">
            Complete analysis with professional consultation
          </p>

          <ul className="space-y-2">
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              All Basic Report features
            </li>
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              20-minute Interview Session
            </li>
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Personalized Q&A session
            </li>
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Custom career roadmap
            </li>
            <li className="flex items-center text-sm">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Follow-up report and resources
            </li>
            <li className="flex items-center text-sm text-blue-600 font-medium">
              <svg
                className="h-5 w-5 text-blue-500 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Priority expert manual review
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={handleContinue}
          disabled={isUpdating}
          className="px-6 py-2 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white font-medium rounded-lg hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isUpdating ? 'Processing...' : 'Continue to Payment'}
        </button>
      </div>
    </div>
  );
}