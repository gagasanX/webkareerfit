// src/app/assessment/[type]/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import FJRLForm from '@/components/assessment/FJRLForm';
import IJRLForm from '@/components/assessment/IJRLForm';
import CDRLForm from '@/components/assessment/CDRLForm';
import CCRLForm from '@/components/assessment/CCRLForm';
import CTRLForm from '@/components/assessment/CTRLForm';
import RRLForm from '@/components/assessment/RRLForm';
import IRLForm from '@/components/assessment/IRLForm';

// Define types for the form data
interface AssessmentData {
  personalInfo?: {
    name: string;
    email: string;
    phone: string;
    personality: string;
    jobPosition: string;
  };
  qualification?: string;
  [key: string]: any; // Allow for type-specific fields
}

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [showNav, setShowNav] = useState(true);
  
  // Extract type and id from params - ensure they are strings
  const type = params?.type ? String(params.type) : '';
  const id = params?.id ? String(params.id) : '';
  
  console.log('Assessment page loaded with:', { type, id });

  // Assessment type labels for display
  const assessmentTypeLabels: Record<string, string> = {
    fjrl: 'First Job Readiness Level',
    ijrl: 'Ideal Job Readiness Level',
    cdrl: 'Career Development Readiness Level',
    ccrl: 'Career Comeback Readiness Level',
    ctrl: 'Career Transition Readiness Level',
    rrl: 'Retirement Readiness Level',
    irl: 'Internship Readiness Level',
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/assessment/${type}/${id}`);
      return;
    }
    
    if (!type || !id) {
      console.error('Missing type or id parameters');
      router.push('/dashboard');
      return;
    }
    
    // Check if payment is completed and fetch assessment data
    const verifyPayment = async () => {
      try {
        console.log(`Fetching assessment data for ${type}/${id}`);
        const response = await fetch(`/api/assessment/${type}/${id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch assessment data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Assessment data received:', data);
        
        // Redirect to payment if not completed
        if (data.payment?.status !== 'completed') {
          console.log('Payment not completed, redirecting to payment page');
          router.push(`/payment/${id}`);
          return;
        }
        
        setAssessmentData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error verifying payment or loading assessment:', error);
        setLoading(false);
      }
    };
    
    if (status === 'authenticated') {
      verifyPayment();
    }
  }, [status, type, id, router]);
  
  // Handle form submission - UPDATED FUNCTION
  const handleSubmit = async (formData: AssessmentData, resumeFile?: File) => {
    try {
      setLoading(true);
      console.log('Starting assessment submission process');
      console.log('Assessment type:', type);
      console.log('Assessment ID:', id);
      
      // Validate inputs before submission
      if (!type || !id) {
        throw new Error('Missing assessment type or ID');
      }
      
      if (!formData.personalInfo?.name || !formData.personalInfo?.email) {
        throw new Error('Missing required personal information');
      }
      
      console.log('Form data validated, preparing for submission');
      
      // Create FormData object for file upload
      const formDataToSubmit = new FormData();
      
      // Important: Use 'formData' as the key, not 'answers'
      formDataToSubmit.append('formData', JSON.stringify(formData));
      
      if (resumeFile) {
        console.log('Including resume file:', resumeFile.name, 'Size:', Math.round(resumeFile.size / 1024), 'KB');
        formDataToSubmit.append('resume', resumeFile);
      } else {
        console.log('No resume file attached');
      }
      
      // Use the correct endpoint for file uploads
      const endpoint = `/api/assessment/${type}/${id}/submit-with-file`;
      console.log('Submitting to endpoint:', endpoint);
      
      // Make the API request
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formDataToSubmit
        // Don't set Content-Type header for multipart/form-data
      });
      
      console.log('API response received, status:', response.status);
      
      // Handle different response types for better error reporting
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          // JSON error response
          const errorData = await response.json();
          console.error('Error details from API:', errorData);
          throw new Error(errorData.error || `Submission failed with status: ${response.status}`);
        } else {
          // Non-JSON error (like HTML error page)
          const text = await response.text();
          console.error('Non-JSON error response:', text.substring(0, 500));
          throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
        }
      }
      
      // Parse successful response
      const result = await response.json();
      console.log('Submission successful:', result);
      
      // Redirect to results page
      const redirectUrl = result.redirectTo || `/assessment/${type}/results/${id}`;
      console.log('Redirecting to:', redirectUrl);
      router.push(redirectUrl);
      
    } catch (error) {
      // Comprehensive error handling
      console.error('Error during assessment submission:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred during submission';
      
      alert(`Failed to submit assessment: ${errorMessage}. Please try again.`);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
            <h1 className="text-2xl font-bold">
              {assessmentTypeLabels[type] || type}
            </h1>
            <p className="text-white/80 mt-1">Complete this assessment to measure your readiness level</p>
          </div>
          
          <div className="p-6">
            {/* Render the appropriate form based on assessment type */}
            {type === 'fjrl' && <FJRLForm assessmentId={id} assessmentType={type} onSubmit={handleSubmit} />}
            {type === 'ijrl' && <IJRLForm assessmentId={id} assessmentType={type} onSubmit={handleSubmit} />}
            {type === 'cdrl' && <CDRLForm assessmentId={id} assessmentType={type} onSubmit={handleSubmit} />}
            {/* IMPORTANT: Pass all required props to CCRLForm */}
            {type === 'ccrl' && <CCRLForm assessmentId={id} assessmentType={type} onSubmit={handleSubmit} />}
            {type === 'ctrl' && <CTRLForm assessmentId={id} assessmentType={type} onSubmit={handleSubmit} />}
            {type === 'rrl' && <RRLForm assessmentId={id} assessmentType={type} onSubmit={handleSubmit} />}
            {type === 'irl' && <IRLForm assessmentId={id} assessmentType={type} onSubmit={handleSubmit} />}
            
            {/* Backup navigation buttons */}
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                onClick={() => router.push('/dashboard')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white py-2 px-4 rounded-lg hover:shadow-md"
                onClick={() => {
                  const form = document.querySelector('form');
                  if (form) {
                    form.dispatchEvent(new Event('submit', { bubbles: true }));
                  }
                }}
              >
                Submit Assessment
              </button>
            </div>
            
            {/* Save and exit link */}
            <div className="text-center mt-6">
              <Link 
                href="/dashboard" 
                className="text-sm text-gray-500 hover:text-[#7e43f1]"
              >
                Save and come back later
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}