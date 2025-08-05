'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Country codes data - Malaysia first as default
const countryCodes = [
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' }, // DEFAULT - Malaysia first
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+1', country: 'United States', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
];

// Types
interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error: string;
}

interface ReferralInfo {
  code: string;
  affiliateName: string;
}

// Phone Input Component
function PhoneInput({ value, onChange, error }: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState('+60'); // Default Malaysia
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Parse existing value when component mounts
  useEffect(() => {
    if (value) {
      const country = countryCodes.find(c => value.startsWith(c.code));
      if (country) {
        setCountryCode(country.code);
        setPhoneNumber(value.replace(country.code, ''));
      } else {
        setPhoneNumber(value);
      }
    }
  }, []);

  // Update parent component when values change
  useEffect(() => {
    const fullNumber = phoneNumber ? `${countryCode}${phoneNumber}` : '';
    onChange(fullNumber);
  }, [countryCode, phoneNumber, onChange]);

  const formatPhoneNumber = (input: string, countryCode: string): string => {
    // Remove all non-digits
    const cleaned = input.replace(/\D/g, '');
    
    if (countryCode === '+60') {
      // Malaysia formatting - support both short (9-10 digits) and long (11-12 digits)
      if (cleaned.length <= 2) return cleaned;
      if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
      if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
      if (cleaned.length <= 11) return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}-${cleaned.slice(8, 12)}`;
    }
    
    // Default formatting for other countries
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatPhoneNumber(input, countryCode);
    setPhoneNumber(formatted);
  };

  const validatePhoneNumber = (phone: string, code: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (code === '+60') {
      // Malaysia: support both formats
      // Short format: 9-10 digits (mobile: 12-345-6789, 11-234-5678)
      // Long format: 11-12 digits (mobile with extra digits: 11-5633-3012, 11-2345-6789)
      return cleaned.length >= 9 && cleaned.length <= 12;
    }
    
    // Basic validation for other countries
    return cleaned.length >= 7 && cleaned.length <= 15;
  };

  const isValid = phoneNumber ? validatePhoneNumber(phoneNumber, countryCode) : true;

  return (
    <div>
      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
        Phone Number <span className="text-gray-500">(Optional)</span>
      </label>
      
      <div className="relative">
        <div className="flex">
          {/* Country Code Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-gray-100 focus:ring-2 focus:ring-[#7e43f1] focus:border-transparent transition-colors flex items-center gap-2 ${
                error && !isValid ? 'border-red-300' : ''
              }`}
            >
              <span className="text-lg">
                {countryCodes.find(c => c.code === countryCode)?.flag || '🌍'}
              </span>
              <span className="text-sm font-medium">{countryCode}</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {countryCodes.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      setCountryCode(country.code);
                      setDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 transition-colors"
                  >
                    <span className="text-lg">{country.flag}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{country.country}</div>
                      <div className="text-xs text-gray-500">{country.code}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone Number Input */}
          <input
            type="tel"
            id="phone"
            name="phone"
            value={phoneNumber}
            onChange={handlePhoneChange}
            className={`flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg focus:ring-2 focus:ring-[#7e43f1] focus:border-transparent ${
              error && !isValid ? 'border-red-300 bg-red-50' : ''
            }`}
            placeholder={countryCode === '+60' ? '12-345-6789 or 11-5633-3012' : '123-456-7890'}
          />
        </div>

        {/* Validation Message */}
        {phoneNumber && !isValid && (
          <p className="text-xs text-red-600 mt-1">
            {countryCode === '+60' 
              ? 'Please enter a valid Malaysian phone number (9-12 digits). Examples: 123456789, 1156333012'
              : 'Please enter a valid phone number'
            }
          </p>
        )}
        
        {phoneNumber && isValid && (
          <p className="text-xs text-green-600 mt-1">
            ✓ Phone number format is valid
          </p>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {dropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </div>
  );
}

// Separate component untuk logic yang pakai useSearchParams - MUST be wrapped in Suspense
function RegisterFormWithSearchParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);

  // 🚀 AUTO-DETECT REFERRAL CODE FROM URL
  useEffect(() => {
    // Safely get search params with null checks
    const refCode = searchParams?.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: refCode }));
      
      // Validate referral code and get affiliate info
      validateReferralCode(refCode);
    }
  }, [searchParams]);

  const validateReferralCode = async (code: string) => {
    try {
      const response = await fetch(`/api/referral/validate?code=${code}`);
      if (response.ok) {
        const data = await response.json();
        setReferralInfo({
          code: code,
          affiliateName: data.affiliateName || 'KareerFit Partner'
        });
      }
    } catch (error) {
      console.log('Referral code validation failed:', error);
    }
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    
    // Check if it starts with a country code
    const hasCountryCode = countryCodes.some(c => phone.startsWith(c.code));
    if (!hasCountryCode) return false;
    
    // Get the country code and number part
    const country = countryCodes.find(c => phone.startsWith(c.code));
    if (!country) return false;
    
    const numberPart = phone.replace(country.code, '').replace(/\D/g, '');
    
    if (country.code === '+60') {
      // Malaysia: 9-12 digits (support both short and long formats)
      return numberPart.length >= 9 && numberPart.length <= 12;
    }
    
    // Other countries: 7-15 digits
    return numberPart.length >= 7 && numberPart.length <= 15;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    // Phone validation
    if (formData.phone && !validatePhone(formData.phone)) {
      setError('Please enter a valid phone number with country code');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          referralCode: formData.referralCode || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('Account created successfully! Redirecting to login...');
      
      // Redirect to login with success message
      setTimeout(() => {
        router.push('/login?success=Account+created+successfully');
      }, 2000);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // If manually entering referral code, validate it
    if (name === 'referralCode' && value.length >= 3) {
      validateReferralCode(value);
    }
  };

  const handlePhoneChange = (phoneValue: string) => {
    setFormData(prev => ({
      ...prev,
      phone: phoneValue
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl font-bold">KF</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Create Your Account</h1>
          <p className="text-white/90">Join KareerFit and discover your career path</p>
        </div>

        {/* Referral Info Banner */}
        {referralInfo && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  🎉 <strong>Special Invitation!</strong> You were referred by <strong>{referralInfo.affiliateName}</strong>
                </p>
                <p className="text-xs text-green-600 mt-1">
                  You'll get exclusive access and your referrer will earn a commission when you complete an assessment.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7e43f1] focus:border-transparent"
                placeholder="Enter your full name"
              />
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
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7e43f1] focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            {/* 🚀 NEW PHONE INPUT WITH COUNTRY CODE */}
            <PhoneInput 
              value={formData.phone} 
              onChange={handlePhoneChange}
              error={error}
            />

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7e43f1] focus:border-transparent"
                placeholder="Create a strong password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7e43f1] focus:border-transparent"
                placeholder="Confirm your password"
              />
            </div>

            {/* 🚀 REFERRAL CODE INPUT */}
            <div>
              <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-1">
                Referral Code <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="text"
                id="referralCode"
                name="referralCode"
                value={formData.referralCode}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#7e43f1] focus:border-transparent ${
                  referralInfo ? 'border-green-300 bg-green-50' : 'border-gray-300'
                }`}
                placeholder="Enter referral code (e.g., KF-ABCD12)"
              />
              {referralInfo && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Valid referral code from {referralInfo.affiliateName}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white py-3 px-4 rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-[#7e43f1] hover:underline font-medium">
              Sign in
            </Link>
          </div>

          <div className="mt-4 text-xs text-gray-500 text-center">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-[#7e43f1] hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-[#7e43f1] hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced loading fallback component
function RegisterPageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl font-bold">KF</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Create Your Account</h1>
          <p className="text-white/90">Join KareerFit and discover your career path</p>
        </div>
        
        {/* Loading content */}
        <div className="p-8">
          <div className="space-y-4">
            {/* Form field skeletons */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
            
            {/* Submit button skeleton */}
            <div className="mt-6">
              <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            {/* Links skeleton */}
            <div className="mt-6 flex justify-center">
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div className="mt-4 flex justify-center">
              <div className="h-3 w-56 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component dengan Suspense wrapper
export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageFallback />}>
      <RegisterFormWithSearchParams />
    </Suspense>
  );
}