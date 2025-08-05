'use client';

import React, { ReactNode, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

// ===== BEAUTIFUL TEXT LOGO COMPONENT =====
const KareerFitLogo = ({ 
  variant = 'dark', 
  size = 'medium',
  className = '' 
}: { 
  variant?: 'dark' | 'light' | 'white';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}) => {
  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-3xl md:text-4xl'
  };

  const variantClasses = {
    dark: 'text-gray-800',
    light: 'text-white',
    white: 'text-white'
  };

  return (
    <div className={`font-bold ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      <span className="relative">
        KAREER
        <span className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] bg-clip-text text-transparent">
          fit
        </span>
        {/* Decorative dot */}
        <span className="inline-block w-2 h-2 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] rounded-full ml-1 animate-pulse"></span>
      </span>
    </div>
  );
};

// Enhanced Logo with Container for Left Side
const LogoWithContainer = () => (
  <div className="inline-block bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg mb-2 border border-white/20">
    <KareerFitLogo variant="white" size="medium" />
  </div>
);

// Simple Logo for Right Side
const SimpleLogo = () => (
  <div className="inline-flex items-center justify-center mb-4">
    <KareerFitLogo variant="dark" size="large" />
  </div>
);

// Define types for FloatingElement props
interface FloatingElementProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

// Animation components
const FloatingElement = ({ children, className, delay = 0 }: FloatingElementProps) => (
  <div
    className={`animate-float ${className}`}
    style={{
      animation: `float 6s ease-in-out infinite ${delay}s`,
    }}
  >
    {children}
  </div>
);

// Beta Banner Component
const BetaBanner = () => (
  <div className="bg-gradient-to-r from-orange-400 to-pink-500 text-white text-center py-2 px-4 relative overflow-hidden">
    <div className="relative z-10">
      <div className="font-bold text-sm">Beta Version</div>
      <div className="text-xs opacity-80">Experimental 2.0</div>
    </div>
    {/* Animated background elements */}
    <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-pink-500/20 animate-pulse"></div>
  </div>
);

// Referral Welcome Component
const ReferralWelcome = ({ affiliateName }: { affiliateName: string }) => (
  <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded-r-lg">
    <div className="flex">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-green-600 text-lg">🎉</span>
        </div>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-green-800">Special Invitation!</h3>
        <p className="text-sm text-green-700">
          You were referred by <strong>{affiliateName}</strong>. 
          Sign up now to get exclusive benefits on your first assessment!
        </p>
      </div>
    </div>
  </div>
);

// Inline Login Form Component with clear button styling
const LoginForm = ({ referralCode }: { referralCode?: string }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
      
    } catch (error) {
      console.error('Login failed', error);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate sign up link with referral code
  const signUpLink = referralCode ? `/register?ref=${referralCode}` : '/register';

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
            <span className="block text-sm">{error}</span>
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7e43f1] focus:border-[#7e43f1]"
            placeholder="Your email"
            required
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7e43f1] focus:border-[#7e43f1]"
            placeholder="Your password"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 mt-4 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white font-medium rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7e43f1] border border-[#6a38d1] shadow-md disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Log In'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-[#38b6ff]">
          Forgot Password?
        </Link>
      </div>
      
      {/* Sign up link with referral support */}
      <div className="mt-6 text-center">
        <p className="text-gray-600 mb-4">
          Don't have an account?{" "}
          <Link href={signUpLink} className="text-[#7e43f1] hover:text-[#38b6ff] font-medium">
            Sign up
          </Link>
          {referralCode && (
            <span className="block text-xs text-green-600 mt-1">
              ✨ With special referral benefits!
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

// Component that uses useSearchParams - MUST be wrapped in Suspense
function HomePageWithSearchParams() {
  const router = useRouter();
  const searchParams = useSearchParams(); // ✅ Now properly wrapped in Suspense
  const { data: session, status } = useSession();
  
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralInfo, setReferralInfo] = useState<{
    code: string;
    affiliateName: string;
  } | null>(null);

  // 🚀 REFERRAL DETECTION
  useEffect(() => {
    // Safely get search params with null checks
    const refCode = searchParams?.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      validateReferralCode(refCode);
    }
  }, [searchParams]);

  // Handle authenticated users redirect
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (session.user.isAdmin) {
        router.push('/admin/dashboard');
      } else if (session.user.isClerk) {
        router.push('/clerk/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [status, session, router]);

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

  // Show loading for authenticated users
  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 🚀 BETA BANNER */}
      <BetaBanner />
      
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-52px)]">
        {/* Left side - Content */}
        <div className="flex-1 bg-gradient-to-br from-[#38b6ff] to-[#7e43f1] p-8 relative overflow-hidden">
          {/* Animated elements */}
          <FloatingElement className="absolute top-24 right-24">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm"></div>
          </FloatingElement>
          <FloatingElement className="absolute bottom-32 left-16" delay={1}>
            <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
          </FloatingElement>
          <FloatingElement className="absolute top-48 left-48" delay={2}>
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm"></div>
          </FloatingElement>
          
          <div className="relative z-10 h-full flex flex-col justify-between">
            {/* ✨ BEAUTIFUL TEXT LOGO - Left Side */}
            <div className="mb-10">
              <LogoWithContainer />
              <h2 className="text-white text-lg font-medium"></h2>
            </div>

            {/* Main content */}
            <div className="max-w-md">
              <div className="mb-8">
                <h3 className="text-white/90 text-xl font-medium mb-2">About KAREERfit</h3>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Find Your <span className="underline decoration-[#fcb3b3] decoration-4 underline-offset-4">Dream Career</span> With AI Assessment
                </h1>
                <p className="text-white/80 text-lg">
                  KAREERfit is the Intelligent way of planning your future. No more guesswork - our AI-powered reveal the perfect career match for your unique talents.
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl mb-8">
                <h3 className="text-white font-semibold text-xl mb-4">Features</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-white/20 p-2 rounded-full mr-4">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    <div>
                      <p className="text-white">Discover a perfect, data-driven fit of job matching and personality.</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-white/20 p-2 rounded-full mr-4">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    <div>
                      <p className="text-white">Learn about a simple, quality test of job matching and onboarding.</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-white/20 p-2 rounded-full mr-4">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    <div>
                      <p className="text-white">Uncover potential talents you never knew you had.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-white/60 text-sm">
              V2.0.01 © {new Date().getFullYear()} CAREERXPERT SOLUTIONS (003704811-M)
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="w-full lg:w-[450px] bg-white p-8 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              {/* ✨ BEAUTIFUL TEXT LOGO - Right Side */}
              <SimpleLogo />
              <h2 className="text-2xl font-bold text-gray-800">Welcome to</h2>
              <p className="text-gray-600">Sign in to discover your career path</p>
            </div>

            {/* 🚀 REFERRAL WELCOME BANNER */}
            {referralInfo && (
              <ReferralWelcome affiliateName={referralInfo.affiliateName} />
            )}

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
              <LoginForm referralCode={referralCode} />
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-center text-gray-500 text-sm">
                By signing in, you agree to our{" "}
                <Link href="/terms" className="text-[#7e43f1] hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-[#7e43f1] hover:underline">Privacy Policy</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for float animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Loading fallback component for Suspense
function HomePageFallback() {
  return (
    <div className="min-h-screen">
      {/* Beta Banner skeleton */}
      <div className="bg-gradient-to-r from-orange-400 to-pink-500 text-white text-center py-2 px-4">
        <div className="font-bold text-sm">Beta Version</div>
        <div className="text-xs opacity-80">Experimental 2.0</div>
      </div>
      
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-52px)]">
        {/* Left side skeleton */}
        <div className="flex-1 bg-gradient-to-br from-[#38b6ff] to-[#7e43f1] p-8 relative overflow-hidden">
          <div className="relative z-10 h-full flex flex-col justify-between">
            {/* Logo skeleton */}
            <div className="mb-10">
              <div className="w-32 h-12 bg-white/20 rounded-lg mb-2 animate-pulse"></div>
            </div>

            {/* Content skeleton */}
            <div className="max-w-md">
              <div className="mb-8">
                <div className="h-6 w-32 bg-white/20 rounded animate-pulse mb-2"></div>
                <div className="h-12 bg-white/20 rounded animate-pulse mb-4"></div>
                <div className="h-20 bg-white/20 rounded animate-pulse"></div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl mb-8">
                <div className="h-6 w-24 bg-white/20 rounded animate-pulse mb-4"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start">
                      <div className="w-9 h-9 bg-white/20 rounded-full mr-4 animate-pulse"></div>
                      <div className="h-4 bg-white/20 rounded animate-pulse flex-1"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer skeleton */}
            <div className="h-4 w-64 bg-white/20 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Right side skeleton */}
        <div className="w-full lg:w-[450px] bg-white p-8 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-40 h-12 bg-gray-200 rounded animate-pulse mx-auto mb-4"></div>
              <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mx-auto mb-2"></div>
              <div className="h-10 w-40 bg-gray-200 rounded animate-pulse mx-auto mb-2"></div>
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mx-auto"></div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
              <div className="space-y-4">
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div>
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>

            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary ✅
export default function HomePage() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePageWithSearchParams />
    </Suspense>
  );
}