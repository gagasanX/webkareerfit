'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface IRLFormProps {
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
  coreSkillsAndKnowledge: string;
  emotionalIntelligence: string;
  socialIntelligence: string;
  competencyAndKnowHow: string;
  strategicThinkingAndGoalSetting: string;
  professionalPresentationAndPreparedness: string;
  continuousLearningAndGrowthMindset: string;
}

export default function IRLForm({ onSubmit, initialData }: IRLFormProps) {
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
    coreSkillsAndKnowledge: '',
    emotionalIntelligence: '',
    socialIntelligence: '',
    competencyAndKnowHow: '',
    strategicThinkingAndGoalSetting: '',
    professionalPresentationAndPreparedness: '',
    continuousLearningAndGrowthMindset: '',
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
                Describe your personality
              </label>
              <textarea
                name="personalInfo.personality"
                id="personalInfo.personality"
                rows={4}
                value={formData.personalInfo.personality}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Tell us about your personality traits, work style, and how you interact with others..."
              />
            </div>
            <div>
              <label htmlFor="personalInfo.jobPosition" className="block text-sm font-medium text-gray-700">
                Job and position applying for? (e.g.: Junior Web Designer, Entry Level)
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
                Highest qualification
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
            <h2 className="text-xl font-semibold text-gray-900">Core Skills and Knowledge</h2>
            
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Core Skills and Knowledge</h3>
              <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
              <div className="space-y-3">
                <label className="block">
                  <input
                    type="radio"
                    name="coreSkillsAndKnowledge"
                    value="I have a clear understanding of the technical requirements and job-specific knowledge for the role."
                    checked={formData.coreSkillsAndKnowledge === "I have a clear understanding of the technical requirements and job-specific knowledge for the role."}
                    onChange={handleInputChange}
                    className="mr-2"
                    required
                  />
                  <span className="text-gray-700">I have a clear understanding of the technical requirements and job-specific knowledge for the role.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="coreSkillsAndKnowledge"
                    value="My problem-solving abilities enable me to address challenges logically and effectively."
                    checked={formData.coreSkillsAndKnowledge === "My problem-solving abilities enable me to address challenges logically and effectively."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">My problem-solving abilities enable me to address challenges logically and effectively.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="coreSkillsAndKnowledge"
                    value="I have a strong foundation in industry-related tools, technologies, or methodologies."
                    checked={formData.coreSkillsAndKnowledge === "I have a strong foundation in industry-related tools, technologies, or methodologies."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">I have a strong foundation in industry-related tools, technologies, or methodologies.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="coreSkillsAndKnowledge"
                    value="I can apply critical thinking to analyze complex situations and develop appropriate solutions."
                    checked={formData.coreSkillsAndKnowledge === "I can apply critical thinking to analyze complex situations and develop appropriate solutions."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">I can apply critical thinking to analyze complex situations and develop appropriate solutions.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="coreSkillsAndKnowledge"
                    value="I consistently seek opportunities to update my skills and stay relevant in my field."
                    checked={formData.coreSkillsAndKnowledge === "I consistently seek opportunities to update my skills and stay relevant in my field."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">I consistently seek opportunities to update my skills and stay relevant in my field.</span>
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
            <h2 className="text-xl font-semibold text-gray-900">Emotional and Social Intelligence</h2>
            
            <div className="space-y-8">
              {/* Emotional Intelligence */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Emotional Intelligence</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalIntelligence"
                      value="I understand my strengths and weaknesses and how they impact my professional interactions."
                      checked={formData.emotionalIntelligence === "I understand my strengths and weaknesses and how they impact my professional interactions."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I understand my strengths and weaknesses and how they impact my professional interactions.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalIntelligence"
                      value="I can regulate my emotions under pressure to maintain focus and professionalism."
                      checked={formData.emotionalIntelligence === "I can regulate my emotions under pressure to maintain focus and professionalism."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I can regulate my emotions under pressure to maintain focus and professionalism.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalIntelligence"
                      value="I empathize with others' perspectives and build positive relationships in the workplace."
                      checked={formData.emotionalIntelligence === "I empathize with others' perspectives and build positive relationships in the workplace."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I empathize with others' perspectives and build positive relationships in the workplace.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalIntelligence"
                      value="I handle constructive criticism with an open mind and use it for personal growth."
                      checked={formData.emotionalIntelligence === "I handle constructive criticism with an open mind and use it for personal growth."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I handle constructive criticism with an open mind and use it for personal growth.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalIntelligence"
                      value="I demonstrate resilience and adaptability when faced with unexpected challenges or changes."
                      checked={formData.emotionalIntelligence === "I demonstrate resilience and adaptability when faced with unexpected challenges or changes."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I demonstrate resilience and adaptability when faced with unexpected challenges or changes.</span>
                  </label>
                </div>
              </div>

              {/* Social Intelligence */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Social Intelligence</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="socialIntelligence"
                      value="I can work collaboratively with diverse teams to achieve common goals."
                      checked={formData.socialIntelligence === "I can work collaboratively with diverse teams to achieve common goals."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I can work collaboratively with diverse teams to achieve common goals.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="socialIntelligence"
                      value="I effectively navigate workplace dynamics and manage conflicts constructively."
                      checked={formData.socialIntelligence === "I effectively navigate workplace dynamics and manage conflicts constructively."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I effectively navigate workplace dynamics and manage conflicts constructively.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="socialIntelligence"
                      value="I am aware of cultural sensitivities and respect differences in professional environments."
                      checked={formData.socialIntelligence === "I am aware of cultural sensitivities and respect differences in professional environments."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am aware of cultural sensitivities and respect differences in professional environments.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="socialIntelligence"
                      value="I communicate ideas clearly and persuasively, both verbally and in writing."
                      checked={formData.socialIntelligence === "I communicate ideas clearly and persuasively, both verbally and in writing."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I communicate ideas clearly and persuasively, both verbally and in writing.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="socialIntelligence"
                      value="I build and maintain professional networks that support my career development."
                      checked={formData.socialIntelligence === "I build and maintain professional networks that support my career development."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I build and maintain professional networks that support my career development.</span>
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
            <h2 className="text-xl font-semibold text-gray-900">Competency and Strategic Thinking</h2>
            
            <div className="space-y-8">
              {/* Competency and Know-How */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Competency and Know-How</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="competencyAndKnowHow"
                      value="I can independently manage tasks and responsibilities to meet job expectations."
                      checked={formData.competencyAndKnowHow === "I can independently manage tasks and responsibilities to meet job expectations."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I can independently manage tasks and responsibilities to meet job expectations.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="competencyAndKnowHow"
                      value="I demonstrate precision and attention to detail in my work outputs."
                      checked={formData.competencyAndKnowHow === "I demonstrate precision and attention to detail in my work outputs."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I demonstrate precision and attention to detail in my work outputs.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="competencyAndKnowHow"
                      value="I can integrate theoretical knowledge into practical scenarios effectively."
                      checked={formData.competencyAndKnowHow === "I can integrate theoretical knowledge into practical scenarios effectively."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I can integrate theoretical knowledge into practical scenarios effectively.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="competencyAndKnowHow"
                      value="I am skilled at optimizing processes to improve efficiency and outcomes."
                      checked={formData.competencyAndKnowHow === "I am skilled at optimizing processes to improve efficiency and outcomes."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am skilled at optimizing processes to improve efficiency and outcomes.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="competencyAndKnowHow"
                      value="I continuously evaluate my performance to identify and implement improvements."
                      checked={formData.competencyAndKnowHow === "I continuously evaluate my performance to identify and implement improvements."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I continuously evaluate my performance to identify and implement improvements.</span>
                  </label>
                </div>
              </div>

              {/* Strategic Thinking and Goal Setting */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Strategic Thinking and Goal Setting</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="strategicThinkingAndGoalSetting"
                      value="I can set realistic goals and create actionable plans to achieve them."
                      checked={formData.strategicThinkingAndGoalSetting === "I can set realistic goals and create actionable plans to achieve them."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I can set realistic goals and create actionable plans to achieve them.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="strategicThinkingAndGoalSetting"
                      value="I prioritize tasks effectively to meet deadlines without compromising quality."
                      checked={formData.strategicThinkingAndGoalSetting === "I prioritize tasks effectively to meet deadlines without compromising quality."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I prioritize tasks effectively to meet deadlines without compromising quality.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="strategicThinkingAndGoalSetting"
                      value="I consider the broader implications of my actions in achieving organizational goals."
                      checked={formData.strategicThinkingAndGoalSetting === "I consider the broader implications of my actions in achieving organizational goals."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I consider the broader implications of my actions in achieving organizational goals.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="strategicThinkingAndGoalSetting"
                      value="I adapt my strategies when unforeseen obstacles or opportunities arise."
                      checked={formData.strategicThinkingAndGoalSetting === "I adapt my strategies when unforeseen obstacles or opportunities arise."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I adapt my strategies when unforeseen obstacles or opportunities arise.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="strategicThinkingAndGoalSetting"
                      value="I align my career aspirations with the organization's vision and mission."
                      checked={formData.strategicThinkingAndGoalSetting === "I align my career aspirations with the organization's vision and mission."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I align my career aspirations with the organization's vision and mission.</span>
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
            <h2 className="text-xl font-semibold text-gray-900">Professional Development</h2>
            
            <div className="space-y-8">
              {/* Professional Presentation and Preparedness */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Presentation and Preparedness</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="professionalPresentationAndPreparedness"
                      value="My resume and portfolio effectively showcase my skills, achievements, and experiences."
                      checked={formData.professionalPresentationAndPreparedness === "My resume and portfolio effectively showcase my skills, achievements, and experiences."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">My resume and portfolio effectively showcase my skills, achievements, and experiences.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="professionalPresentationAndPreparedness"
                      value="I articulate my qualifications and career aspirations confidently during interviews."
                      checked={formData.professionalPresentationAndPreparedness === "I articulate my qualifications and career aspirations confidently during interviews."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I articulate my qualifications and career aspirations confidently during interviews.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="professionalPresentationAndPreparedness"
                      value="I demonstrate professional etiquette in all communication, whether written or verbal."
                      checked={formData.professionalPresentationAndPreparedness === "I demonstrate professional etiquette in all communication, whether written or verbal."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I demonstrate professional etiquette in all communication, whether written or verbal.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="professionalPresentationAndPreparedness"
                      value="I prepare thoroughly for interviews, including researching the company and role."
                      checked={formData.professionalPresentationAndPreparedness === "I prepare thoroughly for interviews, including researching the company and role."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I prepare thoroughly for interviews, including researching the company and role.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="professionalPresentationAndPreparedness"
                      value="My appearance and demeanor consistently reflect a professional standard."
                      checked={formData.professionalPresentationAndPreparedness === "My appearance and demeanor consistently reflect a professional standard."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">My appearance and demeanor consistently reflect a professional standard.</span>
                  </label>
                </div>
              </div>

              {/* Continuous Learning and Growth Mindset */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Continuous Learning and Growth Mindset</h3>
                <p className="text-sm text-gray-500 mb-4">Choose 1 statement that resonates with you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="continuousLearningAndGrowthMindset"
                      value="I actively seek learning opportunities to enhance my skills and knowledge."
                      checked={formData.continuousLearningAndGrowthMindset === "I actively seek learning opportunities to enhance my skills and knowledge."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I actively seek learning opportunities to enhance my skills and knowledge.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="continuousLearningAndGrowthMindset"
                      value="I am open to feedback and view it as a tool for continuous improvement."
                      checked={formData.continuousLearningAndGrowthMindset === "I am open to feedback and view it as a tool for continuous improvement."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am open to feedback and view it as a tool for continuous improvement.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="continuousLearningAndGrowthMindset"
                      value="I explore new technologies, trends, and methods relevant to my desired field."
                      checked={formData.continuousLearningAndGrowthMindset === "I explore new technologies, trends, and methods relevant to my desired field."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I explore new technologies, trends, and methods relevant to my desired field.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="continuousLearningAndGrowthMindset"
                      value="I take initiative in pursuing certifications, training, or projects to expand my expertise."
                      checked={formData.continuousLearningAndGrowthMindset === "I take initiative in pursuing certifications, training, or projects to expand my expertise."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I take initiative in pursuing certifications, training, or projects to expand my expertise.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="continuousLearningAndGrowthMindset"
                      value="I embrace challenges as opportunities to develop and grow professionally."
                      checked={formData.continuousLearningAndGrowthMindset === "I embrace challenges as opportunities to develop and grow professionally."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I embrace challenges as opportunities to develop and grow professionally.</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                Previous Step
              </Button>
              <Button type="submit" className="bg-primary-600 hover:bg-primary-700">
                Submit
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Internship Readiness Level (IRL) Assessment</h1>
        <p className="text-gray-600">
          The Internship Readiness Level (IRL) assesses an individual's preparedness for entering the professional world through internships, focusing on their skills, adaptability, work ethic, and alignment with career goals.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{currentStep} of 5</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-primary-600 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          ></div>
        </div>
      </div>

      {renderStep()}
    </form>
  );
}