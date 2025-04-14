'use client';

import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

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

// Inline Login Form Component with clear button styling
const LoginForm = () => {
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
      // Proper authentication using NextAuth
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

      // On successful login, redirect to dashboard
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Login failed', error);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
      
      {/* Here's the improved button with clear styling */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 px-4 mt-4 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white font-medium rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7e43f1] border border-[#6a38d1] shadow-md"
      >
        {isLoading ? 'Signing in...' : 'Log In'}
      </button>
    </form>
  );
};

export default function HomePage() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
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
          {/* Logo and name */}
          <div className="mb-10">
            <div className="inline-block bg-white p-2 rounded-lg shadow-lg mb-2">
              <img 
                src="https://kareerfit.com/wp-content/uploads/2025/01/KAREERfit.png" 
                alt="KareerFit Logo" 
                className="h-8"
              />
            </div>
            <h2 className="text-white text-lg font-medium">KareerFit</h2>
          </div>

          {/* Main content */}
          <div className="max-w-md">
            <div className="mb-8">
              <h3 className="text-white/90 text-xl font-medium mb-2">About KAREERfit</h3>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Find Your <span className="underline decoration-[#fcb3b3] decoration-4 underline-offset-4">Dream Career</span> With AI Assessment
              </h1>
              <p className="text-white/80 text-lg">
                KAREERfit is the modern way of planning your future. No more guesswork - our AI-powered reveal the perfect career match for your unique talents.
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
            © {new Date().getFullYear()} KareerFit. Transform your career journey today.
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[450px] bg-white p-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-4">
              <img 
                src="https://kareerfit.com/wp-content/uploads/2025/01/KAREERfit.png" 
                alt="KareerFit Logo" 
                className="h-8"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Welcome to</h2>
            <h1 className="text-3xl font-bold text-[#7e43f1] mb-2">KAREERfit</h1>
            <p className="text-gray-600">Sign in to discover your career path</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
            <LoginForm />
            
            <div className="mt-4 text-center">
              <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-[#38b6ff]">
                Forgot Password?
              </Link>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Don't have an account?{" "}
              <Link href="/register" className="text-[#7e43f1] hover:text-[#38b6ff] font-medium">
                Sign up
              </Link>
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-center text-gray-500 text-sm">
              By signing in, you agree to our{" "}
              <a href="#" className="text-[#7e43f1]">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="text-[#7e43f1]">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}