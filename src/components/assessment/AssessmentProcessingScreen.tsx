import React, { useState, useEffect } from 'react';

const AssessmentProcessingScreen = ({ assessmentType, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    "Thank you for completing your assessment!",
    "Analyzing your career readiness...",
    "Evaluating your strengths and areas for improvement...",
    "Generating personalized recommendations...",
    "Preparing your detailed results..."
  ];
  
  const assessmentLabels = {
    fjrl: 'First Job Readiness',
    ijrl: 'Ideal Job Readiness',
    cdrl: 'Career Development Readiness',
    ccrl: 'Career Comeback Readiness',
    ctrl: 'Career Transition Readiness',
    rrl: 'Retirement Readiness',
    irl: 'Internship Readiness',
  };
  
  const assessmentTitle = assessmentLabels[assessmentType] || 'Career Readiness';
  
  // Simulate progress
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onComplete && onComplete();
          }, 500);
          return 100;
        }
        return prev + 1;
      });
    }, 75); // Total time ≈ 7.5 seconds
    
    return () => clearInterval(timer);
  }, [onComplete]);
  
  // Update step text based on progress
  useEffect(() => {
    if (progress < 20) setCurrentStep(0);
    else if (progress < 40) setCurrentStep(1);
    else if (progress < 60) setCurrentStep(2);
    else if (progress < 80) setCurrentStep(3);
    else setCurrentStep(4);
  }, [progress]);
  
  // Calculate animation values for the particle effects
  const particleCount = 20;
  const particles = Array.from({ length: particleCount }).map((_, i) => ({
    id: i,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 7,
    size: 4 + Math.random() * 8,
    startX: Math.random() * 100,
    startY: 100 + Math.random() * 20,
  }));

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-100 to-purple-100 flex flex-col items-center justify-center z-50 p-4">
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-white opacity-60"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.startX}%`,
              top: `${particle.startY}%`,
              animation: `float ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
          <h1 className="text-xl font-bold text-center">
            {assessmentTitle} Analysis
          </h1>
        </div>
        
        <div className="p-6 text-center">
          {/* Current step display */}
          <div className="h-16 flex items-center justify-center">
            <p className="text-gray-800 font-medium">{steps[currentStep]}</p>
          </div>
          
          {/* Progress bar */}
          <div className="relative w-full h-3 bg-gray-200 rounded-full mt-6 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Progress percentage */}
          <p className="mt-3 text-gray-600 text-sm font-medium">
            {progress}% complete
          </p>
          
          {/* AI processing visualization */}
          <div className="mt-8 flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-200 border-t-[#7e43f1] rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg 
                  viewBox="0 0 24 24" 
                  className="w-8 h-8 text-[#38b6ff]" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M18.5 7.5V7.5" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Message */}
          <p className="mt-6 text-sm text-gray-500">
            Our AI is analyzing your responses to provide personalized insights.
            This process typically takes less than a minute.
          </p>
        </div>
      </div>
      
      {/* Add a bit of global animation styling */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-100px) rotate(8deg);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default AssessmentProcessingScreen;