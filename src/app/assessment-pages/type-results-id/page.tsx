'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Define interface for radar chart props
interface RadarChartProps {
  data: number[];
  labels: string[];
}

// Define interface for results data
interface ResultsData {
  completedAt: Date;
  overallScore: number;
  summary: string;
  strengths: string[];
  developmentAreas: string[];
  competencyScores: number[];
  careerRecommendations: {
    title: string;
    match: number;
  }[];
  actionPlan: string[];
}

// Component for radar chart
const RadarChart = ({ data, labels }: RadarChartProps) => {
  // This would be implemented with a chart library like recharts or chart.js
  // Simplified representation here
  return (
    <div className="relative h-64 w-64 mx-auto">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <polygon 
          points="50,10 90,50 50,90 10,50" 
          fill="rgba(126, 67, 241, 0.2)" 
          stroke="#7e43f1" 
          strokeWidth="1"
        />
        <circle cx="50" cy="10" r="3" fill="#7e43f1" />
        <circle cx="90" cy="50" r="3" fill="#7e43f1" />
        <circle cx="50" cy="90" r="3" fill="#7e43f1" />
        <circle cx="10" cy="50" r="3" fill="#7e43f1" />
      </svg>
      <div className="absolute top-0 left-0 right-0 text-center text-xs text-gray-600">
        {labels[0]}
      </div>
      <div className="absolute top-1/2 right-0 transform translate-y-[-50%] text-xs text-gray-600">
        {labels[1]}
      </div>
      <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-gray-600">
        {labels[2]}
      </div>
      <div className="absolute top-1/2 left-0 transform translate-y-[-50%] text-xs text-gray-600">
        {labels[3]}
      </div>
    </div>
  );
};

// Define interface for page params
interface PageParams {
  params: {
    type: string;
    id: string;
  };
}

export default function AssessmentResultsPage({ params }: PageParams) {
  const { type, id } = params;
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [error, setError] = useState('');

  // Assessment type labels
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
      router.push(`/login?callbackUrl=/assessment/${type}/results/${id}`);
      return;
    }

    if (status === 'authenticated') {
      fetchResults();
    }
  }, [status, type, id, router]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/assessment/${type}/results/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setError('Error loading results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-red-500 mb-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-center mb-4">Error</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <div className="flex justify-center">
            <button
              onClick={fetchResults}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default data in case results are null
  const defaultData: ResultsData = {
    completedAt: new Date(),
    overallScore: 85,
    summary: 'Your profile shows strong potential for career growth. Review the detailed insights below.',
    strengths: ['Problem-solving skills', 'Adaptability', 'Communication'],
    developmentAreas: ['Leadership experience', 'Technical skills', 'Networking'],
    competencyScores: [85, 70, 60, 90],
    careerRecommendations: [
      { title: 'Software Developer', match: 92 },
      { title: 'Data Analyst', match: 85 },
      { title: 'UX Designer', match: 78 },
      { title: 'Product Manager', match: 75 }
    ],
    actionPlan: [
      'Develop technical skills through online courses',
      'Gain practical experience through internships or projects',
      'Build your professional network',
      'Create a portfolio showcasing your work'
    ]
  };

  // Use results if available, otherwise use default data
  const displayData = results || defaultData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
            <h1 className="text-2xl font-bold">{assessmentTypeLabels[type] || type} Results</h1>
            <p className="text-white/80 mt-1">Completed on {new Date(displayData.completedAt).toLocaleDateString()}</p>
          </div>
          
          {/* Results summary */}
          <div className="p-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-green-100 text-green-800 text-3xl font-bold mb-4">
                {displayData.overallScore}%
              </div>
              <h2 className="text-xl font-bold text-gray-800">Your Career Readiness Score</h2>
              <p className="text-gray-600 mt-2">{displayData.summary}</p>
            </div>
            
            {/* Strengths and development areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-green-50 p-5 rounded-lg">
                <h3 className="font-medium text-green-800 mb-3">Key Strengths</h3>
                <ul className="space-y-2">
                  {displayData.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-yellow-50 p-5 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-3">Development Areas</h3>
                <ul className="space-y-2">
                  {displayData.developmentAreas.map((area, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Competency radar chart */}
            <div className="mb-8">
              <h3 className="font-medium text-gray-800 mb-4 text-center">Competency Profile</h3>
              <RadarChart 
                data={displayData.competencyScores}
                labels={['Technical Skills', 'Soft Skills', 'Experience', 'Alignment']}
              />
            </div>
            
            {/* Career recommendations */}
            <div className="bg-blue-50 p-5 rounded-lg mb-8">
              <h3 className="font-medium text-blue-800 mb-3">Recommended Career Paths</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayData.careerRecommendations.map((career, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <span className="text-gray-800">{career.title}</span>
                    <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {career.match}% Match
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Action plan */}
            <div className="bg-purple-50 p-5 rounded-lg mb-8">
              <h3 className="font-medium text-purple-800 mb-3">Your Action Plan</h3>
              <ol className="space-y-3 list-decimal pl-5">
                {displayData.actionPlan.map((action, index) => (
                  <li key={index} className="text-gray-700">{action}</li>
                ))}
              </ol>
            </div>
            
            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
              <Link 
                href={`/assessment/${type}/results/${id}/download`}
                className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-6 py-3 rounded-lg text-center"
              >
                Download Full Report
              </Link>
              <Link 
                href="/dashboard"
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg text-center"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}