'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface RRLFormProps {
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
  financialPreparedness: string;
  emotionalMentalPreparedness: string;
  physicalHealthPreparedness: string;
  purposeLifestylePlanning: string;
  socialCommunityEngagement: string;
  gigWorkSupplementalIncome: string;
  spiritualReflectiveReadiness: string;
}

export default function RRLForm({ onSubmit, initialData }: RRLFormProps) {
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
    financialPreparedness: '',
    emotionalMentalPreparedness: '',
    physicalHealthPreparedness: '',
    purposeLifestylePlanning: '',
    socialCommunityEngagement: '',
    gigWorkSupplementalIncome: '',
    spiritualReflectiveReadiness: '',
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
            <h2 className="text-xl font-semibold text-gray-900">Financial Preparedness</h2>
            
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Preparedness</h3>
              <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
              <div className="space-y-3">
                <label className="block">
                  <input
                    type="radio"
                    name="financialPreparedness"
                    value="I have a clear understanding of my current financial situation and future income sources, including pensions, savings, and investments."
                    checked={formData.financialPreparedness === "I have a clear understanding of my current financial situation and future income sources, including pensions, savings, and investments."}
                    onChange={handleInputChange}
                    className="mr-2"
                    required
                  />
                  <span className="text-gray-700">I have a clear understanding of my current financial situation and future income sources, including pensions, savings, and investments.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="financialPreparedness"
                    value="I have calculated my estimated monthly expenses for retirement and created a budget to sustain my lifestyle."
                    checked={formData.financialPreparedness === "I have calculated my estimated monthly expenses for retirement and created a budget to sustain my lifestyle."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">I have calculated my estimated monthly expenses for retirement and created a budget to sustain my lifestyle.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="financialPreparedness"
                    value="I am aware of potential healthcare and long-term care costs and have prepared financially to manage them."
                    checked={formData.financialPreparedness === "I am aware of potential healthcare and long-term care costs and have prepared financially to manage them."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">I am aware of potential healthcare and long-term care costs and have prepared financially to manage them.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="financialPreparedness"
                    value="I have diversified my savings and investments to minimize risks and ensure consistent income during retirement."
                    checked={formData.financialPreparedness === "I have diversified my savings and investments to minimize risks and ensure consistent income during retirement."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">I have diversified my savings and investments to minimize risks and ensure consistent income during retirement.</span>
                </label>
                <label className="block">
                  <input
                    type="radio"
                    name="financialPreparedness"
                    value="I feel confident that my financial resources will support me throughout my retirement years without compromising my standard of living."
                    checked={formData.financialPreparedness === "I feel confident that my financial resources will support me throughout my retirement years without compromising my standard of living."}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">I feel confident that my financial resources will support me throughout my retirement years without compromising my standard of living.</span>
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
            <h2 className="text-xl font-semibold text-gray-900">Mental and Physical Readiness</h2>
            
            <div className="space-y-8">
              {/* Emotional and Mental Preparedness */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Emotional and Mental Preparedness</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalMentalPreparedness"
                      value="I have a positive outlook on retirement and see it as an opportunity to explore new interests and activities."
                      checked={formData.emotionalMentalPreparedness === "I have a positive outlook on retirement and see it as an opportunity to explore new interests and activities."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I have a positive outlook on retirement and see it as an opportunity to explore new interests and activities.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalMentalPreparedness"
                      value="I feel emotionally prepared to let go of my professional identity and embrace a new phase of life."
                      checked={formData.emotionalMentalPreparedness === "I feel emotionally prepared to let go of my professional identity and embrace a new phase of life."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I feel emotionally prepared to let go of my professional identity and embrace a new phase of life.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalMentalPreparedness"
                      value="I have strategies to manage potential feelings of isolation, boredom, or loss of purpose during retirement."
                      checked={formData.emotionalMentalPreparedness === "I have strategies to manage potential feelings of isolation, boredom, or loss of purpose during retirement."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have strategies to manage potential feelings of isolation, boredom, or loss of purpose during retirement.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalMentalPreparedness"
                      value="I am comfortable discussing my retirement plans with family and friends and receiving their input or support."
                      checked={formData.emotionalMentalPreparedness === "I am comfortable discussing my retirement plans with family and friends and receiving their input or support."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am comfortable discussing my retirement plans with family and friends and receiving their input or support.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="emotionalMentalPreparedness"
                      value="I have prepared for the emotional changes that may come with a reduced role in professional or social settings."
                      checked={formData.emotionalMentalPreparedness === "I have prepared for the emotional changes that may come with a reduced role in professional or social settings."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have prepared for the emotional changes that may come with a reduced role in professional or social settings.</span>
                  </label>
                </div>
              </div>

              {/* Physical and Health Preparedness */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Physical and Health Preparedness</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="physicalHealthPreparedness"
                      value="I have a plan to maintain my physical health through regular exercise, balanced nutrition, and preventive healthcare."
                      checked={formData.physicalHealthPreparedness === "I have a plan to maintain my physical health through regular exercise, balanced nutrition, and preventive healthcare."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I have a plan to maintain my physical health through regular exercise, balanced nutrition, and preventive healthcare.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="physicalHealthPreparedness"
                      value="I have consulted with healthcare professionals to ensure I understand and address my health needs for retirement."
                      checked={formData.physicalHealthPreparedness === "I have consulted with healthcare professionals to ensure I understand and address my health needs for retirement."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have consulted with healthcare professionals to ensure I understand and address my health needs for retirement.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="physicalHealthPreparedness"
                      value="I have adequate health insurance or savings to cover unforeseen medical expenses."
                      checked={formData.physicalHealthPreparedness === "I have adequate health insurance or savings to cover unforeseen medical expenses."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have adequate health insurance or savings to cover unforeseen medical expenses.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="physicalHealthPreparedness"
                      value="I feel physically capable of engaging in activities or hobbies that I look forward to pursuing in retirement."
                      checked={formData.physicalHealthPreparedness === "I feel physically capable of engaging in activities or hobbies that I look forward to pursuing in retirement."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I feel physically capable of engaging in activities or hobbies that I look forward to pursuing in retirement.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="physicalHealthPreparedness"
                      value="I regularly monitor and take proactive steps to maintain or improve my overall health."
                      checked={formData.physicalHealthPreparedness === "I regularly monitor and take proactive steps to maintain or improve my overall health."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I regularly monitor and take proactive steps to maintain or improve my overall health.</span>
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
            <h2 className="text-xl font-semibold text-gray-900">Purpose and Social Engagement</h2>
            
            <div className="space-y-8">
              {/* Purpose and Lifestyle Planning */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Purpose and Lifestyle Planning</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="purposeLifestylePlanning"
                      value="I have identified hobbies, activities, or causes that I want to explore or engage in during retirement."
                      checked={formData.purposeLifestylePlanning === "I have identified hobbies, activities, or causes that I want to explore or engage in during retirement."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I have identified hobbies, activities, or causes that I want to explore or engage in during retirement.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="purposeLifestylePlanning"
                      value="I feel confident that I can structure my daily routine to find purpose and joy in my retirement years."
                      checked={formData.purposeLifestylePlanning === "I feel confident that I can structure my daily routine to find purpose and joy in my retirement years."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I feel confident that I can structure my daily routine to find purpose and joy in my retirement years.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="purposeLifestylePlanning"
                      value="I have a clear plan for how I will stay socially connected and engaged after leaving the workforce."
                      checked={formData.purposeLifestylePlanning === "I have a clear plan for how I will stay socially connected and engaged after leaving the workforce."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have a clear plan for how I will stay socially connected and engaged after leaving the workforce.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="purposeLifestylePlanning"
                      value="I have considered how I will balance leisure, personal development, and family responsibilities in retirement."
                      checked={formData.purposeLifestylePlanning === "I have considered how I will balance leisure, personal development, and family responsibilities in retirement."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have considered how I will balance leisure, personal development, and family responsibilities in retirement.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="purposeLifestylePlanning"
                      value="I am excited about the opportunities retirement offers to pursue new goals and passions."
                      checked={formData.purposeLifestylePlanning === "I am excited about the opportunities retirement offers to pursue new goals and passions."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am excited about the opportunities retirement offers to pursue new goals and passions.</span>
                  </label>
                </div>
              </div>

              {/* Social and Community Engagement */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Social and Community Engagement</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="socialCommunityEngagement"
                      value="I have a strong support network of family and friends who I can rely on during retirement."
                      checked={formData.socialCommunityEngagement === "I have a strong support network of family and friends who I can rely on during retirement."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I have a strong support network of family and friends who I can rely on during retirement.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="socialCommunityEngagement"
                      value="I am comfortable reaching out to new people or joining groups to expand my social circle if needed."
                      checked={formData.socialCommunityEngagement === "I am comfortable reaching out to new people or joining groups to expand my social circle if needed."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am comfortable reaching out to new people or joining groups to expand my social circle if needed.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="socialCommunityEngagement"
                      value="I plan to volunteer, mentor, or participate in community programs to stay connected and active."
                      checked={formData.socialCommunityEngagement === "I plan to volunteer, mentor, or participate in community programs to stay connected and active."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I plan to volunteer, mentor, or participate in community programs to stay connected and active.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="socialCommunityEngagement"
                      value="I have identified ways to continue contributing to society or sharing my knowledge and skills during retirement."
                      checked={formData.socialCommunityEngagement === "I have identified ways to continue contributing to society or sharing my knowledge and skills during retirement."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have identified ways to continue contributing to society or sharing my knowledge and skills during retirement.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="socialCommunityEngagement"
                      value="I value and prioritize maintaining meaningful relationships in my retirement years."
                      checked={formData.socialCommunityEngagement === "I value and prioritize maintaining meaningful relationships in my retirement years."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I value and prioritize maintaining meaningful relationships in my retirement years.</span>
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
            <h2 className="text-xl font-semibold text-gray-900">Additional Income and Personal Growth</h2>
            
            <div className="space-y-8">
              {/* Gig Work and Supplemental Income */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Gig Work and Supplemental Income</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="gigWorkSupplementalIncome"
                      value="I have explored opportunities for part-time work or freelancing to supplement my retirement income if needed."
                      checked={formData.gigWorkSupplementalIncome === "I have explored opportunities for part-time work or freelancing to supplement my retirement income if needed."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I have explored opportunities for part-time work or freelancing to supplement my retirement income if needed.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="gigWorkSupplementalIncome"
                      value="I feel confident that I can leverage my skills or expertise to generate additional income post-retirement."
                      checked={formData.gigWorkSupplementalIncome === "I feel confident that I can leverage my skills or expertise to generate additional income post-retirement."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I feel confident that I can leverage my skills or expertise to generate additional income post-retirement.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="gigWorkSupplementalIncome"
                      value="I have considered how gig work might affect my retirement plans, both positively and negatively."
                      checked={formData.gigWorkSupplementalIncome === "I have considered how gig work might affect my retirement plans, both positively and negatively."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have considered how gig work might affect my retirement plans, both positively and negatively.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="gigWorkSupplementalIncome"
                      value="I am aware of how to balance gig work with leisure and family time during retirement."
                      checked={formData.gigWorkSupplementalIncome === "I am aware of how to balance gig work with leisure and family time during retirement."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am aware of how to balance gig work with leisure and family time during retirement.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="gigWorkSupplementalIncome"
                      value="I am open to adapting to new roles or industries for supplemental income opportunities if required."
                      checked={formData.gigWorkSupplementalIncome === "I am open to adapting to new roles or industries for supplemental income opportunities if required."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I am open to adapting to new roles or industries for supplemental income opportunities if required.</span>
                  </label>
                </div>
              </div>

              {/* Spiritual and Reflective Readiness */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Spiritual and Reflective Readiness</h3>
                <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="spiritualReflectiveReadiness"
                      value="I have considered how my retirement years can be a time for personal growth and self-reflection."
                      checked={formData.spiritualReflectiveReadiness === "I have considered how my retirement years can be a time for personal growth and self-reflection."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">I have considered how my retirement years can be a time for personal growth and self-reflection.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="spiritualReflectiveReadiness"
                      value="I feel aligned with my personal values and priorities as I transition into this new phase of life."
                      checked={formData.spiritualReflectiveReadiness === "I feel aligned with my personal values and priorities as I transition into this new phase of life."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I feel aligned with my personal values and priorities as I transition into this new phase of life.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="spiritualReflectiveReadiness"
                      value="I regularly practice mindfulness, gratitude, or other techniques to nurture my emotional and spiritual well-being."
                      checked={formData.spiritualReflectiveReadiness === "I regularly practice mindfulness, gratitude, or other techniques to nurture my emotional and spiritual well-being."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I regularly practice mindfulness, gratitude, or other techniques to nurture my emotional and spiritual well-being.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="spiritualReflectiveReadiness"
                      value="I have identified ways to give back or leave a legacy that aligns with my purpose and beliefs."
                      checked={formData.spiritualReflectiveReadiness === "I have identified ways to give back or leave a legacy that aligns with my purpose and beliefs."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I have identified ways to give back or leave a legacy that aligns with my purpose and beliefs.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="spiritualReflectiveReadiness"
                      value="I feel at peace with my decision to retire and confident about the life I am transitioning into."
                      checked={formData.spiritualReflectiveReadiness === "I feel at peace with my decision to retire and confident about the life I am transitioning into."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">I feel at peace with my decision to retire and confident about the life I am transitioning into.</span>
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">Personal Info</div>
              <div className="text-xs text-gray-500">Financial</div>
              <div className="text-xs text-gray-500">Mental & Physical</div>
              <div className="text-xs text-gray-500">Purpose & Social</div>
              <div className="text-xs text-gray-500">Income & Growth</div>
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