'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Define proper types for results data
interface ScoresData {
  [key: string]: number;
  overallScore: number;
}

// Define interface for enhanced recommendations
interface RecommendationWithDetails {
  title: string;
  explanation: string;
  steps: string[];
}

interface AssessmentData {
  scores: ScoresData;
  categoryAnalysis?: Record<string, {
    score: number;
    strengths: string[];
    improvements: string[];
  }>;
  recommendations: (string | RecommendationWithDetails)[];  // Updated to support both formats
  summary: string;
  strengths?: string[];
  improvements?: string[];
  answers: Record<string, any>;
  completedAt: string;
  submittedAt: string;
  resumeText?: string;
  resumeAnalysis?: string;
  resumeRecommendations?: string[];
  aiProcessed?: boolean;
  aiProcessedAt?: string;
  readinessLevel?: string; // Added readinessLevel property
}

interface ResultsClientProps {
  assessmentType: string;
  assessmentId: string;
}

export function ResultsClient({ assessmentType, assessmentId }: ResultsClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState<any>(null);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [aiStatus, setAiStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [pollingCount, setPollingCount] = useState(0);

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

  // Fetch assessment results
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/assessment/${assessmentType}/results/${assessmentId}`);
      return;
    }

    if (status === 'authenticated' && assessmentType && assessmentId) {
      fetchResults();
    }
  }, [status, assessmentType, assessmentId, router]);

  // Poll for AI updates every 10 seconds if AI processing is not complete
  useEffect(() => {
    // Only poll if:
    // 1. We have assessment data
    // 2. AI is not marked as completed
    // 3. We haven't polled too many times (max 30 times = 5 minutes)
    if (assessmentData && aiStatus !== 'completed' && pollingCount < 30) {
      const timer = setTimeout(() => {
        console.log(`Polling for AI updates (attempt ${pollingCount + 1})...`);
        fetchResults();
        setPollingCount(prev => prev + 1);
      }, 10000); // Poll every 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [assessmentData, aiStatus, pollingCount]);

  const fetchResults = async () => {
    if (!assessmentType || !assessmentId) {
      setError('Missing assessment type or ID');
      return;
    }
    
    try {
      console.log(`Fetching results for assessment: ${assessmentType}/${assessmentId}`);
      const response = await fetch(`/api/assessment/${assessmentType}/results/${assessmentId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch assessment results');
      }
      
      const data = await response.json();
      console.log('Assessment data received:', data);
      
      setAssessment(data);
      
      // Ensure data.data has required properties with defaults
      const processedData: AssessmentData = {
        scores: (data.data?.scores as ScoresData) || { overallScore: 10 },
        recommendations: data.data?.recommendations || [],
        summary: data.data?.summary || 'Processing, Please wait.',
        strengths: data.data?.strengths || [],
        improvements: data.data?.improvements || [],
        answers: data.data?.answers || {},
        completedAt: data.data?.completedAt || new Date().toISOString(),
        submittedAt: data.data?.submittedAt || new Date().toISOString(),
        resumeText: data.data?.resumeText || '',
        resumeAnalysis: data.data?.resumeAnalysis || '',
        resumeRecommendations: data.data?.resumeRecommendations || [],
        aiProcessed: data.data?.aiProcessed || false,
        aiProcessedAt: data.data?.aiProcessedAt || null,
        readinessLevel: data.data?.readinessLevel || calculateReadinessLevel((data.data?.scores as ScoresData)?.overallScore || 0)
      };
      
      // Ensure overallScore exists
      if (!processedData.scores.overallScore && processedData.scores.overallScore !== 0) {
        const scoreValues = Object.values(processedData.scores);
        processedData.scores.overallScore = scoreValues.length > 0 
          ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
          : 70;
      }
      
      // Check AI processing status
      if (processedData.aiProcessed) {
        setAiStatus('completed');
        console.log('AI analysis completed at:', processedData.aiProcessedAt);
      } else if (processedData.resumeText && processedData.resumeText.length > 0) {
        setAiStatus('processing');
        console.log('AI analysis in progress...');
      } else {
        console.log('No AI analysis started yet');
      }
      
      setAssessmentData(processedData);
      setLoading(false);
      setError('');
    } catch (err) {
      console.error('Error fetching assessment results:', err);
      setError('Error loading assessment results. Please try again.');
      setLoading(false);
      setAiStatus('failed');
    }
  };

  // Function to calculate readiness level based on score
  const calculateReadinessLevel = (score: number): string => {
    if (score < 50) return "Early Development";
    if (score < 70) return "Developing Competency";
    if (score < 85) return "Approaching Readiness";
    return "Fully Prepared";
  };

  // Manual refresh function for AI results
  const handleRefreshResults = () => {
    setLoading(true);
    fetchResults();
  };

  // Helper to get color based on score percentage
  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    if (percentage >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Get readiness level color
  const getReadinessLevelColor = (level: string): string => {
    switch (level) {
      case "Early Development":
        return "text-red-600";
      case "Developing Competency":
        return "text-yellow-600";
      case "Approaching Readiness":
        return "text-blue-600";
      case "Fully Prepared":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  // Show loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  // Show error state
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
              className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show not found state
  if (!assessment || !assessmentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-gray-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-4">No Results Found</h2>
          <p className="text-gray-600 mb-6">We couldn't find any results for this assessment.</p>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-4 py-2 rounded-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Extract data for display
  const scores = assessmentData.scores || {};
  const recommendations = assessmentData.recommendations || [];
  const strengths = assessmentData.strengths || [];
  const improvements = assessmentData.improvements || [];
  const overallScore = assessmentData.scores.overallScore;
  const summary = assessmentData.summary || 'Assessment completed successfully.';
  const completedAt = assessmentData.completedAt || new Date().toISOString();
  const categoryAnalysis = assessmentData.categoryAnalysis || {};
  
  // Get or calculate readiness level
  const readinessLevel = assessmentData.readinessLevel || calculateReadinessLevel(overallScore);
  const readinessLevelColor = getReadinessLevelColor(readinessLevel);

  return (
    <div className="print-container min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header section */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="print-header bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
            <h1 className="text-2xl font-bold">
              {assessmentTypeLabels[assessmentType] || assessmentType} Results
            </h1>
            <p className="text-white/80 mt-1">
              Completed on {new Date(completedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Overall score if available */}
          <div className="p-6 border-b">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Overall Score</h2>
              <div className="flex justify-center flex-col items-center">
                <div className="relative h-36 w-36">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">{overallScore}%</span>
                  </div>
                  <svg className="h-full w-full" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e6e6e6"
                      strokeWidth="3"
                      strokeDasharray="100, 100"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={overallScore >= 80 ? "#48bb78" : 
                             overallScore >= 60 ? "#4299e1" : 
                             overallScore >= 40 ? "#ecc94b" : 
                             overallScore >= 20 ? "#ed8936" : "#f56565"}
                      strokeWidth="3"
                      strokeDasharray={`${overallScore}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                {/* Readiness Level - Added this section */}
                <div className="mt-2">
                  <span className="font-medium">Readiness Level: </span>
                  <span className={`font-bold ${readinessLevelColor}`}>{readinessLevel}</span>
                </div>
              </div>
              <p className="mt-4 text-gray-600 max-w-xl mx-auto">{summary}</p>
              
              {/* AI analysis status indicator */}
              {aiStatus === 'processing' && (
                <div className="print-hidden mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-t-transparent border-blue-700 rounded-full animate-spin mr-2"></div>
                  <span>AI analysis in progress... This may take a few minutes.</span>
                  <button 
                    onClick={handleRefreshResults}
                    className="ml-3 text-xs underline hover:text-blue-800"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Strengths and Improvements */}
        {(strengths.length > 0 || improvements.length > 0) && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Key Insights</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {strengths.length > 0 && (
                  <div className="bg-green-50 p-5 rounded-lg print-bg-light">
                    <h3 className="text-lg font-medium text-green-800 mb-3">Your Strengths</h3>
                    <ul className="list-disc list-inside space-y-2">
                      {strengths.map((strength, index) => (
                        <li key={index} className="text-gray-700">{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {improvements.length > 0 && (
                  <div className="bg-yellow-50 p-5 rounded-lg print-bg-light">
                    <h3 className="text-lg font-medium text-yellow-800 mb-3">Areas for Improvement</h3>
                    <ul className="list-disc list-inside space-y-2">
                      {improvements.map((improvement, index) => (
                        <li key={index} className="text-gray-700">{improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Detailed scores */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Category Scores</h2>
            
            <div className="space-y-6">
              {Object.entries(scores)
                .filter(([key]) => key !== 'overallScore')
                .map(([category, score], index) => {
                  const analysis = categoryAnalysis[category];
                  
                  return (
                    <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium text-gray-800">{formatCategoryName(category)}</h3>
                        <span className="font-semibold">{score}%</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                        <div
                          className={`h-3 rounded-full ${getScoreColor(score)}`}
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                      
                      {/* Show category analysis if available */}
                      {analysis && (
                        <div className="mt-3 pl-4 border-l-2 border-blue-200">
                          {analysis.strengths && analysis.strengths.length > 0 && (
                            <div className="mb-2">
                              <h4 className="text-sm font-medium text-green-700">Strengths:</h4>
                              <ul className="mt-1 list-disc list-inside text-sm text-gray-600">
                                {analysis.strengths.map((str, i) => (
                                  <li key={i}>{str}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {analysis.improvements && analysis.improvements.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-yellow-700">Areas to focus on:</h4>
                              <ul className="mt-1 list-disc list-inside text-sm text-gray-600">
                                {analysis.improvements.map((imp, i) => (
                                  <li key={i}>{imp}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Enhanced Recommendations section */}
        {recommendations && recommendations.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Action Plan & Recommendations</h2>
              
              <div className="space-y-6">
                {recommendations.map((recommendation, index) => {
                  // Handle both string recommendations and detailed recommendation objects
                  if (typeof recommendation === 'string') {
                    // Simple string recommendation
                    return (
                      <div key={index} className="pl-2">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs mt-0.5">
                            {index + 1}
                          </div>
                          <p className="ml-3 text-gray-700">{recommendation}</p>
                        </div>
                      </div>
                    );
                  } else {
                    // Enhanced recommendation with details
                    const detailedRec = recommendation as unknown as RecommendationWithDetails;
                    return (
                      <div key={index} className="bg-blue-50 rounded-lg p-4 print-bg-light">
                        <div className="flex items-start mb-2">
                          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs mt-0.5">
                            {index + 1}
                          </div>
                          <h3 className="ml-3 font-medium text-blue-800">{detailedRec.title}</h3>
                        </div>
                        
                        <div className="ml-9">
                          <p className="text-gray-700 mb-3">{detailedRec.explanation}</p>
                          
                          {detailedRec.steps && detailedRec.steps.length > 0 && (
                            <div className="mt-2">
                              <h4 className="text-sm font-medium text-blue-700 mb-2">Implementation Steps:</h4>
                              <ul className="list-disc list-inside space-y-1.5 text-gray-700">
                                {detailedRec.steps.map((step, stepIndex) => (
                                  <li key={stepIndex} className="text-sm">{step}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          </div>
        )}

        {/* Resume Analysis section */}
        {assessmentData.resumeText && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Resume Analysis</h2>
              
              {aiStatus === 'processing' ? (
                <div className="print-hidden flex items-center justify-center p-6 text-gray-500">
                  <div className="w-5 h-5 border-2 border-t-transparent border-gray-500 rounded-full animate-spin mr-2"></div>
                  <span>Resume analysis in progress...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-700">
                    {assessmentData.resumeAnalysis || "Your resume has been analyzed as part of the assessment. See specific recommendations related to your resume in the recommendations section."}
                  </p>
                  
                  {assessmentData.resumeRecommendations && assessmentData.resumeRecommendations.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-md font-medium text-gray-800 mb-2">Resume Recommendations</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-700">
                        {assessmentData.resumeRecommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="print-hidden flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-white text-[#7e43f1] border border-[#7e43f1] px-6 py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors"
          >
            Back to Dashboard
          </button>
          
          {aiStatus === 'processing' ? (
            <button
              onClick={handleRefreshResults}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
              Refresh Results
            </button>
          ) : (
            <button
              onClick={() => window.print()}
              className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] hover:from-[#7e43f1] hover:to-[#38b6ff] text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Download Results
            </button>
          )}
        </div>
      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          /* General Layout */
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 12pt !important;
            color: #000 !important;
          }
          
          .print-container {
            min-height: 0 !important;
            background: white !important;
            padding: 0 !important;
          }
          
          .max-w-4xl {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 20px !important;
          }
          
          /* Hide elements not needed in print */
          .bg-gradient-to-br,
          .print-hidden,
          button {
            display: none !important;
          }
          
          /* Reset backgrounds and borders */
          .bg-white {
            box-shadow: none !important;
            margin: 15px 0 !important;
            border: 1px solid #ddd !important;
          }
          
          .rounded-xl {
            border-radius: 0 !important;
          }
          
          /* Header styling */
          .print-header {
            background: #f8f9fa !important;
            color: #000 !important;
            border-bottom: 2px solid #333 !important;
            padding: 20px !important;
          }
          
          .print-header h1 {
            color: #000 !important;
            font-size: 24pt !important;
            margin-bottom: 10px !important;
          }
          
          .print-header p {
            color: #666 !important;
          }
          
          /* Score circle optimization */
          .h-36.w-36 {
            height: 100px !important;
            width: 100px !important;
          }
          
          /* Typography for print */
          h1 { font-size: 24pt !important; }
          h2 { font-size: 18pt !important; }
          h3 { font-size: 14pt !important; }
          h4 { font-size: 12pt !important; }
          p, li { font-size: 11pt !important; }
          
          /* Color adjustments */
          .bg-green-50,
          .bg-yellow-50,
          .bg-blue-50,
          .print-bg-light {
            background: #f8f9fa !important;
            border: 1px solid #ddd !important;
          }
          
          .text-white {
            color: #000 !important;
          }
          
          .text-gray-700,
          .text-gray-600,
          .text-gray-800 {
            color: #000 !important;
          }
          
          .text-green-800,
          .text-yellow-800,
          .text-blue-800 {
            color: #333 !important;
          }
          
          .text-green-700,
          .text-yellow-700,
          .text-blue-700 {
            color: #555 !important;
          }
          
          /* Score bars */
          .bg-green-500,
          .bg-blue-500,
          .bg-yellow-500,
          .bg-orange-500,
          .bg-red-500 {
            background: #666 !important;
            print-color-adjust: exact !important;
          }
          
          /* Recommendation numbers */
          .flex-shrink-0.h-6.w-6.rounded-full {
            background: #333 !important;
            color: #fff !important;
            print-color-adjust: exact !important;
          }
          
          /* Keep SVG colors for the score circle */
          svg path {
            print-color-adjust: exact !important;
          }
          
          /* Page break handling */
          .bg-white {
            page-break-inside: avoid !important;
          }
          
          h2, h3 {
            page-break-after: avoid !important;
          }
          
          ul, ol {
            page-break-inside: avoid !important;
          }
          
          /* Ensure consistent spacing */
          .p-6 {
            padding: 15px !important;
          }
          
          .mb-8 {
            margin-bottom: 15px !important;
          }
          
          .space-y-6 > * + * {
            margin-top: 12px !important;
          }
          
          /* Loading and error states not needed in print */
          .animate-spin {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// Helper function to format category names
function formatCategoryName(category: string): string {
  return category
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
}