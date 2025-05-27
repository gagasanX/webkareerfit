'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, signIn, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function AffiliateJoinClient() {
  const router = useRouter();
  const { data: session, update } = useSession();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    website: '',
    socialMedia: '',
    howPromote: '',
    acceptTerms: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (!formData.howPromote.trim()) {
      newErrors.howPromote = 'Please explain how you plan to promote KareerFit';
    }
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = validateForm();
    if (!isValid) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await fetch('/api/affiliate/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit affiliate application');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setAffiliateCode(result.affiliateCode);
        setSubmitted(true);
        
        // Force session update
        if (update) {
          await update();
        }
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          handleGoToDashboard();
        }, 3000);
      } else {
        throw new Error(result.error || 'Registration failed');
      }
      
    } catch (error) {
      console.error('Error submitting affiliate application:', error);
      setSubmitError('Failed to submit your application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToDashboard = async () => {
    try {
      // Method 1: Force page refresh to update session
      window.location.href = '/affiliate';
      
      // Alternative Method 2: Session refresh then navigate
      // if (update) {
      //   await update();
      //   setTimeout(() => {
      //     router.push('/affiliate');
      //   }, 500);
      // } else {
      //   window.location.href = '/affiliate';
      // }
      
    } catch (error) {
      console.error('Error navigating to dashboard:', error);
      // Fallback to force refresh
      window.location.href = '/affiliate';
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
            <h1 className="text-2xl font-bold">Registration Complete!</h1>
          </div>
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-2">Welcome, Affiliate!</h2>
            <p className="text-gray-600 mb-4">
              Your affiliate registration is complete. You can now access your dashboard and start earning commissions.
            </p>
            
            {affiliateCode && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600 mb-2">Your Affiliate Code:</p>
                <p className="font-mono text-lg font-bold text-[#7e43f1]">{affiliateCode}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Redirecting to your affiliate dashboard in 3 seconds...</p>
              
              <button
                onClick={handleGoToDashboard}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white rounded-lg hover:shadow-lg transition-shadow font-medium"
              >
                Go to Affiliate Dashboard Now
              </button>
              
              <Link
                href="/dashboard"
                className="block w-full px-6 py-2 bg-white text-[#7e43f1] border border-[#7e43f1] rounded-lg hover:bg-purple-50 transition-colors"
              >
                Back to Main Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
            <h1 className="text-2xl font-bold">Affiliate Program Application</h1>
            <p className="text-white/90 mt-1">
              Join our affiliate program and earn commission for every successful referral.
            </p>
          </div>
          
          <div className="p-6">
            {submitError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p>{submitError}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 rounded-lg border ${errors.fullName ? 'border-red-300' : 'border-gray-300'} focus:ring-[#7e43f1] focus:border-[#7e43f1] focus:outline-none`}
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 rounded-lg border ${errors.email ? 'border-red-300' : 'border-gray-300'} focus:ring-[#7e43f1] focus:border-[#7e43f1] focus:outline-none`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 rounded-lg border ${errors.phone ? 'border-red-300' : 'border-gray-300'} focus:ring-[#7e43f1] focus:border-[#7e43f1] focus:outline-none`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                      Website URL (Optional)
                    </label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://yourdomain.com"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-[#7e43f1] focus:border-[#7e43f1] focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="socialMedia" className="block text-sm font-medium text-gray-700 mb-1">
                      Social Media Handles (Optional)
                    </label>
                    <input
                      type="text"
                      id="socialMedia"
                      name="socialMedia"
                      value={formData.socialMedia}
                      onChange={handleChange}
                      placeholder="@username"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-[#7e43f1] focus:border-[#7e43f1] focus:outline-none"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="howPromote" className="block text-sm font-medium text-gray-700 mb-1">
                    How will you promote KareerFit? *
                  </label>
                  <textarea
                    id="howPromote"
                    name="howPromote"
                    rows={4}
                    value={formData.howPromote}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 rounded-lg border ${errors.howPromote ? 'border-red-300' : 'border-gray-300'} focus:ring-[#7e43f1] focus:border-[#7e43f1] focus:outline-none resize-none`}
                    placeholder="Please explain how you plan to promote KareerFit (e.g., website, social media, email newsletter, etc.)"
                  ></textarea>
                  {errors.howPromote && (
                    <p className="mt-1 text-sm text-red-600">{errors.howPromote}</p>
                  )}
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="acceptTerms"
                      name="acceptTerms"
                      type="checkbox"
                      checked={formData.acceptTerms}
                      onChange={handleChange}
                      className="h-4 w-4 text-[#7e43f1] focus:ring-[#7e43f1] border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="acceptTerms" className={`font-medium ${errors.acceptTerms ? 'text-red-600' : 'text-gray-700'}`}>
                      I agree to the Terms and Conditions *
                    </label>
                    <p className="text-gray-500">
                      By checking this box, I agree to the <Link href="/terms" className="text-[#7e43f1] hover:underline">Affiliate Program Terms & Conditions</Link>.
                    </p>
                    {errors.acceptTerms && (
                      <p className="mt-1 text-sm text-red-600">{errors.acceptTerms}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between mt-8">
                  <Link 
                    href="/dashboard" 
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}