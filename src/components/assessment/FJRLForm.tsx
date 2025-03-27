'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface FJRLFormProps {
  onSubmit: (data: any, resumeFile?: File) => void;
  initialData?: any;
}

// Define proper typing for form data
interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  personality: string;
  jobPosition: string;
}

interface FormData {
  personalInfo: PersonalInfo;
  qualification: string;
  professionalism: string;
  learningSkills: string;
  communicationSkills: string;
  criticalThinking: string;
  teamwork: string;
  selfManagement: string;
  selfAwareness: string;
}

export default function FJRLForm({ onSubmit, initialData }: FJRLFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialData || {
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

  // All steps rendered based on currentStep
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
                placeholder="Tell us about your work style, strengths, and how you handle challenges..."
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

            <div className="mt-6 flex justify-between">
              <div></div> {/* Empty div for spacing */}
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Professional Readiness Assessment</h2>
            
            <div className="space-y-8">
              {/* Professionalism */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Professionalism (choose 1 statement that resonates with you.)</h3>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="professionalism"
                      value="Work habits and ethics align with the standards expected in professional environments."
                      checked={formData.professionalism === "Work habits and ethics align with the standards expected in professional environments."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">Work habits and ethics align with the standards expected in professional environments.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="professionalism"
                      value="Punctuality and time management skills ensure timely completion of tasks and adherence to schedules."
                      checked={formData.professionalism === "Punctuality and time management skills ensure timely completion of tasks and adherence to schedules."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Punctuality and time management skills ensure timely completion of tasks and adherence to schedules.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="professionalism"
                      value="Professional appearance and demeanor align with industry norms and organizational expectations."
                      checked={formData.professionalism === "Professional appearance and demeanor align with industry norms and organizational expectations."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Professional appearance and demeanor align with industry norms and organizational expectations.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="professionalism"
                      value="Awareness of workplace hierarchy and respect for roles and responsibilities is consistently practiced."
                      checked={formData.professionalism === "Awareness of workplace hierarchy and respect for roles and responsibilities is consistently practiced."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Awareness of workplace hierarchy and respect for roles and responsibilities is consistently practiced.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="professionalism"
                      value="Confidentiality and integrity are maintained when dealing with sensitive or organizational information."
                      checked={formData.professionalism === "Confidentiality and integrity are maintained when dealing with sensitive or organizational information."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Confidentiality and integrity are maintained when dealing with sensitive or organizational information.</span>
                  </label>
                </div>
              </div>

              {/* Learning Skills */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Learning Skills (choose 1 statement that resonates with you.)</h3>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="learningSkills"
                      value="New tasks and skills are approached with curiosity and a willingness to learn."
                      checked={formData.learningSkills === "New tasks and skills are approached with curiosity and a willingness to learn."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">New tasks and skills are approached with curiosity and a willingness to learn.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="learningSkills"
                      value="Constructive feedback is actively sought and applied to improve performance."
                      checked={formData.learningSkills === "Constructive feedback is actively sought and applied to improve performance."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Constructive feedback is actively sought and applied to improve performance.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="learningSkills"
                      value="Research and self-learning tools are effectively used to acquire job-specific knowledge."
                      checked={formData.learningSkills === "Research and self-learning tools are effectively used to acquire job-specific knowledge."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Research and self-learning tools are effectively used to acquire job-specific knowledge.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="learningSkills"
                      value="The ability to analyze and synthesize information supports continuous learning."
                      checked={formData.learningSkills === "The ability to analyze and synthesize information supports continuous learning."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">The ability to analyze and synthesize information supports continuous learning.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="learningSkills"
                      value="Growth opportunities are identified and pursued proactively to align with career goals."
                      checked={formData.learningSkills === "Growth opportunities are identified and pursued proactively to align with career goals."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Growth opportunities are identified and pursued proactively to align with career goals.</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                Previous
              </Button>
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Communication and Critical Thinking</h2>
            
            <div className="space-y-8">
              {/* Communication Skills */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Communication Skills (choose 1 statement that resonates with you.)</h3>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="communicationSkills"
                      value="Communication is clear, concise, and tailored to the audience and purpose."
                      checked={formData.communicationSkills === "Communication is clear, concise, and tailored to the audience and purpose."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">Communication is clear, concise, and tailored to the audience and purpose.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="communicationSkills"
                      value="Active listening ensures accurate understanding and meaningful responses during conversations."
                      checked={formData.communicationSkills === "Active listening ensures accurate understanding and meaningful responses during conversations."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Active listening ensures accurate understanding and meaningful responses during conversations.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="communicationSkills"
                      value="Written correspondence, including emails and reports, adheres to professional standards."
                      checked={formData.communicationSkills === "Written correspondence, including emails and reports, adheres to professional standards."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Written correspondence, including emails and reports, adheres to professional standards.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="communicationSkills"
                      value="Presentation skills effectively convey ideas, concepts, or solutions to diverse audiences."
                      checked={formData.communicationSkills === "Presentation skills effectively convey ideas, concepts, or solutions to diverse audiences."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Presentation skills effectively convey ideas, concepts, or solutions to diverse audiences.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="communicationSkills"
                      value="Non-verbal communication, including body language and tone, aligns with the intended message."
                      checked={formData.communicationSkills === "Non-verbal communication, including body language and tone, aligns with the intended message."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Non-verbal communication, including body language and tone, aligns with the intended message.</span>
                  </label>
                </div>
              </div>

              {/* Critical Thinking */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Creative and Critical Thinking (choose 1 statement that resonates with you.)</h3>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="criticalThinking"
                      value="Problems are analyzed from multiple perspectives to identify effective solutions."
                      checked={formData.criticalThinking === "Problems are analyzed from multiple perspectives to identify effective solutions."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">Problems are analyzed from multiple perspectives to identify effective solutions.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="criticalThinking"
                      value="Innovative approaches are explored when addressing challenges or improving processes."
                      checked={formData.criticalThinking === "Innovative approaches are explored when addressing challenges or improving processes."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Innovative approaches are explored when addressing challenges or improving processes.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="criticalThinking"
                      value="Logical reasoning and evidence-based thinking guide decision-making."
                      checked={formData.criticalThinking === "Logical reasoning and evidence-based thinking guide decision-making."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Logical reasoning and evidence-based thinking guide decision-making.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="criticalThinking"
                      value="Risks and potential consequences are considered when proposing or implementing solutions."
                      checked={formData.criticalThinking === "Risks and potential consequences are considered when proposing or implementing solutions."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Risks and potential consequences are considered when proposing or implementing solutions.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="criticalThinking"
                      value="Opportunities for improvement or innovation are identified and communicated effectively."
                      checked={formData.criticalThinking === "Opportunities for improvement or innovation are identified and communicated effectively."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Opportunities for improvement or innovation are identified and communicated effectively.</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                Previous
              </Button>
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Teamwork and Self-Management</h2>
            
            <div className="space-y-8">
              {/* Teamwork */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Teamwork and Collaboration (choose 1 statement that resonates with you.)</h3>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="teamwork"
                      value="Roles and responsibilities within teams are understood and fulfilled effectively."
                      checked={formData.teamwork === "Roles and responsibilities within teams are understood and fulfilled effectively."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">Roles and responsibilities within teams are understood and fulfilled effectively.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="teamwork"
                      value="Collaboration is fostered by actively engaging with team members and valuing diverse perspectives."
                      checked={formData.teamwork === "Collaboration is fostered by actively engaging with team members and valuing diverse perspectives."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Collaboration is fostered by actively engaging with team members and valuing diverse perspectives.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="teamwork"
                      value="Conflicts are resolved constructively to maintain team harmony and productivity."
                      checked={formData.teamwork === "Conflicts are resolved constructively to maintain team harmony and productivity."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Conflicts are resolved constructively to maintain team harmony and productivity.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="teamwork"
                      value="Contributions to team projects are consistent, reliable, and aligned with shared objectives."
                      checked={formData.teamwork === "Contributions to team projects are consistent, reliable, and aligned with shared objectives."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Contributions to team projects are consistent, reliable, and aligned with shared objectives.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="teamwork"
                      value="Recognition and appreciation of the strengths and efforts of team members are regularly practiced."
                      checked={formData.teamwork === "Recognition and appreciation of the strengths and efforts of team members are regularly practiced."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Recognition and appreciation of the strengths and efforts of team members are regularly practiced.</span>
                  </label>
                </div>
              </div>

              {/* Self Management */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Self Management (choose 1 statement that resonates with you.)</h3>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="selfManagement"
                      value="Daily tasks and responsibilities are organized effectively to ensure productivity."
                      checked={formData.selfManagement === "Daily tasks and responsibilities are organized effectively to ensure productivity."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">Daily tasks and responsibilities are organized effectively to ensure productivity.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="selfManagement"
                      value="Stress and challenges are managed constructively without compromising performance."
                      checked={formData.selfManagement === "Stress and challenges are managed constructively without compromising performance."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Stress and challenges are managed constructively without compromising performance.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="selfManagement"
                      value="Initiative is taken to address tasks or responsibilities without waiting for direct instruction."
                      checked={formData.selfManagement === "Initiative is taken to address tasks or responsibilities without waiting for direct instruction."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Initiative is taken to address tasks or responsibilities without waiting for direct instruction.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="selfManagement"
                      value="Personal and professional goals are set and tracked for continuous self-improvement."
                      checked={formData.selfManagement === "Personal and professional goals are set and tracked for continuous self-improvement."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Personal and professional goals are set and tracked for continuous self-improvement.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="selfManagement"
                      value="Work-life balance is maintained to ensure overall well-being and sustained performance."
                      checked={formData.selfManagement === "Work-life balance is maintained to ensure overall well-being and sustained performance."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Work-life balance is maintained to ensure overall well-being and sustained performance.</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                Previous
              </Button>
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Self-Awareness and Growth</h2>
            
            <div className="space-y-8">
              {/* Self Awareness */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Self Awareness and Growth Orientation (choose 1 statement that resonates with you.)</h3>
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="radio"
                      name="selfAwareness"
                      value="Strengths and areas for improvement are clearly identified and articulated."
                      checked={formData.selfAwareness === "Strengths and areas for improvement are clearly identified and articulated."}
                      onChange={handleInputChange}
                      className="mr-2"
                      required
                    />
                    <span className="text-gray-700">Strengths and areas for improvement are clearly identified and articulated.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="selfAwareness"
                      value="Constructive feedback is embraced as an opportunity for personal and professional development."
                      checked={formData.selfAwareness === "Constructive feedback is embraced as an opportunity for personal and professional development."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Constructive feedback is embraced as an opportunity for personal and professional development.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="selfAwareness"
                      value="Career aspirations are aligned with skills, values, and industry opportunities."
                      checked={formData.selfAwareness === "Career aspirations are aligned with skills, values, and industry opportunities."}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Career aspirations are aligned with skills, values, and industry opportunities.</span>
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name="selfAwareness"
                      value="Efforts to develop soft skills, such as empathy and emotional intelligence, are consistently made."
                      checked={formData.selfAwareness === "Efforts to develop soft skills, such as empathy and emotional intelligence, are consistently made."}
                      onChange={handleInputChange}
                      className="mr-2"
                      />
                      <span className="text-gray-700">A growth mindset drives the pursuit of learning and adaptation in a changing work environment.</span>
                    </label>
                  </div>
                </div>
              </div>
  
              <div className="mt-6 flex justify-between">
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
                <Button type="submit" onClick={handleSubmit} className="bg-primary-600 hover:bg-primary-700">
                  Submit Assessment
                </Button>
              </div>
            </div>
          );
        
        default:
          return null;
      }
    };
  
    // Progress bar
    const totalSteps = 5;
    const progress = (currentStep / totalSteps) * 100;
  
    return (
      <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">First Job Readiness Level (FJRL) Assessment</h1>
          <p className="text-gray-600">
            The First Job Readiness Level (FJRL) evaluates a fresh graduate's preparedness for their first job. 
            It assesses key competencies, self-awareness, and readiness for professional environments.
          </p>
          
          {/* Progress tracking */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {renderStep()}
      </form>
    );
  }