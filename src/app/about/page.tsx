'use client';

import React from 'react';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">About KareerFit</h1>
            <p className="text-white/90 text-lg md:text-xl">AI-Powered Career Navigation for Your Professional Journey</p>
          </div>
        </section>
        
        {/* About Section */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-12">
              <div className="p-8">
                <div className="flex flex-col md:flex-row items-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-[#7e43f1] mb-4 md:mb-0 md:mr-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Who We Are</h2>
                </div>
                
                <p className="text-gray-700 mb-6">
                  KareerFit is an AI-powered career assessment platform dedicated to helping individuals discover their ideal career paths. We combine cutting-edge artificial intelligence with deep career expertise to deliver personalized recommendations that align with your skills, experience, and aspirations.
                </p>
                
                <p className="text-gray-700 mb-6">
                  Founded with the mission to revolutionize how people navigate their professional journeys, we believe everyone deserves a career that truly fits. Our team of career experts and AI specialists work together to provide accurate, actionable insights that empower you to make confident career decisions.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div className="bg-gray-50 p-5 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Our Mission</h3>
                    <p className="text-gray-600">To empower individuals to discover and pursue fulfilling career paths through innovative AI technology and personalized guidance.</p>
                  </div>
                  
                  <div className="bg-gray-50 p-5 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Our Vision</h3>
                    <p className="text-gray-600">A world where everyone can access the insights they need to build meaningful careers aligned with their true potential.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-8">
                <div className="flex flex-col md:flex-row items-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-[#38b6ff] mb-4 md:mb-0 md:mr-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Our Approach</h2>
                </div>
                
                <p className="text-gray-700 mb-6">
                  At KareerFit, we harness the power of advanced neural networks and machine learning to analyze thousands of career patterns, skills, and success factors. Our proprietary AI technology processes this data alongside your unique profile to identify optimal career matches.
                </p>
                
                <div className="space-y-6 mt-8">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] flex items-center justify-center text-white font-bold">1</div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-800">Comprehensive Assessment</h3>
                      <p className="text-gray-600 mt-1">Our specialized assessments evaluate your skills, interests, work preferences, and career readiness at every stage of your journey.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] flex items-center justify-center text-white font-bold">2</div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-800">AI-Powered Analysis</h3>
                      <p className="text-gray-600 mt-1">Our advanced algorithms analyze your profile against successful career patterns to identify your optimal career matches.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] flex items-center justify-center text-white font-bold">3</div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-800">Personalized Guidance</h3>
                      <p className="text-gray-600 mt-1">Receive tailored recommendations and actionable steps to help you navigate your career journey with confidence.</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-10 text-center">
                  <Link 
                    href="https://my.kareerfit.com/" 
                    className="inline-block py-3 px-8 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    Start Your Assessment
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}