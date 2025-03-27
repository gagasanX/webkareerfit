'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface CTRLFormProps {
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
  clarityAndCareerGoals: string;
  transferableSkillsAndExperience: string;
  adaptabilityAndLearningAgility: string;
  marketAndIndustryUnderstanding: string;
  networkingAndRelationshipBuilding: string;
  emotionalAndMentalPreparedness: string;
  applicationAndInterviewPreparedness: string;
}

export default function CTRLForm({ onSubmit, initialData }: CTRLFormProps) {
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
            <h2 className="text-xl font-semibold text-gray-900">Career Goals and Skills</h2>
            
            <div className="space-y-8">
              {/* Clarity and Career Goals */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Clarity and Career Goals</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="clarityAndCareerGoals"
                      value="I have a clear vision of the type of job and sector I want to transition into."
                      checked={formData.clarityAndCareerGoals === "I have a clear vision of the type of job and sector I want to transition into."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I have a clear vision of the type of job and sector I want to transition into.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="clarityAndCareerGoals"
                      value="I understand how my personal values and career aspirations align with my desired new role."
                      checked={formData.clarityAndCareerGoals === "I understand how my personal values and career aspirations align with my desired new role."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I understand how my personal values and career aspirations align with my desired new role.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="clarityAndCareerGoals"
                      value="I have identified the key factors (e.g., salary, work-life balance, job satisfaction) influencing my career transition decision."
                      checked={formData.clarityAndCareerGoals === "I have identified the key factors (e.g., salary, work-life balance, job satisfaction) influencing my career transition decision."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have identified the key factors (e.g., salary, work-life balance, job satisfaction) influencing my career transition decision.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="clarityAndCareerGoals"
                      value="I have a concrete plan for how this transition aligns with my long-term professional growth."
                      checked={formData.clarityAndCareerGoals === "I have a concrete plan for how this transition aligns with my long-term professional growth."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have a concrete plan for how this transition aligns with my long-term professional growth.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="clarityAndCareerGoals"
                      value="I can articulate the reasons why I am making this transition and how it benefits my career trajectory."
                      checked={formData.clarityAndCareerGoals === "I can articulate the reasons why I am making this transition and how it benefits my career trajectory."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I can articulate the reasons why I am making this transition and how it benefits my career trajectory.</span>
                  </label>
                </div>
              </div>

              {/* Transferable Skills and Experience */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Transferable Skills and Experience</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="transferableSkillsAndExperience"
                      value="I can identify the transferable skills from my current role that are relevant to my desired new position."
                      checked={formData.transferableSkillsAndExperience === "I can identify the transferable skills from my current role that are relevant to my desired new position."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I can identify the transferable skills from my current role that are relevant to my desired new position.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="transferableSkillsAndExperience"
                      value="I have evidence or examples of how I have successfully applied my skills in varied contexts."
                      checked={formData.transferableSkillsAndExperience === "I have evidence or examples of how I have successfully applied my skills in varied contexts."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have evidence or examples of how I have successfully applied my skills in varied contexts.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="transferableSkillsAndExperience"
                      value="I can effectively communicate how my past achievements add value to the new role or sector."
                      checked={formData.transferableSkillsAndExperience === "I can effectively communicate how my past achievements add value to the new role or sector."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I can effectively communicate how my past achievements add value to the new role or sector.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="transferableSkillsAndExperience"
                      value="I understand the gaps between my current expertise and the requirements of my desired position."
                      checked={formData.transferableSkillsAndExperience === "I understand the gaps between my current expertise and the requirements of my desired position."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I understand the gaps between my current expertise and the requirements of my desired position.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="transferableSkillsAndExperience"
                      value="I am actively working on acquiring or enhancing skills to meet the expectations of the new role."
                      checked={formData.transferableSkillsAndExperience === "I am actively working on acquiring or enhancing skills to meet the expectations of the new role."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am actively working on acquiring or enhancing skills to meet the expectations of the new role.</span>
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
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Adaptability and Industry Knowledge</h2>
            
            <div className="space-y-8">
              {/* Adaptability and Learning Agility */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Adaptability and Learning Agility</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="adaptabilityAndLearningAgility"
                      value="I am open to learning new tools, technologies, and methods required for the new role or sector."
                      checked={formData.adaptabilityAndLearningAgility === "I am open to learning new tools, technologies, and methods required for the new role or sector."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I am open to learning new tools, technologies, and methods required for the new role or sector.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="adaptabilityAndLearningAgility"
                      value="I have demonstrated resilience and flexibility when faced with career challenges or changes in the past."
                      checked={formData.adaptabilityAndLearningAgility === "I have demonstrated resilience and flexibility when faced with career challenges or changes in the past."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have demonstrated resilience and flexibility when faced with career challenges or changes in the past.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="adaptabilityAndLearningAgility"
                      value="I view this career transition as an opportunity for personal and professional growth."
                      checked={formData.adaptabilityAndLearningAgility === "I view this career transition as an opportunity for personal and professional growth."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I view this career transition as an opportunity for personal and professional growth.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="adaptabilityAndLearningAgility"
                      value="I am comfortable stepping out of my comfort zone to adapt to new work environments."
                      checked={formData.adaptabilityAndLearningAgility === "I am comfortable stepping out of my comfort zone to adapt to new work environments."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am comfortable stepping out of my comfort zone to adapt to new work environments.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="adaptabilityAndLearningAgility"
                      value="I seek feedback and use it constructively to enhance my performance in new situations."
                      checked={formData.adaptabilityAndLearningAgility === "I seek feedback and use it constructively to enhance my performance in new situations."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I seek feedback and use it constructively to enhance my performance in new situations.</span>
                  </label>
                </div>
              </div>

              {/* Market and Industry Understanding */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Market and Industry Understanding</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="marketAndIndustryUnderstanding"
                      value="I have researched the industry or sector I want to transition into, including its trends and demands."
                      checked={formData.marketAndIndustryUnderstanding === "I have researched the industry or sector I want to transition into, including its trends and demands."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I have researched the industry or sector I want to transition into, including its trends and demands.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="marketAndIndustryUnderstanding"
                      value="I am aware of the challenges and opportunities unique to the new sector."
                      checked={formData.marketAndIndustryUnderstanding === "I am aware of the challenges and opportunities unique to the new sector."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am aware of the challenges and opportunities unique to the new sector.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="marketAndIndustryUnderstanding"
                      value="I understand the cultural and operational differences between my current role and the desired sector."
                      checked={formData.marketAndIndustryUnderstanding === "I understand the cultural and operational differences between my current role and the desired sector."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I understand the cultural and operational differences between my current role and the desired sector.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="marketAndIndustryUnderstanding"
                      value="I have identified potential employers or opportunities that align with my career transition goals."
                      checked={formData.marketAndIndustryUnderstanding === "I have identified potential employers or opportunities that align with my career transition goals."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have identified potential employers or opportunities that align with my career transition goals.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="marketAndIndustryUnderstanding"
                      value="I have a clear understanding of the qualifications and competencies valued in the target industry."
                      checked={formData.marketAndIndustryUnderstanding === "I have a clear understanding of the qualifications and competencies valued in the target industry."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have a clear understanding of the qualifications and competencies valued in the target industry.</span>
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
            <h2 className="text-xl font-semibold text-gray-900">Networking and Emotional Readiness</h2>
            
            <div className="space-y-8">
              {/* Networking and Relationship Building */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Networking and Relationship Building</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="networkingAndRelationshipBuilding"
                      value="I have reached out to professionals in the industry I want to transition into for advice and insights."
                      checked={formData.networkingAndRelationshipBuilding === "I have reached out to professionals in the industry I want to transition into for advice and insights."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I have reached out to professionals in the industry I want to transition into for advice and insights.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="networkingAndRelationshipBuilding"
                      value="I am actively building connections that can help facilitate my career transition."
                      checked={formData.networkingAndRelationshipBuilding === "I am actively building connections that can help facilitate my career transition."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am actively building connections that can help facilitate my career transition.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="networkingAndRelationshipBuilding"
                      value="I participate in industry events, workshops, or online forums relevant to my new career goals."
                      checked={formData.networkingAndRelationshipBuilding === "I participate in industry events, workshops, or online forums relevant to my new career goals."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I participate in industry events, workshops, or online forums relevant to my new career goals.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="networkingAndRelationshipBuilding"
                      value="I have a mentor or guide who is familiar with the sector I am targeting for transition."
                      checked={formData.networkingAndRelationshipBuilding === "I have a mentor or guide who is familiar with the sector I am targeting for transition."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have a mentor or guide who is familiar with the sector I am targeting for transition.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="networkingAndRelationshipBuilding"
                      value="I can articulate my career story and transition goals effectively to new professional contacts."
                      checked={formData.networkingAndRelationshipBuilding === "I can articulate my career story and transition goals effectively to new professional contacts."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I can articulate my career story and transition goals effectively to new professional contacts.</span>
                  </label>
                </div>
              </div>

              {/* Emotional and Mental Preparedness */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Emotional and Mental Preparedness</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalAndMentalPreparedness"
                      value="I am prepared to face potential setbacks or rejections during my career transition journey."
                      checked={formData.emotionalAndMentalPreparedness === "I am prepared to face potential setbacks or rejections during my career transition journey."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I am prepared to face potential setbacks or rejections during my career transition journey.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalAndMentalPreparedness"
                      value="I manage stress and uncertainty effectively while navigating career changes."
                      checked={formData.emotionalAndMentalPreparedness === "I manage stress and uncertainty effectively while navigating career changes."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I manage stress and uncertainty effectively while navigating career changes.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalAndMentalPreparedness"
                      value="I am confident in my ability to make a positive impression in a new industry or role."
                      checked={formData.emotionalAndMentalPreparedness === "I am confident in my ability to make a positive impression in a new industry or role."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am confident in my ability to make a positive impression in a new industry or role.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalAndMentalPreparedness"
                      value="I have strategies to overcome self-doubt and maintain motivation during this process."
                      checked={formData.emotionalAndMentalPreparedness === "I have strategies to overcome self-doubt and maintain motivation during this process."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have strategies to overcome self-doubt and maintain motivation during this process.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalAndMentalPreparedness"
                      value="I am prepared to invest the necessary time and effort to succeed in my career transition."
                      checked={formData.emotionalAndMentalPreparedness === "I am prepared to invest the necessary time and effort to succeed in my career transition."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am prepared to invest the necessary time and effort to succeed in my career transition.</span>
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
            <h2 className="text-xl font-semibold text-gray-900">Application and Interview Preparedness</h2>
            
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Application and Interview Preparedness</h3>
              <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
              <div className="space-y-3">
                <label className="block">
                  <input
                    type="radio"
                    name="applicationAndInterviewPreparedness"
                    value="My resume and cover letter are tailored to highlight my suitability for the new role or sector."
                    checked={formData.applicationAndInterviewPreparedness === "My resume and cover letter are tailored to highlight my suitability for the new role or sector."}
                    onChange={handleInputChange}
                    className="mr-2"
                    required
                  />
                  <span className="text-gray-700">My resume and cover letter are tailored to highlight my suitability for the new role or sector.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="applicationAndInterviewPreparedness"
                    value="I can clearly explain my reasons for transitioning and how my background aligns with the target job."
                    checked={formData.applicationAndInterviewPreparedness === "I can clearly explain my reasons for transitioning and how my background aligns with the target job."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">I can clearly explain my reasons for transitioning and how my background aligns with the target job.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="applicationAndInterviewPreparedness"
                    value="I have practiced responding to questions about my career change in a confident and positive manner."
                    checked={formData.applicationAndInterviewPreparedness === "I have practiced responding to questions about my career change in a confident and positive manner."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">I have practiced responding to questions about my career change in a confident and positive manner.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="applicationAndInterviewPreparedness"
                    value="I am familiar with the recruitment processes and expectations in the new sector."
                    checked={formData.applicationAndInterviewPreparedness === "I am familiar with the recruitment processes and expectations in the new sector."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">I am familiar with the recruitment processes and expectations in the new sector.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="applicationAndInterviewPreparedness"
                    value="I have prepared examples of how my skills and experiences demonstrate my readiness for the new role."
                    checked={formData.applicationAndInterviewPreparedness === "I have prepared examples of how my skills and experiences demonstrate my readiness for the new role."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">I have prepared examples of how my skills and experiences demonstrate my readiness for the new role.</span>
                </label>
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">Personal Info</div>
              <div className="text-xs text-gray-500">Career Goals</div>
              <div className="text-xs text-gray-500">Adaptability</div>
              <div className="text-xs text-gray-500">Networking</div>
              <div className="text-xs text-gray-500">Interview</div>
            </div>
            <div className="relative">
              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                <div
                  style={{ width: `${(currentStep / 5) * 100}%` }}
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