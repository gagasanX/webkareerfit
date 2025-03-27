// src/app/assessment/[type]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import AssessmentForm from '@/components/assessment/AssessmentForm';
import { ASSESSMENT_TITLES } from '@/lib/assessmentQuestions';

export default function AssessmentPage() {
  const params = useParams();
  const type = params.type as 'fjrl' | 'ijrl' | 'cdrl' | 'ccrl' | 'ctrl' | 'rrl' | 'irl';
  
  if (!type || !ASSESSMENT_TITLES[type]) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Invalid Assessment Type</h2>
          <p className="text-gray-600 mb-4">The assessment type you requested does not exist.</p>
          <a 
            href="/dashboard" 
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <AssessmentForm type={type} />
      </div>
    </div>
  );
}