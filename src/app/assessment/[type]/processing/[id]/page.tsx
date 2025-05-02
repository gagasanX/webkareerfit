'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProcessingClient({ 
  assessmentId, 
  assessmentType 
}: { 
  assessmentId: string; 
  assessmentType: string; 
}) {
  const router = useRouter();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState<string | null>(null);
  const [loadingPercent, setLoadingPercent] = useState(0);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/assessment/${assessmentType}/processing/${assessmentId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to check status: ${response.status}`);
        }
        
        const data = await response.json();
        
        setStatus(data.status);
        
        if (data.status === 'completed' && data.redirectUrl) {
          router.push(data.redirectUrl);
        } else if (data.status === 'error') {
          setError(data.error || 'An error occurred during analysis.');
        } else if (data.status === 'processing') {
          // Increment loading percentage for visual feedback
          setLoadingPercent(prev => (prev < 95 ? prev + 5 : prev));
        }
      } catch (err) {
        console.error('Error checking assessment status:', err);
      }
    };
    
    // Check immediately and then every 3 seconds
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    
    // Update loading percentage continuously
    const loadingInterval = setInterval(() => {
      setLoadingPercent(prev => (prev < 95 ? prev + 1 : prev));
    }, 800);
    
    return () => {
      clearInterval(interval);
      clearInterval(loadingInterval);
    };
  }, [assessmentId, assessmentType, router]);

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
        <div className="text-red-500 mb-4 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-center mb-4">Analysis Error</h2>
        <p className="text-gray-600 text-center mb-6">{error}</p>
        <div className="flex justify-center">
          <button
            onClick={() => {
              setStatus('processing');
              setError(null);
              fetch(`/api/debug/assessments`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  id: assessmentId, 
                  action: 'reset-ai' 
                }),
              })
              .then(() => router.refresh())
              .catch(err => console.error(err));
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg text-center">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
      </div>
      
      <h2 className="text-xl font-bold mb-4">Processing Your Assessment</h2>
      
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${loadingPercent}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">{loadingPercent}% Complete</p>
      </div>
      
      <p className="text-gray-600 mb-4">
        Our AI is analyzing your responses to create a personalized assessment report.
      </p>
      
      <p className="text-sm text-gray-500">
        This may take up to 1-2 minutes. Please do not close this page.
      </p>
    </div>
  );
}