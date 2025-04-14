'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AssessmentProcessingScreen from '@/components/assessment/AssessmentProcessingScreen';

// Define the AssessmentType type to match what's expected in AssessmentProcessingScreen
type AssessmentType = 'rrl' | 'ja' | 'mja'; // Add other valid assessment types as needed

interface RRLFormProps {
  assessmentId?: string;
  assessmentType?: AssessmentType; // Updated type here
  onSubmit?: (formData: any, resumeFile?: File) => Promise<void>;
  initialData?: any;
}

interface FormDataType {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    personality: string;
    jobPosition: string;
  };
  qualification: string;
  financialPreparedness: string;
  emotionalMentalPreparedness: string;
  physicalHealthPreparedness: string;
  purposeLifestylePlanning: string;
  socialCommunityEngagement: string;
  gigWorkSupplementalIncome: string;
  spiritualReflectiveReadiness: string;
}

export default function RRLForm({ assessmentId, assessmentType, onSubmit, initialData }: RRLFormProps) {
  // Log assessment ID for debugging
  if (assessmentId) {
    console.log('Current assessment ID:', assessmentId);
  }
  
  // Add useSession hook
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [step, setStep] = useState<'form' | 'preview' | 'processing' | 'analyzing'>('form');
  const [formData, setFormData] = useState<FormDataType>(initialData || {
    personalInfo: {
      name: session?.user?.name || '',
      email: session?.user?.email || '',
      phone: '',
      personality: '',
      jobPosition: '',
    },
    qualification: '',
    financialPreparedness: '',
    emotionalMentalPreparedness: '',
    physicalHealthPreparedness: '',
    purposeLifestylePlanning: '',
    socialCommunityEngagement: '',
    gigWorkSupplementalIncome: '',
    spiritualReflectiveReadiness: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate progress percentage based on completed fields
  useEffect(() => {
    let completedFields = 0;
    const totalFields = 13; // 5 personal fields + qualification + 7 assessment sections
    
    // Count completed personal info fields
    if (formData.personalInfo.name) completedFields++;
    if (formData.personalInfo.email) completedFields++;
    if (formData.personalInfo.phone) completedFields++;
    if (formData.personalInfo.personality) completedFields++;
    if (formData.personalInfo.jobPosition) completedFields++;
    if (formData.qualification) completedFields++;
    
    // Count assessment fields
    if (formData.financialPreparedness) completedFields++;
    if (formData.emotionalMentalPreparedness) completedFields++;
    if (formData.physicalHealthPreparedness) completedFields++;
    if (formData.purposeLifestylePlanning) completedFields++;
    if (formData.socialCommunityEngagement) completedFields++;
    if (formData.gigWorkSupplementalIncome) completedFields++;
    if (formData.spiritualReflectiveReadiness) completedFields++;
    
    const percentage = (completedFields / totalFields) * 100;
    setProgressPercentage(percentage);
  }, [formData]);

  const updateFormData = (section: string, field: string, value: string) => {
    if (section === 'personalInfo') {
      setFormData({
        ...formData,
        personalInfo: {
          ...formData.personalInfo,
          [field]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [section]: value,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      updateFormData(section, field, value);
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    if (!formData.personalInfo.name || !formData.personalInfo.email || !formData.personalInfo.jobPosition) {
      setError('Please fill in all required fields.');
      return;
    }

    // Proceed to preview
    setStep('preview');
    window.scrollTo(0, 0);
  };

  const handleFinalSubmit = async () => {
    console.log('Final submit function called');
    
    // Validate inputs
    if (!formData.personalInfo.name || !formData.personalInfo.email) {
      setError('Missing required personal information.');
      return;
    }
    
    try {
      // Show processing state and clear errors
      setIsSubmitting(true);
      setError('');
      
      // Show the "analyzing" step with the new processing screen
      setStep('analyzing');
      
      // Use onSubmit prop if provided
      if (onSubmit) {
        await onSubmit(formData, resumeFile || undefined);
        return; // Let parent handle navigation
      }
      
      // Otherwise use direct API submission
      if (!assessmentId || !assessmentType) {
        throw new Error('Assessment ID and type are required');
      }
      
      console.log('Creating form data for API submission');
      console.log('Using assessment ID:', assessmentId);
      
      // Create FormData for submission
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('formData', JSON.stringify(formData));
      
      if (resumeFile) {
        console.log('Adding resume file:', resumeFile.name);
        formDataToSubmit.append('resume', resumeFile);
      }
      
      // Submit to API
      const endpoint = `/api/assessment/${assessmentType}/${assessmentId}/submit-with-file`;
      console.log('Submitting to API:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formDataToSubmit
      });
      
      console.log('API response status:', response.status);
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // If not JSON, get text content for better error message
        const textContent = await response.text();
        console.error('Non-JSON response:', textContent.substring(0, 200));
        throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
      }
      
      // Now safely parse JSON
      const result = await response.json();
      console.log('Submission successful:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit assessment');
      }
      
      // Redirect to results page - with a delay to show the processing screen
      setTimeout(() => {
        router.push(result.redirectTo || `/assessment/${assessmentType}/results/${assessmentId}`);
      }, 5000); // Give the processing screen time to show (5 seconds minimum)
      
    } catch (err) {
      console.error('Error during submission:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit. Please try again.';
      setError(errorMessage);
      setStep('preview'); // Go back to preview on error
    } finally {
      if (onSubmit) {
        setIsSubmitting(false); // Only reset isSubmitting if not redirecting
      }
    }
  };

  // Render the preview section
  const renderPreview = () => {
    return (
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Your Assessment</h2>
          <p className="text-gray-600 mb-6">Please review your answers before submitting for analysis.</p>  

          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-800">Personal Information</h3>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{formData.personalInfo.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{formData.personalInfo.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{formData.personalInfo.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Job Position</p>
                  <p className="font-medium">{formData.personalInfo.jobPosition}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Qualification</p>
                  <p className="font-medium">{formData.qualification}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Resume</p>
                  <p className="font-medium">{resumeFile ? resumeFile.name : 'No file uploaded'}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-800">Assessment Responses</h3>
              <div className="mt-2 space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Financial Preparedness</p>
                  <p className="font-medium">{formData.financialPreparedness}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Emotional and Mental Preparedness</p>
                  <p className="font-medium">{formData.emotionalMentalPreparedness}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Physical and Health Preparedness</p>
                  <p className="font-medium">{formData.physicalHealthPreparedness}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Purpose and Lifestyle Planning</p>
                  <p className="font-medium">{formData.purposeLifestylePlanning}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Social and Community Engagement</p>
                  <p className="font-medium">{formData.socialCommunityEngagement}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gig Work and Supplemental Income</p>
                  <p className="font-medium">{formData.gigWorkSupplementalIncome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Spiritual and Reflective Readiness</p>
                  <p className="font-medium">{formData.spiritualReflectiveReadiness}</p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {/* Buttons for navigation/submission */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
            <button 
              type="button" 
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              onClick={() => setStep('form')}
              disabled={isSubmitting}
            >
              Edit Responses
            </button>
            
            <button 
              type="button" 
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              onClick={() => {
                console.log('Submit button clicked');
                handleFinalSubmit();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Confirm & Submit'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Authentication warning if not logged in */}
      {status === 'unauthenticated' && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <p className="text-yellow-700">
            <strong>Note:</strong> You must be logged in to submit this assessment. Your responses will not be saved otherwise.
          </p>
        </div>
      )}
    
      {step === 'form' && (
        <form onSubmit={handleFormSubmit} className="space-y-8">
          <div className="bg-white overflow-hidden shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900">Retirement Readiness Level (RRL) Assessment</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 mb-6">
              The Retirement Readiness Level (RRL) assesses an individual's preparedness for retirement, focusing on their financial stability, emotional and mental readiness, future planning, and overall well-being.
            </p>
            
            {/* Progress bar */}
            <div className="mb-8 mt-4">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Progress</span>
                <span className="text-xs text-gray-500">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
            
            {/* Personal Information Section */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="personalInfo.name" className="block text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="personalInfo.name"
                    id="personalInfo.name"
                    value={formData.personalInfo.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="personalInfo.email" className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="personalInfo.email"
                    id="personalInfo.email"
                    value={formData.personalInfo.email}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="personalInfo.phone" className="block text-sm font-medium text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="personalInfo.phone"
                    id="personalInfo.phone"
                    value={formData.personalInfo.phone}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="personalInfo.jobPosition" className="block text-sm font-medium text-gray-700">
                    Job and position applying for? *
                  </label>
                  <input
                    type="text"
                    name="personalInfo.jobPosition"
                    id="personalInfo.jobPosition"
                    value={formData.personalInfo.jobPosition}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="e.g.: Previous role or current position"
                  />
                </div>
                <div>
                  <label htmlFor="qualification" className="block text-sm font-medium text-gray-700">
                    Highest qualification *
                  </label>
                  <select
                    id="qualification"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">Select...</option>
                    <option value="SPM, STPM, or equivalent">SPM, STPM, or equivalent (Foundation, Certificate, etc)</option>
                    <option value="Diploma or Advanced Diploma">Diploma or Advanced Diploma</option>
                    <option value="Undergraduate Degree">Undergraduate Degree</option>
                    <option value="Postgraduate Degree">Postgraduate Degree</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="personalInfo.personality" className="block text-sm font-medium text-gray-700">
                    Describe your personality *
                  </label>
                  <textarea
                    name="personalInfo.personality"
                    id="personalInfo.personality"
                    rows={3}
                    value={formData.personalInfo.personality}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Tell us about your work style, strengths, and how you handle challenges..."
                  />
                </div>
                <div>
                  <label htmlFor="resume" className="block text-sm font-medium text-gray-700">
                    Upload Resume *
                  </label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="file"
                      id="resume"
                      name="resume"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center"
                    >
                      {resumeFile ? resumeFile.name : 'Choose File'}
                    </Button>
                    {resumeFile && (
                      <button
                        type="button"
                        onClick={() => setResumeFile(null)}
                        className="ml-2 text-sm text-red-600 hover:text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">PDF, DOC, or DOCX. Maximum 5MB.</p>
                </div>
              </div>
            </div>
            
            {/* Assessment Sections */}
            <div className="space-y-8">
              {/* Financial Preparedness */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Preparedness</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                <div className="space-y-3">
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.financialPreparedness === "I have a clear understanding of my current financial situation and future income sources, including pensions, savings, and investments."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="financialPreparedness"
                      value="I have a clear understanding of my current financial situation and future income sources, including pensions, savings, and investments."
                      checked={formData.financialPreparedness === "I have a clear understanding of my current financial situation and future income sources, including pensions, savings, and investments."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      required
                    />
                    <span className="ml-3 text-gray-700">I have a clear understanding of my current financial situation and future income sources, including pensions, savings, and investments.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.financialPreparedness === "I have calculated my estimated monthly expenses for retirement and created a budget to sustain my lifestyle."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="financialPreparedness"
                      value="I have calculated my estimated monthly expenses for retirement and created a budget to sustain my lifestyle."
                      checked={formData.financialPreparedness === "I have calculated my estimated monthly expenses for retirement and created a budget to sustain my lifestyle."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I have calculated my estimated monthly expenses for retirement and created a budget to sustain my lifestyle.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.financialPreparedness === "I am aware of potential healthcare and long-term care costs and have prepared financially to manage them."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="financialPreparedness"
                      value="I am aware of potential healthcare and long-term care costs and have prepared financially to manage them."
                      checked={formData.financialPreparedness === "I am aware of potential healthcare and long-term care costs and have prepared financially to manage them."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I am aware of potential healthcare and long-term care costs and have prepared financially to manage them.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.financialPreparedness === "I have diversified my savings and investments to minimize risks and ensure consistent income during retirement."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="financialPreparedness"
                      value="I have diversified my savings and investments to minimize risks and ensure consistent income during retirement."
                      checked={formData.financialPreparedness === "I have diversified my savings and investments to minimize risks and ensure consistent income during retirement."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I have diversified my savings and investments to minimize risks and ensure consistent income during retirement.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.financialPreparedness === "I feel confident that my financial resources will support me throughout my retirement years without compromising my standard of living."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="financialPreparedness"
                      value="I feel confident that my financial resources will support me throughout my retirement years without compromising my standard of living."
                      checked={formData.financialPreparedness === "I feel confident that my financial resources will support me throughout my retirement years without compromising my standard of living."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I feel confident that my financial resources will support me throughout my retirement years without compromising my standard of living.</span>
                  </label>
                </div>
              </div>

              {/* Emotional and Mental Preparedness */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Emotional and Mental Preparedness</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                <div className="space-y-3">
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.emotionalMentalPreparedness === "I have a positive outlook on retirement and see it as an opportunity to explore new interests and activities."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="emotionalMentalPreparedness"
                      value="I have a positive outlook on retirement and see it as an opportunity to explore new interests and activities."
                      checked={formData.emotionalMentalPreparedness === "I have a positive outlook on retirement and see it as an opportunity to explore new interests and activities."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      required
                    />
                    <span className="ml-3 text-gray-700">I have a positive outlook on retirement and see it as an opportunity to explore new interests and activities.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.emotionalMentalPreparedness === "I feel emotionally prepared to let go of my professional identity and embrace a new phase of life."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="emotionalMentalPreparedness"
                      value="I feel emotionally prepared to let go of my professional identity and embrace a new phase of life."
                      checked={formData.emotionalMentalPreparedness === "I feel emotionally prepared to let go of my professional identity and embrace a new phase of life."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I feel emotionally prepared to let go of my professional identity and embrace a new phase of life.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.emotionalMentalPreparedness === "I have strategies to manage potential feelings of isolation, boredom, or loss of purpose during retirement."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="emotionalMentalPreparedness"
                      value="I have strategies to manage potential feelings of isolation, boredom, or loss of purpose during retirement."
                      checked={formData.emotionalMentalPreparedness === "I have strategies to manage potential feelings of isolation, boredom, or loss of purpose during retirement."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I have strategies to manage potential feelings of isolation, boredom, or loss of purpose during retirement.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.emotionalMentalPreparedness === "I am comfortable discussing my retirement plans with family and friends and receiving their input or support."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="emotionalMentalPreparedness"
                      value="I am comfortable discussing my retirement plans with family and friends and receiving their input or support."
                      checked={formData.emotionalMentalPreparedness === "I am comfortable discussing my retirement plans with family and friends and receiving their input or support."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I am comfortable discussing my retirement plans with family and friends and receiving their input or support.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.emotionalMentalPreparedness === "I have prepared for the emotional changes that may come with a reduced role in professional or social settings."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="emotionalMentalPreparedness"
                      value="I have prepared for the emotional changes that may come with a reduced role in professional or social settings."
                      checked={formData.emotionalMentalPreparedness === "I have prepared for the emotional changes that may come with a reduced role in professional or social settings."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I have prepared for the emotional changes that may come with a reduced role in professional or social settings.</span>
                  </label>
                </div>
              </div>

              {/* Physical and Health Preparedness */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Physical and Health Preparedness</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                <div className="space-y-3">
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.physicalHealthPreparedness === "I have a plan to maintain my physical health through regular exercise, balanced nutrition, and preventive healthcare."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="physicalHealthPreparedness"
                      value="I have a plan to maintain my physical health through regular exercise, balanced nutrition, and preventive healthcare."
                      checked={formData.physicalHealthPreparedness === "I have a plan to maintain my physical health through regular exercise, balanced nutrition, and preventive healthcare."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      required
                    />
                    <span className="ml-3 text-gray-700">I have a plan to maintain my physical health through regular exercise, balanced nutrition, and preventive healthcare.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.physicalHealthPreparedness === "I have consulted with healthcare professionals to ensure I understand and address my health needs for retirement."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="physicalHealthPreparedness"
                      value="I have consulted with healthcare professionals to ensure I understand and address my health needs for retirement."
                      checked={formData.physicalHealthPreparedness === "I have consulted with healthcare professionals to ensure I understand and address my health needs for retirement."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I have consulted with healthcare professionals to ensure I understand and address my health needs for retirement.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.physicalHealthPreparedness === "I have adequate health insurance or savings to cover unforeseen medical expenses."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="physicalHealthPreparedness"
                      value="I have adequate health insurance or savings to cover unforeseen medical expenses."
                      checked={formData.physicalHealthPreparedness === "I have adequate health insurance or savings to cover unforeseen medical expenses."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I have adequate health insurance or savings to cover unforeseen medical expenses.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.physicalHealthPreparedness === "I feel physically capable of engaging in activities or hobbies that I look forward to pursuing in retirement."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="physicalHealthPreparedness"
                      value="I feel physically capable of engaging in activities or hobbies that I look forward to pursuing in retirement."
                      checked={formData.physicalHealthPreparedness === "I feel physically capable of engaging in activities or hobbies that I look forward to pursuing in retirement."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I feel physically capable of engaging in activities or hobbies that I look forward to pursuing in retirement.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.physicalHealthPreparedness === "I regularly monitor and take proactive steps to maintain or improve my overall health."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="physicalHealthPreparedness"
                      value="I regularly monitor and take proactive steps to maintain or improve my overall health."
                      checked={formData.physicalHealthPreparedness === "I regularly monitor and take proactive steps to maintain or improve my overall health."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I regularly monitor and take proactive steps to maintain or improve my overall health.</span>
                  </label>
                </div>
              </div>

              {/* Purpose and Lifestyle Planning */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Purpose and Lifestyle Planning</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                <div className="space-y-3">
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.purposeLifestylePlanning === "I have identified hobbies, activities, or causes that I want to explore or engage in during retirement."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="purposeLifestylePlanning"
                      value="I have identified hobbies, activities, or causes that I want to explore or engage in during retirement."
                      checked={formData.purposeLifestylePlanning === "I have identified hobbies, activities, or causes that I want to explore or engage in during retirement."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      required
                    />
                    <span className="ml-3 text-gray-700">I have identified hobbies, activities, or causes that I want to explore or engage in during retirement.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.purposeLifestylePlanning === "I feel confident that I can structure my daily routine to find purpose and joy in my retirement years."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="purposeLifestylePlanning"
                      value="I feel confident that I can structure my daily routine to find purpose and joy in my retirement years."
                      checked={formData.purposeLifestylePlanning === "I feel confident that I can structure my daily routine to find purpose and joy in my retirement years."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I feel confident that I can structure my daily routine to find purpose and joy in my retirement years.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.purposeLifestylePlanning === "I have a clear plan for how I will stay socially connected and engaged after leaving the workforce."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="purposeLifestylePlanning"
                      value="I have a clear plan for how I will stay socially connected and engaged after leaving the workforce."
                      checked={formData.purposeLifestylePlanning === "I have a clear plan for how I will stay socially connected and engaged after leaving the workforce."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I have a clear plan for how I will stay socially connected and engaged after leaving the workforce.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.purposeLifestylePlanning === "I have considered how I will balance leisure, personal development, and family responsibilities in retirement."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="purposeLifestylePlanning"
                      value="I have considered how I will balance leisure, personal development, and family responsibilities in retirement."
                      checked={formData.purposeLifestylePlanning === "I have considered how I will balance leisure, personal development, and family responsibilities in retirement."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I have considered how I will balance leisure, personal development, and family responsibilities in retirement.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.purposeLifestylePlanning === "I am excited about the opportunities retirement offers to pursue new goals and passions."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="purposeLifestylePlanning"
                      value="I am excited about the opportunities retirement offers to pursue new goals and passions."
                      checked={formData.purposeLifestylePlanning === "I am excited about the opportunities retirement offers to pursue new goals and passions."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I am excited about the opportunities retirement offers to pursue new goals and passions.</span>
                  </label>
                </div>
              </div>

              {/* Social and Community Engagement */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Social and Community Engagement</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                <div className="space-y-3">
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.socialCommunityEngagement === "I have a strong support network of family and friends who I can rely on during retirement."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="socialCommunityEngagement"
                      value="I have a strong support network of family and friends who I can rely on during retirement."
                      checked={formData.socialCommunityEngagement === "I have a strong support network of family and friends who I can rely on during retirement."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      required
                    />
                    <span className="ml-3 text-gray-700">I have a strong support network of family and friends who I can rely on during retirement.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.socialCommunityEngagement === "I am comfortable reaching out to new people or joining groups to expand my social circle if needed."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="socialCommunityEngagement"
                      value="I am comfortable reaching out to new people or joining groups to expand my social circle if needed."
                      checked={formData.socialCommunityEngagement === "I am comfortable reaching out to new people or joining groups to expand my social circle if needed."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I am comfortable reaching out to new people or joining groups to expand my social circle if needed.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.socialCommunityEngagement === "I plan to volunteer, mentor, or participate in community programs to stay connected and active."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="socialCommunityEngagement"
                      value="I plan to volunteer, mentor, or participate in community programs to stay connected and active."
                      checked={formData.socialCommunityEngagement === "I plan to volunteer, mentor, or participate in community programs to stay connected and active."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I plan to volunteer, mentor, or participate in community programs to stay connected and active.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.socialCommunityEngagement === "I have identified ways to continue contributing to society or sharing my knowledge and skills during retirement."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="socialCommunityEngagement"
                      value="I have identified ways to continue contributing to society or sharing my knowledge and skills during retirement."
                      checked={formData.socialCommunityEngagement === "I have identified ways to continue contributing to society or sharing my knowledge and skills during retirement."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I have identified ways to continue contributing to society or sharing my knowledge and skills during retirement.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.socialCommunityEngagement === "I value and prioritize maintaining meaningful relationships in my retirement years."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="socialCommunityEngagement"
                      value="I value and prioritize maintaining meaningful relationships in my retirement years."
                      checked={formData.socialCommunityEngagement === "I value and prioritize maintaining meaningful relationships in my retirement years."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I value and prioritize maintaining meaningful relationships in my retirement years.</span>
                  </label>
                </div>
              </div>

              {/* Gig Work and Supplemental Income */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Gig Work and Supplemental Income</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                <div className="space-y-3">
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.gigWorkSupplementalIncome === "I have explored opportunities for part-time work or freelancing to supplement my retirement income if needed."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="gigWorkSupplementalIncome"
                      value="I have explored opportunities for part-time work or freelancing to supplement my retirement income if needed."
                      checked={formData.gigWorkSupplementalIncome === "I have explored opportunities for part-time work or freelancing to supplement my retirement income if needed."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      required
                    />
                    <span className="ml-3 text-gray-700">I have explored opportunities for part-time work or freelancing to supplement my retirement income if needed.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.gigWorkSupplementalIncome === "I feel confident that I can leverage my skills or expertise to generate additional income post-retirement."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="gigWorkSupplementalIncome"
                      value="I feel confident that I can leverage my skills or expertise to generate additional income post-retirement."
                      checked={formData.gigWorkSupplementalIncome === "I feel confident that I can leverage my skills or expertise to generate additional income post-retirement."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I feel confident that I can leverage my skills or expertise to generate additional income post-retirement.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.gigWorkSupplementalIncome === "I have considered how gig work might affect my retirement plans, both positively and negatively."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="gigWorkSupplementalIncome"
                      value="I have considered how gig work might affect my retirement plans, both positively and negatively."
                      checked={formData.gigWorkSupplementalIncome === "I have considered how gig work might affect my retirement plans, both positively and negatively."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I have considered how gig work might affect my retirement plans, both positively and negatively.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.gigWorkSupplementalIncome === "I am aware of how to balance gig work with leisure and family time during retirement."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="gigWorkSupplementalIncome"
                      value="I am aware of how to balance gig work with leisure and family time during retirement."
                      checked={formData.gigWorkSupplementalIncome === "I am aware of how to balance gig work with leisure and family time during retirement."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I am aware of how to balance gig work with leisure and family time during retirement.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.gigWorkSupplementalIncome === "I am open to adapting to new roles or industries for supplemental income opportunities if required."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="gigWorkSupplementalIncome"
                      value="I am open to adapting to new roles or industries for supplemental income opportunities if required."
                      checked={formData.gigWorkSupplementalIncome === "I am open to adapting to new roles or industries for supplemental income opportunities if required."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I am open to adapting to new roles or industries for supplemental income opportunities if required.</span>
                  </label>
                </div>
              </div>

              {/* Spiritual and Reflective Readiness */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Spiritual and Reflective Readiness</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                <div className="space-y-3">
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.spiritualReflectiveReadiness === "I have considered how my retirement years can be a time for personal growth and self-reflection."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="spiritualReflectiveReadiness"
                      value="I have considered how my retirement years can be a time for personal growth and self-reflection."
                      checked={formData.spiritualReflectiveReadiness === "I have considered how my retirement years can be a time for personal growth and self-reflection."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      required
                    />
                    <span className="ml-3 text-gray-700">I have considered how my retirement years can be a time for personal growth and self-reflection.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.spiritualReflectiveReadiness === "I feel aligned with my personal values and priorities as I transition into this new phase of life."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="spiritualReflectiveReadiness"
                      value="I feel aligned with my personal values and priorities as I transition into this new phase of life."
                      checked={formData.spiritualReflectiveReadiness === "I feel aligned with my personal values and priorities as I transition into this new phase of life."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I feel aligned with my personal values and priorities as I transition into this new phase of life.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.spiritualReflectiveReadiness === "I regularly practice mindfulness, gratitude, or other techniques to nurture my emotional and spiritual well-being."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="spiritualReflectiveReadiness"
                      value="I regularly practice mindfulness, gratitude, or other techniques to nurture my emotional and spiritual well-being."
                      checked={formData.spiritualReflectiveReadiness === "I regularly practice mindfulness, gratitude, or other techniques to nurture my emotional and spiritual well-being."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I regularly practice mindfulness, gratitude, or other techniques to nurture my emotional and spiritual well-being.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.spiritualReflectiveReadiness === "I have identified ways to give back or leave a legacy that aligns with my purpose and beliefs."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="spiritualReflectiveReadiness"
                      value="I have identified ways to give back or leave a legacy that aligns with my purpose and beliefs."
                      checked={formData.spiritualReflectiveReadiness === "I have identified ways to give back or leave a legacy that aligns with my purpose and beliefs."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I have identified ways to give back or leave a legacy that aligns with my purpose and beliefs.</span>
                  </label>
                  
                  <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.spiritualReflectiveReadiness === "I feel at peace with my decision to retire and confident about the life I am transitioning into."
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="spiritualReflectiveReadiness"
                      value="I feel at peace with my decision to retire and confident about the life I am transitioning into."
                      checked={formData.spiritualReflectiveReadiness === "I feel at peace with my decision to retire and confident about the life I am transitioning into."}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">I feel at peace with my decision to retire and confident about the life I am transitioning into.</span>
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="mt-8 flex justify-end">
              <Button 
                type="submit" 
                className="bg-primary-600 hover:bg-primary-700"
              >
                Review Assessment
              </Button>
            </div>
          </div>
        </form>
      )}

      {step === 'preview' && renderPreview()}
      
      {step === 'analyzing' && (
        <AssessmentProcessingScreen 
          assessmentType={assessmentType || 'rrl'} 
          onComplete={() => {
            if (assessmentId && assessmentType) {
              router.push(`/assessment/${assessmentType}/results/${assessmentId}`);
            }
          }}
        />
      )}
    </div>
  );
}