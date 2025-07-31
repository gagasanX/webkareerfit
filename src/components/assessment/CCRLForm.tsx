// components/assessment/CCRLForm.tsx - FIXED VERSION with Google Vision Integration

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AssessmentProcessingScreen from '@/components/assessment/AssessmentProcessingScreen';

// ✅ FIXED: Define AssessmentType locally to avoid import issues
type AssessmentType = 'fjrl' | 'ijrl' | 'cdrl' | 'ccrl' | 'ctrl' | 'rrl' | 'irl';

interface CCRLFormProps {
  assessmentId?: string;
  assessmentType?: string;
  onSubmit?: (formData: any, resumeFile?: File) => Promise<void>;
}

// CCRL WEIGHTAGE SYSTEM - Based on actual document
interface WeightageOption {
  text: string;
  weightage: number;
}

interface CategoryWeightage {
  [key: string]: WeightageOption[];
}

// ✅ FIXED: Exact weightage mapping from CCRL document
const CCRL_CATEGORY_WEIGHTAGES: CategoryWeightage = {
  careerRelevance: [
    { text: "My professional knowledge and skills are up-to-date with the current industry standards.", weightage: 1 },
    { text: "I have a clear understanding of the changes and trends in my target industry since my hiatus.", weightage: 2 },
    { text: "I have identified the skills and certifications required for my desired role.", weightage: 3 },
    { text: "My previous experience and achievements align with the expectations of my desired job.", weightage: 4 },
    { text: "I can articulate how my background adds value to the current demands of the industry.", weightage: 5 }
  ],
  confidenceReadiness: [
    { text: "I feel confident about competing with current professionals for the desired role.", weightage: 1 },
    { text: "I have strategies to address potential challenges related to my career hiatus.", weightage: 2 },
    { text: "I am emotionally prepared to manage workplace dynamics and responsibilities.", weightage: 3 },
    { text: "I view my career break as an opportunity to reflect and grow professionally.", weightage: 4 },
    { text: "I am adaptable to changes in workplace culture and technological advancements.", weightage: 5 }
  ],
  networkingRelationships: [
    { text: "I have an active professional network that can support my career comeback.", weightage: 1 },
    { text: "I have re-established connections with former colleagues, mentors, and industry peers.", weightage: 2 },
    { text: "I actively engage in industry events, forums, and professional communities.", weightage: 3 },
    { text: "I can leverage my network to explore job opportunities and gain insights into the job market.", weightage: 4 },
    { text: "I maintain a professional presence through platforms like LinkedIn to showcase my skills.", weightage: 5 }
  ],
  skillRenewal: [
    { text: "I have completed relevant training, courses, or certifications to refresh or update my skills.", weightage: 1 },
    { text: "I am committed to continuous learning to stay relevant in my chosen field.", weightage: 2 },
    { text: "I seek opportunities to gain hands-on experience and practical exposure to new tools or technologies.", weightage: 3 },
    { text: "I actively explore resources to bridge any skill gaps identified during my hiatus.", weightage: 4 },
    { text: "I am open to learning from younger colleagues or mentors who have industry-specific expertise.", weightage: 5 }
  ],
  selfManagement: [
    { text: "I have strategies in place to manage my time and responsibilities effectively.", weightage: 1 },
    { text: "I am prepared to create a balance between my personal and professional life.", weightage: 2 },
    { text: "I am confident in my ability to set boundaries to maintain work-life harmony.", weightage: 3 },
    { text: "I have resolved any personal challenges that might impact my work performance.", weightage: 4 },
    { text: "I have a plan to adjust to a regular work schedule and workplace demands.", weightage: 5 }
  ],
  interviewPreparedness: [
    { text: "My resume and cover letter effectively highlight my skills, experiences, and career goals.", weightage: 1 },
    { text: "I am confident in articulating the value of my career break during interviews.", weightage: 2 },
    { text: "I am aware of how to tailor my job applications to specific employers and roles.", weightage: 3 },
    { text: "I have practiced answering potential interview questions to address gaps in my career timeline.", weightage: 4 },
    { text: "I am familiar with digital tools and platforms used in modern recruitment processes.", weightage: 5 }
  ],
  motivation: [
    { text: "I have a clear understanding of why I want to return to the workforce and what I seek in my next role.", weightage: 1 },
    { text: "My career goals are aligned with my personal values and long-term aspirations.", weightage: 2 },
    { text: "I am motivated to overcome challenges and remain committed to my career comeback.", weightage: 3 },
    { text: "I find fulfillment in pursuing opportunities that align with my passions and strengths.", weightage: 4 },
    { text: "I am prepared to embrace feedback and adapt my approach to achieve my career objectives.", weightage: 5 }
  ]
};

// ✅ CCRL Categories in correct order
const CCRL_CATEGORIES = [
  { key: 'careerRelevance', title: 'Career Relevance and Industry Alignment', description: 'Choose the statement that best describes your current professional knowledge and industry awareness.' },
  { key: 'confidenceReadiness', title: 'Confidence and Emotional Readiness', description: 'Select the option that reflects your confidence level and emotional preparation for returning to work.' },
  { key: 'networkingRelationships', title: 'Networking and Professional Relationships', description: 'Choose the statement that best represents your professional network and relationship building.' },
  { key: 'skillRenewal', title: 'Skill Renewal and Lifelong Learning', description: 'Select the option that describes your approach to skill development and continuous learning.' },
  { key: 'selfManagement', title: 'Self Management and Work Life Balance', description: 'Choose the statement that reflects your time management and work-life balance capabilities.' },
  { key: 'interviewPreparedness', title: 'Interview and Job Search Preparedness', description: 'Select the option that best describes your job search and interview readiness.' },
  { key: 'motivation', title: 'Motivation and Career Purpose', description: 'Choose the statement that represents your motivation and clarity about your career comeback.' }
];

interface CCRLFormData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    personality: string[];
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
    rawTotalScore: number;
    formPercentage: number;
    formContribution: number;
    estimatedFinalScore: number;
    readinessLevel: string;
  };
}

export default function CCRLForm({ assessmentId, assessmentType, onSubmit }: CCRLFormProps) {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<'form' | 'preview' | 'analyzing'>('form');
  const [formData, setFormData] = useState<CCRLFormData>({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      personality: [],
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
      rawTotalScore: 0,
      formPercentage: 0,
      formContribution: 0,
      estimatedFinalScore: 0,
      readinessLevel: 'Early Development'
    }
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPersonalities, setSelectedPersonalities] = useState<string[]>([]);

  const router = useRouter();

  // Sync selectedPersonalities with formData
  useEffect(() => {
    setSelectedPersonalities(formData.personalInfo.personality);
  }, [formData.personalInfo.personality]);

  // Personality options organized by categories
  const PERSONALITY_OPTIONS = {
    "Leadership & Management": [
      "Natural Leader - Takes initiative and guides teams toward success",
      "Collaborative Leader - Leads through teamwork and consensus building", 
      "Strategic Thinker - Focuses on long-term planning and big picture vision",
      "Decision Maker - Confident in making tough choices quickly and effectively",
      "Mentor & Coach - Enjoys developing others and sharing knowledge"
    ],
    "Analytical & Problem-Solving": [
      "Detail-Oriented Analyst - Thrives on accuracy and thorough analysis",
      "Problem Solver - Enjoys tackling challenges and finding innovative solutions",
      "Data-Driven Professional - Makes decisions based on facts and evidence", 
      "Systematic Organizer - Excels at creating efficient processes and systems",
      "Research Specialist - Loves investigating and discovering new information"
    ],
    "Creative & Innovation": [
      "Creative Innovator - Generates original ideas and artistic solutions",
      "Adaptable Creator - Flexible thinker who adapts creativity to different needs",
      "Visionary - Sees future possibilities and inspires others with ideas",
      "Design Thinker - Approaches problems with user-centered creative solutions",
      "Innovation Catalyst - Drives change and encourages creative thinking in others"
    ],
    "Communication & Relationship": [
      "Excellent Communicator - Clear, articulate, and persuasive in all interactions",
      "Active Listener - Builds strong relationships through empathetic listening",
      "Team Collaborator - Works seamlessly with diverse groups and personalities",
      "Relationship Builder - Naturally connects with people and maintains strong networks",
      "Diplomatic Mediator - Skilled at resolving conflicts and finding common ground"
    ],
    "Work Style & Approach": [
      "Self-Motivated Achiever - Driven to succeed with minimal supervision needed",
      "Results-Oriented Professional - Focused on delivering measurable outcomes",
      "Process-Oriented Specialist - Values structure, procedures, and quality standards",
      "Flexible Adapter - Thrives in changing environments and embraces new challenges",
      "Independent Worker - Performs best with autonomy and self-direction"
    ],
    "Customer & Service Focus": [
      "Customer-Focused Professional - Prioritizes client satisfaction and service excellence",
      "Service-Oriented Helper - Genuinely enjoys assisting others and solving their problems",
      "Quality-Focused Perfectionist - Maintains high standards and attention to detail",
      "Empathetic Professional - Understands and responds to others' needs effectively", 
      "Reliable Supporter - Consistently dependable and trustworthy in all commitments"
    ],
    "Drive & Ambition": [
      "Ambitious Go-Getter - Continuously seeks growth and advancement opportunities",
      "Resilient Perseverer - Bounces back from setbacks and maintains positive attitude",
      "Proactive Initiator - Anticipates needs and takes action before being asked",
      "Enthusiastic Motivator - Brings positive energy and inspires others to excel",
      "Balanced Professional - Maintains harmony between work excellence and personal well-being"
    ]
  };

  // ✅ CORRECT CCRL scoring calculation (60% form + 40% resume)
  const calculateCCRLScores = (currentFormData: CCRLFormData) => {
    const categories = ['careerRelevance', 'confidenceReadiness', 'networkingRelationships', 'skillRenewal', 'selfManagement', 'interviewPreparedness', 'motivation'] as const;
    let rawTotalScore = 0;
    const newScores = { ...currentFormData._internalScores };

    // Calculate individual category scores
    categories.forEach(category => {
      const selectedAnswer = currentFormData[category] as string;
      if (selectedAnswer && CCRL_CATEGORY_WEIGHTAGES[category]) {
        const option = CCRL_CATEGORY_WEIGHTAGES[category].find(opt => opt.text === selectedAnswer);
        if (option) {
          (newScores as any)[category] = option.weightage;
          rawTotalScore += option.weightage;
        }
      }
    });

    // 🔥 UNIFIED CALCULATION: 60% Form + 40% Resume
    newScores.rawTotalScore = rawTotalScore;
    newScores.formPercentage = Math.round((rawTotalScore / 35) * 100);
    newScores.formContribution = Math.round(newScores.formPercentage * 0.6);
    
    // Estimate final score (assuming average resume score of 70%)
    const estimatedResumeScore = 70;
    const resumeContribution = Math.round(estimatedResumeScore * 0.4);
    newScores.estimatedFinalScore = newScores.formContribution + resumeContribution;
    newScores.readinessLevel = calculateReadinessLevel(newScores.estimatedFinalScore);

    return newScores;
  };

  // ✅ CCRL Readiness Level mapping
  const calculateReadinessLevel = (finalScore: number): string => {
    if (finalScore >= 85) return "Exceptional Readiness";
    if (finalScore >= 75) return "Strong Readiness";
    if (finalScore >= 65) return "Moderate Readiness";
    if (finalScore >= 55) return "Developing Readiness";
    if (finalScore >= 45) return "Basic Readiness";
    return "Early Development";
  };

  // Handle personality selection (multiple selection allowed)
  const handlePersonalityToggle = (personality: string) => {
    const updatedPersonalities = selectedPersonalities.includes(personality)
      ? selectedPersonalities.filter(p => p !== personality)
      : [...selectedPersonalities, personality];
    
    setSelectedPersonalities(updatedPersonalities);
    updateFormData('personalInfo', 'personality', updatedPersonalities);
  };

  // Update form data to handle personality array
  const updateFormData = (section: string, field: string, value: string | string[]) => {
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

    // 🔥 TRADE SECRET: Internal scoring calculation (completely hidden from users)
    const newScores = calculateCCRLScores(updatedData);
    updatedData._internalScores = newScores;
    
    setFormData(updatedData);
  };

  // Calculate progress percentage
  useEffect(() => {
    let completedFields = 0;

    // Personal info fields (6 fields)
    if (formData.personalInfo.name) completedFields++;
    if (formData.personalInfo.email) completedFields++;
    if (formData.personalInfo.phone) completedFields++;
    if (formData.personalInfo.personality.length > 0) completedFields++;
    if (formData.personalInfo.jobPosition) completedFields++;
    if (formData.qualification) completedFields++;

    // Assessment fields (7 fields)
    CCRL_CATEGORIES.forEach(category => {
      if (formData[category.key as keyof CCRLFormData]) completedFields++;
    });

    // Resume file
    if (resumeFile) completedFields++;

    // Total: 6 personal + 7 assessment + 1 resume = 14 fields
    const totalFields = 14;
    const percentage = (completedFields / totalFields) * 100;
    setProgressPercentage(percentage);
  }, [formData, resumeFile, selectedPersonalities]);

  // Handle input changes (excluding personality which has its own handler)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      if (field !== 'personality') {
        updateFormData(section, field, value);
      }
    } else {
      updateFormData(name, '', value);
    }
  };

  // 🔥 ENHANCED: File validation for Google Vision API
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // ✅ GOOGLE VISION SUPPORTED FILE TYPES
      const ALLOWED_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/gif'
      ];
      
      const MAX_SIZE = 15 * 1024 * 1024; // 15MB (Google Vision limit)
      
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Unsupported file type. Please upload PDF, Word document, or image file.');
        return;
      }
      
      // Validate file size
      if (file.size > MAX_SIZE) {
        setError(`File size too large: ${Math.round(file.size / 1024 / 1024)}MB. Maximum: 15MB.`);
        return;
      }
      
      setError(''); // Clear any previous errors
      setResumeFile(file);
      
      // Show file type info for Google Vision processing
      if (file.type === 'application/pdf') {
        console.log('✅ PDF file selected - will be processed with Google Vision PDF API');
      } else if (file.type.includes('word')) {
        console.log('✅ Word document selected - will be processed with Google Vision');
      } else if (file.type.startsWith('image/')) {
        console.log('✅ Image file selected - will be processed with Google Vision Image API');
      }
    }
  };

  // Form submission validation
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate personal info
    if (!formData.personalInfo.name || !formData.personalInfo.email || !formData.personalInfo.jobPosition) {
      setError('Please fill in all required personal information fields.');
      return;
    }

    // Validate personality selection
    if (formData.personalInfo.personality.length === 0) {
      setError('Please select at least one personality type that describes you.');
      return;
    }

    // Validate assessment questions
    const missingCategories = CCRL_CATEGORIES.filter(category => 
      !formData[category.key as keyof CCRLFormData]
    );
    
    if (missingCategories.length > 0) {
      setError(`Please answer all assessment questions. Missing: ${missingCategories.map(c => c.title).join(', ')}`);
      return;
    }

    // Validate resume file
    if (!resumeFile) {
      setError('Please upload your resume for comprehensive analysis.');
      return;
    }

    setError('');
    setStep('preview');
    window.scrollTo(0, 0);
  };

  // 🔥 GOOGLE VISION: Submit to Google Vision API endpoint
  const handleFinalSubmit = async () => {
    if (!formData.personalInfo.name || !formData.personalInfo.email) {
      setError('Missing required personal information.');
      return;
    }
    
    if (!resumeFile) {
      setError('Resume file is required for complete assessment.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      setStep('analyzing');
      
      // Enhanced form data with scoring metadata for Google Vision
      const enhancedFormData = {
        ...formData,
        assessmentType: 'CCRL',
        
        // File metadata for Google Vision processing
        fileMetadata: {
          originalFileName: resumeFile.name,
          fileType: resumeFile.type,
          fileSize: resumeFile.size,
          processingMethod: 'google_vision_api' // Use Google Vision instead of Assistants
        },
        
        // 🔥 CRITICAL: Structured scoring data for backend
        _internalScoring: {
          formScoring: {
            rawTotalScore: formData._internalScores.rawTotalScore,
            formPercentage: formData._internalScores.formPercentage,
            formContribution: formData._internalScores.formContribution,
            weight: 60,
            calculationMethod: 'frontend_calculated',
            formula: '(rawScore/35)*100*0.6',
            calculatedAt: new Date().toISOString()
          },
          resumeScoring: {
            weight: 40,
            note: "Resume analysis will be performed by Google Vision API + OpenAI",
            expectedContribution: 'resumeScore * 0.4'
          },
          categoryScores: {
            careerRelevance: formData._internalScores.careerRelevance,
            confidenceReadiness: formData._internalScores.confidenceReadiness,
            networkingRelationships: formData._internalScores.networkingRelationships,
            skillRenewal: formData._internalScores.skillRenewal,
            selfManagement: formData._internalScores.selfManagement,
            interviewPreparedness: formData._internalScores.interviewPreparedness,
            motivation: formData._internalScores.motivation
          },
          frontendVersion: '2.0',
          assessmentType: 'CCRL',
          scoringEngine: 'google_vision_openai'
        }
      };
      
      // Clean form data for API (remove internal scores)
      const { _internalScores, ...cleanFormData } = enhancedFormData;
      
      console.log('🔥 GOOGLE VISION SUBMISSION DEBUG:');
      console.log('File:', resumeFile.name, resumeFile.type, `${Math.round(resumeFile.size / 1024)}KB`);
      console.log('Form Contribution:', cleanFormData._internalScoring.formScoring.formContribution);
      console.log('Processing Method: Google Vision API + OpenAI');
      
      // Use onSubmit prop if provided
      if (onSubmit) {
        await onSubmit(cleanFormData, resumeFile);
        return;
      }
      
      // Direct API submission to Google Vision endpoint
      if (!assessmentId || !assessmentType) {
        throw new Error('Assessment ID and type are required');
      }
      
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('formData', JSON.stringify(cleanFormData));
      formDataToSubmit.append('resume', resumeFile); // Raw file for Google Vision processing
      
      console.log('🔥 Submitting to Google Vision API endpoint');
      
      // 🚀 USE GOOGLE VISION ENDPOINT INSTEAD OF ASSISTANTS API
      const response = await fetch(`/api/assessment/${assessmentType}/${assessmentId}/submit-with-google-vision`, {
        method: 'POST',
        body: formDataToSubmit
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to submit assessment');
      }
      
      const result = await response.json();
      
      console.log('✅ Google Vision submission successful:', result);
      
      // Redirect to results
      setTimeout(() => {
        router.push(result.redirectUrl || `/assessment/${assessmentType}/results/${assessmentId}`);
      }, 3000);
      
    } catch (err) {
      console.error('❌ CCRL Google Vision submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
      setStep('preview');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render category question
  const renderCategoryQuestion = (category: typeof CCRL_CATEGORIES[0]) => {
    const options = CCRL_CATEGORY_WEIGHTAGES[category.key] || [];
    const selectedValue = formData[category.key as keyof CCRLFormData] as string;
    
    return (
      <div className="space-y-4" key={category.key}>
        <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">{category.title}</h3>
        <p className="text-sm text-gray-500 mb-4">{category.description}</p>
        
        <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
          {options.map((option, index) => (
            <label 
              key={index}
              className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                selectedValue === option.text
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={category.key}
                value={option.text}
                checked={selectedValue === option.text}
                onChange={handleInputChange}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                required
              />
              <span className="ml-3 text-gray-700">{option.text}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  // 🔥 GOOGLE VISION: Enhanced file upload section
  const renderFileUploadSection = () => (
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
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif"
          className="hidden"
          required
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center"
        >
          {resumeFile ? resumeFile.name : 'Choose Resume File'}
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
      <p className="mt-1 text-sm text-gray-500">
        Supported: PDF, Word (.doc/.docx), PNG, JPEG, WebP, GIF. Maximum 15MB.
        {resumeFile && (
          <span className="block text-green-600 mt-1">
            ✅ {resumeFile.name} ({Math.round(resumeFile.size / 1024)}KB) - 
            {resumeFile.type === 'application/pdf' 
              ? ' Will be processed with Google Vision PDF API' 
              : resumeFile.type.startsWith('image/')
              ? ' Will be processed with Google Vision Image API'
              : ' Will be processed with Google Vision API'}
          </span>
        )}
      </p>
    </div>
  );

  // ✅ FIXED: If analyzing, show processing screen with proper type casting
  if (step === 'analyzing') {
    return (
      <AssessmentProcessingScreen 
        assessmentType={(assessmentType || 'ccrl') as AssessmentType}
        assessmentId={assessmentId || ''}
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
      {/* Authentication check */}
      {status === 'unauthenticated' && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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
                The CCRL evaluates your preparedness to return to the workforce after a career hiatus. 
                Complete all sections to receive your comprehensive readiness analysis powered by Google Vision AI.
              </p>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        <option value="SPM, STPM, or equivalent">SPM, STPM, or equivalent</option>
                        <option value="Diploma or Advanced Diploma">Diploma or Advanced Diploma</option>
                        <option value="Undergraduate Degree">Undergraduate Degree</option>
                        <option value="Postgraduate Degree">Postgraduate Degree</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="personalInfo.jobPosition" className="block text-sm font-medium text-gray-700">
                      Specific Target Job Position * 
                    </label>
                    <input
                      type="text"
                      name="personalInfo.jobPosition"
                      id="personalInfo.jobPosition"
                      value={formData.personalInfo.jobPosition}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g.: Marketing Manager, Project Coordinator, Data Analyst"
                    />
                  </div>
                  
                  {/* Personality selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Your Personality Types *
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      Choose one or more personality types that best describe your professional working style.
                    </p>
                    
                    <div className="space-y-4 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-4">
                      {Object.entries(PERSONALITY_OPTIONS).map(([category, options]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="font-medium text-gray-800 text-sm border-b border-gray-200 pb-1">
                            {category}
                          </h4>
                          <div className="space-y-2">
                            {options.map((option, index) => (
                              <label 
                                key={index}
                                className={`flex items-start p-2 border rounded cursor-pointer transition-colors text-sm ${
                                  selectedPersonalities.includes(option)
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-gray-200 bg-white hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPersonalities.includes(option)}
                                  onChange={() => handlePersonalityToggle(option)}
                                  className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="ml-3 text-gray-700">{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {selectedPersonalities.length > 0 && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <h5 className="text-sm font-medium text-green-800 mb-2">
                          Selected Personalities ({selectedPersonalities.length}):
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {selectedPersonalities.map((personality, index) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {personality.split(' - ')[0]}
                              <button
                                type="button"
                                onClick={() => handlePersonalityToggle(personality)}
                                className="ml-1 h-4 w-4 rounded-full hover:bg-blue-200 flex items-center justify-center"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Google Vision file upload section */}
                  {renderFileUploadSection()}
                </div>
                
                {/* CCRL Assessment Categories */}
                <div className="space-y-8">
                  <div className="border-t pt-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Assessment Questions
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Answer all questions to receive your comprehensive career comeback readiness analysis.
                    </p>
                  </div>
                  
                  {CCRL_CATEGORIES.map(category => renderCategoryQuestion(category))}
                </div>
                
                {/* Error message */}
                {error && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-sm text-red-600">{error}</div>
                  </div>
                )}
                
                {/* Submit button */}
                <div className="pt-6 border-t border-gray-200">
                  <Button 
                    type="submit" 
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
                  >
                    Preview CCRL Assessment
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

      {/* Preview step */}
      {step === 'preview' && (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Your CCRL Assessment</h2>
            <p className="text-gray-600 mb-6">Please review your answers before submitting for comprehensive Google Vision AI analysis.</p>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <p className="text-sm text-gray-500">Target Position</p>
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

              {/* Personality Types */}
              {formData.personalInfo.personality.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Selected Personality Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.personalInfo.personality.map((personality, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {personality.split(' - ')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Assessment Responses */}
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Assessment Responses</h3>
                <div className="space-y-3">
                  {CCRL_CATEGORIES.map(category => (
                    <div key={category.key} className="border-l-4 border-blue-200 pl-4 py-2">
                      <p className="text-sm font-medium text-gray-700">{category.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{formData[category.key as keyof CCRLFormData] as string}</p>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
        
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
                <button 
                  type="button" 
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => setStep('form')}
                  disabled={isSubmitting}
                >
                  Edit Responses
                </button>
                
                <button 
                  type="button" 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : 'Submit CCRL Assessment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}