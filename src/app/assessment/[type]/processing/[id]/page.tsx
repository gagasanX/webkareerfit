// app/assessment/[type]/processing/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

export default function ProcessingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const type = params.type as string;
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [checkCount, setCheckCount] = useState(0);
  const [message, setMessage] = useState('');
  
  // Check authentication status
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/assessment/${type}/processing/${id}`);
      return;
    }
  }, [status, router, type, id]);
  
  // Poll for assessment status
  useEffect(() => {
    if (status !== 'authenticated' || !type || !id) return;
    
    const checkStatus = async () => {
      try {
        console.log(`Checking status for assessment ${id}, attempt ${checkCount + 1}`);
        const response = await fetch(`/api/assessment/${type}/${id}/check-status`);
        
        if (!response.ok) {
          throw new Error(`Failed to check assessment status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Status check response:', data);
        
        // Update message if available
        if (data.message) {
          setMessage(data.message);
        }
        
        // Update progress
        if (typeof data.progress === 'number') {
          setProgress(data.progress);
        } else {
          // If no progress provided, increment based on check count
          setProgress(Math.min(95, checkCount * 5));
        }
        
        // Handle different statuses
        if (data.status === 'completed') {
          console.log('Assessment completed, redirecting to results');
          // Redirect to results page
          router.push(`/assessment/${type}/results/${id}`);
          return;
        } else if (data.status === 'error') {
          setError('An error occurred during analysis. Please try again.');
          setLoading(false);
          return;
        }
        
        // Update check count
        setCheckCount(prev => prev + 1);
        
        // If we've checked more than 60 times (5 minutes at 5-second intervals),
        // show an error to prevent endless loading
        if (checkCount > 60) {
          setError('Processing is taking longer than expected. Please refresh the page or try again later.');
          setLoading(false);
          return;
        }
        
      } catch (err) {
        console.error('Error checking assessment status:', err);
        setError('Error checking assessment status. Please try again.');
        setLoading(false);
      }
    };
    
    // Check immediately
    checkStatus();
    
    // Then check every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    
    // Clean up
    return () => clearInterval(interval);
  }, [status, type, id, router, checkCount]);
  
  // Show loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="w-20 h-20 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto"></div>
          
          <h1 className="text-2xl font-bold mt-6 mb-2">Processing Your Assessment</h1>
          <p className="text-gray-600 mb-6">
            Our AI is analyzing your responses and uploaded file. This may take a minute or two.
          </p>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div 
              className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          {message && (
            <p className="text-sm text-gray-500 mb-4">{message}</p>
          )}
          
          <p className="text-sm text-gray-500">Please don't close this page</p>
          
          {/* Manual redirect option after 30 seconds */}
          {checkCount > 6 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-sm text-amber-600 mb-2">
                Taking longer than expected? Your results might be ready.
              </p>
              <button
                onClick={() => router.push(`/assessment/${type}/results/${id}`)}
                className="text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-lg transition-colors"
              >
                Check Results Now
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-bold mb-4">Processing Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
            <button
              onClick={() => router.push(`/assessment/${type}/${id}`)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
            >
              Back to Assessment
            </button>
            
            <button
              onClick={() => router.push(`/assessment/${type}/results/${id}`)}
              className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-lg"
            >
              Try Viewing Results
            </button>
            
            <button
              onClick={() => {
                setLoading(true);
                setError('');
                setProgress(0);
                setCheckCount(0);
              }}
              className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Fallback (should not reach here)
  return null;
}
