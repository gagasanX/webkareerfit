'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Define interface for page params
interface PageParams {
  params: {
    type: string;
    id: string;
  };
}

// Define interface for assessment and questions
interface Assessment {
  id: string;
  type: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  questions: Question[];
  answers?: Record<string, any>;
  payment?: Payment;
}

interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'scale' | 'text';
  step: number;
  options?: Option[];
  minLabel?: string;
  maxLabel?: string;
}

interface Option {
  text: string;
  value: string | number;
}

interface Payment {
  id: string;
  status: string;
}

export default function AssessmentPage({ params }: PageParams) {
  const { type, id } = params;
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
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
      router.push(`/login?callbackUrl=/assessment/${type}/${id}`);
      return;
    }

    if (status === 'authenticated') {
      fetchAssessment();
    }
  }, [status, type, id, router]);

  const fetchAssessment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/assessment/${type}/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch assessment');
      }
      const data = await response.json();
      setAssessment(data);
      
      // Load saved answers if any
      if (data.answers) {
        setAnswers(data.answers);
      }
      
      // Check if payment is required
      if (data.payment?.status !== 'completed') {
        router.push(`/payment/${id}`);
        return;
      }

      // Set current step from progress
      if (data.currentStep) {
        setCurrentStep(data.currentStep);
      }
    } catch (error) {
      setError('Error loading assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = async () => {
    // Save current progress
    try {
      const response = await fetch(`/api/assessment/${type}/${id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentStep,
          answers
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }

      // Move to next step
      if (assessment && currentStep < assessment.totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        // Submit assessment
        await submitAssessment();
      }
    } catch (error) {
      setError('Error saving progress. Please try again.');
    }
  };

  const submitAssessment = async () => {
    try {
      const response = await fetch(`/api/assessment/${type}/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit assessment');
      }
      
      // Redirect to results page
      router.push(`/assessment/${type}/results/${id}`);
    } catch (error) {
      setError('Error submitting assessment. Please try again.');
    }
  };

  // Get questions for current step
  const currentQuestions = assessment?.questions?.filter(
    q => q.step === currentStep
  ) || [];
  
  const totalSteps = assessment?.totalSteps || 5;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessment...</p>
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
              onClick={fetchAssessment}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
            <h1 className="text-2xl font-bold">{assessmentTypeLabels[type] || type}</h1>
            <p className="text-white/80 mt-1">Step {currentStep} of {totalSteps}</p>
            
            {/* Progress bar */}
            <div className="mt-4 w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full" 
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
          
          {/* Question form */}
          <div className="p-6">
            {currentQuestions.map((question, index) => (
              <div key={question.id} className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {index + 1}. {question.text}
                </h3>
                
                {question.type === 'multiple_choice' && (
                  <div className="space-y-3 mt-4">
                    {question.options?.map((option, optionIndex) => (
                      <label 
                        key={optionIndex} 
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          answers[question.id] === option.value 
                            ? 'border-[#7e43f1] bg-purple-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={String(option.value)}
                          checked={answers[question.id] === option.value}
                          onChange={() => handleAnswer(question.id, option.value)}
                          className="h-4 w-4 text-[#7e43f1] focus:ring-[#38b6ff] border-gray-300"
                        />
                        <span className="ml-3 text-gray-800">{option.text}</span>
                      </label>
                    ))}
                  </div>
                )}
                
                {question.type === 'scale' && (
                  <div className="mt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-500">{question.minLabel || 'Strongly Disagree'}</span>
                      <span className="text-sm text-gray-500">{question.maxLabel || 'Strongly Agree'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleAnswer(question.id, value)}
                          className={`h-10 w-10 rounded-full flex items-center justify-center font-medium ${
                            answers[question.id] === value
                              ? 'bg-[#7e43f1] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {question.type === 'text' && (
                  <div className="mt-4">
                    <textarea
                      rows={4}
                      placeholder="Type your answer here..."
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswer(question.id, e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:ring-[#7e43f1] focus:border-[#7e43f1] resize-none"
                    ></textarea>
                  </div>
                )}
              </div>
            ))}
            
            {/* Navigation buttons */}
            <div className="flex justify-between mt-8">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className={`px-4 py-2 rounded-lg ${
                  currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Previous
              </button>
              
              <button
                onClick={handleNext}
                className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] hover:from-[#7e43f1] hover:to-[#38b6ff] text-white px-4 py-2 rounded-lg transition-colors"
              >
                {assessment && currentStep < assessment.totalSteps ? 'Next' : 'Submit'}
              </button>
            </div>
            
            {/* Save and exit */}
            <div className="text-center mt-6">
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-[#7e43f1]">
                Save and come back later
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}