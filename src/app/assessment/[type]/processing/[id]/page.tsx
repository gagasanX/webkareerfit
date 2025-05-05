// app/assessment/[type]/processing/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProcessingPage({ params }: { params: { type: string, id: string } }) {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/assessment/${params.type}/${params.id}/check-status`);
        const data = await response.json();
        
        // Update status
        setStatus(data.analysisStatus || data.status || 'processing');
        
        // If there's an error, show it
        if (data.error) {
          setError(data.error);
          return;
        }
        
        // If completed, redirect to results
        if (data.analysisStatus === 'completed' || data.status === 'completed') {
          router.push(`/assessment/${params.type}/results/${params.id}`);
          return;
        }
        
        // If manual processing, redirect to appropriate page
        if (data.manualProcessing) {
          router.push(data.redirectUrl || `/assessment/${params.type}/standard-results/${params.id}`);
          return;
        }
        
        // If still processing, update progress
        if (data.analysisStatus === 'pending' || data.analysisStatus === 'processing') {
          // Increment progress for visual feedback
          setProgress(prev => Math.min(prev + 5, 95));
          
          // If pending, initiate processing
          if (data.analysisStatus === 'pending') {
            await fetch(`/api/assessment/${params.type}/${params.id}/process`, {
              method: 'GET' // Changed to GET since we're triggering via the GET endpoint now
            });
          }
        }
      } catch (err) {
        console.error('Error checking processing status:', err);
        setError('Failed to check processing status. Please try refreshing the page.');
      }
    };
    
    // Check status immediately
    checkStatus();
    
    // Then set up an interval to check every 3 seconds
    const intervalId = setInterval(checkStatus, 3000);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [params.id, params.type, router]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
          <h1 className="text-2xl font-bold">Processing Your Assessment</h1>
          <p className="opacity-80">Please wait while our AI analyzes your responses</p>
        </div>
        
        <div className="p-8 text-center">
          {status === 'error' ? (
            <div className="text-red-500 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold mt-4 mb-2">Processing Error</h2>
              <p className="text-gray-700">{error || 'An error occurred while processing your assessment.'}</p>
              <div className="mt-6">
                <Link 
                  href={`/assessment/${params.type}/results/${params.id}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Available Results
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center mb-8">
                <div className="w-20 h-20 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Processing your assessment...</p>
              </div>
              
              <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2.5 mb-6">
                <div 
                  className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] h-2.5 rounded-full" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
                <p className="text-blue-700 text-sm">
                  Our AI is carefully analyzing your responses to provide personalized insights. This typically takes 1-2 minutes to complete.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}