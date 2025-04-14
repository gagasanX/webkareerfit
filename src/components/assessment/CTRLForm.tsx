'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AssessmentProcessingScreen from '@/components/assessment/AssessmentProcessingScreen';

interface CTRLFormProps {
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
  clarityAndCareerGoals: string;
  transferableSkillsAndExperience: string;
  adaptabilityAndLearningAgility: string;
  marketAndIndustryUnderstanding: string;
  networkingAndRelationshipBuilding: string;
  emotionalAndMentalPreparedness: string;
  applicationAndInterviewPreparedness: string;
}

export default function CTRLForm({ assessmentId, assessmentType, onSubmit }: CTRLFormProps) {
  // Log assessment ID for debugging
  if (assessmentId) {
    console.log('Current assessment ID:', assessmentId);
  }
  
  // Add useSession hook
  const { data: session, status } = useSession();
  
  // State for showing analyzing screen
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [formData, setFormData] = useState<FormDataType>({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      personality: '',
      jobPosition: '',
    },
    qualification: '',
    clarityAndCareerGoals: '',
    transferableSkillsAndExperience: '',
    adaptabilityAndLearningAgility: '',
    marketAndIndustryUnderstanding: '',
    networkingAndRelationshipBuilding: '',
    emotionalAndMentalPreparedness: '',
    applicationAndInterviewPreparedness: '',
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
    if (formData.clarityAndCareerGoals) completedFields++;
    if (formData.transferableSkillsAndExperience) completedFields++;
    if (formData.adaptabilityAndLearningAgility) completedFields++;
    if (formData.marketAndIndustryUnderstanding) completedFields++;
    if (formData.networkingAndRelationshipBuilding) completedFields++;
    if (formData.emotionalAndMentalPreparedness) completedFields++;
    if (formData.applicationAndInterviewPreparedness) completedFields++;
    
    // Calculate percentage (7 sections total + personal info)
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    if (!formData.personalInfo.name || !formData.personalInfo.email || !formData.personalInfo.jobPosition) {
      setError('Please fill in all required personal information fields.');
      window.scrollTo(0, 0);
      return;
    }

    // Check if all assessment sections are completed
    if (
      !formData.clarityAndCareerGoals ||
      !formData.transferableSkillsAndExperience ||
      !formData.adaptabilityAndLearningAgility ||
      !formData.marketAndIndustryUnderstanding ||
      !formData.networkingAndRelationshipBuilding ||
      !formData.emotionalAndMentalPreparedness ||
      !formData.applicationAndInterviewPreparedness
    ) {
      setError('Please complete all assessment sections.');
      window.scrollTo(0, 0);
      return;
    }
    
    try {
      // Show processing state and clear errors
      setIsSubmitting(true);
      setError('');
      
      // Show analyzing screen
      setIsAnalyzing(true);
      
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
      
      // Redirect to results page
      setTimeout(() => {
        router.push(result.redirectTo || `/assessment/${assessmentType}/results/${assessmentId}`);
      }, 3000); // Small delay for a better user experience
      
    } catch (err) {
      console.error('Error during submission:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit. Please try again.';
      setError(errorMessage);
      setIsAnalyzing(false);
    } finally {
      if (onSubmit) {
        setIsSubmitting(false);
      }
    }
  };

  // If analyzing, show processing screen
  if (isAnalyzing) {
    return (
      <AssessmentProcessingScreen 
        assessmentType={assessmentType || 'ctrl'} 
        onComplete={() => {
          if (assessmentId && assessmentType) {
            router.push(`/assessment/${assessmentType}/results/${assessmentId}`);
          }
        }}
      />
    );
  }

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
    
      {/* Error message at the top if there's any */}
      {error && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}
    
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900">Career Transition Readiness Level (CTRL) Assessment</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              The CTRL evaluates your preparedness to make a significant career shift. It highlights strengths, identifies areas for growth, and provides actionable insights to ensure a smooth and successful transition to a new job sector or role.
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
                    Job and position applying for? (e.g.: Senior Project Manager, Team Lead) *
                  </label>
                  <input
                    type="text"
                    name="personalInfo.jobPosition"
                    id="personalInfo.jobPosition"
                    value={formData.personalInfo.jobPosition}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="e.g.: Senior Project Manager, Team Lead"
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
              
              {/* Clarity and Career Goals */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Clarity and Career Goals</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "I have a clear vision of the type of job and sector I want to transition into.",
                    "I understand how my personal values and career aspirations align with my desired new role.",
                    "I have identified the key factors (e.g., salary, work-life balance, job satisfaction) influencing my career transition decision.",
                    "I have a concrete plan for how this transition aligns with my long-term professional growth.",
                    "I can articulate the reasons why I am making this transition and how it benefits my career trajectory."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.clarityAndCareerGoals === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="clarityAndCareerGoals"
                        value={option}
                        checked={formData.clarityAndCareerGoals === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Transferable Skills and Experience */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Transferable Skills and Experience</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "I can identify the transferable skills from my current role that are relevant to my desired new position.",
                    "I have evidence or examples of how I have successfully applied my skills in varied contexts.",
                    "I can effectively communicate how my past achievements add value to the new role or sector.",
                    "I understand the gaps between my current expertise and the requirements of my desired position.",
                    "I am actively working on acquiring or enhancing skills to meet the expectations of the new role."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.transferableSkillsAndExperience === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="transferableSkillsAndExperience"
                        value={option}
                        checked={formData.transferableSkillsAndExperience === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Adaptability and Learning Agility */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Adaptability and Learning Agility</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "I am open to learning new tools, technologies, and methods required for the new role or sector.",
                    "I have demonstrated resilience and flexibility when faced with career challenges or changes in the past.",
                    "I view this career transition as an opportunity for personal and professional growth.",
                    "I am comfortable stepping out of my comfort zone to adapt to new work environments.",
                    "I seek feedback and use it constructively to enhance my performance in new situations."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.adaptabilityAndLearningAgility === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="adaptabilityAndLearningAgility"
                        value={option}
                        checked={formData.adaptabilityAndLearningAgility === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Market and Industry Understanding */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Market and Industry Understanding</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "I have researched the industry or sector I want to transition into, including its trends and demands.",
                    "I am aware of the challenges and opportunities unique to the new sector.",
                    "I understand the cultural and operational differences between my current role and the desired sector.",
                    "I have identified potential employers or opportunities that align with my career transition goals.",
                    "I have a clear understanding of the qualifications and competencies valued in the target industry."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.marketAndIndustryUnderstanding === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="marketAndIndustryUnderstanding"
                        value={option}
                        checked={formData.marketAndIndustryUnderstanding === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Networking and Relationship Building */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Networking and Relationship Building</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "I have reached out to professionals in the industry I want to transition into for advice and insights.",
                    "I am actively building connections that can help facilitate my career transition.",
                    "I participate in industry events, workshops, or online forums relevant to my new career goals.",
                    "I have a mentor or guide who is familiar with the sector I am targeting for transition.",
                    "I can articulate my career story and transition goals effectively to new professional contacts."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.networkingAndRelationshipBuilding === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="networkingAndRelationshipBuilding"
                        value={option}
                        checked={formData.networkingAndRelationshipBuilding === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Emotional and Mental Preparedness */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Emotional and Mental Preparedness</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "I am prepared to face potential setbacks or rejections during my career transition journey.",
                    "I manage stress and uncertainty effectively while navigating career changes.",
                    "I am confident in my ability to make a positive impression in a new industry or role.",
                    "I have strategies to overcome self-doubt and maintain motivation during this process.",
                    "I am prepared to invest the necessary time and effort to succeed in my career transition."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.emotionalAndMentalPreparedness === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="emotionalAndMentalPreparedness"
                        value={option}
                        checked={formData.emotionalAndMentalPreparedness === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Application and Interview Preparedness */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Application and Interview Preparedness</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "My resume and cover letter are tailored to highlight my suitability for the new role or sector.",
                    "I can clearly explain my reasons for transitioning and how my background aligns with the target job.",
                    "I have practiced responding to questions about my career change in a confident and positive manner.",
                    "I am familiar with the recruitment processes and expectations in the new sector.",
                    "I have prepared examples of how my skills and experiences demonstrate my readiness for the new role."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.applicationAndInterviewPreparedness === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="applicationAndInterviewPreparedness"
                        value={option}
                        checked={formData.applicationAndInterviewPreparedness === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Submit button */}
              <div className="pt-6 border-t border-gray-200">
                <Button 
                  type="submit" 
                  className="w-full md:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : 'Submit Assessment'}
                </Button>
                
                <p className="mt-4 text-sm text-gray-500">
                  By submitting this assessment, you agree to our terms and conditions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}