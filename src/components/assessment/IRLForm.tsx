'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AssessmentProcessingScreen from '@/components/assessment/AssessmentProcessingScreen';

interface IRLFormProps {
  assessmentId?: string;
  assessmentType?: string;
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
  coreSkillsAndKnowledge: string;
  emotionalIntelligence: string;
  socialIntelligence: string;
  competencyAndKnowHow: string;
  strategicThinkingAndGoalSetting: string;
  professionalPresentationAndPreparedness: string;
  continuousLearningAndGrowthMindset: string;
}

export default function IRLForm({ assessmentId, assessmentType, onSubmit, initialData }: IRLFormProps) {
  // Log assessment ID for debugging
  if (assessmentId) {
    console.log('Current assessment ID:', assessmentId);
  }
  
  // Add useSession hook
  const { data: session, status } = useSession();
  
  // Add analyzing step to possible states
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
    coreSkillsAndKnowledge: '',
    emotionalIntelligence: '',
    socialIntelligence: '',
    competencyAndKnowHow: '',
    strategicThinkingAndGoalSetting: '',
    professionalPresentationAndPreparedness: '',
    continuousLearningAndGrowthMindset: '',
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
    if (formData.coreSkillsAndKnowledge) completedFields++;
    if (formData.emotionalIntelligence) completedFields++;
    if (formData.socialIntelligence) completedFields++;
    if (formData.competencyAndKnowHow) completedFields++;
    if (formData.strategicThinkingAndGoalSetting) completedFields++;
    if (formData.professionalPresentationAndPreparedness) completedFields++;
    if (formData.continuousLearningAndGrowthMindset) completedFields++;

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
                  <p className="text-sm text-gray-500">Core Skills and Knowledge</p>
                  <p className="font-medium">{formData.coreSkillsAndKnowledge}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Emotional Intelligence</p>
                  <p className="font-medium">{formData.emotionalIntelligence}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Social Intelligence</p>
                  <p className="font-medium">{formData.socialIntelligence}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Competency and Know-How</p>
                  <p className="font-medium">{formData.competencyAndKnowHow}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Strategic Thinking and Goal Setting</p>
                  <p className="font-medium">{formData.strategicThinkingAndGoalSetting}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Professional Presentation and Preparedness</p>
                  <p className="font-medium">{formData.professionalPresentationAndPreparedness}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Continuous Learning and Growth Mindset</p>
                  <p className="font-medium">{formData.continuousLearningAndGrowthMindset}</p>
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
              <h2 className="text-lg font-medium text-gray-900">Internship Readiness Level (IRL) Assessment</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                The Internship Readiness Level (IRL) assesses an individual's preparedness for entering the professional world through internships, focusing on their skills, adaptability, work ethic, and alignment with career goals.
              </p>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                <div 
                  className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
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
                      placeholder="e.g.: Junior Web Designer, Entry Level"
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
                      placeholder="Tell us about your personality traits, work style, and how you interact with others..."
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
                
                {/* Core Skills and Knowledge Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Core Skills and Knowledge</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.coreSkillsAndKnowledge === "I have a clear understanding of the technical requirements and job-specific knowledge for the role."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="coreSkillsAndKnowledge"
                        value="I have a clear understanding of the technical requirements and job-specific knowledge for the role."
                        checked={formData.coreSkillsAndKnowledge === "I have a clear understanding of the technical requirements and job-specific knowledge for the role."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">I have a clear understanding of the technical requirements and job-specific knowledge for the role.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.coreSkillsAndKnowledge === "My problem-solving abilities enable me to address challenges logically and effectively."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="coreSkillsAndKnowledge"
                        value="My problem-solving abilities enable me to address challenges logically and effectively."
                        checked={formData.coreSkillsAndKnowledge === "My problem-solving abilities enable me to address challenges logically and effectively."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">My problem-solving abilities enable me to address challenges logically and effectively.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.coreSkillsAndKnowledge === "I have a strong foundation in industry-related tools, technologies, or methodologies."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="coreSkillsAndKnowledge"
                        value="I have a strong foundation in industry-related tools, technologies, or methodologies."
                        checked={formData.coreSkillsAndKnowledge === "I have a strong foundation in industry-related tools, technologies, or methodologies."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I have a strong foundation in industry-related tools, technologies, or methodologies.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.coreSkillsAndKnowledge === "I can apply critical thinking to analyze complex situations and develop appropriate solutions."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="coreSkillsAndKnowledge"
                        value="I can apply critical thinking to analyze complex situations and develop appropriate solutions."
                        checked={formData.coreSkillsAndKnowledge === "I can apply critical thinking to analyze complex situations and develop appropriate solutions."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I can apply critical thinking to analyze complex situations and develop appropriate solutions.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.coreSkillsAndKnowledge === "I consistently seek opportunities to update my skills and stay relevant in my field."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="coreSkillsAndKnowledge"
                        value="I consistently seek opportunities to update my skills and stay relevant in my field."
                        checked={formData.coreSkillsAndKnowledge === "I consistently seek opportunities to update my skills and stay relevant in my field."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I consistently seek opportunities to update my skills and stay relevant in my field.</span>
                    </label>
                  </div>
                </div>
                
                {/* Emotional Intelligence */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Emotional Intelligence</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.emotionalIntelligence === "I understand my strengths and weaknesses and how they impact my professional interactions."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="emotionalIntelligence"
                        value="I understand my strengths and weaknesses and how they impact my professional interactions."
                        checked={formData.emotionalIntelligence === "I understand my strengths and weaknesses and how they impact my professional interactions."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">I understand my strengths and weaknesses and how they impact my professional interactions.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.emotionalIntelligence === "I can regulate my emotions under pressure to maintain focus and professionalism."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="emotionalIntelligence"
                        value="I can regulate my emotions under pressure to maintain focus and professionalism."
                        checked={formData.emotionalIntelligence === "I can regulate my emotions under pressure to maintain focus and professionalism."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I can regulate my emotions under pressure to maintain focus and professionalism.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.emotionalIntelligence === "I empathize with others' perspectives and build positive relationships in the workplace."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="emotionalIntelligence"
                        value="I empathize with others' perspectives and build positive relationships in the workplace."
                        checked={formData.emotionalIntelligence === "I empathize with others' perspectives and build positive relationships in the workplace."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I empathize with others' perspectives and build positive relationships in the workplace.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.emotionalIntelligence === "I handle constructive criticism with an open mind and use it for personal growth."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="emotionalIntelligence"
                        value="I handle constructive criticism with an open mind and use it for personal growth."
                        checked={formData.emotionalIntelligence === "I handle constructive criticism with an open mind and use it for personal growth."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I handle constructive criticism with an open mind and use it for personal growth.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.emotionalIntelligence === "I demonstrate resilience and adaptability when faced with unexpected challenges or changes."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="emotionalIntelligence"
                        value="I demonstrate resilience and adaptability when faced with unexpected challenges or changes."
                        checked={formData.emotionalIntelligence === "I demonstrate resilience and adaptability when faced with unexpected challenges or changes."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I demonstrate resilience and adaptability when faced with unexpected challenges or changes.</span>
                    </label>
                  </div>
                </div>
                
                {/* Social Intelligence */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Social Intelligence</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.socialIntelligence === "I can work collaboratively with diverse teams to achieve common goals."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="socialIntelligence"
                        value="I can work collaboratively with diverse teams to achieve common goals."
                        checked={formData.socialIntelligence === "I can work collaboratively with diverse teams to achieve common goals."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">I can work collaboratively with diverse teams to achieve common goals.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.socialIntelligence === "I effectively navigate workplace dynamics and manage conflicts constructively."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="socialIntelligence"
                        value="I effectively navigate workplace dynamics and manage conflicts constructively."
                        checked={formData.socialIntelligence === "I effectively navigate workplace dynamics and manage conflicts constructively."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I effectively navigate workplace dynamics and manage conflicts constructively.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.socialIntelligence === "I am aware of cultural sensitivities and respect differences in professional environments."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="socialIntelligence"
                        value="I am aware of cultural sensitivities and respect differences in professional environments."
                        checked={formData.socialIntelligence === "I am aware of cultural sensitivities and respect differences in professional environments."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am aware of cultural sensitivities and respect differences in professional environments.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.socialIntelligence === "I communicate ideas clearly and persuasively, both verbally and in writing."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="socialIntelligence"
                        value="I communicate ideas clearly and persuasively, both verbally and in writing."
                        checked={formData.socialIntelligence === "I communicate ideas clearly and persuasively, both verbally and in writing."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I communicate ideas clearly and persuasively, both verbally and in writing.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.socialIntelligence === "I build and maintain professional networks that support my career development."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="socialIntelligence"
                        value="I build and maintain professional networks that support my career development."
                        checked={formData.socialIntelligence === "I build and maintain professional networks that support my career development."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I build and maintain professional networks that support my career development.</span>
                    </label>
                  </div>
                </div>
                
                {/* Competency and Know-How */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Competency and Know-How</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.competencyAndKnowHow === "I can independently manage tasks and responsibilities to meet job expectations."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="competencyAndKnowHow"
                        value="I can independently manage tasks and responsibilities to meet job expectations."
                        checked={formData.competencyAndKnowHow === "I can independently manage tasks and responsibilities to meet job expectations."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">I can independently manage tasks and responsibilities to meet job expectations.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.competencyAndKnowHow === "I demonstrate precision and attention to detail in my work outputs."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="competencyAndKnowHow"
                        value="I demonstrate precision and attention to detail in my work outputs."
                        checked={formData.competencyAndKnowHow === "I demonstrate precision and attention to detail in my work outputs."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I demonstrate precision and attention to detail in my work outputs.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.competencyAndKnowHow === "I can integrate theoretical knowledge into practical scenarios effectively."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="competencyAndKnowHow"
                        value="I can integrate theoretical knowledge into practical scenarios effectively."
                        checked={formData.competencyAndKnowHow === "I can integrate theoretical knowledge into practical scenarios effectively."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I can integrate theoretical knowledge into practical scenarios effectively.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.competencyAndKnowHow === "I am skilled at optimizing processes to improve efficiency and outcomes."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="competencyAndKnowHow"
                        value="I am skilled at optimizing processes to improve efficiency and outcomes."
                        checked={formData.competencyAndKnowHow === "I am skilled at optimizing processes to improve efficiency and outcomes."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am skilled at optimizing processes to improve efficiency and outcomes.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.competencyAndKnowHow === "I continuously evaluate my performance to identify and implement improvements."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="competencyAndKnowHow"
                        value="I continuously evaluate my performance to identify and implement improvements."
                        checked={formData.competencyAndKnowHow === "I continuously evaluate my performance to identify and implement improvements."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I continuously evaluate my performance to identify and implement improvements.</span>
                    </label>
                  </div>
                </div>
                
                {/* Strategic Thinking and Goal Setting */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Strategic Thinking and Goal Setting</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.strategicThinkingAndGoalSetting === "I can set realistic goals and create actionable plans to achieve them."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="strategicThinkingAndGoalSetting"
                        value="I can set realistic goals and create actionable plans to achieve them."
                        checked={formData.strategicThinkingAndGoalSetting === "I can set realistic goals and create actionable plans to achieve them."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">I can set realistic goals and create actionable plans to achieve them.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.strategicThinkingAndGoalSetting === "I prioritize tasks effectively to meet deadlines without compromising quality."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="strategicThinkingAndGoalSetting"
                        value="I prioritize tasks effectively to meet deadlines without compromising quality."
                        checked={formData.strategicThinkingAndGoalSetting === "I prioritize tasks effectively to meet deadlines without compromising quality."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I prioritize tasks effectively to meet deadlines without compromising quality.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.strategicThinkingAndGoalSetting === "I consider the broader implications of my actions in achieving organizational goals."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="strategicThinkingAndGoalSetting"
                        value="I consider the broader implications of my actions in achieving organizational goals."
                        checked={formData.strategicThinkingAndGoalSetting === "I consider the broader implications of my actions in achieving organizational goals."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I consider the broader implications of my actions in achieving organizational goals.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.strategicThinkingAndGoalSetting === "I adapt my strategies when unforeseen obstacles or opportunities arise."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="strategicThinkingAndGoalSetting"
                        value="I adapt my strategies when unforeseen obstacles or opportunities arise."
                        checked={formData.strategicThinkingAndGoalSetting === "I adapt my strategies when unforeseen obstacles or opportunities arise."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I adapt my strategies when unforeseen obstacles or opportunities arise.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.strategicThinkingAndGoalSetting === "I align my career aspirations with the organization's vision and mission."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="strategicThinkingAndGoalSetting"
                        value="I align my career aspirations with the organization's vision and mission."
                        checked={formData.strategicThinkingAndGoalSetting === "I align my career aspirations with the organization's vision and mission."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I align my career aspirations with the organization's vision and mission.</span>
                    </label>
                  </div>
                </div>
                
                {/* Professional Presentation and Preparedness */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Professional Presentation and Preparedness</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.professionalPresentationAndPreparedness === "My resume and portfolio effectively showcase my skills, achievements, and experiences."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="professionalPresentationAndPreparedness"
                        value="My resume and portfolio effectively showcase my skills, achievements, and experiences."
                        checked={formData.professionalPresentationAndPreparedness === "My resume and portfolio effectively showcase my skills, achievements, and experiences."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">My resume and portfolio effectively showcase my skills, achievements, and experiences.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.professionalPresentationAndPreparedness === "I articulate my qualifications and career aspirations confidently during interviews."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="professionalPresentationAndPreparedness"
                        value="I articulate my qualifications and career aspirations confidently during interviews."
                        checked={formData.professionalPresentationAndPreparedness === "I articulate my qualifications and career aspirations confidently during interviews."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I articulate my qualifications and career aspirations confidently during interviews.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.professionalPresentationAndPreparedness === "I demonstrate professional etiquette in all communication, whether written or verbal."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="professionalPresentationAndPreparedness"
                        value="I demonstrate professional etiquette in all communication, whether written or verbal."
                        checked={formData.professionalPresentationAndPreparedness === "I demonstrate professional etiquette in all communication, whether written or verbal."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I demonstrate professional etiquette in all communication, whether written or verbal.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.professionalPresentationAndPreparedness === "I prepare thoroughly for interviews, including researching the company and role."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="professionalPresentationAndPreparedness"
                        value="I prepare thoroughly for interviews, including researching the company and role."
                        checked={formData.professionalPresentationAndPreparedness === "I prepare thoroughly for interviews, including researching the company and role."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I prepare thoroughly for interviews, including researching the company and role.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.professionalPresentationAndPreparedness === "My appearance and demeanor consistently reflect a professional standard."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="professionalPresentationAndPreparedness"
                        value="My appearance and demeanor consistently reflect a professional standard."
                        checked={formData.professionalPresentationAndPreparedness === "My appearance and demeanor consistently reflect a professional standard."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">My appearance and demeanor consistently reflect a professional standard.</span>
                    </label>
                  </div>
                </div>
                
                {/* Continuous Learning and Growth Mindset */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Continuous Learning and Growth Mindset</h3>
                  <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                  
                  <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.continuousLearningAndGrowthMindset === "I actively seek learning opportunities to enhance my skills and knowledge."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="continuousLearningAndGrowthMindset"
                        value="I actively seek learning opportunities to enhance my skills and knowledge."
                        checked={formData.continuousLearningAndGrowthMindset === "I actively seek learning opportunities to enhance my skills and knowledge."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">I actively seek learning opportunities to enhance my skills and knowledge.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.continuousLearningAndGrowthMindset === "I am open to feedback and view it as a tool for continuous improvement."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="continuousLearningAndGrowthMindset"
                        value="I am open to feedback and view it as a tool for continuous improvement."
                        checked={formData.continuousLearningAndGrowthMindset === "I am open to feedback and view it as a tool for continuous improvement."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I am open to feedback and view it as a tool for continuous improvement.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.continuousLearningAndGrowthMindset === "I explore new technologies, trends, and methods relevant to my desired field."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="continuousLearningAndGrowthMindset"
                        value="I explore new technologies, trends, and methods relevant to my desired field."
                        checked={formData.continuousLearningAndGrowthMindset === "I explore new technologies, trends, and methods relevant to my desired field."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I explore new technologies, trends, and methods relevant to my desired field.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.continuousLearningAndGrowthMindset === "I take initiative in pursuing certifications, training, or projects to expand my expertise."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="continuousLearningAndGrowthMindset"
                        value="I take initiative in pursuing certifications, training, or projects to expand my expertise."
                        checked={formData.continuousLearningAndGrowthMindset === "I take initiative in pursuing certifications, training, or projects to expand my expertise."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I take initiative in pursuing certifications, training, or projects to expand my expertise.</span>
                    </label>
                    
                    <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.continuousLearningAndGrowthMindset === "I embrace challenges as opportunities to develop and grow professionally."
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="continuousLearningAndGrowthMindset"
                        value="I embrace challenges as opportunities to develop and grow professionally."
                        checked={formData.continuousLearningAndGrowthMindset === "I embrace challenges as opportunities to develop and grow professionally."}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-gray-700">I embrace challenges as opportunities to develop and grow professionally.</span>
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
      {step === 'analyzing' && (
        <AssessmentProcessingScreen 
          assessmentType={assessmentType || 'irl'} 
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