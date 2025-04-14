'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AssessmentProcessingScreen from '@/components/assessment/AssessmentProcessingScreen';

// Define AssessmentType to match what AssessmentProcessingScreen expects
type AssessmentType = 'fjrl' | 'ijrl' | 'cdrl' | 'ccrl' | 'ctrl' | 'rrl' | 'irl';

interface IJRLFormProps {
  assessmentId?: string;
  assessmentType?: AssessmentType;
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
  professionalAlignment: string;
  skillsAndCompetency: string;
  networkingAndProfessionalPresence: string;
  jobMarketKnowledge: string;
  applicationAndInterviewReadiness: string;
  emotionalAndSocialIntelligence: string;
  continuousGrowthAndSelfReflection: string;
}

export default function IJRLForm({ assessmentId, assessmentType, onSubmit }: IJRLFormProps) {
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
    professionalAlignment: '',
    skillsAndCompetency: '',
    networkingAndProfessionalPresence: '',
    jobMarketKnowledge: '',
    applicationAndInterviewReadiness: '',
    emotionalAndSocialIntelligence: '',
    continuousGrowthAndSelfReflection: '',
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
    if (formData.professionalAlignment) completedFields++;
    if (formData.skillsAndCompetency) completedFields++;
    if (formData.networkingAndProfessionalPresence) completedFields++;
    if (formData.jobMarketKnowledge) completedFields++;
    if (formData.applicationAndInterviewReadiness) completedFields++;
    if (formData.emotionalAndSocialIntelligence) completedFields++;
    if (formData.continuousGrowthAndSelfReflection) completedFields++;
    
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

    // Check if all assessment sections are completed
    if (
      !formData.professionalAlignment ||
      !formData.skillsAndCompetency ||
      !formData.networkingAndProfessionalPresence ||
      !formData.jobMarketKnowledge ||
      !formData.applicationAndInterviewReadiness ||
      !formData.emotionalAndSocialIntelligence ||
      !formData.continuousGrowthAndSelfReflection
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
        assessmentType={assessmentType || 'ijrl'} 
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
            <h2 className="text-lg font-medium text-gray-900">Ideal Job Readiness Level (IJRL) Assessment</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              The IJRL evaluates your preparedness to secure and succeed in your desired role. 
              It helps identify areas for improvement to align your skills with your dream job requirements.
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
                    Job and position applying for? (e.g.: Senior Product Manager, Marketing Director) *
                  </label>
                  <input
                    type="text"
                    name="personalInfo.jobPosition"
                    id="personalInfo.jobPosition"
                    value={formData.personalInfo.jobPosition}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="e.g.: Senior Product Manager, Marketing Director"
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
              
              {/* Professional Alignment */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Professional Alignment</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "The job description and responsibilities align with personal career aspirations and long-term goals.",
                    "The company's mission, vision, and values resonate with personal principles and motivations.",
                    "Industry knowledge and understanding of trends support informed decision-making about the role.",
                    "The desired role offers opportunities for growth and skill development aligned with future aspirations.",
                    "Expectations regarding work culture, job security, and benefits are realistic and well-informed."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.professionalAlignment === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="professionalAlignment"
                        value={option}
                        checked={formData.professionalAlignment === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Skills and Competency */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Skills and Competency</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "The technical skills needed for the role are well understood and sufficiently developed.",
                    "Problem-solving and critical thinking abilities match the requirements of the ideal job.",
                    "Soft skills, such as communication and adaptability, align with industry and role expectations.",
                    "Transferable skills from previous experiences can be effectively applied to the desired position.",
                    "A clear understanding of gaps in current competencies allows for targeted skill-building."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.skillsAndCompetency === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="skillsAndCompetency"
                        value={option}
                        checked={formData.skillsAndCompetency === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Networking and Professional Presence */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Networking and Professional Presence</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "A professional network has been established to explore opportunities and gather industry insights.",
                    "Online profiles, such as LinkedIn, are optimized to showcase relevant skills and achievements.",
                    "Participation in professional events and forums demonstrates engagement with the industry.",
                    "Effective networking strategies are employed to create meaningful connections.",
                    "Communication in professional settings reflects confidence and clarity."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.networkingAndProfessionalPresence === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="networkingAndProfessionalPresence"
                        value={option}
                        checked={formData.networkingAndProfessionalPresence === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Job Market Knowledge */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Job Market Knowledge</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "Current job market trends and in-demand skills in the industry are well-researched and understood.",
                    "Knowledge of key employers and their expectations supports targeted job applications.",
                    "Awareness of salary ranges, benefits, and negotiation strategies is comprehensive.",
                    "The competitive landscape for the ideal role is analyzed to develop a standout application strategy.",
                    "Economic and technological changes influencing the industry are accounted for in career planning."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.jobMarketKnowledge === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="jobMarketKnowledge"
                        value={option}
                        checked={formData.jobMarketKnowledge === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Application and Interview Readiness */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Application and Interview Readiness</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "Resumes and cover letters are tailored to highlight relevant experiences and achievements.",
                    "Application materials are error-free, professional, and aligned with job requirements.",
                    "Interview preparation includes understanding the role, company, and potential questions.",
                    "Responses during interviews effectively convey competencies, enthusiasm, and cultural fit.",
                    "Confidence and composure are maintained during high-pressure interview situations."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.applicationAndInterviewReadiness === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="applicationAndInterviewReadiness"
                        value={option}
                        checked={formData.applicationAndInterviewReadiness === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Emotional and Social Intelligence */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Emotional and Social Intelligence</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "Relationships with colleagues and supervisors are managed with empathy and understanding.",
                    "Feedback is received constructively and used to improve performance and relationships.",
                    "Adaptability is demonstrated in response to changing roles, challenges, and team dynamics.",
                    "Emotional resilience and stress management techniques support professional success.",
                    "The ability to navigate workplace conflicts promotes a harmonious and productive environment."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.emotionalAndSocialIntelligence === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="emotionalAndSocialIntelligence"
                        value={option}
                        checked={formData.emotionalAndSocialIntelligence === option}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Continuous Growth and Self Reflection */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Continuous Growth and Self Reflection</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                
                <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                  {[
                    "A proactive approach is taken to identify and pursue learning opportunities.",
                    "Strengths and areas for improvement are regularly assessed to guide personal growth.",
                    "Long-term goals are set and adjusted based on self-reflection and professional aspirations.",
                    "A growth mindset drives the pursuit of knowledge and adaptability in evolving roles.",
                    "Motivation to excel in the ideal job is fueled by intrinsic and extrinsic factors."
                  ].map((option) => (
                    <label key={option} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.continuousGrowthAndSelfReflection === option
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="continuousGrowthAndSelfReflection"
                        value={option}
                        checked={formData.continuousGrowthAndSelfReflection === option}
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