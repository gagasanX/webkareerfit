// components/assessment/CCRLForm.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AssessmentProcessingScreen from '@/components/assessment/AssessmentProcessingScreen';

interface CCRLFormProps {
  assessmentId?: string;
  assessmentType?: string;
  onSubmit?: (formData: any, resumeFile?: File) => Promise<void>;
}

// 🔥 INTERNAL WEIGHTAGE SYSTEM - Hidden from users
interface WeightageOption {
  text: string;
  weightage: number;
}

interface CategoryWeightage {
  [key: string]: WeightageOption[];
}

// Internal weightage mapping (users won't see these numbers)
const CATEGORY_WEIGHTAGES: CategoryWeightage = {
  careerRelevance: [
    { text: "My professional knowledge and skills are completely up-to-date with current industry standards and I consistently stay ahead of trends.", weightage: 5 },
    { text: "I have a comprehensive understanding of changes and trends in my target industry and actively monitor developments.", weightage: 4 },
    { text: "I have identified and am actively pursuing the skills and certifications required for my desired role.", weightage: 3 },
    { text: "My previous experience and achievements align well with current expectations of my desired job market.", weightage: 2 },
    { text: "I can articulate some value from my background but need to better understand current industry demands.", weightage: 1 }
  ],
  confidenceReadiness: [
    { text: "I feel highly confident about competing with current professionals and view my career break as a valuable experience.", weightage: 5 },
    { text: "I have developed comprehensive strategies to address potential challenges and am emotionally prepared for workplace dynamics.", weightage: 4 },
    { text: "I am emotionally prepared to manage workplace responsibilities and have good self-awareness of my capabilities.", weightage: 3 },
    { text: "I view my career break positively and am adaptable to changes in workplace culture and technology.", weightage: 2 },
    { text: "I have some concerns about competing but am working on building my confidence and addressing challenges.", weightage: 1 }
  ],
  networkingRelationships: [
    { text: "I have an extensive and active professional network that strongly supports my career comeback with multiple connection points.", weightage: 5 },
    { text: "I have successfully re-established connections with former colleagues, mentors, and industry peers and maintain regular contact.", weightage: 4 },
    { text: "I actively engage in industry events, forums, and professional communities and am building meaningful relationships.", weightage: 3 },
    { text: "I can leverage my existing network to explore opportunities and maintain a professional presence through platforms like LinkedIn.", weightage: 2 },
    { text: "I have limited professional connections but am working on building and expanding my network.", weightage: 1 }
  ],
  skillRenewal: [
    { text: "I have completed extensive relevant training, courses, and certifications and am fully committed to continuous learning.", weightage: 5 },
    { text: "I actively seek hands-on experience and practical exposure to new tools and technologies in my field.", weightage: 4 },
    { text: "I consistently explore resources to bridge skill gaps and am proactive about learning opportunities.", weightage: 3 },
    { text: "I am open to learning from colleagues and mentors and have taken some steps to update my skills.", weightage: 2 },
    { text: "I recognize the need for skill development but have limited recent training or learning experiences.", weightage: 1 }
  ],
  selfManagement: [
    { text: "I have excellent strategies for time management and have successfully created a sustainable work-life balance plan.", weightage: 5 },
    { text: "I am well-prepared to balance personal and professional life with clear boundaries and strong self-management skills.", weightage: 4 },
    { text: "I am confident in setting boundaries and have resolved personal challenges that might impact work performance.", weightage: 3 },
    { text: "I have a solid plan to adjust to regular work schedules and workplace demands.", weightage: 2 },
    { text: "I am working on developing better time management and work-life balance strategies.", weightage: 1 }
  ],
  interviewPreparedness: [
    { text: "My resume and cover letter are professionally optimized and I am highly confident in articulating the value of my career break.", weightage: 5 },
    { text: "I am skilled at tailoring applications to specific employers and have extensively practiced addressing career timeline questions.", weightage: 4 },
    { text: "I am familiar with modern recruitment processes and digital tools used in current hiring practices.", weightage: 3 },
    { text: "I have prepared responses for potential interview questions and understand how to present my background positively.", weightage: 2 },
    { text: "I have basic interview preparation but need more practice in articulating my career break and current readiness.", weightage: 1 }
  ],
  motivation: [
    { text: "I have exceptional clarity about my career return goals and my aspirations are perfectly aligned with my values and long-term vision.", weightage: 5 },
    { text: "I am highly motivated to overcome challenges and remain committed to my career comeback with strong determination.", weightage: 4 },
    { text: "I find significant fulfillment in pursuing opportunities that align with my passions and strengths.", weightage: 3 },
    { text: "I am prepared to embrace feedback and adapt my approach to achieve my career objectives.", weightage: 2 },
    { text: "I have general motivation to return to work but need to clarify my specific goals and direction.", weightage: 1 }
  ]
};

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
  // 🔥 INTERNAL: Store calculated scores (hidden from user)
  _internalScores: {
    careerRelevance: number;
    confidenceReadiness: number;
    networkingRelationships: number;
    skillRenewal: number;
    selfManagement: number;
    interviewPreparedness: number;
    motivation: number;
    totalScore: number;
    overallScore: number;
  };
}

export default function CCRLForm({ assessmentId, assessmentType, onSubmit }: CCRLFormProps) {
  if (assessmentId) {
    console.log('Current assessment ID:', assessmentId);
  }
  
  const { data: session, status } = useSession();
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
    _internalScores: {
      careerRelevance: 0,
      confidenceReadiness: 0,
      networkingRelationships: 0,
      skillRenewal: 0,
      selfManagement: 0,
      interviewPreparedness: 0,
      motivation: 0,
      totalScore: 0,
      overallScore: 0
    }
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // 🔥 INTERNAL SCORING CALCULATION - Hidden from users
  const calculateInternalScores = (currentFormData: FormDataType) => {
    const categories = ['careerRelevance', 'confidenceReadiness', 'networkingRelationships', 'skillRenewal', 'selfManagement', 'interviewPreparedness', 'motivation'];
    let totalScore = 0;
    const newScores = { ...currentFormData._internalScores };

    categories.forEach(category => {
      const selectedAnswer = currentFormData[category as keyof FormDataType] as string;
      if (selectedAnswer && CATEGORY_WEIGHTAGES[category]) {
        const option = CATEGORY_WEIGHTAGES[category].find(opt => opt.text === selectedAnswer);
        if (option) {
          newScores[category as keyof typeof newScores] = option.weightage;
          totalScore += option.weightage;
        }
      }
    });

    newScores.totalScore = totalScore;
    // Calculate percentage (max possible score is 35 = 7 categories × 5 max weightage)
    newScores.overallScore = Math.round((totalScore / 35) * 100);

    return newScores;
  };

  // Update form data and recalculate internal scores
  const updateFormData = (section: string, field: string, value: string) => {
    let updatedData;
    
    if (section === 'personalInfo') {
      updatedData = {
        ...formData,
        personalInfo: {
          ...formData.personalInfo,
          [field]: value,
        },
      };
    } else {
      updatedData = {
        ...formData,
        [section]: value,
      };
    }

    // Recalculate internal scores (hidden from user)
    const newScores = calculateInternalScores(updatedData);
    updatedData._internalScores = newScores;
    
    setFormData(updatedData);
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

    // Count assessment fields
    if (formData.careerRelevance) completedFields++;
    if (formData.confidenceReadiness) completedFields++;
    if (formData.networkingRelationships) completedFields++;
    if (formData.skillRenewal) completedFields++;
    if (formData.selfManagement) completedFields++;
    if (formData.interviewPreparedness) completedFields++;
    if (formData.motivation) completedFields++;

    // Calculate percentage (13 total fields)
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
      updateFormData(name, '', value);
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

    // Validate that all assessment questions are answered
    const assessmentFields = ['careerRelevance', 'confidenceReadiness', 'networkingRelationships', 'skillRenewal', 'selfManagement', 'interviewPreparedness', 'motivation'];
    const missingFields = assessmentFields.filter(field => !formData[field as keyof FormDataType]);
    
    if (missingFields.length > 0) {
      setError('Please answer all assessment questions before proceeding.');
      return;
    }

    // Proceed to preview
    setStep('preview');
    window.scrollTo(0, 0);
  };

  // Final submission after preview
  const handleFinalSubmit = async () => {
    console.log('Final submit function called');
    console.log('Internal scores calculated:', formData._internalScores);
    
    // Validate inputs
    if (!formData.personalInfo.name || !formData.personalInfo.email) {
      setError('Missing required personal information.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      setStep('analyzing');
      
      // 🔥 Enhanced form data with internal scoring
      const enhancedFormData = {
        ...formData,
        // Add calculated readiness level based on internal score
        readinessLevel: getReadinessLevel(formData._internalScores.overallScore),
        // Add scoring data for backend processing
        scoringData: {
          totalScore: formData._internalScores.totalScore,
          overallScore: formData._internalScores.overallScore,
          categoryScores: {
            skillCurrency: formData._internalScores.skillRenewal, // Map to expected CCRL categories
            marketKnowledge: formData._internalScores.careerRelevance,
            confidenceLevel: formData._internalScores.confidenceReadiness,
            networkStrength: formData._internalScores.networkingRelationships,
            selfManagement: formData._internalScores.selfManagement,
            interviewPreparedness: formData._internalScores.interviewPreparedness,
            motivation: formData._internalScores.motivation
          }
        }
      };
      
      // Remove internal scores from the data that goes to API (keep it private)
      const { _internalScores, ...cleanFormData } = enhancedFormData;
      const finalFormData = cleanFormData;
      
      // Use onSubmit prop if provided
      if (onSubmit) {
        await onSubmit(finalFormData, resumeFile || undefined);
        return;
      }
      
      // Otherwise use direct API submission
      if (!assessmentId || !assessmentType) {
        throw new Error('Assessment ID and type are required');
      }
      
      console.log('Creating form data for API submission');
      console.log('Calculated scores:', finalFormData.scoringData);
      
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('formData', JSON.stringify(finalFormData));
      
      if (resumeFile) {
        console.log('Adding resume file:', resumeFile.name);
        formDataToSubmit.append('resume', resumeFile);
      }
      
      const endpoint = `/api/assessment/${assessmentType}/${assessmentId}/submit-with-file`;
      console.log('Submitting to API:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formDataToSubmit
      });
      
      console.log('API response status:', response.status);
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textContent = await response.text();
        console.error('Non-JSON response:', textContent.substring(0, 200));
        throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Submission successful:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit assessment');
      }
      
      // Redirect to results page
      setTimeout(() => {
        router.push(result.redirectTo || `/assessment/${assessmentType}/results/${assessmentId}`);
      }, 5000);
      
    } catch (err) {
      console.error('Error during submission:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit. Please try again.';
      setError(errorMessage);
      setStep('preview');
    } finally {
      if (onSubmit) {
        setIsSubmitting(false);
      }
    }
  };

  // 🔥 Internal helper functions
  const getReadinessLevel = (score: number): string => {
    if (score >= 85) return "Fully Prepared";
    if (score >= 70) return "Approaching Readiness";
    if (score >= 50) return "Developing Competency"; 
    return "Early Development";
  };

  // Go back to edit form
  const handleBackToForm = () => {
    setStep('form');
    window.scrollTo(0, 0);
  };

  // Render category question (clean UI without weightage visible)
  const renderCategoryQuestion = (
    categoryKey: string,
    title: string,
    description: string
  ) => {
    const options = CATEGORY_WEIGHTAGES[categoryKey] || [];
    const selectedValue = formData[categoryKey as keyof FormDataType] as string;
    
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        
        <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
          {options.map((option, index) => (
            <label 
              key={index}
              className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                selectedValue === option.text
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={categoryKey}
                value={option.text}
                checked={selectedValue === option.text}
                onChange={handleInputChange}
                className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                required
              />
              <span className="ml-3 text-gray-700">{option.text}</span>
            </label>
          ))}
        </div>
      </div>
    );
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
                {Object.entries({
                  careerRelevance: 'Career Relevance and Industry Alignment',
                  confidenceReadiness: 'Confidence and Emotional Readiness',
                  networkingRelationships: 'Networking and Professional Relationships',
                  skillRenewal: 'Skill Renewal and Lifelong Learning',
                  selfManagement: 'Self Management and Work Life Balance',
                  interviewPreparedness: 'Interview and Job Search Preparedness',
                  motivation: 'Motivation and Career Purpose'
                }).map(([key, label]) => (
                  <div key={key}>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="font-medium">{formData[key as keyof FormDataType] as string}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 🔥 DEBUG: Show calculated scores in development mode only */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-2">Debug: Internal Scores (Hidden from Users)</h4>
                <div className="text-sm text-yellow-700">
                  <p>Overall Score: {formData._internalScores.overallScore}%</p>
                  <p>Total Score: {formData._internalScores.totalScore}/35</p>
                  <p>Readiness Level: {getReadinessLevel(formData._internalScores.overallScore)}</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        
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
        <p className="mt-2 text-gray-600">Processing your responses with advanced scoring system.</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Authentication warning */}
      {status === 'unauthenticated' && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <p className="text-yellow-700">
            <strong>Note:</strong> You must be logged in to submit this assessment.
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
                
                {/* Assessment Categories - Clean UI without visible weightage */}
                {renderCategoryQuestion(
                  'careerRelevance',
                  'Career Relevance and Industry Alignment',
                  'Choose the statement that best describes your current professional knowledge and industry awareness.'
                )}
                
                {renderCategoryQuestion(
                  'confidenceReadiness',
                  'Confidence and Emotional Readiness',
                  'Select the option that reflects your confidence level and emotional preparation for returning to work.'
                )}
                
                {renderCategoryQuestion(
                  'networkingRelationships',
                  'Networking and Professional Relationships',
                  'Choose the statement that best represents your professional network and relationship building.'
                )}
                
                {renderCategoryQuestion(
                  'skillRenewal',
                  'Skill Renewal and Lifelong Learning',
                  'Select the option that describes your approach to skill development and continuous learning.'
                )}
                
                {renderCategoryQuestion(
                  'selfManagement',
                  'Self Management and Work Life Balance',
                  'Choose the statement that reflects your time management and work-life balance capabilities.'
                )}
                
                {renderCategoryQuestion(
                  'interviewPreparedness',
                  'Interview and Job Search Preparedness',
                  'Select the option that best describes your job search and interview readiness.'
                )}
                
                {renderCategoryQuestion(
                  'motivation',
                  'Motivation and Career Purpose',
                  'Choose the statement that represents your motivation and clarity about your career comeback.'
                )}
                
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
          assessmentType={assessmentType as any}
          assessmentId={assessmentId}
          onComplete={() => {}} // Will redirect after timeout
        />
      )}
    </div>
  );
}