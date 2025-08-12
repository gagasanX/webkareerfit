"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import axios from 'axios';
import Turnstile from "react-turnstile";
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loader2, User, Briefcase, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';

type UserType = 'professional' | 'graduate';
type Step = 'selection' | 'form' | 'results';

const superpowers = [
  { code: 'A', title: 'Project Architect', desc: 'Love planning, organizing, and ensuring everything runs smoothly' },
  { code: 'B', title: 'Data Detective', desc: 'Enjoy analyzing information, finding patterns, and using facts' },
  { code: 'C', title: 'Communications Ambassador', desc: 'Love connecting with people, sharing ideas, and building networks' },
  { code: 'D', title: 'Idea Designer', desc: 'Think outside the box, create new things, and innovate' },
  { code: 'E', title: 'Talent Captain', desc: 'Enjoy teaching, mentoring, and helping others succeed' },
];

type FormValues = {
  email: string;
  currentPosition?: string;
  fieldOfStudy?: string;
  superpower: 'A' | 'B' | 'C' | 'D' | 'E';
  optInMarketing: boolean;
  turnstileToken: string;
};

type Suggestion = { id: string; jobTitle: string; shortDescription: string };
type ApiResponse = { summary: string; suggestions: Suggestion[] };

export const CareerSuggesterClient = () => {
  const [step, setStep] = useState<Step>('selection');
  const [userType, setUserType] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  const { register, handleSubmit, formState: { errors, isValid }, watch } = useForm<FormValues>({
    mode: 'onChange',
  });

  const handleSelectUserType = (type: UserType) => {
    setUserType(type);
    setStep('form');
  };

  const onSubmit: SubmitHandler<FormValues> = async (formData) => {
    if (!turnstileToken) {
      setError("Please complete the verification");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        userType: userType,
        turnstileToken,
      };

      const response = await axios.post<ApiResponse>('/api/career-suggester', payload);
      setResults(response.data);
      setStep('results');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Something went wrong. Please try again.';
      setError(typeof errorMessage === 'string' ? errorMessage : 'Validation error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSelectionStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Who are you?</h2>
        <p className="text-gray-600">Select your current stage to get personalized career suggestions</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          onClick={() => handleSelectUserType('professional')} 
          className="p-8 text-center cursor-pointer hover:shadow-xl hover:border-blue-500 transition-all duration-300 border-2"
        >
          <Briefcase className="w-16 h-16 mx-auto mb-4 text-blue-600" />
          <h3 className="text-2xl font-bold mb-2">Working Professional</h3>
          <p className="text-gray-600">Get career advancement recommendations</p>
        </Card>
        
        <Card 
          onClick={() => handleSelectUserType('graduate')}
          className="p-8 text-center cursor-pointer hover:shadow-xl hover:border-green-500 transition-all duration-300 border-2"
        >
          <User className="w-16 h-16 mx-auto mb-4 text-green-600" />
          <h3 className="text-2xl font-bold mb-2">Student / Graduate</h3>
          <p className="text-gray-600">Discover your first career opportunities</p>
        </Card>
      </div>
    </div>
  );

  const renderFormStep = () => (
    <Card className="w-full max-w-2xl mx-auto p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-center mb-2">Almost there!</h2>
          <p className="text-center text-gray-600 mb-6">Tell us a bit about yourself</p>
        </div>

        {userType === 'professional' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Position</label>
            <input 
              type="text" 
              {...register('currentPosition', { required: true })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Marketing Executive"
            />
            {errors.currentPosition && <span className="text-red-500 text-sm">This field is required</span>}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Field of Study</label>
            <input 
              type="text" 
              {...register('fieldOfStudy', { required: true })} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Computer Science"
            />
            {errors.fieldOfStudy && <span className="text-red-500 text-sm">This field is required</span>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
          <input 
            type="email" 
            {...register('email', { required: true })} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="your@email.com"
          />
          {errors.email && <span className="text-red-500 text-sm">Valid email required</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Your Professional Superpower</label>
          <div className="space-y-3">
            {superpowers.map(power => (
              <label key={power.code} className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-blue-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                <input type="radio" value={power.code} {...register('superpower', { required: true })} className="mt-1" />
                <div className="ml-3">
                  <div className="font-semibold text-gray-900">{power.title}</div>
                  <div className="text-sm text-gray-600">{power.desc}</div>
                </div>
              </label>
            ))}
          </div>
          {errors.superpower && <span className="text-red-500 text-sm">Please select your superpower</span>}
        </div>

        <div className="flex items-start">
          <input type="checkbox" {...register('optInMarketing')} className="mt-1 rounded" />
          <label className="ml-2 text-sm text-gray-700">
            Yes, I want to receive career tips and updates from KareerFit
          </label>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <div className="flex items-center justify-between pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => setStep('selection')}>
            Back
          </Button>
          
          <div className="flex items-center space-x-4">
            <Turnstile
              sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
              onVerify={(token) => setTurnstileToken(token)}
              theme="light"
            />
            
            <Button type="submit" disabled={!isValid || isLoading || !turnstileToken}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Get My Suggestions'
              )}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );

  const renderResultsStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4 mr-2" />
          AI-Powered Career Insights
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Your Career Path Awaits
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 mb-8">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Your Career Narrative</h3>
            <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
              {results?.summary}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Recommended Career Paths
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {results?.suggestions.map((job, index) => (
            <div 
              key={job.id} 
              className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-gray-100 hover:border-blue-200"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl font-bold text-gray-200">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {job.jobTitle}
              </h3>
              <p className="text-gray-600">
                {job.shortDescription}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
        <h3 className="text-3xl font-bold mb-4">
          Ready for Your Complete Career Analysis?
        </h3>
        <p className="text-blue-100 mb-6 text-lg max-w-2xl mx-auto">
          Get a comprehensive career report with detailed insights, personalized action plans, 
          and exclusive industry recommendations.
        </p>
        <a 
          href="https://kareerfit.com/assessment?utm_source=career-suggester&utm_medium=results"
          className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg"
        >
          Start Full Assessment 
          <ExternalLink className="w-5 h-5 ml-2" />
        </a>
      </div>
    </div>
  );

  switch (step) {
    case 'form': return renderFormStep();
    case 'results': return renderResultsStep();
    case 'selection':
    default: return renderSelectionStep();
  }
};