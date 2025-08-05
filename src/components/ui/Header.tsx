'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

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

// Define extended session user type
type ExtendedUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  isAffiliate?: boolean;
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();

  // Check if session user has isAffiliate property
  const isAffiliate = session?.user ? (session.user as ExtendedUser).isAffiliate : false;

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              {/* ===== BEAUTIFUL KAREERFIT TEXT LOGO ===== */}
              <KareerFitLogo variant="dark" size="small" />
            </Link>
            
            <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
              <Link href="/" className="text-gray-500 hover:text-[#7e43f1] px-3 py-2 text-sm font-medium">
                Home
              </Link>
              <Link href="/about" className="text-gray-500 hover:text-[#7e43f1] px-3 py-2 text-sm font-medium">
                About
              </Link>
              <Link href="/assessment" className="text-gray-500 hover:text-[#7e43f1] px-3 py-2 text-sm font-medium">
                Assessments
              </Link>
              <Link href="/contact" className="text-gray-500 hover:text-[#7e43f1] px-3 py-2 text-sm font-medium">
                Contact
              </Link>
            </div>
          </div>
          
          <div className="hidden sm:flex sm:items-center">
            {session ? (
              <div className="flex items-center space-x-4">
                {isAffiliate && (
                  <Link
                    href="/affiliate"
                    className="text-gray-500 hover:text-[#7e43f1] px-3 py-2 text-sm font-medium"
                  >
                    Affiliate
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="text-[#7e43f1] hover:text-[#38b6ff] px-3 py-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-md transition-shadow"
              >
                Sign In
              </Link>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden bg-white border-b border-gray-200">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/about"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/assessment"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              Assessments
            </Link>
            <Link
              href="/contact"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
          </div>
          
          <div className="pt-4 pb-3 border-t border-gray-200">
            {session ? (
              <div className="space-y-1">
                {isAffiliate && (
                  <Link
                    href="/affiliate"
                    className="block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Affiliate
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-base font-medium text-[#7e43f1] hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    signOut({ callbackUrl: '/' });
                  }}
                  className="w-full text-left block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="px-4 py-2">
                <Link
                  href="/login"
                  className="w-full block text-center bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white px-4 py-2 rounded-lg text-base font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}