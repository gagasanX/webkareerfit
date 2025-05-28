'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [affiliateName, setAffiliateName] = useState<string | null>(null);

  // Capture referral code on component mount
  useEffect(() => {
    // Get referral code from localStorage
    const savedReferralCode = localStorage.getItem('referralCode');
    const expiryDate = localStorage.getItem('referralCodeExpiry');
    const savedAffiliateName = localStorage.getItem('affiliateName');
    
    if (savedReferralCode && expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      
      if (now < expiry) {
        setReferralCode(savedReferralCode);
        setAffiliateName(savedAffiliateName);
        console.log('Using saved referral code:', savedReferralCode);
      } else {
        // Expired, remove from localStorage
        localStorage.removeItem('referralCode');
        localStorage.removeItem('referralCodeExpiry');
        localStorage.removeItem('affiliateName');
        console.log('Referral code expired');
      }
    }
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';

    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setServerError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          referralCode: referralCode // Include referral code in registration
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An error occurred during registration');
      }

      // Clear referral code after successful registration
      if (referralCode) {
        localStorage.removeItem('referralCode');
        localStorage.removeItem('referralCodeExpiry');
        localStorage.removeItem('affiliateName');
        console.log('Referral code cleared after successful registration');
      }

      router.push('/login?success=Account+created+successfully');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            {/* Header section */}
            <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white text-center">
              <div className="inline-block bg-white p-2 rounded-lg shadow-lg mb-4">
                <img 
                  src="https://kareerfit.com/wp-content/uploads/2025/04/kareerfit-1-e1745277544629.png" 
                  alt="KareerFit Logo" 
                  className="h-8"
                />
              </div>
              <h2 className="text-2xl font-bold">Create Your Account</h2>
              <p className="text-white/80 mt-1">Join KareerFit and discover your career path</p>
            </div>
            
            {/* Referral Code Display */}
            {referralCode && (
              <div className="mx-6 mt-6 mb-0 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      🎁 Referral Code Applied!
                    </h3>
                    <div className="mt-1 text-sm text-green-700">
                      <p>
                        You were referred by: <span className="font-semibold">{affiliateName || 'KareerFit Affiliate'}</span>
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Code: <span className="font-mono font-bold">{referralCode}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Form section */}
            <div className="p-6">
              {serverError && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg" role="alert">
                  <span className="block">{serverError}</span>
                </div>
              )}
              
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.name ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-[#7e43f1] focus:border-transparent transition-all`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.email ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-[#7e43f1] focus:border-transparent transition-all`}
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7e43f1] focus:border-transparent transition-all"
                    placeholder="+60 12 345 6789"
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.password ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-[#7e43f1] focus:border-transparent transition-all`}
                    placeholder="Create a strong password"
                  />
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.confirmPassword ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-[#7e43f1] focus:border-transparent transition-all`}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                </div>

                <div className="mt-8">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] hover:from-[#7e43f1] hover:to-[#38b6ff] text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    {loading ? 'Registering...' : 'Create Account'}
                  </Button>
                </div>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[#7e43f1] hover:text-[#38b6ff] font-medium transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-gray-500 text-sm">
                By creating an account, you agree to our{" "}
                <a href="#" className="text-[#7e43f1] hover:text-[#38b6ff]">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="text-[#7e43f1] hover:text-[#38b6ff]">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}