// components/assessment/FJRLForm.tsx - FIXED VERSION with Google Vision Integration

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AssessmentProcessingScreen from '@/components/assessment/AssessmentProcessingScreen';

// ✅ FIXED: Define AssessmentType locally to avoid import issues
type AssessmentType = 'fjrl' | 'ijrl' | 'cdrl' | 'ccrl' | 'ctrl' | 'rrl' | 'irl';

interface FJRLFormProps {
  assessmentId?: string;
  assessmentType?: string;
  onSubmit?: (formData: any, resumeFile?: File) => Promise<void>;
}

// FJRL WEIGHTAGE SYSTEM - Based on actual document
interface WeightageOption {
  text: string;
  weightage: number;
}

interface CategoryWeightage {
  [key: string]: WeightageOption[];
}

// ✅ FIXED: Exact weightage mapping from FJRL document
const FJRL_CATEGORY_WEIGHTAGES: CategoryWeightage = {
  professionalism: [
    { text: "Work habits and ethics align with the standards expected in professional environments.", weightage: 1 },
    { text: "Punctuality and time management skills ensure timely completion of tasks and adherence to schedules.", weightage: 2 },
    { text: "Professional appearance and demeanor align with industry norms and organizational expectations.", weightage: 3 },
    { text: "Awareness of workplace hierarchy and respect for roles and responsibilities is consistently practiced.", weightage: 4 },
    { text: "Confidentiality and integrity are maintained when dealing with sensitive or organizational information.", weightage: 5 }
  ],
  learningSkills: [
    { text: "New tasks and skills are approached with curiosity and a willingness to learn.", weightage: 1 },
    { text: "Constructive feedback is actively sought and applied to improve performance.", weightage: 2 },
    { text: "Research and self-learning tools are effectively used to acquire job-specific knowledge.", weightage: 3 },
    { text: "The ability to analyze and synthesize information supports continuous learning.", weightage: 4 },
    { text: "Growth opportunities are identified and pursued proactively to align with career goals.", weightage: 5 }
  ],
  communicationSkills: [
    { text: "Communication is clear, concise, and tailored to the audience and purpose.", weightage: 1 },
    { text: "Active listening ensures accurate understanding and meaningful responses during conversations.", weightage: 2 },
    { text: "Written correspondence, including emails and reports, adheres to professional standards.", weightage: 3 },
    { text: "Presentation skills effectively convey ideas, concepts, or solutions to diverse audiences.", weightage: 4 },
    { text: "Non-verbal communication, including body language and tone, aligns with the intended message.", weightage: 5 }
  ],
  criticalThinking: [
    { text: "Problems are analyzed from multiple perspectives to identify effective solutions.", weightage: 1 },
    { text: "Innovative approaches are explored when addressing challenges or improving processes.", weightage: 2 },
    { text: "Logical reasoning and evidence-based thinking guide decision-making.", weightage: 3 },
    { text: "Risks and potential consequences are considered when proposing or implementing solutions.", weightage: 4 },
    { text: "Opportunities for improvement or innovation are identified and communicated effectively.", weightage: 5 }
  ],
  teamwork: [
    { text: "Roles and responsibilities within teams are understood and fulfilled effectively.", weightage: 1 },
    { text: "Collaboration is fostered by actively engaging with team members and valuing diverse perspectives.", weightage: 2 },
    { text: "Conflicts are resolved constructively to maintain team harmony and productivity.", weightage: 3 },
    { text: "Contributions to team projects are consistent, reliable, and aligned with shared objectives.", weightage: 4 },
    { text: "Recognition and appreciation of the strengths and efforts of team members are regularly practiced.", weightage: 5 }
  ],
  selfManagement: [
    { text: "Daily tasks and responsibilities are organized effectively to ensure productivity.", weightage: 1 },
    { text: "Stress and challenges are managed constructively without compromising performance.", weightage: 2 },
    { text: "Initiative is taken to address tasks or responsibilities without waiting for direct instruction.", weightage: 3 },
    { text: "Personal and professional goals are set and tracked for continuous self-improvement.", weightage: 4 },
    { text: "Work-life balance is maintained to ensure overall well-being and sustained performance.", weightage: 5 }
  ],
  selfAwareness: [
    { text: "Strengths and areas for improvement are clearly identified and articulated.", weightage: 1 },
    { text: "Constructive feedback is embraced as an opportunity for personal and professional development.", weightage: 2 },
    { text: "Career aspirations are aligned with skills, values, and industry opportunities.", weightage: 3 },
    { text: "Efforts to develop soft skills, such as empathy and emotional intelligence, are consistently made.", weightage: 4 },
    { text: "A growth mindset drives the pursuit of learning and adaptation in a changing work environment.", weightage: 5 }
  ]
};

// ✅ FJRL Categories in correct order
const FJRL_CATEGORIES = [
  { key: 'professionalism', title: 'Professionalism', description: 'Choose the statement that best describes your professional work habits and ethics.' },
  { key: 'learningSkills', title: 'Learning Skills', description: 'Select the option that reflects your approach to learning and skill development.' },
  { key: 'communicationSkills', title: 'Communication Skills', description: 'Choose the statement that represents your communication abilities and style.' },
  { key: 'criticalThinking', title: 'Creative and Critical Thinking', description: 'Select the option that best describes your problem-solving and analytical thinking.' },
  { key: 'teamwork', title: 'Teamwork and Collaboration', description: 'Choose the statement that reflects your teamwork and collaboration capabilities.' },
  { key: 'selfManagement', title: 'Self Management', description: 'Select the option that describes your self-management and organizational skills.' },
  { key: 'selfAwareness', title: 'Self Awareness and Growth Orientation', description: 'Choose the statement that represents your self-awareness and growth mindset.' }
];

interface FJRLFormData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    personality: string[];
    jobPosition: string;
  };
  qualification: string;
  professionalism: string;
  learningSkills: string;
  communicationSkills: string;
  criticalThinking: string;
  teamwork: string;
  selfManagement: string;
  selfAwareness: string;
  // 🔥 INTERNAL: Store calculated scores (hidden from user)
  _internalScores: {
    professionalism: number;
    learningSkills: number;
    communicationSkills: number;
    criticalThinking: number;
    teamwork: number;
    selfManagement: number;
    selfAwareness: number;
    rawTotalScore: number;
    formPercentage: number;
    formContribution: number;
    estimatedFinalScore: number;
    readinessLevel: string;
  };
}

export default function FJRLForm({ assessmentId, assessmentType, onSubmit }: FJRLFormProps) {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<'form' | 'preview' | 'analyzing'>('form');
  const [formData, setFormData] = useState<FJRLFormData>({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      personality: [],
      jobPosition: '',
    },
    qualification: '',
    professionalism: '',
    learningSkills: '',
    communicationSkills: '',
    criticalThinking: '',
    teamwork: '',
    selfManagement: '',
    selfAwareness: '',
    _internalScores: {
      professionalism: 0,
      learningSkills: 0,
      communicationSkills: 0,
      criticalThinking: 0,
      teamwork: 0,
      selfManagement: 0,
      selfAwareness: 0,
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

  // Fresh Graduate focused personality options
  const PERSONALITY_OPTIONS = {
    "Learning & Development": [
      "Eager Learner - Always curious and excited to acquire new knowledge and skills",
      "Quick Adapter - Rapidly adjusts to new environments and embraces change",
      "Growth Mindset - Believes abilities can be developed through dedication and hard work", 
      "Knowledge Seeker - Actively pursues learning opportunities and stays updated with industry trends",
      "Feedback Oriented - Welcomes constructive criticism and uses it to improve performance"
    ],
    "Communication & Teamwork": [
      "Active Listener - Pays close attention and responds thoughtfully in conversations",
      "Team Player - Works well with others and contributes positively to group dynamics",
      "Clear Communicator - Expresses ideas clearly and effectively in various formats",
      "Collaborative Spirit - Enjoys working with diverse teams and values different perspectives",
      "Respectful Professional - Maintains professionalism and courtesy in all interactions"
    ],
    "Work Style & Approach": [
      "Detail-Oriented - Pays careful attention to accuracy and quality in all tasks",
      "Self-Motivated - Takes initiative and works independently with minimal supervision",
      "Organized Planner - Manages time effectively and keeps tasks well-structured",
      "Results-Focused - Concentrates on achieving goals and delivering quality outcomes",
      "Reliable Performer - Consistently meets deadlines and fulfills commitments"
    ],
    "Problem-Solving & Innovation": [
      "Creative Thinker - Generates innovative ideas and approaches to challenges",
      "Analytical Minded - Breaks down complex problems into manageable components",
      "Solution Oriented - Focuses on finding practical solutions rather than dwelling on problems",
      "Tech Savvy - Comfortable with technology and learns new digital tools quickly",
      "Research Enthusiast - Enjoys investigating and gathering information to make informed decisions"
    ],
    "Personal Qualities": [
      "Positive Attitude - Maintains optimism and brings positive energy to the workplace",
      "Patient Learner - Takes time to understand concepts thoroughly before moving forward",
      "Humble Professional - Open to guidance and recognizes areas for improvement",
      "Ambitious Graduate - Has clear career goals and works towards achieving them",
      "Adaptable Professional - Flexible and open to changing priorities and new challenges"
    ],
    "Entry-Level Strengths": [
      "Fresh Perspective - Brings new ideas and current knowledge from recent education",
      "Enthusiasm & Energy - Shows genuine excitement and passion for starting career",
      "Technology Native - Naturally comfortable with modern digital tools and platforms",
      "Academic Excellence - Strong foundation from educational achievements and projects",
      "Mentorship Ready - Eager to learn from experienced professionals and seek guidance"
    ]
  };

  // ✅ CORRECT FJRL scoring calculation (60% form + 40% resume)
  const calculateFJRLScores = (currentFormData: FJRLFormData) => {
    const categories = ['professionalism', 'learningSkills', 'communicationSkills', 'criticalThinking', 'teamwork', 'selfManagement', 'selfAwareness'] as const;
    let rawTotalScore = 0;
    const newScores = { ...currentFormData._internalScores };

    // Calculate individual category scores
    categories.forEach(category => {
      const selectedAnswer = currentFormData[category] as string;
      if (selectedAnswer && FJRL_CATEGORY_WEIGHTAGES[category]) {
        const option = FJRL_CATEGORY_WEIGHTAGES[category].find(opt => opt.text === selectedAnswer);
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

  // ✅ FJRL Readiness Level mapping
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
    const newScores = calculateFJRLScores(updatedData);
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
    FJRL_CATEGORIES.forEach(category => {
      if (formData[category.key as keyof FJRLFormData]) completedFields++;
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
        console.log('✅ PDF file selected - will be processed with AI Vision PDF API');
      } else if (file.type.includes('word')) {
        console.log('✅ Word document selected - will be processed with Vision');
      } else if (file.type.startsWith('image/')) {
        console.log('✅ Image file selected - will be processed with Vision Image API');
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
    const missingCategories = FJRL_CATEGORIES.filter(category => 
      !formData[category.key as keyof FJRLFormData]
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
        assessmentType: 'FJRL',
        
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
            note: "Resume analysis will be performed",
            expectedContribution: 'resumeScore * 0.4'
          },
          categoryScores: {
            professionalism: formData._internalScores.professionalism,
            learningSkills: formData._internalScores.learningSkills,
            communicationSkills: formData._internalScores.communicationSkills,
            criticalThinking: formData._internalScores.criticalThinking,
            teamwork: formData._internalScores.teamwork,
            selfManagement: formData._internalScores.selfManagement,
            selfAwareness: formData._internalScores.selfAwareness
          },
          frontendVersion: '2.0',
          assessmentType: 'FJRL',
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
      
      console.log('🔥 Submitting to Vision API endpoint');
      
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
      
      console.log('✅ Vision submission successful:', result);
      
      // Redirect to results
      setTimeout(() => {
        router.push(result.redirectUrl || `/assessment/${assessmentType}/results/${assessmentId}`);
      }, 3000);
      
    } catch (err) {
      console.error('❌ FJRL Vision submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
      setStep('preview');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render category question
  const renderCategoryQuestion = (category: typeof FJRL_CATEGORIES[0]) => {
    const options = FJRL_CATEGORY_WEIGHTAGES[category.key] || [];
    const selectedValue = formData[category.key as keyof FJRLFormData] as string;
    
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
              ? ' Will be processed with Vision PDF API' 
              : resumeFile.type.startsWith('image/')
              ? ' Will be processed with Vision Image API'
              : ' Will be processed with Vision API'}
          </span>
        )}
      </p>
    </div>
  );

  // ✅ FIXED: If analyzing, show processing screen with proper type casting
  if (step === 'analyzing') {
    return (
      <AssessmentProcessingScreen 
        assessmentType={(assessmentType || 'fjrl') as AssessmentType}
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
              <h2 className="text-lg font-medium text-gray-900">First Job Readiness Level (FJRL) Assessment</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                The FJRL evaluates a fresh graduate's preparedness for their first job. It assesses key competencies, 
                self-awareness, and readiness for professional environments powered by Vision AI.
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
                      First Job Position (entry-level) *
                    </label>
                    <input
                      type="text"
                      name="personalInfo.jobPosition"
                      id="personalInfo.jobPosition"
                      value={formData.personalInfo.jobPosition}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g.: Junior Developer, Marketing Assistant, Graduate Trainee"
                    />
                  </div>
                  
                  {/* Fresh Graduate personality selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Your Personality Types *
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      Choose one or more personality types that best describe you as a fresh graduate entering the workforce.
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
                
                {/* FJRL Assessment Categories */}
                <div className="space-y-8">
                  <div className="border-t pt-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Assessment Questions
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Answer all questions to receive your comprehensive first job readiness analysis.
                    </p>
                  </div>
                  
                  {FJRL_CATEGORIES.map(category => renderCategoryQuestion(category))}
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
                    Preview FJRL Assessment
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Your FJRL Assessment</h2>
            <p className="text-gray-600 mb-6">Please review your answers before submitting for comprehensive Vision AI analysis.</p>

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
                    <p className="text-sm text-gray-500">First Job Position</p>
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
                  {FJRL_CATEGORIES.map(category => (
                    <div key={category.key} className="border-l-4 border-blue-200 pl-4 py-2">
                      <p className="text-sm font-medium text-gray-700">{category.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{formData[category.key as keyof FJRLFormData] as string}</p>
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
                  {isSubmitting ? 'Processing...' : 'Submit FJRL Assessment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}