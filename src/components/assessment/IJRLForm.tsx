'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface IJRLFormProps {
  onSubmit: (data: any, resumeFile?: File) => void;
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
  professionalAlignment: string;
  skillsAndCompetency: string;
  networkingAndProfessionalPresence: string;
  jobMarketKnowledge: string;
  applicationAndInterviewReadiness: string;
  emotionalAndSocialIntelligence: string;
  continuousGrowthAndSelfReflection: string;
}

export default function IJRLForm({ onSubmit, initialData }: IJRLFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormDataType>(initialData || {
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

  const updateFormData = (section: string, field: string, value: string) => {
    if (section === 'personalInfo') {
      // Handle personalInfo as a nested object
      setFormData({
        ...formData,
        personalInfo: {
          ...formData.personalInfo,
          [field]: value,
        },
      });
    } else {
      // For non-nested properties, set directly
      setFormData({
        ...formData,
        [section]: value,
      });
    }
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, resumeFile || undefined);
  };

  const nextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
            <div>
              <label htmlFor="personalInfo.name" className="block text-sm font-medium text-gray-700">
                Full Name
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
                Email
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
                Phone Number
              </label>
              <input
                type="tel"
                name="personalInfo.phone"
                id="personalInfo.phone"
                value={formData.personalInfo.phone}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="personalInfo.personality" className="block text-sm font-medium text-gray-700">
                Describe Your Personality
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
              <label htmlFor="personalInfo.jobPosition" className="block text-sm font-medium text-gray-700">
                Job and Position Applying For
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
              <label htmlFor="qualification" className="block text-sm font-medium text-gray-700">
                Highest Qualification
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
            <div>
              <label htmlFor="resume" className="block text-sm font-medium text-gray-700">
                Upload Resume
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

            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={nextStep}>
                Next Step
              </Button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Professional Alignment</h2>
            
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Alignment</h3>
              <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
              <div className="space-y-3">
                <label className="block">
                  <input
                    type="radio"
                    name="professionalAlignment"
                    value="The job description and responsibilities align with personal career aspirations and long-term goals."
                    checked={formData.professionalAlignment === "The job description and responsibilities align with personal career aspirations and long-term goals."}
                    onChange={handleInputChange}
                    className="mr-2"
                    required
                  />
                  <span className="text-gray-700">The job description and responsibilities align with personal career aspirations and long-term goals.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="professionalAlignment"
                    value="The company's mission, vision, and values resonate with personal principles and motivations."
                    checked={formData.professionalAlignment === "The company's mission, vision, and values resonate with personal principles and motivations."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">The company's mission, vision, and values resonate with personal principles and motivations.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="professionalAlignment"
                    value="Industry knowledge and understanding of trends support informed decision-making about the role."
                    checked={formData.professionalAlignment === "Industry knowledge and understanding of trends support informed decision-making about the role."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Industry knowledge and understanding of trends support informed decision-making about the role.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="professionalAlignment"
                    value="The desired role offers opportunities for growth and skill development aligned with future aspirations."
                    checked={formData.professionalAlignment === "The desired role offers opportunities for growth and skill development aligned with future aspirations."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">The desired role offers opportunities for growth and skill development aligned with future aspirations.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="professionalAlignment"
                    value="Expectations regarding work culture, job security, and benefits are realistic and well-informed."
                    checked={formData.professionalAlignment === "Expectations regarding work culture, job security, and benefits are realistic and well-informed."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Expectations regarding work culture, job security, and benefits are realistic and well-informed.</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                Previous Step
              </Button>
              <Button type="button" onClick={nextStep}>
                Next Step
              </Button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Skills and Networking</h2>
            
            <div className="space-y-8">
              {/* Skills and Competency */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Skills and Competency</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="skillsAndCompetency"
                      value="The technical skills needed for the role are well understood and sufficiently developed."
                      checked={formData.skillsAndCompetency === "The technical skills needed for the role are well understood and sufficiently developed."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">The technical skills needed for the role are well understood and sufficiently developed.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="skillsAndCompetency"
                      value="Problem-solving and critical thinking abilities match the requirements of the ideal job."
                      checked={formData.skillsAndCompetency === "Problem-solving and critical thinking abilities match the requirements of the ideal job."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Problem-solving and critical thinking abilities match the requirements of the ideal job.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="skillsAndCompetency"
                      value="Soft skills, such as communication and adaptability, align with industry and role expectations."
                      checked={formData.skillsAndCompetency === "Soft skills, such as communication and adaptability, align with industry and role expectations."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Soft skills, such as communication and adaptability, align with industry and role expectations.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="skillsAndCompetency"
                      value="Transferable skills from previous experiences can be effectively applied to the desired position."
                      checked={formData.skillsAndCompetency === "Transferable skills from previous experiences can be effectively applied to the desired position."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Transferable skills from previous experiences can be effectively applied to the desired position.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="skillsAndCompetency"
                      value="A clear understanding of gaps in current competencies allows for targeted skill-building."
                      checked={formData.skillsAndCompetency === "A clear understanding of gaps in current competencies allows for targeted skill-building."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">A clear understanding of gaps in current competencies allows for targeted skill-building.</span>
                  </label>
                </div>
              </div>

              {/* Networking and Professional Presence */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Networking and Professional Presence</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="networkingAndProfessionalPresence"
                      value="A professional network has been established to explore opportunities and gather industry insights."
                      checked={formData.networkingAndProfessionalPresence === "A professional network has been established to explore opportunities and gather industry insights."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">A professional network has been established to explore opportunities and gather industry insights.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="networkingAndProfessionalPresence"
                      value="Online profiles, such as LinkedIn, are optimized to showcase relevant skills and achievements."
                      checked={formData.networkingAndProfessionalPresence === "Online profiles, such as LinkedIn, are optimized to showcase relevant skills and achievements."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Online profiles, such as LinkedIn, are optimized to showcase relevant skills and achievements.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="networkingAndProfessionalPresence"
                      value="Participation in professional events and forums demonstrates engagement with the industry."
                      checked={formData.networkingAndProfessionalPresence === "Participation in professional events and forums demonstrates engagement with the industry."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Participation in professional events and forums demonstrates engagement with the industry.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="networkingAndProfessionalPresence"
                      value="Effective networking strategies are employed to create meaningful connections."
                      checked={formData.networkingAndProfessionalPresence === "Effective networking strategies are employed to create meaningful connections."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Effective networking strategies are employed to create meaningful connections.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="networkingAndProfessionalPresence"
                      value="Communication in professional settings reflects confidence and clarity."
                      checked={formData.networkingAndProfessionalPresence === "Communication in professional settings reflects confidence and clarity."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Communication in professional settings reflects confidence and clarity.</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                Previous Step
              </Button>
              <Button type="button" onClick={nextStep}>
                Next Step
              </Button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Job Market and Interview Readiness</h2>
            
            <div className="space-y-8">
              {/* Job Market Knowledge */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Job Market Knowledge</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="jobMarketKnowledge"
                      value="Current job market trends and in-demand skills in the industry are well-researched and understood."
                      checked={formData.jobMarketKnowledge === "Current job market trends and in-demand skills in the industry are well-researched and understood."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">Current job market trends and in-demand skills in the industry are well-researched and understood.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="jobMarketKnowledge"
                      value="Knowledge of key employers and their expectations supports targeted job applications."
                      checked={formData.jobMarketKnowledge === "Knowledge of key employers and their expectations supports targeted job applications."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Knowledge of key employers and their expectations supports targeted job applications.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="jobMarketKnowledge"
                      value="Awareness of salary ranges, benefits, and negotiation strategies is comprehensive."
                      checked={formData.jobMarketKnowledge === "Awareness of salary ranges, benefits, and negotiation strategies is comprehensive."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Awareness of salary ranges, benefits, and negotiation strategies is comprehensive.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="jobMarketKnowledge"
                      value="The competitive landscape for the ideal role is analyzed to develop a standout application strategy."
                      checked={formData.jobMarketKnowledge === "The competitive landscape for the ideal role is analyzed to develop a standout application strategy."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">The competitive landscape for the ideal role is analyzed to develop a standout application strategy.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="jobMarketKnowledge"
                      value="Economic and technological changes influencing the industry are accounted for in career planning."
                      checked={formData.jobMarketKnowledge === "Economic and technological changes influencing the industry are accounted for in career planning."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Economic and technological changes influencing the industry are accounted for in career planning.</span>
                  </label>
                </div>
              </div>

              {/* Application and Interview Readiness */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Application and Interview Readiness</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="applicationAndInterviewReadiness"
                      value="Resumes and cover letters are tailored to highlight relevant experiences and achievements."
                      checked={formData.applicationAndInterviewReadiness === "Resumes and cover letters are tailored to highlight relevant experiences and achievements."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">Resumes and cover letters are tailored to highlight relevant experiences and achievements.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="applicationAndInterviewReadiness"
                      value="Application materials are error-free, professional, and aligned with job requirements."
                      checked={formData.applicationAndInterviewReadiness === "Application materials are error-free, professional, and aligned with job requirements."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Application materials are error-free, professional, and aligned with job requirements.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="applicationAndInterviewReadiness"
                      value="Interview preparation includes understanding the role, company, and potential questions."
                      checked={formData.applicationAndInterviewReadiness === "Interview preparation includes understanding the role, company, and potential questions."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Interview preparation includes understanding the role, company, and potential questions.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="applicationAndInterviewReadiness"
                      value="Responses during interviews effectively convey competencies, enthusiasm, and cultural fit."
                      checked={formData.applicationAndInterviewReadiness === "Responses during interviews effectively convey competencies, enthusiasm, and cultural fit."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Responses during interviews effectively convey competencies, enthusiasm, and cultural fit.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="applicationAndInterviewReadiness"
                      value="Confidence and composure are maintained during high-pressure interview situations."
                      checked={formData.applicationAndInterviewReadiness === "Confidence and composure are maintained during high-pressure interview situations."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Confidence and composure are maintained during high-pressure interview situations.</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                Previous Step
              </Button>
              <Button type="button" onClick={nextStep}>
                Next Step
              </Button>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Emotional Intelligence and Growth</h2>
            
            <div className="space-y-8">
              {/* Emotional and Social Intelligence */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Emotional and Social Intelligence</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalAndSocialIntelligence"
                      value="Relationships with colleagues and supervisors are managed with empathy and understanding."
                      checked={formData.emotionalAndSocialIntelligence === "Relationships with colleagues and supervisors are managed with empathy and understanding."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">Relationships with colleagues and supervisors are managed with empathy and understanding.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalAndSocialIntelligence"
                      value="Feedback is received constructively and used to improve performance and relationships."
                      checked={formData.emotionalAndSocialIntelligence === "Feedback is received constructively and used to improve performance and relationships."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Feedback is received constructively and used to improve performance and relationships.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalAndSocialIntelligence"
                      value="Adaptability is demonstrated in response to changing roles, challenges, and team dynamics."
                      checked={formData.emotionalAndSocialIntelligence === "Adaptability is demonstrated in response to changing roles, challenges, and team dynamics."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Adaptability is demonstrated in response to changing roles, challenges, and team dynamics.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalAndSocialIntelligence"
                      value="Emotional resilience and stress management techniques support professional success."
                      checked={formData.emotionalAndSocialIntelligence === "Emotional resilience and stress management techniques support professional success."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Emotional resilience and stress management techniques support professional success.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalAndSocialIntelligence"
                      value="The ability to navigate workplace conflicts promotes a harmonious and productive environment."
                      checked={formData.emotionalAndSocialIntelligence === "The ability to navigate workplace conflicts promotes a harmonious and productive environment."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">The ability to navigate workplace conflicts promotes a harmonious and productive environment.</span>
                  </label>
                </div>
              </div>

              {/* Continuous Growth and Self Reflection */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Continuous Growth and Self Reflection</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="continuousGrowthAndSelfReflection"
                      value="A proactive approach is taken to identify and pursue learning opportunities."
                      checked={formData.continuousGrowthAndSelfReflection === "A proactive approach is taken to identify and pursue learning opportunities."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">A proactive approach is taken to identify and pursue learning opportunities.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="continuousGrowthAndSelfReflection"
                      value="Strengths and areas for improvement are regularly assessed to guide personal growth."
                      checked={formData.continuousGrowthAndSelfReflection === "Strengths and areas for improvement are regularly assessed to guide personal growth."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Strengths and areas for improvement are regularly assessed to guide personal growth.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="continuousGrowthAndSelfReflection"
                      value="Long-term goals are set and adjusted based on self-reflection and professional aspirations."
                      checked={formData.continuousGrowthAndSelfReflection === "Long-term goals are set and adjusted based on self-reflection and professional aspirations."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Long-term goals are set and adjusted based on self-reflection and professional aspirations.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="continuousGrowthAndSelfReflection"
                      value="A growth mindset drives the pursuit of knowledge and adaptability in evolving roles."
                      checked={formData.continuousGrowthAndSelfReflection === "A growth mindset drives the pursuit of knowledge and adaptability in evolving roles."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">A growth mindset drives the pursuit of knowledge and adaptability in evolving roles.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="continuousGrowthAndSelfReflection"
                      value="Motivation to excel in the ideal job is fueled by intrinsic and extrinsic factors."
                      checked={formData.continuousGrowthAndSelfReflection === "Motivation to excel in the ideal job is fueled by intrinsic and extrinsic factors."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Motivation to excel in the ideal job is fueled by intrinsic and extrinsic factors.</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                Previous Step
              </Button>
              <Button type="submit" onClick={handleSubmit}>
                Submit Assessment
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Calculate progress percentage
  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {/* Header and Description */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Ideal Job Readiness Level (IJRL) Assessment</h1>
            <p className="mt-2 text-gray-600">
              The Ideal Job Readiness Level (IJRL) evaluates a job seeker's preparedness to secure and succeed in their desired role. 
              It helps identify areas for improvement to align your skills with your dream job requirements.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">Personal Info</div>
              <div className="text-xs text-gray-500">Professional Alignment</div>
              <div className="text-xs text-gray-500">Skills & Networking</div>
              <div className="text-xs text-gray-500">Job Market</div>
              <div className="text-xs text-gray-500">Growth & Reflection</div>
            </div>
            <div className="relative">
              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                <div
                  style={{ width: `${progress}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-600 transition-all duration-300"
                ></div>
              </div>
              <div className="flex justify-between -mt-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`w-5 h-5 rounded-full ${
                      currentStep >= step ? 'bg-primary-600' : 'bg-gray-200'
                    } flex items-center justify-center text-xs text-white font-bold`}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {renderStep()}
        </div>
      </div>
    </form>
  );
}