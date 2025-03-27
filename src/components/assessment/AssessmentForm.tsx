// src/components/assessment/AssessmentForm.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { assessmentQuestions, ASSESSMENT_TITLES } from '@/lib/assessmentQuestions';

// Define types for form data and questions
type AssessmentType = 'fjrl' | 'ijrl' | 'cdrl' | 'ccrl' | 'ctrl' | 'rrl' | 'irl';

interface FormData {
  name: string;
  email: string;
  phone: string;
  personality: string;
  position: string;
  qualification: string;
  resume: File | null;
  responses: Record<string, number>;
}

interface Question {
  id: string;
  label: string;
  description: string;
  options: string[];
}

interface AssessmentQuestions {
  fjrl: Question[];
  ijrl: Question[];
  cdrl: Question[];
  ccrl: Question[];
  ctrl: Question[];
  rrl: Question[];
  irl: Question[];
}

interface AssessmentFormProps {
  type: AssessmentType;
  initialData?: Partial<FormData>;
}

export default function AssessmentForm({ type, initialData }: AssessmentFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || session?.user?.name || '',
    email: initialData?.email || session?.user?.email || '',
    phone: initialData?.phone || '',
    personality: initialData?.personality || '',
    position: initialData?.position || '',
    qualification: initialData?.qualification || '',
    resume: initialData?.resume || null,
    responses: initialData?.responses || {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  
  // Type assertion for assessmentQuestions to match our interface
  const questions = (assessmentQuestions as unknown as AssessmentQuestions)[type] || [];
  const totalQuestions = questions.length + 5; // 5 personal info fields + assessment questions
  
  // Calculate progress percentage
  useEffect(() => {
    let completedFields = 0;
    
    // Count completed personal info fields
    if (formData.name) completedFields++;
    if (formData.email) completedFields++;
    if (formData.phone) completedFields++;
    if (formData.personality) completedFields++;
    if (formData.position) completedFields++;
    
    // Count completed questions
    completedFields += Object.keys(formData.responses).length;
    
    const percentage = (completedFields / totalQuestions) * 100;
    setProgressPercentage(percentage);
  }, [formData, totalQuestions]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFormData((prev) => ({ ...prev, resume: files[0] }));
    }
  };
  
  const handleResponseChange = (questionId: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      responses: { ...prev.responses, [questionId]: value }
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!formData.name || !formData.email || !formData.phone || !formData.personality || !formData.position) {
      setError('Please fill in all required personal information fields');
      return;
    }
    
    // Validate all questions have responses
    const unansweredQuestions = questions.filter(q => !formData.responses[q.id]);
    if (unansweredQuestions.length > 0) {
      setError(`Please answer all questions. ${unansweredQuestions.length} questions remain unanswered.`);
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // Create form data for file upload
      const submitData = new FormData();
      submitData.append('type', type);
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('personality', formData.personality);
      submitData.append('position', formData.position);
      submitData.append('qualification', formData.qualification);
      submitData.append('responses', JSON.stringify(formData.responses));
      
      if (formData.resume) {
        submitData.append('resume', formData.resume);
      }
      
      const response = await fetch('/api/assessment/create', {
        method: 'POST',
        body: submitData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit assessment');
      }
      
      // Redirect to payment page
      router.push(`/payment/checkout?assessmentId=${data.assessmentId}`);
    } catch (err) {
      console.error('Error submitting assessment:', err);
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">{ASSESSMENT_TITLES[type] || 'Assessment'}</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Complete the assessment to receive personalized insights.
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
      </div>
      
      <form onSubmit={handleSubmit} className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6 space-y-10">
          {/* Personal Information Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  required
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">Select qualification</option>
                  <option value="SPM">SPM, STPM, or equivalent (Foundation, Certificate, etc)</option>
                  <option value="Diploma">Diploma or Advanced Diploma</option>
                  <option value="Undergraduate">Undergraduate Degree</option>
                  <option value="Postgraduate">Postgraduate Degree</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                Job and position applying for? (e.g.: Junior Web Designer, Entry Level) *
              </label>
              <input
                type="text"
                id="position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="personality" className="block text-sm font-medium text-gray-700">
                Describe your personality *
              </label>
              <textarea
                id="personality"
                name="personality"
                value={formData.personality}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="resume" className="block text-sm font-medium text-gray-700">
                Upload resume *
              </label>
              <input
                type="file"
                id="resume"
                name="resume"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                accept=".pdf,.doc,.docx"
                required
              />
              <p className="mt-1 text-xs text-gray-500">PDF, DOC, or DOCX. Maximum 5MB.</p>
            </div>
          </div>
          
          {/* Assessment Questions Sections */}
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b">
                {index + 1}. {question.label}
              </h3>
              <p className="text-sm text-gray-500 mb-4">{question.description}</p>
              
              <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
                {question.options.map((option, optionIndex) => (
                  <label 
                    key={optionIndex} 
                    className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      formData.responses[question.id] === optionIndex 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center h-5">
                      <input
                        id={`${question.id}-option-${optionIndex}`}
                        name={question.id}
                        type="radio"
                        checked={formData.responses[question.id] === optionIndex}
                        onChange={() => handleResponseChange(question.id, optionIndex)}
                        className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <span className="font-medium text-gray-700">{option}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
          
          {/* Error message */}
          {error && (
            <div className="bg-red-50 p-4 rounded-lg text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}
          
          {/* Submit button */}
          <div className="pt-6 border-t border-gray-200">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full md:w-auto"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </Button>
            
            <p className="mt-4 text-sm text-gray-500">
              By submitting this assessment, you agree to our terms and conditions.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}