'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// Define interfaces for our data types
interface Option {
  value: string | number;
  text: string;
}

interface Question {
  id: string | number;
  type: 'multiple_choice' | 'scale' | 'text';
  text: string;
  step: number;
  options?: Option[];
  minLabel?: string;
  maxLabel?: string;
}

interface Assessment {
  id: string;
  totalSteps: number;
  questions: Question[];
  tier: string;
  price: number;
  manualProcessing: boolean;
  answers?: Record<string | number, any>;
  currentStep?: number;
}

// Define the valid assessment types
type AssessmentType = 'fjrl' | 'ijrl' | 'cdrl' | 'ccrl' | 'ctrl' | 'rrl' | 'irl';

// Question component props
interface QuestionProps {
  question: Question;
  answer: any;
  onAnswer: (value: any) => void;
}

// Question component
const Question = ({ question, answer, onAnswer }: QuestionProps) => {
  if (question.type === 'multiple_choice') {
    return (
      <div className="space-y-3 mt-4">
        {question.options?.map((option, optionIndex) => (
          <label 
            key={optionIndex} 
            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
              answer === option.value 
                ? 'border-[#7e43f1] bg-purple-50' 
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={String(option.value)}
              checked={answer === option.value}
              onChange={() => onAnswer(option.value)}
              className="h-4 w-4 text-[#7e43f1] focus:ring-[#38b6ff] border-gray-300"
            />
            <span className="ml-3 text-gray-800">{option.text}</span>
          </label>
        ))}
      </div>
    );
  }
  
  if (question.type === 'scale') {
    return (
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
              onClick={() => onAnswer(value)}
              className={`h-10 w-10 rounded-full flex items-center justify-center font-medium ${
                answer === value
                  ? 'bg-[#7e43f1] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    );
  }
  
  if (question.type === 'text') {
    return (
      <div className="mt-4">
        <textarea
          rows={4}
          placeholder="Type your answer here..."
          value={answer || ''}
          onChange={(e) => onAnswer(e.target.value)}
          className="w-full rounded-lg border-gray-300 focus:ring-[#7e43f1] focus:border-[#7e43f1] resize-none"
        ></textarea>
      </div>
    );
  }
  
  return null;
};

export default function AssessmentInstanceClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const type = params.type as string;
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string | number, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  
  // Assessment type labels
  const assessmentTypeLabels: Record<AssessmentType, string> = {
    fjrl: 'First Job Readiness Level',
    ijrl: 'Ideal Job Readiness Level',
    cdrl: 'Career Development Readiness Level',
    ccrl: 'Career Comeback Readiness Level',
    ctrl: 'Career Transition Readiness Level',
    rrl: 'Retirement Readiness Level',
    irl: 'Internship Readiness Level',
  };

  // Check authentication status
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/assessment/${type}/${id}`);
      return;
    }
    
    console.log(`AssessmentInstanceClient loaded - Type: ${type}, ID: ${id}`);
  }, [status, router, type, id]);

  // Fetch assessment data
  useEffect(() => {
    if (status === 'authenticated' && type && id) {
      fetchAssessment();
    }
  }, [status, type, id]);

  const fetchAssessment = async () => {
    setLoading(true);
    try {
      console.log(`Fetching assessment data for ${type}/${id}`);
      setDebugInfo(`Fetching assessment data for ${type}/${id}`);
      
      const response = await fetch(`/api/assessment/${type}/${id}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch assessment');
      }
      
      const data = await response.json();
      console.log('Assessment data received:', data);
      
      setAssessment(data);
      setQuestions(data.questions || []);
      
      // Log tier information for debugging
      setDebugInfo(`Assessment loaded successfully. Tier: ${data.tier}, Price: RM${data.price}, ManualProcessing: ${data.manualProcessing}`);
      
      // Load saved answers if any
      if (data.answers) {
        setAnswers(data.answers);
      }
      
      // Set current step from progress
      if (data.currentStep) {
        setCurrentStep(data.currentStep);
      }
      
      setError('');
    } catch (err) {
      console.error('Error fetching assessment:', err);
      setError('Error loading assessment. Please try again.');
      setDebugInfo(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string | number, answer: any) => {
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
    await saveProgress();
    
    // Move to next step
    if (assessment && currentStep < assessment.totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step, submit assessment
      await submitAssessment();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    // Check file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('File type not allowed. Please upload PDF, DOC, DOCX, or TXT files only.');
      return;
    }
    
    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileError('File size exceeds 5MB limit.');
      return;
    }
    
    setResumeFile(file);
    setDebugInfo(`Resume file selected: ${file.name} (${Math.round(file.size / 1024)} KB)`);
  };
  
  const saveProgress = async () => {
    try {
      console.log(`Saving progress for assessment ${id} - Step ${currentStep}`);
      setDebugInfo(`Saving progress - Step ${currentStep}`);
      
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save progress');
      }
      
      console.log('Progress saved successfully');
      setDebugInfo('Progress saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving progress:', error);
      setError('Failed to save progress. Please try again.');
      setDebugInfo(`Error saving progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  const submitAssessment = async () => {
    setSubmitting(true);
    try {
      // Create FormData object for file upload
      const formData = new FormData();
      
      // Add answers as JSON string
      const formDataPayload = {
        personalInfo: {
          name: session?.user?.name || '',
          email: session?.user?.email || '',
        },
        ...answers
      };
      
      console.log(`Submitting assessment ${id} with formData:`, formDataPayload);
      setDebugInfo(`Preparing to submit assessment ${id} - Tier: ${assessment?.tier}, Price: RM${assessment?.price}`);
      
      formData.append('formData', JSON.stringify(formDataPayload));
      
      // Add resume file if available
      if (resumeFile) {
        formData.append('resume', resumeFile);
        console.log(`Including resume: ${resumeFile.name}`);
        setDebugInfo(`Including resume: ${resumeFile.name}`);
      }
      
      // Submit to the submit endpoint
      console.log(`Submitting to endpoint: /api/assessment/${type}/${id}/submit-with-google-vision`);
      const response = await fetch(`/api/assessment/${type}/${id}/submit-with-google-vision`, {
        method: 'POST',
        body: formData
        // Don't set Content-Type header for multipart/form-data
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Submission error response:', errorData);
        throw new Error(errorData.error || `Failed to submit assessment: ${response.status}`);
      }
      
      // Get response data
      let result;
      try {
        result = await response.json();
        console.log('Submission response:', result);
      } catch (e) {
        console.error('Error parsing response JSON:', e);
        throw new Error('Invalid response from server');
      }
      
      // CRITICAL FIX: Always respect the redirectUrl from the server response
      if (result.redirectUrl) {
        console.log(`REDIRECTING TO: ${result.redirectUrl}`);
        setDebugInfo(`Redirecting to: ${result.redirectUrl}`);
        router.push(result.redirectUrl);
      } else {
        // Only as fallback if server didn't provide a redirect URL
        console.log(`NO REDIRECT URL PROVIDED - Using default path`);
        setDebugInfo(`No redirect URL - Using default`);
        
        // Get up-to-date assessment data directly from API
        const assessmentData = await fetch(`/api/assessment/${type}/${id}`).then(res => res.json());
        const tier = assessmentData.tier || 'basic';
        const price = assessmentData.price || 0;
        
        // CRITICAL FIX: Determine redirect based on tier with explicit checks
        let defaultPath;
        
        // Check tier first
        if (tier === 'premium' || price >= 250) {
          defaultPath = `/assessment/${type}/premium-results/${id}`;
          console.log(`Premium tier/price detected for fallback redirect: ${defaultPath}`);
        } else if (tier === 'standard' || price >= 100) {
          defaultPath = `/assessment/${type}/standard-results/${id}`;
          console.log(`Standard tier/price detected for fallback redirect: ${defaultPath}`);
        } else {
          defaultPath = `/assessment/${type}/processing/${id}`;
          console.log(`Basic tier detected for fallback redirect: ${defaultPath}`);
        }
        
        console.log(`Fallback redirect to: ${defaultPath}`);
        router.push(defaultPath);
      }
    } catch (error) {
      console.error('Error submitting assessment:', error);
      setError(error instanceof Error ? error.message : 'Error submitting assessment. Please try again.');
      setDebugInfo(`Submission error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSubmitting(false);
    }
  };

  // Show loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessment...</p>
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
          
          {/* Debug info (only in development) */}
          {process.env.NODE_ENV === 'development' && debugInfo && (
            <div className="mb-6 p-3 bg-gray-100 text-xs text-gray-700 rounded-lg overflow-auto max-h-32">
              <strong>Debug:</strong> {debugInfo}
            </div>
          )}
          
          <div className="flex justify-center">
            <button
              onClick={fetchAssessment}
              className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get questions for current step
  const currentQuestions = questions.filter(q => q.step === currentStep) || [];
  const totalSteps = assessment?.totalSteps || 5;
  
  // Determine if we're on the final step
  const isFinalStep = assessment && currentStep === assessment.totalSteps;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
            <h1 className="text-2xl font-bold">
              {type in assessmentTypeLabels 
                ? assessmentTypeLabels[type as AssessmentType]
                : type}
            </h1>
            <p className="text-white/80 mt-1">Step {currentStep} of {totalSteps}</p>
            
            {/* Progress bar */}
            <div className="mt-4 w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full" 
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
          
          {/* Debug info (only in development) */}
          {process.env.NODE_ENV === 'development' && debugInfo && (
            <div className="px-6 pt-4 pb-0">
              <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <strong>Debug:</strong> {debugInfo}
              </div>
            </div>
          )}
          
          {/* Question form */}
          <div className="p-6">
            {currentQuestions.map((question, index) => (
              <div key={question.id} className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {index + 1}. {question.text}
                </h3>
                
                <Question 
                  question={question}
                  answer={answers[question.id]}
                  onAnswer={(value) => handleAnswer(question.id, value)}
                />
              </div>
            ))}
            
            {/* File upload section - only show on final step */}
            {isFinalStep && (
              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="font-medium text-blue-800 mb-2">Upload Your Resume/CV (Optional)</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Upload your resume for a more personalized assessment. Supported formats: PDF, DOC, DOCX, TXT (Max 5MB)
                </p>
                
                <div className="mt-2">
                  <input
                    type="file"
                    id="resume"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                  {fileError && (
                    <p className="mt-1 text-sm text-red-600">{fileError}</p>
                  )}
                  {resumeFile && (
                    <p className="mt-1 text-sm text-green-600">
                      File selected: {resumeFile.name} ({Math.round(resumeFile.size / 1024)} KB)
                    </p>
                  )}
                </div>
              </div>
            )}
            
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
                disabled={submitting}
                className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] hover:from-[#7e43f1] hover:to-[#38b6ff] text-white px-4 py-2 rounded-lg transition-colors"
              >
                {submitting 
                  ? 'Processing...' 
                  : assessment && currentStep < assessment.totalSteps 
                    ? 'Next' 
                    : 'Submit'
                }
              </button>
            </div>
            
            {/* Save and exit */}
            <div className="text-center mt-6">
              <button 
                onClick={saveProgress}
                className="text-sm text-gray-500 hover:text-[#7e43f1]"
              >
                Save and come back later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}