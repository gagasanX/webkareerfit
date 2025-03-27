// components/assessment/CCRLForm.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; // Import useSession hook
import AssessmentProcessingScreen from '@/components/assessment/AssessmentProcessingScreen'; // Import processing screen

// Update props interface to accept onSubmit or direct ID/type
interface CCRLFormProps {
  assessmentId?: string;
  assessmentType?: string;
  onSubmit?: (formData: any, resumeFile?: File) => Promise<void>;
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
  careerRelevance: string;
  confidenceReadiness: string;
  networkingRelationships: string;
  skillRenewal: string;
  selfManagement: string;
  interviewPreparedness: string;
  motivation: string;
}

export default function CCRLForm({ assessmentId, assessmentType, onSubmit }: CCRLFormProps) {
  // Log assessment ID untuk debugging
  if (assessmentId) {
    console.log('Current assessment ID:', assessmentId);
  }
  
  // Add useSession hook
  const { data: session, status } = useSession();
  
  // Add analyzing step to possible states
  const [step, setStep] = useState<'form' | 'preview' | 'processing' | 'analyzing'>('form');
  const [formData, setFormData] = useState<FormDataType>({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      personality: '',
      jobPosition: '',
    },
    qualification: '',
    careerRelevance: '',
    confidenceReadiness: '',
    networkingRelationships: '',
    skillRenewal: '',
    selfManagement: '',
    interviewPreparedness: '',
    motivation: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Update form data
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

  // Calculate progress percentage
  useEffect(() => {
    let completedFields = 0;

    // Count completed personal info fields
    if (formData.personalInfo.name) completedFields++;
    if (formData.personalInfo.email) completedFields++;
    if (formData.personalInfo.phone) completedFields++;
    if (formData.personalInfo.personality) completedFields++;
    if (formData.personalInfo.jobPosition) completedFields++;
    if (formData.qualification) completedFields++;

    // Count other sections
    if (formData.careerRelevance) completedFields++;
    if (formData.confidenceReadiness) completedFields++;
    if (formData.networkingRelationships) completedFields++;
    if (formData.skillRenewal) completedFields++;
    if (formData.selfManagement) completedFields++;
    if (formData.interviewPreparedness) completedFields++;
    if (formData.motivation) completedFields++;

    // Calculate percentage (7 assessment sections + 6 personal info fields)
    const totalFields = 13;
    const percentage = (completedFields / totalFields) * 100;
    setProgressPercentage(percentage);
  }, [formData]);

  // Handle input changes for all form fields
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

  // Handle file upload changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  // Move to preview after initial form submission
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

  // Final submission after preview - updated with analyzing step
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

  // Go back to edit form
  const handleBackToForm = () => {
    setStep('form');
    window.scrollTo(0, 0);
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
                  <p className="text-sm text-gray-500">Career Relevance and Industry Alignment</p>
                  <p className="font-medium">{formData.careerRelevance}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Confidence and Emotional Readiness</p>
                  <p className="font-medium">{formData.confidenceReadiness}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Networking and Professional Relationships</p>
                  <p className="font-medium">{formData.networkingRelationships}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Skill Renewal and Lifelong Learning</p>
                  <p className="font-medium">{formData.skillRenewal}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Self Management and Work Life Balance</p>
                  <p className="font-medium">{formData.selfManagement}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Interview and Job Search Preparedness</p>
                  <p className="font-medium">{formData.interviewPreparedness}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Motivation and Career Purpose</p>
                  <p className="font-medium">{formData.motivation}</p>
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
            onClick={handleBackToForm}
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

  // Render loading state during processing
  const renderProcessing = () => {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin"></div>
        <p className="mt-4 text-lg font-medium text-gray-800">Analyzing your assessment...</p>
        <p className="mt-2 text-gray-600">This may take a minute. We're processing your responses and analyzing your resume.</p>
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
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900">Career Comeback Readiness Level (CCRL) Assessment</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                The CCRL evaluates your preparedness to return to the workforce after a hiatus. It highlights strengths, identifies areas for improvement, and provides actionable insights.
              </p>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                <div 
                  className="bg-primary-600 h-2.5 rounded-full" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="mt-1 text-xs text-gray-500 text-right">
                {Math.round(progressPercentage)}% complete
              </div>
              
              <div className="mt-8 space-y-10">
                {/* Personal Information Section */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Personal Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="personalInfo.name" className="block text-sm font-medium text-gray-700">
                        Name *
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
                        Phone *
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
                      <label htmlFor="qualification" className="block text-sm font-medium text-gray-700">
                        Highest Qualification *
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
                  </div>
                  
                  <div>
                    <label htmlFor="personalInfo.jobPosition" className="block text-sm font-medium text-gray-700">
                      Job and position applying for? (e.g.: Junior Web Designer, Entry Level) *
                    </label>
                    <input
                      type="text"
                      name="personalInfo.jobPosition"
                      id="personalInfo.jobPosition"
                      value={formData.personalInfo.jobPosition}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="e.g.: Marketing Manager, UI/UX Designer, Project Coordinator"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="personalInfo.personality" className="block text-sm font-medium text-gray-700">
                      Describe your personality *
                    </label>
                    <textarea
                      name="personalInfo.personality"
                      id="personalInfo.personality"
                      rows={4}
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
                
                {/* Career Relevance Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Career Relevance and Industry Alignment</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.careerRelevance === "My professional knowledge and skills are up-to-date with the current industry standards."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="careerRelevance"
                        value="My professional knowledge and skills are up-to-date with the current industry standards."
                        checked={formData.careerRelevance === "My professional knowledge and skills are up-to-date with the current industry standards."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">My professional knowledge and skills are up-to-date with the current industry standards.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.careerRelevance === "I have a clear understanding of the changes and trends in my target industry since my hiatus."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="careerRelevance"
                        value="I have a clear understanding of the changes and trends in my target industry since my hiatus."
                        checked={formData.careerRelevance === "I have a clear understanding of the changes and trends in my target industry since my hiatus."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I have a clear understanding of the changes and trends in my target industry since my hiatus.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.careerRelevance === "I have identified the skills and certifications required for my desired role."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="careerRelevance"
                        value="I have identified the skills and certifications required for my desired role."
                        checked={formData.careerRelevance === "I have identified the skills and certifications required for my desired role."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I have identified the skills and certifications required for my desired role.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.careerRelevance === "My previous experience and achievements align with the expectations of my desired job."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="careerRelevance"
                        value="My previous experience and achievements align with the expectations of my desired job."
                        checked={formData.careerRelevance === "My previous experience and achievements align with the expectations of my desired job."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">My previous experience and achievements align with the expectations of my desired job.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.careerRelevance === "I can articulate how my background adds value to the current demands of the industry."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="careerRelevance"
                        value="I can articulate how my background adds value to the current demands of the industry."
                        checked={formData.careerRelevance === "I can articulate how my background adds value to the current demands of the industry."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I can articulate how my background adds value to the current demands of the industry.</span>
                    </label>
                  </div>
                </div>
                
                {/* Confidence and Emotional Readiness */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Confidence and Emotional Readiness</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.confidenceReadiness === "I feel confident about competing with current professionals for the desired role."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="confidenceReadiness"
                        value="I feel confident about competing with current professionals for the desired role."
                        checked={formData.confidenceReadiness === "I feel confident about competing with current professionals for the desired role."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">I feel confident about competing with current professionals for the desired role.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.confidenceReadiness === "I have strategies to address potential challenges related to my career hiatus."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="confidenceReadiness"
                        value="I have strategies to address potential challenges related to my career hiatus."
                        checked={formData.confidenceReadiness === "I have strategies to address potential challenges related to my career hiatus."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I have strategies to address potential challenges related to my career hiatus.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.confidenceReadiness === "I am emotionally prepared to manage workplace dynamics and responsibilities."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="confidenceReadiness"
                        value="I am emotionally prepared to manage workplace dynamics and responsibilities."
                        checked={formData.confidenceReadiness === "I am emotionally prepared to manage workplace dynamics and responsibilities."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am emotionally prepared to manage workplace dynamics and responsibilities.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.confidenceReadiness === "I view my career break as an opportunity to reflect and grow professionally."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="confidenceReadiness"
                        value="I view my career break as an opportunity to reflect and grow professionally."
                        checked={formData.confidenceReadiness === "I view my career break as an opportunity to reflect and grow professionally."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I view my career break as an opportunity to reflect and grow professionally.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.confidenceReadiness === "I am adaptable to changes in workplace culture and technological advancements."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="confidenceReadiness"
                        value="I am adaptable to changes in workplace culture and technological advancements."
                        checked={formData.confidenceReadiness === "I am adaptable to changes in workplace culture and technological advancements."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am adaptable to changes in workplace culture and technological advancements.</span>
                    </label>
                  </div>
                </div>
                
                {/* Networking and Professional Relationships */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Networking and Professional Relationships</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.networkingRelationships === "I have an active professional network that can support my career comeback."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="networkingRelationships"
                        value="I have an active professional network that can support my career comeback."
                        checked={formData.networkingRelationships === "I have an active professional network that can support my career comeback."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">I have an active professional network that can support my career comeback.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.networkingRelationships === "I have re-established connections with former colleagues, mentors, and industry peers."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="networkingRelationships"
                        value="I have re-established connections with former colleagues, mentors, and industry peers."
                        checked={formData.networkingRelationships === "I have re-established connections with former colleagues, mentors, and industry peers."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I have re-established connections with former colleagues, mentors, and industry peers.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.networkingRelationships === "I actively engage in industry events, forums, and professional communities."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="networkingRelationships"
                        value="I actively engage in industry events, forums, and professional communities."
                        checked={formData.networkingRelationships === "I actively engage in industry events, forums, and professional communities."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I actively engage in industry events, forums, and professional communities.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.networkingRelationships === "I can leverage my network to explore job opportunities and gain insights into the job market."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="networkingRelationships"
                        value="I can leverage my network to explore job opportunities and gain insights into the job market."
                        checked={formData.networkingRelationships === "I can leverage my network to explore job opportunities and gain insights into the job market."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I can leverage my network to explore job opportunities and gain insights into the job market.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.networkingRelationships === "I maintain a professional presence through platforms like LinkedIn to showcase my skills."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="networkingRelationships"
                        value="I maintain a professional presence through platforms like LinkedIn to showcase my skills."
                        checked={formData.networkingRelationships === "I maintain a professional presence through platforms like LinkedIn to showcase my skills."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I maintain a professional presence through platforms like LinkedIn to showcase my skills.</span>
                    </label>
                  </div>
                </div>
                
                {/* Skill Renewal and Lifelong Learning */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Skill Renewal and Lifelong Learning</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.skillRenewal === "I have completed relevant training, courses, or certifications to refresh or update my skills."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="skillRenewal"
                        value="I have completed relevant training, courses, or certifications to refresh or update my skills."
                        checked={formData.skillRenewal === "I have completed relevant training, courses, or certifications to refresh or update my skills."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">I have completed relevant training, courses, or certifications to refresh or update my skills.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.skillRenewal === "I am committed to continuous learning to stay relevant in my chosen field."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="skillRenewal"
                        value="I am committed to continuous learning to stay relevant in my chosen field."
                        checked={formData.skillRenewal === "I am committed to continuous learning to stay relevant in my chosen field."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am committed to continuous learning to stay relevant in my chosen field.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.skillRenewal === "I seek opportunities to gain hands-on experience and practical exposure to new tools or technologies."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="skillRenewal"
                        value="I seek opportunities to gain hands-on experience and practical exposure to new tools or technologies."
                        checked={formData.skillRenewal === "I seek opportunities to gain hands-on experience and practical exposure to new tools or technologies."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I seek opportunities to gain hands-on experience and practical exposure to new tools or technologies.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.skillRenewal === "I actively explore resources to bridge any skill gaps identified during my hiatus."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="skillRenewal"
                        value="I actively explore resources to bridge any skill gaps identified during my hiatus."
                        checked={formData.skillRenewal === "I actively explore resources to bridge any skill gaps identified during my hiatus."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I actively explore resources to bridge any skill gaps identified during my hiatus.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.skillRenewal === "I am open to learning from younger colleagues or mentors who have industry-specific expertise."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="skillRenewal"
                        value="I am open to learning from younger colleagues or mentors who have industry-specific expertise."
                        checked={formData.skillRenewal === "I am open to learning from younger colleagues or mentors who have industry-specific expertise."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am open to learning from younger colleagues or mentors who have industry-specific expertise.</span>
                    </label>
                  </div>
                </div>
                
                {/* Self-Management and Work-Life Balance */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Self Management and Work Life Balance</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.selfManagement === "I have strategies in place to manage my time and responsibilities effectively."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="selfManagement"
                        value="I have strategies in place to manage my time and responsibilities effectively."
                        checked={formData.selfManagement === "I have strategies in place to manage my time and responsibilities effectively."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">I have strategies in place to manage my time and responsibilities effectively.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.selfManagement === "I am prepared to create a balance between my personal and professional life."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="selfManagement"
                        value="I am prepared to create a balance between my personal and professional life."
                        checked={formData.selfManagement === "I am prepared to create a balance between my personal and professional life."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am prepared to create a balance between my personal and professional life.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.selfManagement === "I am confident in my ability to set boundaries to maintain work-life harmony."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="selfManagement"
                        value="I am confident in my ability to set boundaries to maintain work-life harmony."
                        checked={formData.selfManagement === "I am confident in my ability to set boundaries to maintain work-life harmony."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am confident in my ability to set boundaries to maintain work-life harmony.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.selfManagement === "I have resolved any personal challenges that might impact my work performance."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="selfManagement"
                        value="I have resolved any personal challenges that might impact my work performance."
                        checked={formData.selfManagement === "I have resolved any personal challenges that might impact my work performance."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I have resolved any personal challenges that might impact my work performance.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.selfManagement === "I have a plan to adjust to a regular work schedule and workplace demands."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="selfManagement"
                        value="I have a plan to adjust to a regular work schedule and workplace demands."
                        checked={formData.selfManagement === "I have a plan to adjust to a regular work schedule and workplace demands."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I have a plan to adjust to a regular work schedule and workplace demands.</span>
                    </label>
                  </div>
                </div>
                
                {/* Interview and Job Search Preparedness */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Interview and Job Search Preparedness</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.interviewPreparedness === "My resume and cover letter effectively highlight my skills, experiences, and career goals."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="interviewPreparedness"
                        value="My resume and cover letter effectively highlight my skills, experiences, and career goals."
                        checked={formData.interviewPreparedness === "My resume and cover letter effectively highlight my skills, experiences, and career goals."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">My resume and cover letter effectively highlight my skills, experiences, and career goals.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.interviewPreparedness === "I am confident in articulating the value of my career break during interviews."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="interviewPreparedness"
                        value="I am confident in articulating the value of my career break during interviews."
                        checked={formData.interviewPreparedness === "I am confident in articulating the value of my career break during interviews."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am confident in articulating the value of my career break during interviews.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.interviewPreparedness === "I am aware of how to tailor my job applications to specific employers and roles."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="interviewPreparedness"
                        value="I am aware of how to tailor my job applications to specific employers and roles."
                        checked={formData.interviewPreparedness === "I am aware of how to tailor my job applications to specific employers and roles."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am aware of how to tailor my job applications to specific employers and roles.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.interviewPreparedness === "I have practiced answering potential interview questions to address gaps in my career timeline."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="interviewPreparedness"
                        value="I have practiced answering potential interview questions to address gaps in my career timeline."
                        checked={formData.interviewPreparedness === "I have practiced answering potential interview questions to address gaps in my career timeline."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I have practiced answering potential interview questions to address gaps in my career timeline.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.interviewPreparedness === "I am familiar with digital tools and platforms used in modern recruitment processes."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="interviewPreparedness"
                        value="I am familiar with digital tools and platforms used in modern recruitment processes."
                        checked={formData.interviewPreparedness === "I am familiar with digital tools and platforms used in modern recruitment processes."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am familiar with digital tools and platforms used in modern recruitment processes.</span>
                    </label>
                  </div>
                </div>
                
                {/* Motivation and Career Purpose */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Motivation and Career Purpose</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.motivation === "I have a clear understanding of why I want to return to the workforce and what I seek in my next role."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="motivation"
                        value="I have a clear understanding of why I want to return to the workforce and what I seek in my next role."
                        checked={formData.motivation === "I have a clear understanding of why I want to return to the workforce and what I seek in my next role."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">I have a clear understanding of why I want to return to the workforce and what I seek in my next role.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.motivation === "My career goals are aligned with my personal values and long-term aspirations."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="motivation"
                        value="My career goals are aligned with my personal values and long-term aspirations."
                        checked={formData.motivation === "My career goals are aligned with my personal values and long-term aspirations."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">My career goals are aligned with my personal values and long-term aspirations.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.motivation === "I am motivated to overcome challenges and remain committed to my career comeback."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="motivation"
                        value="I am motivated to overcome challenges and remain committed to my career comeback."
                        checked={formData.motivation === "I am motivated to overcome challenges and remain committed to my career comeback."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am motivated to overcome challenges and remain committed to my career comeback.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.motivation === "I find fulfillment in pursuing opportunities that align with my passions and strengths."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="motivation"
                        value="I find fulfillment in pursuing opportunities that align with my passions and strengths."
                        checked={formData.motivation === "I find fulfillment in pursuing opportunities that align with my passions and strengths."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I find fulfillment in pursuing opportunities that align with my passions and strengths.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.motivation === "I am prepared to embrace feedback and adapt my approach to achieve my career objectives."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="motivation"
                        value="I am prepared to embrace feedback and adapt my approach to achieve my career objectives."
                        checked={formData.motivation === "I am prepared to embrace feedback and adapt my approach to achieve my career objectives."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am prepared to embrace feedback and adapt my approach to achieve my career objectives.</span>
                    </label>
                  </div>
                </div>
                
                {/* Error message */}
                {error && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-sm text-red-600">
                    {error}
                  </div>
                )}
                
                {/* Submit button */}
                <div className="pt-6 border-t border-gray-200">
                  <Button 
                    type="submit" 
                    className="w-full md:w-auto"
                  >
                    Preview Assessment
                  </Button>
                  
                  <p className="mt-4 text-sm text-gray-500">
                    By submitting this assessment, you agree to our terms and conditions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {step === 'preview' && renderPreview()}
      {step === 'processing' && renderProcessing()}
    </div>
  );
}