'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AssessmentProcessingScreen from '@/components/assessment/AssessmentProcessingScreen';

interface FJRLFormProps {
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
  professionalism: string;
  learningSkills: string;
  communicationSkills: string;
  criticalThinking: string;
  teamwork: string;
  selfManagement: string;
  selfAwareness: string;
}

export default function FJRLForm({ assessmentId, assessmentType, onSubmit }: FJRLFormProps) {
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
    professionalism: '',
    learningSkills: '',
    communicationSkills: '',
    criticalThinking: '',
    teamwork: '',
    selfManagement: '',
    selfAwareness: '',
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
    if (formData.professionalism) completedFields++;
    if (formData.learningSkills) completedFields++;
    if (formData.communicationSkills) completedFields++;
    if (formData.criticalThinking) completedFields++;
    if (formData.teamwork) completedFields++;
    if (formData.selfManagement) completedFields++;
    if (formData.selfAwareness) completedFields++;
    
    // Calculate percentage (7 assessment sections + personal info)
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

    // Validate resume upload
    if (!resumeFile) {
      setError('Please upload your resume.');
      window.scrollTo(0, 0);
      return;
    }

    // Check if all assessment sections are completed
    if (
      !formData.professionalism ||
      !formData.learningSkills ||
      !formData.communicationSkills ||
      !formData.criticalThinking ||
      !formData.teamwork ||
      !formData.selfManagement ||
      !formData.selfAwareness
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
        assessmentType={assessmentType || 'fjrl'} 
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
            <h2 className="text-lg font-medium text-gray-900">First Job Readiness Level (FJRL) Assessment</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              The FJRL evaluates a fresh graduate's preparedness for their first job. It assesses key competencies, 
              self-awareness, and readiness for professional environments.
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
              
              {/* Professionalism */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Professionalism</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "Work habits and ethics align with the standards expected in professional environments.",
                    "Punctuality and time management skills ensure timely completion of tasks and adherence to schedules.",
                    "Professional appearance and demeanor align with industry norms and organizational expectations.",
                    "Awareness of workplace hierarchy and respect for roles and responsibilities is consistently practiced.",
                    "Confidentiality and integrity are maintained when dealing with sensitive or organizational information."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.professionalism === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="professionalism"
                        value={option}
                        checked={formData.professionalism === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Learning Skills */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Learning Skills</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "New tasks and skills are approached with curiosity and a willingness to learn.",
                    "Constructive feedback is actively sought and applied to improve performance.",
                    "Research and self-learning tools are effectively used to acquire job-specific knowledge.",
                    "The ability to analyze and synthesize information supports continuous learning.",
                    "Growth opportunities are identified and pursued proactively to align with career goals."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.learningSkills === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="learningSkills"
                        value={option}
                        checked={formData.learningSkills === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Communication Skills */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Communication Skills</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "Communication is clear, concise, and tailored to the audience and purpose.",
                    "Active listening ensures accurate understanding and meaningful responses during conversations.",
                    "Written correspondence, including emails and reports, adheres to professional standards.",
                    "Presentation skills effectively convey ideas, concepts, or solutions to diverse audiences.",
                    "Non-verbal communication, including body language and tone, aligns with the intended message."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.communicationSkills === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="communicationSkills"
                        value={option}
                        checked={formData.communicationSkills === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Critical Thinking */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Creative and Critical Thinking</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "Problems are analyzed from multiple perspectives to identify effective solutions.",
                    "Innovative approaches are explored when addressing challenges or improving processes.",
                    "Logical reasoning and evidence-based thinking guide decision-making.",
                    "Risks and potential consequences are considered when proposing or implementing solutions.",
                    "Opportunities for improvement or innovation are identified and communicated effectively."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.criticalThinking === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="criticalThinking"
                        value={option}
                        checked={formData.criticalThinking === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Teamwork */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Teamwork and Collaboration</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "Roles and responsibilities within teams are understood and fulfilled effectively.",
                    "Collaboration is fostered by actively engaging with team members and valuing diverse perspectives.",
                    "Conflicts are resolved constructively to maintain team harmony and productivity.",
                    "Contributions to team projects are consistent, reliable, and aligned with shared objectives.",
                    "Recognition and appreciation of the strengths and efforts of team members are regularly practiced."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.teamwork === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="teamwork"
                        value={option}
                        checked={formData.teamwork === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Self Management */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Self Management</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "Daily tasks and responsibilities are organized effectively to ensure productivity.",
                    "Stress and challenges are managed constructively without compromising performance.",
                    "Initiative is taken to address tasks or responsibilities without waiting for direct instruction.",
                    "Personal and professional goals are set and tracked for continuous self-improvement.",
                    "Work-life balance is maintained to ensure overall well-being and sustained performance."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.selfManagement === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="selfManagement"
                        value={option}
                        checked={formData.selfManagement === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Self Awareness */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Self Awareness and Growth Orientation</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "Strengths and areas for improvement are clearly identified and articulated.",
                    "Constructive feedback is embraced as an opportunity for personal and professional development.",
                    "Career aspirations are aligned with skills, values, and industry opportunities.",
                    "Efforts to develop soft skills, such as empathy and emotional intelligence, are consistently made.",
                    "A growth mindset drives the pursuit of learning and adaptation in a changing work environment."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.selfAwareness === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="selfAwareness"
                        value={option}
                        checked={formData.selfAwareness === option}
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