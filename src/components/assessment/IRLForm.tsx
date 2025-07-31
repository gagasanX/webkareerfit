// components/assessment/IRLForm.tsx - FIXED VERSION with Google Vision Integration

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AssessmentProcessingScreen from '@/components/assessment/AssessmentProcessingScreen';

// ✅ FIXED: Define AssessmentType locally to avoid import issues
type AssessmentType = 'fjrl' | 'ijrl' | 'cdrl' | 'ccrl' | 'ctrl' | 'rrl' | 'irl';

interface IRLFormProps {
  assessmentId?: string;
  assessmentType?: string;
  onSubmit?: (formData: any, resumeFile?: File) => Promise<void>;
  initialData?: any;
}

// IRL WEIGHTAGE SYSTEM - Based on actual document
interface WeightageOption {
  text: string;
  weightage: number;
}

interface CategoryWeightage {
  [key: string]: WeightageOption[];
}

// ✅ FIXED: Exact weightage mapping from IRL document
const IRL_CATEGORY_WEIGHTAGES: CategoryWeightage = {
  coreSkillsAndKnowledge: [
    { text: "I have a clear understanding of the technical requirements and job-specific knowledge for the role.", weightage: 1 },
    { text: "My problem-solving abilities enable me to address challenges logically and effectively.", weightage: 2 },
    { text: "I have a strong foundation in industry-related tools, technologies, or methodologies.", weightage: 3 },
    { text: "I can apply critical thinking to analyze complex situations and develop appropriate solutions.", weightage: 4 },
    { text: "I consistently seek opportunities to update my skills and stay relevant in my field.", weightage: 5 }
  ],
  emotionalIntelligence: [
    { text: "I understand my strengths and weaknesses and how they impact my professional interactions.", weightage: 1 },
    { text: "I can regulate my emotions under pressure to maintain focus and professionalism.", weightage: 2 },
    { text: "I empathize with others' perspectives and build positive relationships in the workplace.", weightage: 3 },
    { text: "I handle constructive criticism with an open mind and use it for personal growth.", weightage: 4 },
    { text: "I demonstrate resilience and adaptability when faced with unexpected challenges or changes.", weightage: 5 }
  ],
  socialIntelligence: [
    { text: "I can work collaboratively with diverse teams to achieve common goals.", weightage: 1 },
    { text: "I effectively navigate workplace dynamics and manage conflicts constructively.", weightage: 2 },
    { text: "I am aware of cultural sensitivities and respect differences in professional environments.", weightage: 3 },
    { text: "I communicate ideas clearly and persuasively, both verbally and in writing.", weightage: 4 },
    { text: "I build and maintain professional networks that support my career development.", weightage: 5 }
  ],
  competencyAndKnowHow: [
    { text: "I can independently manage tasks and responsibilities to meet job expectations.", weightage: 1 },
    { text: "I demonstrate precision and attention to detail in my work outputs.", weightage: 2 },
    { text: "I can integrate theoretical knowledge into practical scenarios effectively.", weightage: 3 },
    { text: "I am skilled at optimizing processes to improve efficiency and outcomes.", weightage: 4 },
    { text: "I continuously evaluate my performance to identify and implement improvements.", weightage: 5 }
  ],
  strategicThinkingAndGoalSetting: [
    { text: "I can set realistic goals and create actionable plans to achieve them.", weightage: 1 },
    { text: "I prioritize tasks effectively to meet deadlines without compromising quality.", weightage: 2 },
    { text: "I consider the broader implications of my actions in achieving organizational goals.", weightage: 3 },
    { text: "I adapt my strategies when unforeseen obstacles or opportunities arise.", weightage: 4 },
    { text: "I align my career aspirations with the organization's vision and mission.", weightage: 5 }
  ],
  professionalPresentationAndPreparedness: [
    { text: "My resume and portfolio effectively showcase my skills, achievements, and experiences.", weightage: 1 },
    { text: "I articulate my qualifications and career aspirations confidently during interviews.", weightage: 2 },
    { text: "I demonstrate professional etiquette in all communication, whether written or verbal.", weightage: 3 },
    { text: "I prepare thoroughly for interviews, including researching the company and role.", weightage: 4 },
    { text: "My appearance and demeanor consistently reflect a professional standard.", weightage: 5 }
  ],
  continuousLearningAndGrowthMindset: [
    { text: "I actively seek learning opportunities to enhance my skills and knowledge.", weightage: 1 },
    { text: "I am open to feedback and view it as a tool for continuous improvement.", weightage: 2 },
    { text: "I explore new technologies, trends, and methods relevant to my desired field.", weightage: 3 },
    { text: "I take initiative in pursuing certifications, training, or projects to expand my expertise.", weightage: 4 },
    { text: "I embrace challenges as opportunities to develop and grow professionally.", weightage: 5 }
  ]
};

// ✅ IRL Categories in correct order
const IRL_CATEGORIES = [
  { key: 'coreSkillsAndKnowledge', title: 'Core Skills and Knowledge', description: 'Choose the statement that best describes your technical skills and knowledge base.' },
  { key: 'emotionalIntelligence', title: 'Emotional Intelligence', description: 'Select the option that reflects your emotional awareness and self-regulation abilities.' },
  { key: 'socialIntelligence', title: 'Social Intelligence', description: 'Choose the statement that represents your social skills and workplace relationship building.' },
  { key: 'competencyAndKnowHow', title: 'Competency and Know-How', description: 'Select the option that best describes your practical competencies and work execution.' },
  { key: 'strategicThinkingAndGoalSetting', title: 'Strategic Thinking and Goal Setting', description: 'Choose the statement that reflects your strategic thinking and planning abilities.' },
  { key: 'professionalPresentationAndPreparedness', title: 'Professional Presentation and Preparedness', description: 'Select the option that describes your professional presentation and interview readiness.' },
  { key: 'continuousLearningAndGrowthMindset', title: 'Continuous Learning and Growth Mindset', description: 'Choose the statement that represents your commitment to learning and growth.' }
];

interface IRLFormData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    personality: string[];
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
  // 🔥 INTERNAL: Store calculated scores (hidden from user)
  _internalScores: {
    coreSkillsAndKnowledge: number;
    emotionalIntelligence: number;
    socialIntelligence: number;
    competencyAndKnowHow: number;
    strategicThinkingAndGoalSetting: number;
    professionalPresentationAndPreparedness: number;
    continuousLearningAndGrowthMindset: number;
    rawTotalScore: number;
    formPercentage: number;
    formContribution: number;
    estimatedFinalScore: number;
    readinessLevel: string;
  };
}

export default function IRLForm({ assessmentId, assessmentType, onSubmit, initialData }: IRLFormProps) {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<'form' | 'preview' | 'analyzing'>('form');
  const [formData, setFormData] = useState<IRLFormData>(initialData || {
    personalInfo: {
      name: session?.user?.name || '',
      email: session?.user?.email || '',
      phone: '',
      personality: [],
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
    _internalScores: {
      coreSkillsAndKnowledge: 0,
      emotionalIntelligence: 0,
      socialIntelligence: 0,
      competencyAndKnowHow: 0,
      strategicThinkingAndGoalSetting: 0,
      professionalPresentationAndPreparedness: 0,
      continuousLearningAndGrowthMindset: 0,
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

  // Internship focused personality options
  const PERSONALITY_OPTIONS = {
    "Learning & Academic Excellence": [
      "Academic Achiever - Strong academic performance with dedication to learning",
      "Curious Learner - Always asking questions and seeking to understand deeper concepts",
      "Knowledge Absorber - Quickly grasps new information and applies it effectively",
      "Research Oriented - Enjoys investigating topics and finding detailed information",
      "Theory to Practice - Excels at connecting academic knowledge to real-world applications"
    ],
    "Professional Development": [
      "Career-Focused Student - Clear about career goals and takes steps to achieve them",
      "Skill Builder - Actively works on developing both technical and soft skills",
      "Professional Minded - Understands workplace expectations and prepares accordingly",
      "Industry Aware - Stays informed about trends and developments in chosen field",
      "Network Builder - Recognizes the importance of professional relationships"
    ],
    "Work Ethic & Attitude": [
      "Dedicated Worker - Committed to giving best effort in all tasks and assignments",
      "Reliable Team Member - Can be counted on to meet deadlines and fulfill commitments",
      "Initiative Taker - Proactively identifies opportunities and takes action",
      "Detail Conscious - Pays attention to accuracy and quality in work",
      "Time Manager - Effectively balances multiple responsibilities and priorities"
    ],
    "Communication & Collaboration": [
      "Effective Communicator - Expresses ideas clearly in both written and verbal formats",
      "Active Collaborator - Works well in team settings and contributes meaningfully",
      "Respectful Listener - Values others' input and incorporates feedback constructively",
      "Professional Presenter - Comfortable sharing ideas and findings with others",
      "Cultural Aware - Sensitive to diversity and respectful of different perspectives"
    ],
    "Adaptability & Growth": [
      "Flexible Learner - Adapts quickly to new environments and changing requirements",
      "Challenge Embracer - Views difficulties as opportunities to learn and grow",
      "Feedback Seeker - Actively requests input to improve performance",
      "Tech Adaptable - Comfortable learning and using new technologies and tools",
      "Resilient Professional - Bounces back from setbacks with positive attitude"
    ],
    "Internship Readiness": [
      "Workplace Ready - Prepared for professional environment expectations and norms",
      "Mentor Seeking - Open to guidance and eager to learn from experienced professionals",
      "Value Creator - Focused on contributing meaningful work and adding value",
      "Goal Oriented - Has clear objectives for what to achieve during internship",
      "Future Focused - Uses internship as stepping stone for career development"
    ],
    "Personal Qualities": [
      "Enthusiastic Participant - Brings positive energy and genuine interest to work",
      "Ethical Professional - Maintains high standards of integrity and honesty",
      "Organized Individual - Keeps track of tasks, deadlines, and important information",
      "Self Aware - Understands personal strengths and areas for development",
      "Motivated Achiever - Driven to succeed and make the most of opportunities"
    ]
  };

  // ✅ CORRECT IRL scoring calculation (60% form + 40% resume)
  const calculateIRLScores = (currentFormData: IRLFormData) => {
    const categories = ['coreSkillsAndKnowledge', 'emotionalIntelligence', 'socialIntelligence', 'competencyAndKnowHow', 'strategicThinkingAndGoalSetting', 'professionalPresentationAndPreparedness', 'continuousLearningAndGrowthMindset'] as const;
    let rawTotalScore = 0;
    const newScores = { ...currentFormData._internalScores };

    // Calculate individual category scores
    categories.forEach(category => {
      const selectedAnswer = currentFormData[category] as string;
      if (selectedAnswer && IRL_CATEGORY_WEIGHTAGES[category]) {
        const option = IRL_CATEGORY_WEIGHTAGES[category].find(opt => opt.text === selectedAnswer);
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

  // ✅ IRL Readiness Level mapping
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
    const newScores = calculateIRLScores(updatedData);
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
    IRL_CATEGORIES.forEach(category => {
      if (formData[category.key as keyof IRLFormData]) completedFields++;
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
    const missingCategories = IRL_CATEGORIES.filter(category => 
      !formData[category.key as keyof IRLFormData]
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
        assessmentType: 'IRL',
        
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
            coreSkillsAndKnowledge: formData._internalScores.coreSkillsAndKnowledge,
            emotionalIntelligence: formData._internalScores.emotionalIntelligence,
            socialIntelligence: formData._internalScores.socialIntelligence,
            competencyAndKnowHow: formData._internalScores.competencyAndKnowHow,
            strategicThinkingAndGoalSetting: formData._internalScores.strategicThinkingAndGoalSetting,
            professionalPresentationAndPreparedness: formData._internalScores.professionalPresentationAndPreparedness,
            continuousLearningAndGrowthMindset: formData._internalScores.continuousLearningAndGrowthMindset
          },
          frontendVersion: '2.0',
          assessmentType: 'IRL',
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
      console.error('❌ IRL Google Vision submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
      setStep('preview');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render category question
  const renderCategoryQuestion = (category: typeof IRL_CATEGORIES[0]) => {
    const options = IRL_CATEGORY_WEIGHTAGES[category.key] || [];
    const selectedValue = formData[category.key as keyof IRLFormData] as string;
    
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
        assessmentType={(assessmentType || 'irl') as AssessmentType}
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
              <h2 className="text-lg font-medium text-gray-900">Internship Readiness Level (IRL) Assessment</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                The IRL assesses your preparedness for entering the professional world through internships, 
                focusing on your skills, adaptability, work ethic, and alignment with career goals, powered by Google Vision AI.
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
                      Internship Position (target role) *
                    </label>
                    <input
                      type="text"
                      name="personalInfo.jobPosition"
                      id="personalInfo.jobPosition"
                      value={formData.personalInfo.jobPosition}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g.: Marketing Intern, Software Development Intern, Business Analyst Intern"
                    />
                  </div>
                  
                  {/* Internship focused personality selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Your Personality Types *
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      Choose one or more personality types that best describe you as an internship candidate.
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
                
                {/* IRL Assessment Categories */}
                <div className="space-y-8">
                  <div className="border-t pt-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Assessment Questions
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Answer all questions to receive your comprehensive internship readiness analysis.
                    </p>
                  </div>
                  
                  {IRL_CATEGORIES.map(category => renderCategoryQuestion(category))}
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
                    Preview IRL Assessment
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Your IRL Assessment</h2>
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
                    <p className="text-sm text-gray-500">Internship Position</p>
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
                  {IRL_CATEGORIES.map(category => (
                    <div key={category.key} className="border-l-4 border-blue-200 pl-4 py-2">
                      <p className="text-sm font-medium text-gray-700">{category.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{formData[category.key as keyof IRLFormData] as string}</p>
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
                  {isSubmitting ? 'Processing...' : 'Submit IRL Assessment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}