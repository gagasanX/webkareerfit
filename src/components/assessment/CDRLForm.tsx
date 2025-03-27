'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface CDRLFormProps {
  onSubmit: (data: any, resumeFile?: File) => void;
}

export default function CDRLForm({ onSubmit }: CDRLFormProps) {
  const [formData, setFormData] = useState({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      personality: '',
      jobPosition: '',
    },
    qualification: '',
    leadershipManagement: '',
    roleSpecificSkills: '',
    careerVisionGoals: '',
    networkingPresence: '',
    emotionalSocialIntelligence: '',
    innovationStrategicThinking: '',
    continuousLearning: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [error, setError] = useState('');

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
    if (formData.leadershipManagement) completedFields++;
    if (formData.roleSpecificSkills) completedFields++;
    if (formData.careerVisionGoals) completedFields++;
    if (formData.networkingPresence) completedFields++;
    if (formData.emotionalSocialIntelligence) completedFields++;
    if (formData.innovationStrategicThinking) completedFields++;
    if (formData.continuousLearning) completedFields++;
    
    // Calculate percentage (7 sections total + personal info)
    const totalFields = 13; // 6 personal fields + 7 assessment sections
    const percentage = (completedFields / totalFields) * 100;
    setProgressPercentage(percentage);
  }, [formData]);

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
    
    // Validate required fields
    if (!formData.personalInfo.name || 
        !formData.personalInfo.email || 
        !formData.personalInfo.personality || 
        !formData.personalInfo.jobPosition || 
        !formData.qualification) {
      setError('Please fill in all required personal information fields');
      return;
    }
    
    // Validate all questions have responses
    if (!formData.leadershipManagement ||
        !formData.roleSpecificSkills ||
        !formData.careerVisionGoals ||
        !formData.networkingPresence ||
        !formData.emotionalSocialIntelligence ||
        !formData.innovationStrategicThinking ||
        !formData.continuousLearning) {
      setError('Please answer all assessment questions');
      return;
    }
    
    // If everything is valid, submit the form
    onSubmit(formData, resumeFile || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">Career Development Readiness Level (CDRL) Assessment</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Complete the assessment to receive personalized insights for your career development.
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
                    <option value="SPM, STPM, or equivalent">SPM, STPM, or equivalent</option>
                    <option value="Diploma or Advanced Diploma">Diploma or Advanced Diploma</option>
                    <option value="Undergraduate Degree">Undergraduate Degree</option>
                    <option value="Postgraduate Degree">Postgraduate Degree</option>
                    <option value="Professional Certification">Professional Certification</option>
                    <option value="Doctoral Degree">Doctoral Degree</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="personalInfo.jobPosition" className="block text-sm font-medium text-gray-700">
                  Job and Position Applying For *
                </label>
                <input
                  type="text"
                  name="personalInfo.jobPosition"
                  id="personalInfo.jobPosition"
                  value={formData.personalInfo.jobPosition}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="e.g.: Senior Project Manager, Team Lead"
                />
              </div>
              
              <div>
                <label htmlFor="personalInfo.personality" className="block text-sm font-medium text-gray-700">
                  Describe Your Personality *
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
            </div>
            
            {/* Leadership and Management Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Leadership and Management Readiness</h3>
              <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
              
              <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.leadershipManagement === "Leadership skills are demonstrated through effective delegation and team empowerment."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="leadershipManagement"
                    value="Leadership skills are demonstrated through effective delegation and team empowerment."
                    checked={formData.leadershipManagement === "Leadership skills are demonstrated through effective delegation and team empowerment."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    required
                  />
                  <span className="ml-3 text-gray-700">Leadership skills are demonstrated through effective delegation and team empowerment.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.leadershipManagement === "Decision-making reflects a balance of analytical reasoning and intuitive judgment."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="leadershipManagement"
                    value="Decision-making reflects a balance of analytical reasoning and intuitive judgment."
                    checked={formData.leadershipManagement === "Decision-making reflects a balance of analytical reasoning and intuitive judgment."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Decision-making reflects a balance of analytical reasoning and intuitive judgment.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.leadershipManagement === "Conflict resolution is approached constructively, ensuring harmony and productivity."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="leadershipManagement"
                    value="Conflict resolution is approached constructively, ensuring harmony and productivity."
                    checked={formData.leadershipManagement === "Conflict resolution is approached constructively, ensuring harmony and productivity."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Conflict resolution is approached constructively, ensuring harmony and productivity.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.leadershipManagement === "Strategic thinking and planning align with organizational goals and team capabilities."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="leadershipManagement"
                    value="Strategic thinking and planning align with organizational goals and team capabilities."
                    checked={formData.leadershipManagement === "Strategic thinking and planning align with organizational goals and team capabilities."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Strategic thinking and planning align with organizational goals and team capabilities.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.leadershipManagement === "Emotional intelligence enables effective communication and trust-building within teams."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="leadershipManagement"
                    value="Emotional intelligence enables effective communication and trust-building within teams."
                    checked={formData.leadershipManagement === "Emotional intelligence enables effective communication and trust-building within teams."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Emotional intelligence enables effective communication and trust-building within teams.</span>
                </label>
              </div>
            </div>
            
            {/* Role-Specific Skills Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Role-Specific Skills and Expertise</h3>
              <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
              
              <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.roleSpecificSkills === "Current skills and expertise are aligned with the responsibilities of the target role."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="roleSpecificSkills"
                    value="Current skills and expertise are aligned with the responsibilities of the target role."
                    checked={formData.roleSpecificSkills === "Current skills and expertise are aligned with the responsibilities of the target role."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    required
                  />
                  <span className="ml-3 text-gray-700">Current skills and expertise are aligned with the responsibilities of the target role.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.roleSpecificSkills === "Continuous upskilling is pursued to remain competitive and meet evolving industry demands."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="roleSpecificSkills"
                    value="Continuous upskilling is pursued to remain competitive and meet evolving industry demands."
                    checked={formData.roleSpecificSkills === "Continuous upskilling is pursued to remain competitive and meet evolving industry demands."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Continuous upskilling is pursued to remain competitive and meet evolving industry demands.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.roleSpecificSkills === "Advanced knowledge of tools, processes, and systems enhances role-specific effectiveness."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="roleSpecificSkills"
                    value="Advanced knowledge of tools, processes, and systems enhances role-specific effectiveness."
                    checked={formData.roleSpecificSkills === "Advanced knowledge of tools, processes, and systems enhances role-specific effectiveness."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Advanced knowledge of tools, processes, and systems enhances role-specific effectiveness.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.roleSpecificSkills === "Problem-solving and technical proficiency address complex challenges in the desired role."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="roleSpecificSkills"
                    value="Problem-solving and technical proficiency address complex challenges in the desired role."
                    checked={formData.roleSpecificSkills === "Problem-solving and technical proficiency address complex challenges in the desired role."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Problem-solving and technical proficiency address complex challenges in the desired role.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.roleSpecificSkills === "A clear understanding of the industry landscape informs decision-making and innovation."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="roleSpecificSkills"
                    value="A clear understanding of the industry landscape informs decision-making and innovation."
                    checked={formData.roleSpecificSkills === "A clear understanding of the industry landscape informs decision-making and innovation."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">A clear understanding of the industry landscape informs decision-making and innovation.</span>
                </label>
              </div>
            </div>
            
            {/* Career Vision Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Career Vision and Goal Alignment</h3>
              <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
              
              <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.careerVisionGoals === "Career goals are clearly defined and align with personal values and professional ambitions."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="careerVisionGoals"
                    value="Career goals are clearly defined and align with personal values and professional ambitions."
                    checked={formData.careerVisionGoals === "Career goals are clearly defined and align with personal values and professional ambitions."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    required
                  />
                  <span className="ml-3 text-gray-700">Career goals are clearly defined and align with personal values and professional ambitions.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.careerVisionGoals === "The desired role contributes to long-term career growth and personal fulfillment."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="careerVisionGoals"
                    value="The desired role contributes to long-term career growth and personal fulfillment."
                    checked={formData.careerVisionGoals === "The desired role contributes to long-term career growth and personal fulfillment."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">The desired role contributes to long-term career growth and personal fulfillment.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.careerVisionGoals === "Career transitions are planned with awareness of potential challenges and opportunities."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="careerVisionGoals"
                    value="Career transitions are planned with awareness of potential challenges and opportunities."
                    checked={formData.careerVisionGoals === "Career transitions are planned with awareness of potential challenges and opportunities."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Career transitions are planned with awareness of potential challenges and opportunities.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.careerVisionGoals === "Opportunities for meaningful contributions and recognition are identified in the target role."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="careerVisionGoals"
                    value="Opportunities for meaningful contributions and recognition are identified in the target role."
                    checked={formData.careerVisionGoals === "Opportunities for meaningful contributions and recognition are identified in the target role."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Opportunities for meaningful contributions and recognition are identified in the target role.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.careerVisionGoals === "A balance between professional growth and work-life harmony is prioritized."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="careerVisionGoals"
                    value="A balance between professional growth and work-life harmony is prioritized."
                    checked={formData.careerVisionGoals === "A balance between professional growth and work-life harmony is prioritized."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">A balance between professional growth and work-life harmony is prioritized.</span>
                </label>
              </div>
            </div>
            
            {/* Networking Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Networking and Professional Presence</h3>
              <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
              
              <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.networkingPresence === "Strong professional relationships with colleagues, mentors, and industry peers are established."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="networkingPresence"
                    value="Strong professional relationships with colleagues, mentors, and industry peers are established."
                    checked={formData.networkingPresence === "Strong professional relationships with colleagues, mentors, and industry peers are established."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    required
                  />
                  <span className="ml-3 text-gray-700">Strong professional relationships with colleagues, mentors, and industry peers are established.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.networkingPresence === "Digital presence (LinkedIn, portfolio) effectively showcases professional achievements and aspirations."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="networkingPresence"
                    value="Digital presence (LinkedIn, portfolio) effectively showcases professional achievements and aspirations."
                    checked={formData.networkingPresence === "Digital presence (LinkedIn, portfolio) effectively showcases professional achievements and aspirations."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Digital presence (LinkedIn, portfolio) effectively showcases professional achievements and aspirations.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.networkingPresence === "Active engagement in industry events, conferences, and professional communities expands connections."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="networkingPresence"
                    value="Active engagement in industry events, conferences, and professional communities expands connections."
                    checked={formData.networkingPresence === "Active engagement in industry events, conferences, and professional communities expands connections."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Active engagement in industry events, conferences, and professional communities expands connections.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.networkingPresence === "Personal branding reflects authentic professional identity and values."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="networkingPresence"
                    value="Personal branding reflects authentic professional identity and values."
                    checked={formData.networkingPresence === "Personal branding reflects authentic professional identity and values."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Personal branding reflects authentic professional identity and values.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.networkingPresence === "Meaningful contributions to professional communities and discussions enhance reputation and visibility."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="networkingPresence"
                    value="Meaningful contributions to professional communities and discussions enhance reputation and visibility."
                    checked={formData.networkingPresence === "Meaningful contributions to professional communities and discussions enhance reputation and visibility."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Meaningful contributions to professional communities and discussions enhance reputation and visibility.</span>
                </label>
              </div>
            </div>
            
            {/* Emotional/Social Intelligence Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Emotional and Social Intelligence</h3>
              <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
              
              <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.emotionalSocialIntelligence === "Self-awareness enables recognition and regulation of emotions in professional contexts."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="emotionalSocialIntelligence"
                    value="Self-awareness enables recognition and regulation of emotions in professional contexts."
                    checked={formData.emotionalSocialIntelligence === "Self-awareness enables recognition and regulation of emotions in professional contexts."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    required
                  />
                  <span className="ml-3 text-gray-700">Self-awareness enables recognition and regulation of emotions in professional contexts.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.emotionalSocialIntelligence === "Empathy and perspective-taking strengthen relationships and collaboration."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="emotionalSocialIntelligence"
                    value="Empathy and perspective-taking strengthen relationships and collaboration."
                    checked={formData.emotionalSocialIntelligence === "Empathy and perspective-taking strengthen relationships and collaboration."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Empathy and perspective-taking strengthen relationships and collaboration.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.emotionalSocialIntelligence === "Active listening and clear communication foster understanding and respect."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="emotionalSocialIntelligence"
                    value="Active listening and clear communication foster understanding and respect."
                    checked={formData.emotionalSocialIntelligence === "Active listening and clear communication foster understanding and respect."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Active listening and clear communication foster understanding and respect.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.emotionalSocialIntelligence === "Feedback is received constructively and used for growth and improvement."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="emotionalSocialIntelligence"
                    value="Feedback is received constructively and used for growth and improvement."
                    checked={formData.emotionalSocialIntelligence === "Feedback is received constructively and used for growth and improvement."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Feedback is received constructively and used for growth and improvement.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.emotionalSocialIntelligence === "Cultural sensitivity and awareness enable effective interaction in diverse environments."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="emotionalSocialIntelligence"
                    value="Cultural sensitivity and awareness enable effective interaction in diverse environments."
                    checked={formData.emotionalSocialIntelligence === "Cultural sensitivity and awareness enable effective interaction in diverse environments."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Cultural sensitivity and awareness enable effective interaction in diverse environments.</span>
                </label>
              </div>
            </div>
            
            {/* Innovation and Strategic Thinking Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Innovation and Strategic Thinking</h3>
              <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
              
              <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.innovationStrategicThinking === "Creative problem-solving approaches generate innovative solutions to complex challenges."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="innovationStrategicThinking"
                    value="Creative problem-solving approaches generate innovative solutions to complex challenges."
                    checked={formData.innovationStrategicThinking === "Creative problem-solving approaches generate innovative solutions to complex challenges."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    required
                  />
                  <span className="ml-3 text-gray-700">Creative problem-solving approaches generate innovative solutions to complex challenges.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.innovationStrategicThinking === "Adaptability to emerging trends and technologies drives continuous improvement and relevance."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="innovationStrategicThinking"
                    value="Adaptability to emerging trends and technologies drives continuous improvement and relevance."
                    checked={formData.innovationStrategicThinking === "Adaptability to emerging trends and technologies drives continuous improvement and relevance."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Adaptability to emerging trends and technologies drives continuous improvement and relevance.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.innovationStrategicThinking === "Strategic vision informs decision-making and resource allocation for maximum impact."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="innovationStrategicThinking"
                    value="Strategic vision informs decision-making and resource allocation for maximum impact."
                    checked={formData.innovationStrategicThinking === "Strategic vision informs decision-making and resource allocation for maximum impact."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Strategic vision informs decision-making and resource allocation for maximum impact.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.innovationStrategicThinking === "Analysis of industry dynamics and market forces identifies opportunities for growth and differentiation."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="innovationStrategicThinking"
                    value="Analysis of industry dynamics and market forces identifies opportunities for growth and differentiation."
                    checked={formData.innovationStrategicThinking === "Analysis of industry dynamics and market forces identifies opportunities for growth and differentiation."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Analysis of industry dynamics and market forces identifies opportunities for growth and differentiation.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.innovationStrategicThinking === "Risk assessment balances innovation with practical considerations for sustainable success."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="innovationStrategicThinking"
                    value="Risk assessment balances innovation with practical considerations for sustainable success."
                    checked={formData.innovationStrategicThinking === "Risk assessment balances innovation with practical considerations for sustainable success."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Risk assessment balances innovation with practical considerations for sustainable success.</span>
                </label>
              </div>
            </div>
            
            {/* Continuous Learning Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Continuous Learning and Growth Mindset</h3>
              <p className="text-sm text-gray-500 mb-4">Select the statement that best describes you.</p>
              
              <div className="bg-gray-50 p-5 rounded-lg border space-y-3">
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.continuousLearning === "A growth mindset embraces challenges and views failures as learning opportunities."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="continuousLearning"
                    value="A growth mindset embraces challenges and views failures as learning opportunities."
                    checked={formData.continuousLearning === "A growth mindset embraces challenges and views failures as learning opportunities."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    required
                  />
                  <span className="ml-3 text-gray-700">A growth mindset embraces challenges and views failures as learning opportunities.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.continuousLearning === "Regular pursuit of professional development keeps skills current and enhances knowledge."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="continuousLearning"
                    value="Regular pursuit of professional development keeps skills current and enhances knowledge."
                    checked={formData.continuousLearning === "Regular pursuit of professional development keeps skills current and enhances knowledge."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Regular pursuit of professional development keeps skills current and enhances knowledge.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.continuousLearning === "Adaptability to new methods and technologies enables agility in changing environments."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="continuousLearning"
                    value="Adaptability to new methods and technologies enables agility in changing environments."
                    checked={formData.continuousLearning === "Adaptability to new methods and technologies enables agility in changing environments."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Adaptability to new methods and technologies enables agility in changing environments.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.continuousLearning === "Intellectual curiosity drives exploration of diverse perspectives and innovative approaches."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="continuousLearning"
                    value="Intellectual curiosity drives exploration of diverse perspectives and innovative approaches."
                    checked={formData.continuousLearning === "Intellectual curiosity drives exploration of diverse perspectives and innovative approaches."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Intellectual curiosity drives exploration of diverse perspectives and innovative approaches.</span>
                </label>
                
                <label className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  formData.continuousLearning === "Proactive identification of skill gaps informs targeted development efforts."
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="continuousLearning"
                    value="Proactive identification of skill gaps informs targeted development efforts."
                    checked={formData.continuousLearning === "Proactive identification of skill gaps informs targeted development efforts."}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-gray-700">Proactive identification of skill gaps informs targeted development efforts.</span>
                </label>
              </div>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}
            
            {/* Submit button */}
            <div className="pt-6 border-t border-gray-200">
              <Button 
                type="submit" 
                className="w-full md:w-auto"
              >
                Submit Assessment
              </Button>
              
              <p className="mt-4 text-sm text-gray-500">
                By submitting this assessment, you agree to our terms and conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}