// components/assessment/RRLForm.tsx - FIXED VERSION with Google Vision Integration

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AssessmentProcessingScreen from '@/components/assessment/AssessmentProcessingScreen';

// ✅ FIXED: Define AssessmentType locally to avoid import issues
type AssessmentType = 'fjrl' | 'ijrl' | 'cdrl' | 'ccrl' | 'ctrl' | 'rrl' | 'irl';

interface RRLFormProps {
  assessmentId?: string;
  assessmentType?: string;
  onSubmit?: (formData: any, resumeFile?: File) => Promise<void>;
  initialData?: any;
}

// RRL WEIGHTAGE SYSTEM - Based on actual document
interface WeightageOption {
  text: string;
  weightage: number;
}

interface CategoryWeightage {
  [key: string]: WeightageOption[];
}

// ✅ FIXED: Exact weightage mapping from RRL document
const RRL_CATEGORY_WEIGHTAGES: CategoryWeightage = {
  financialPreparedness: [
    { text: "I have a clear understanding of my current financial situation and future income sources, including pensions, savings, and investments.", weightage: 1 },
    { text: "I have calculated my estimated monthly expenses for retirement and created a budget to sustain my lifestyle.", weightage: 2 },
    { text: "I am aware of potential healthcare and long-term care costs and have prepared financially to manage them.", weightage: 3 },
    { text: "I have diversified my savings and investments to minimize risks and ensure consistent income during retirement.", weightage: 4 },
    { text: "I feel confident that my financial resources will support me throughout my retirement years without compromising my standard of living.", weightage: 5 }
  ],
  emotionalMentalPreparedness: [
    { text: "I have a positive outlook on retirement and see it as an opportunity to explore new interests and activities.", weightage: 1 },
    { text: "I feel emotionally prepared to let go of my professional identity and embrace a new phase of life.", weightage: 2 },
    { text: "I have strategies to manage potential feelings of isolation, boredom, or loss of purpose during retirement.", weightage: 3 },
    { text: "I am comfortable discussing my retirement plans with family and friends and receiving their input or support.", weightage: 4 },
    { text: "I have prepared for the emotional changes that may come with a reduced role in professional or social settings.", weightage: 5 }
  ],
  physicalHealthPreparedness: [
    { text: "I have a plan to maintain my physical health through regular exercise, balanced nutrition, and preventive healthcare.", weightage: 1 },
    { text: "I have consulted with healthcare professionals to ensure I understand and address my health needs for retirement.", weightage: 2 },
    { text: "I have adequate health insurance or savings to cover unforeseen medical expenses.", weightage: 3 },
    { text: "I feel physically capable of engaging in activities or hobbies that I look forward to pursuing in retirement.", weightage: 4 },
    { text: "I regularly monitor and take proactive steps to maintain or improve my overall health.", weightage: 5 }
  ],
  purposeLifestylePlanning: [
    { text: "I have identified hobbies, activities, or causes that I want to explore or engage in during retirement.", weightage: 1 },
    { text: "I feel confident that I can structure my daily routine to find purpose and joy in my retirement years.", weightage: 2 },
    { text: "I have a clear plan for how I will stay socially connected and engaged after leaving the workforce.", weightage: 3 },
    { text: "I have considered how I will balance leisure, personal development, and family responsibilities in retirement.", weightage: 4 },
    { text: "I am excited about the opportunities retirement offers to pursue new goals and passions.", weightage: 5 }
  ],
  socialCommunityEngagement: [
    { text: "I have a strong support network of family and friends who I can rely on during retirement.", weightage: 1 },
    { text: "I am comfortable reaching out to new people or joining groups to expand my social circle if needed.", weightage: 2 },
    { text: "I plan to volunteer, mentor, or participate in community programs to stay connected and active.", weightage: 3 },
    { text: "I have identified ways to continue contributing to society or sharing my knowledge and skills during retirement.", weightage: 4 },
    { text: "I value and prioritize maintaining meaningful relationships in my retirement years.", weightage: 5 }
  ],
  gigWorkSupplementalIncome: [
    { text: "I have explored opportunities for part-time work or freelancing to supplement my retirement income if needed.", weightage: 1 },
    { text: "I feel confident that I can leverage my skills or expertise to generate additional income post-retirement.", weightage: 2 },
    { text: "I have considered how gig work might affect my retirement plans, both positively and negatively.", weightage: 3 },
    { text: "I am aware of how to balance gig work with leisure and family time during retirement.", weightage: 4 },
    { text: "I am open to adapting to new roles or industries for supplemental income opportunities if required.", weightage: 5 }
  ],
  spiritualReflectiveReadiness: [
    { text: "I have considered how my retirement years can be a time for personal growth and self-reflection.", weightage: 1 },
    { text: "I feel aligned with my personal values and priorities as I transition into this new phase of life.", weightage: 2 },
    { text: "I regularly practice mindfulness, gratitude, or other techniques to nurture my emotional and spiritual well-being.", weightage: 3 },
    { text: "I have identified ways to give back or leave a legacy that aligns with my purpose and beliefs.", weightage: 4 },
    { text: "I feel at peace with my decision to retire and confident about the life I am transitioning into.", weightage: 5 }
  ]
};

// ✅ RRL Categories in correct order
const RRL_CATEGORIES = [
  { key: 'financialPreparedness', title: 'Financial Preparedness', description: 'Choose the statement that best describes your financial readiness for retirement.' },
  { key: 'emotionalMentalPreparedness', title: 'Emotional and Mental Preparedness', description: 'Select the option that reflects your emotional and mental readiness for retirement.' },
  { key: 'physicalHealthPreparedness', title: 'Physical and Health Preparedness', description: 'Choose the statement that represents your physical health preparation for retirement.' },
  { key: 'purposeLifestylePlanning', title: 'Purpose and Lifestyle Planning', description: 'Select the option that best describes your lifestyle and purpose planning for retirement.' },
  { key: 'socialCommunityEngagement', title: 'Social and Community Engagement', description: 'Choose the statement that reflects your social engagement plans for retirement.' },
  { key: 'gigWorkSupplementalIncome', title: 'Gig Work and Supplemental Income', description: 'Select the option that describes your approach to supplemental income in retirement.' },
  { key: 'spiritualReflectiveReadiness', title: 'Spiritual and Reflective Readiness', description: 'Choose the statement that represents your spiritual and reflective preparation for retirement.' }
];

interface RRLFormData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    personality: string[];
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
  // 🔥 INTERNAL: Store calculated scores (hidden from user)
  _internalScores: {
    financialPreparedness: number;
    emotionalMentalPreparedness: number;
    physicalHealthPreparedness: number;
    purposeLifestylePlanning: number;
    socialCommunityEngagement: number;
    gigWorkSupplementalIncome: number;
    spiritualReflectiveReadiness: number;
    rawTotalScore: number;
    formPercentage: number;
    formContribution: number;
    estimatedFinalScore: number;
    readinessLevel: string;
  };
}

export default function RRLForm({ assessmentId, assessmentType, onSubmit, initialData }: RRLFormProps) {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<'form' | 'preview' | 'analyzing'>('form');
  const [formData, setFormData] = useState<RRLFormData>(initialData || {
    personalInfo: {
      name: session?.user?.name || '',
      email: session?.user?.email || '',
      phone: '',
      personality: [],
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
    _internalScores: {
      financialPreparedness: 0,
      emotionalMentalPreparedness: 0,
      physicalHealthPreparedness: 0,
      purposeLifestylePlanning: 0,
      socialCommunityEngagement: 0,
      gigWorkSupplementalIncome: 0,
      spiritualReflectiveReadiness: 0,
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

  // Retirement focused personality options
  const PERSONALITY_OPTIONS = {
    "Financial & Planning": [
      "Financial Planner - Has well-organized financial plans and retirement savings strategies",
      "Budget Conscious - Carefully manages expenses and tracks spending patterns",
      "Investment Aware - Understands various investment options and portfolio management",
      "Security Focused - Prioritizes financial stability and risk management",
      "Future Oriented - Makes decisions based on long-term financial implications"
    ],
    "Health & Wellness": [
      "Health Conscious - Actively maintains physical fitness and healthy lifestyle habits",
      "Wellness Advocate - Prioritizes mental and emotional well-being practices",
      "Preventive Care - Regularly engages with healthcare providers for preventive measures",
      "Active Lifestyle - Enjoys physical activities and plans to stay active in retirement",
      "Holistic Health - Considers physical, mental, and spiritual aspects of well-being"
    ],
    "Social & Community": [
      "Community Minded - Values involvement in community activities and organizations",
      "Relationship Builder - Focuses on maintaining and building meaningful relationships",
      "Volunteer Spirit - Interested in giving back through volunteer work and service",
      "Social Connector - Enjoys bringing people together and creating social networks",
      "Mentor & Guide - Likes sharing knowledge and experience with others"
    ],
    "Lifestyle & Purpose": [
      "Adventure Seeker - Looks forward to travel and new experiences in retirement",
      "Lifelong Learner - Continues to pursue education and skill development",
      "Creative Explorer - Wants to explore artistic and creative pursuits",
      "Purpose Driven - Seeks meaningful activities that align with personal values",
      "Family Focused - Prioritizes time with family and multigenerational relationships"
    ],
    "Work & Income": [
      "Gradual Transition - Prefers phased retirement or part-time work arrangements",
      "Skill Leverager - Plans to use existing skills for consulting or freelance work",
      "Entrepreneurial - Interested in starting new ventures or side businesses",
      "Flexible Worker - Open to various forms of supplemental income opportunities",
      "Career Fulfillment - Values meaningful work and professional satisfaction"
    ],
    "Personal Growth": [
      "Self Reflective - Engages in introspection and personal development",
      "Spiritual Seeker - Values spiritual growth and meaning-making activities",
      "Legacy Builder - Focused on leaving a positive impact for future generations",
      "Wisdom Sharer - Enjoys passing on knowledge and experience to others",
      "Growth Minded - Sees retirement as opportunity for continued personal development"
    ],
    "Retirement Readiness": [
      "Retirement Planner - Has comprehensive plans for all aspects of retirement",
      "Transition Ready - Emotionally and practically prepared for retirement transition",
      "Independence Focused - Values autonomy and self-sufficiency in retirement",
      "Adaptable Retiree - Flexible and open to adjusting retirement plans as needed",
      "Retirement Optimist - Has positive outlook and excitement about retirement years"
    ]
  };

  // ✅ CORRECT RRL scoring calculation (60% form + 40% resume)
  const calculateRRLScores = (currentFormData: RRLFormData) => {
    const categories = ['financialPreparedness', 'emotionalMentalPreparedness', 'physicalHealthPreparedness', 'purposeLifestylePlanning', 'socialCommunityEngagement', 'gigWorkSupplementalIncome', 'spiritualReflectiveReadiness'] as const;
    let rawTotalScore = 0;
    const newScores = { ...currentFormData._internalScores };

    // Calculate individual category scores
    categories.forEach(category => {
      const selectedAnswer = currentFormData[category] as string;
      if (selectedAnswer && RRL_CATEGORY_WEIGHTAGES[category]) {
        const option = RRL_CATEGORY_WEIGHTAGES[category].find(opt => opt.text === selectedAnswer);
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

  // ✅ RRL Readiness Level mapping
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
    const newScores = calculateRRLScores(updatedData);
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
    RRL_CATEGORIES.forEach(category => {
      if (formData[category.key as keyof RRLFormData]) completedFields++;
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
    const missingCategories = RRL_CATEGORIES.filter(category => 
      !formData[category.key as keyof RRLFormData]
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
        assessmentType: 'RRL',
        
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
            financialPreparedness: formData._internalScores.financialPreparedness,
            emotionalMentalPreparedness: formData._internalScores.emotionalMentalPreparedness,
            physicalHealthPreparedness: formData._internalScores.physicalHealthPreparedness,
            purposeLifestylePlanning: formData._internalScores.purposeLifestylePlanning,
            socialCommunityEngagement: formData._internalScores.socialCommunityEngagement,
            gigWorkSupplementalIncome: formData._internalScores.gigWorkSupplementalIncome,
            spiritualReflectiveReadiness: formData._internalScores.spiritualReflectiveReadiness
          },
          frontendVersion: '2.0',
          assessmentType: 'RRL',
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
      console.error('❌ RRL Google Vision submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
      setStep('preview');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render category question
  const renderCategoryQuestion = (category: typeof RRL_CATEGORIES[0]) => {
    const options = RRL_CATEGORY_WEIGHTAGES[category.key] || [];
    const selectedValue = formData[category.key as keyof RRLFormData] as string;
    
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
        assessmentType={(assessmentType || 'rrl') as AssessmentType}
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
              <h2 className="text-lg font-medium text-gray-900">Retirement Readiness Level (RRL) Assessment</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                The RRL assesses your preparedness for retirement, focusing on financial stability, emotional readiness, 
                future planning, and overall well-being, powered by Google Vision AI.
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
                      Current/Previous Job Position *
                    </label>
                    <input
                      type="text"
                      name="personalInfo.jobPosition"
                      id="personalInfo.jobPosition"
                      value={formData.personalInfo.jobPosition}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g.: Senior Manager, Director, Consultant"
                    />
                  </div>
                  
                  {/* Retirement focused personality selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Your Retirement Personality Types *
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      Choose one or more personality types that best describe your retirement planning and lifestyle preferences.
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
                
                {/* RRL Assessment Categories */}
                <div className="space-y-8">
                  <div className="border-t pt-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Assessment Questions
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Answer all questions to receive your comprehensive retirement readiness analysis.
                    </p>
                  </div>
                  
                  {RRL_CATEGORIES.map(category => renderCategoryQuestion(category))}
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
                    Preview RRL Assessment
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Your RRL Assessment</h2>
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

              {/* Personality Types */}
              {formData.personalInfo.personality.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Selected Retirement Personality Types</h3>
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
                  {RRL_CATEGORIES.map(category => (
                    <div key={category.key} className="border-l-4 border-blue-200 pl-4 py-2">
                      <p className="text-sm font-medium text-gray-700">{category.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{formData[category.key as keyof RRLFormData] as string}</p>
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
                  {isSubmitting ? 'Processing...' : 'Submit RRL Assessment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}