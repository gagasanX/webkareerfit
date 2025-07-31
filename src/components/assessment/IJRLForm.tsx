// components/assessment/IJRLForm.tsx - FIXED VERSION with Google Vision Integration

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AssessmentProcessingScreen from '@/components/assessment/AssessmentProcessingScreen';

// ✅ FIXED: Define AssessmentType locally to avoid import issues
type AssessmentType = 'fjrl' | 'ijrl' | 'cdrl' | 'ccrl' | 'ctrl' | 'rrl' | 'irl';

interface IJRLFormProps {
  assessmentId?: string;
  assessmentType?: string;
  onSubmit?: (formData: any, resumeFile?: File) => Promise<void>;
}

// IJRL WEIGHTAGE SYSTEM - Based on actual document
interface WeightageOption {
  text: string;
  weightage: number;
}

interface CategoryWeightage {
  [key: string]: WeightageOption[];
}

// ✅ FIXED: Exact weightage mapping from IJRL document
const IJRL_CATEGORY_WEIGHTAGES: CategoryWeightage = {
  professionalAlignment: [
    { text: "The job description and responsibilities align with personal career aspirations and long-term goals.", weightage: 1 },
    { text: "The company's mission, vision, and values resonate with personal principles and motivations.", weightage: 2 },
    { text: "Industry knowledge and understanding of trends support informed decision-making about the role.", weightage: 3 },
    { text: "The desired role offers opportunities for growth and skill development aligned with future aspirations.", weightage: 4 },
    { text: "Expectations regarding work culture, job security, and benefits are realistic and well-informed.", weightage: 5 }
  ],
  skillsAndCompetency: [
    { text: "The technical skills needed for the role are well understood and sufficiently developed.", weightage: 1 },
    { text: "Problem-solving and critical thinking abilities match the requirements of the ideal job.", weightage: 2 },
    { text: "Soft skills, such as communication and adaptability, align with industry and role expectations.", weightage: 3 },
    { text: "Transferable skills from previous experiences can be effectively applied to the desired position.", weightage: 4 },
    { text: "A clear understanding of gaps in current competencies allows for targeted skill-building.", weightage: 5 }
  ],
  networkingAndProfessionalPresence: [
    { text: "A professional network has been established to explore opportunities and gather industry insights.", weightage: 1 },
    { text: "Online profiles, such as LinkedIn, are optimized to showcase relevant skills and achievements.", weightage: 2 },
    { text: "Participation in professional events and forums demonstrates engagement with the industry.", weightage: 3 },
    { text: "Effective networking strategies are employed to create meaningful connections.", weightage: 4 },
    { text: "Communication in professional settings reflects confidence and clarity.", weightage: 5 }
  ],
  jobMarketKnowledge: [
    { text: "Current job market trends and in-demand skills in the industry are well-researched and understood.", weightage: 1 },
    { text: "Knowledge of key employers and their expectations supports targeted job applications.", weightage: 2 },
    { text: "Awareness of salary ranges, benefits, and negotiation strategies is comprehensive.", weightage: 3 },
    { text: "The competitive landscape for the ideal role is analyzed to develop a standout application strategy.", weightage: 4 },
    { text: "Economic and technological changes influencing the industry are accounted for in career planning.", weightage: 5 }
  ],
  applicationAndInterviewReadiness: [
    { text: "Resumes and cover letters are tailored to highlight relevant experiences and achievements.", weightage: 1 },
    { text: "Application materials are error-free, professional, and aligned with job requirements.", weightage: 2 },
    { text: "Interview preparation includes understanding the role, company, and potential questions.", weightage: 3 },
    { text: "Responses during interviews effectively convey competencies, enthusiasm, and cultural fit.", weightage: 4 },
    { text: "Confidence and composure are maintained during high-pressure interview situations.", weightage: 5 }
  ],
  emotionalAndSocialIntelligence: [
    { text: "Relationships with colleagues and supervisors are managed with empathy and understanding.", weightage: 1 },
    { text: "Feedback is received constructively and used to improve performance and relationships.", weightage: 2 },
    { text: "Adaptability is demonstrated in response to changing roles, challenges, and team dynamics.", weightage: 3 },
    { text: "Emotional resilience and stress management techniques support professional success.", weightage: 4 },
    { text: "The ability to navigate workplace conflicts promotes a harmonious and productive environment.", weightage: 5 }
  ],
  continuousGrowthAndSelfReflection: [
    { text: "A proactive approach is taken to identify and pursue learning opportunities.", weightage: 1 },
    { text: "Strengths and areas for improvement are regularly assessed to guide personal growth.", weightage: 2 },
    { text: "Long-term goals are set and adjusted based on self-reflection and professional aspirations.", weightage: 3 },
    { text: "A growth mindset drives the pursuit of knowledge and adaptability in evolving roles.", weightage: 4 },
    { text: "Motivation to excel in the ideal job is fueled by intrinsic and extrinsic factors.", weightage: 5 }
  ]
};

// ✅ IJRL Categories in correct order
const IJRL_CATEGORIES = [
  { key: 'professionalAlignment', title: 'Professional Alignment', description: 'Choose the statement that best describes your alignment with your ideal job and industry.' },
  { key: 'skillsAndCompetency', title: 'Skills and Competency', description: 'Select the option that reflects your skills readiness for your ideal role.' },
  { key: 'networkingAndProfessionalPresence', title: 'Networking and Professional Presence', description: 'Choose the statement that represents your professional networking and presence.' },
  { key: 'jobMarketKnowledge', title: 'Job Market Knowledge', description: 'Select the option that best describes your understanding of the job market and industry.' },
  { key: 'applicationAndInterviewReadiness', title: 'Application and Interview Readiness', description: 'Choose the statement that reflects your readiness for job applications and interviews.' },
  { key: 'emotionalAndSocialIntelligence', title: 'Emotional and Social Intelligence', description: 'Select the option that describes your emotional intelligence and social skills.' },
  { key: 'continuousGrowthAndSelfReflection', title: 'Continuous Growth and Self Reflection', description: 'Choose the statement that represents your commitment to growth and self-improvement.' }
];

interface IJRLFormData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    personality: string[];
    jobPosition: string;
  };
  qualification: string;
  professionalAlignment: string;
  skillsAndCompetency: string;
  networkingAndProfessionalPresence: string;
  jobMarketKnowledge: string;
  applicationAndInterviewReadiness: string;
  emotionalAndSocialIntelligence: string;
  continuousGrowthAndSelfReflection: string;
  // 🔥 INTERNAL: Store calculated scores (hidden from user)
  _internalScores: {
    professionalAlignment: number;
    skillsAndCompetency: number;
    networkingAndProfessionalPresence: number;
    jobMarketKnowledge: number;
    applicationAndInterviewReadiness: number;
    emotionalAndSocialIntelligence: number;
    continuousGrowthAndSelfReflection: number;
    rawTotalScore: number;
    formPercentage: number;
    formContribution: number;
    estimatedFinalScore: number;
    readinessLevel: string;
  };
}

export default function IJRLForm({ assessmentId, assessmentType, onSubmit }: IJRLFormProps) {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<'form' | 'preview' | 'analyzing'>('form');
  const [formData, setFormData] = useState<IJRLFormData>({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      personality: [],
      jobPosition: '',
    },
    qualification: '',
    professionalAlignment: '',
    skillsAndCompetency: '',
    networkingAndProfessionalPresence: '',
    jobMarketKnowledge: '',
    applicationAndInterviewReadiness: '',
    emotionalAndSocialIntelligence: '',
    continuousGrowthAndSelfReflection: '',
    _internalScores: {
      professionalAlignment: 0,
      skillsAndCompetency: 0,
      networkingAndProfessionalPresence: 0,
      jobMarketKnowledge: 0,
      applicationAndInterviewReadiness: 0,
      emotionalAndSocialIntelligence: 0,
      continuousGrowthAndSelfReflection: 0,
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

  // Ideal Job focused personality options
  const PERSONALITY_OPTIONS = {
    "Career Ambition & Goals": [
      "Goal-Oriented Achiever - Clearly defined career goals and works systematically to achieve them",
      "Ambitious Professional - Seeks challenging opportunities and strives for career advancement",
      "Vision-Driven Leader - Has clear long-term career vision and takes steps to realize it",
      "Strategic Career Planner - Makes calculated career moves aligned with professional aspirations",
      "Purpose-Driven Professional - Seeks meaningful work that aligns with personal values and purpose"
    ],
    "Professional Excellence": [
      "Quality-Focused Perfectionist - Maintains high standards and attention to detail in all work",
      "Results-Oriented Professional - Focused on delivering exceptional outcomes and measurable results",
      "Industry Expert - Deep knowledge and expertise in chosen field or industry",
      "Continuous Improver - Always seeking ways to enhance skills and performance",
      "Excellence Driven - Committed to being the best in chosen field or role"
    ],
    "Leadership & Influence": [
      "Natural Leader - Takes initiative and inspires others to achieve common goals",
      "Influential Communicator - Able to persuade and influence stakeholders effectively",
      "Collaborative Leader - Leads through teamwork and building strong relationships",
      "Change Agent - Drives positive change and innovation within organizations",
      "Mentor & Developer - Enjoys developing others and sharing knowledge for mutual growth"
    ],
    "Adaptability & Growth": [
      "Growth Mindset Professional - Embraces challenges and views failures as learning opportunities",
      "Adaptable Expert - Thrives in changing environments and embraces new challenges",
      "Learning Enthusiast - Passionate about acquiring new skills and staying current with trends",
      "Innovation Embracer - Open to new technologies and innovative approaches to work",
      "Resilient Professional - Bounces back from setbacks and maintains positive attitude"
    ],
    "Communication & Networking": [
      "Master Networker - Builds and maintains strong professional relationships across industries",
      "Executive Communicator - Communicates with confidence and clarity at all organizational levels",
      "Relationship Builder - Naturally connects with people and maintains long-term professional relationships",
      "Public Speaker - Comfortable presenting ideas and speaking to diverse audiences",
      "Brand Ambassador - Effectively represents personal and organizational brand in professional settings"
    ],
    "Market Awareness & Strategy": [
      "Market Intelligence Expert - Well-informed about industry trends and market dynamics",
      "Strategic Thinker - Approaches career and business challenges with strategic mindset",
      "Competitive Analyst - Understands competitive landscape and positioning strategies",
      "Future-Focused Planner - Anticipates future trends and prepares accordingly",
      "Industry Thought Leader - Recognized expertise and influence within chosen industry"
    ],
    "Professional Brand & Presence": [
      "Personal Brand Expert - Has strong professional identity and reputation",
      "Digital Professional - Maintains strong online presence and digital professional brand",
      "Industry Connector - Known for connecting people and creating valuable professional relationships",
      "Thought Leader - Shares insights and expertise to influence industry conversations",
      "Executive Presence - Commands respect and attention in professional settings"
    ]
  };

  // ✅ CORRECT IJRL scoring calculation (60% form + 40% resume)
  const calculateIJRLScores = (currentFormData: IJRLFormData) => {
    const categories = ['professionalAlignment', 'skillsAndCompetency', 'networkingAndProfessionalPresence', 'jobMarketKnowledge', 'applicationAndInterviewReadiness', 'emotionalAndSocialIntelligence', 'continuousGrowthAndSelfReflection'] as const;
    let rawTotalScore = 0;
    const newScores = { ...currentFormData._internalScores };

    // Calculate individual category scores
    categories.forEach(category => {
      const selectedAnswer = currentFormData[category] as string;
      if (selectedAnswer && IJRL_CATEGORY_WEIGHTAGES[category]) {
        const option = IJRL_CATEGORY_WEIGHTAGES[category].find(opt => opt.text === selectedAnswer);
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

  // ✅ IJRL Readiness Level mapping
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
    const newScores = calculateIJRLScores(updatedData);
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
    IJRL_CATEGORIES.forEach(category => {
      if (formData[category.key as keyof IJRLFormData]) completedFields++;
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
    const missingCategories = IJRL_CATEGORIES.filter(category => 
      !formData[category.key as keyof IJRLFormData]
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
        assessmentType: 'IJRL',
        
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
            professionalAlignment: formData._internalScores.professionalAlignment,
            skillsAndCompetency: formData._internalScores.skillsAndCompetency,
            networkingAndProfessionalPresence: formData._internalScores.networkingAndProfessionalPresence,
            jobMarketKnowledge: formData._internalScores.jobMarketKnowledge,
            applicationAndInterviewReadiness: formData._internalScores.applicationAndInterviewReadiness,
            emotionalAndSocialIntelligence: formData._internalScores.emotionalAndSocialIntelligence,
            continuousGrowthAndSelfReflection: formData._internalScores.continuousGrowthAndSelfReflection
          },
          frontendVersion: '2.0',
          assessmentType: 'IJRL',
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
      console.error('❌ IJRL Google Vision submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
      setStep('preview');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render category question
  const renderCategoryQuestion = (category: typeof IJRL_CATEGORIES[0]) => {
    const options = IJRL_CATEGORY_WEIGHTAGES[category.key] || [];
    const selectedValue = formData[category.key as keyof IJRLFormData] as string;
    
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
        assessmentType={(assessmentType || 'ijrl') as AssessmentType}
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
              <h2 className="text-lg font-medium text-gray-900">Ideal Job Readiness Level (IJRL) Assessment</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                The IJRL evaluates your preparedness to secure and succeed in your desired role. It helps identify areas for improvement 
                to align your skills with your dream job requirements, powered by Google Vision AI.
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
                      Ideal Job Position (dream role) *
                    </label>
                    <input
                      type="text"
                      name="personalInfo.jobPosition"
                      id="personalInfo.jobPosition"
                      value={formData.personalInfo.jobPosition}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g.: Senior Product Manager, Marketing Director, Chief Technology Officer"
                    />
                  </div>
                  
                  {/* Ideal Job focused personality selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Your Professional Personality Types *
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      Choose one or more personality types that best describe your professional aspirations and working style for your ideal job.
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
                
                {/* IJRL Assessment Categories */}
                <div className="space-y-8">
                  <div className="border-t pt-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Assessment Questions
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Answer all questions to receive your comprehensive ideal job readiness analysis.
                    </p>
                  </div>
                  
                  {IJRL_CATEGORIES.map(category => renderCategoryQuestion(category))}
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
                    Preview IJRL Assessment
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Your IJRL Assessment</h2>
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
                    <p className="text-sm text-gray-500">Ideal Job Position</p>
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
                  <h3 className="font-medium text-gray-800 mb-3">Selected Professional Personality Types</h3>
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
                  {IJRL_CATEGORIES.map(category => (
                    <div key={category.key} className="border-l-4 border-blue-200 pl-4 py-2">
                      <p className="text-sm font-medium text-gray-700">{category.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{formData[category.key as keyof IJRLFormData] as string}</p>
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
                  {isSubmitting ? 'Processing...' : 'Submit IJRL Assessment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}