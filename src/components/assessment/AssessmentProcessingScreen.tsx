import React, { useState, useEffect, useRef } from 'react';

// Define types for assessment info
type AssessmentType = 'fjrl' | 'ijrl' | 'cdrl' | 'ccrl' | 'ctrl' | 'rrl' | 'irl';

interface AssessmentInfo {
  title: string;
  icon: string;
  color: string;
  message: string;
}

interface AssessmentInfoMap {
  [key: string]: AssessmentInfo;
}

interface Particle {
  id: number;
  delay: number;
  duration: number;
  size: number;
  startX: number;
  startY: number;
  opacity: number;
  color: string;
}

interface AssessmentProcessingScreenProps {
  assessmentType: AssessmentType;
  assessmentId?: string;
  onComplete: () => void;
}

const AssessmentProcessingScreen: React.FC<AssessmentProcessingScreenProps> = ({ 
  assessmentType, 
  assessmentId, 
  onComplete 
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [resumeDetected, setResumeDetected] = useState<boolean>(false);
  const pollingCountRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const cleanupRef = useRef<boolean>(false);
  
  // Define assessment specific information
  const assessmentInfo: AssessmentInfoMap = {
    fjrl: {
      title: 'First Job Readiness',
      icon: '👨‍💼',
      color: 'from-blue-400 to-indigo-600',
      message: 'We\'re analyzing your readiness to enter the job market for the first time.'
    },
    ijrl: {
      title: 'Ideal Job Readiness',
      icon: '🌟',
      color: 'from-purple-400 to-pink-600',
      message: 'We\'re assessing your path to your dream career.'
    },
    cdrl: {
      title: 'Career Development Readiness',
      icon: '📈',
      color: 'from-green-400 to-teal-600',
      message: 'We\'re evaluating your potential for career advancement.'
    },
    ccrl: {
      title: 'Career Comeback Readiness',
      icon: '🔄',
      color: 'from-yellow-400 to-orange-600',
      message: 'We\'re analyzing your readiness to return to the workforce.'
    },
    ctrl: {
      title: 'Career Transition Readiness',
      icon: '🔀',
      color: 'from-red-400 to-pink-600',
      message: 'We\'re evaluating your potential for a successful career change.'
    },
    rrl: {
      title: 'Retirement Readiness',
      icon: '🏖️',
      color: 'from-blue-400 to-cyan-600',
      message: 'We\'re assessing your preparation for a fulfilling retirement.'
    },
    irl: {
      title: 'Internship Readiness',
      icon: '🎓',
      color: 'from-indigo-400 to-purple-600',
      message: 'We\'re evaluating your readiness for a successful internship experience.'
    }
  };
  
  const selectedAssessment = assessmentInfo[assessmentType] || {
    title: 'Career Readiness',
    icon: '📊',
    color: 'from-[#38b6ff] to-[#7e43f1]',
    message: 'We\'re analyzing your career readiness profile.'
  };
  
  const steps = [
    "Thank you for completing your assessment!",
    `Analyzing your ${selectedAssessment.title.toLowerCase()} profile...`,
    `Evaluating your strengths and areas for improvement...`,
    resumeDetected ? "Analyzing your resume and professional background..." : "Mapping your career path and opportunities...",
    "Generating personalized recommendations...",
    "Preparing your detailed results..."
  ];

  // Poll for actual assessment status from the server
  useEffect(() => {
    if (!assessmentId) return;
    
    cleanupRef.current = false;
    
    // Start with simulated progress first to give immediate feedback
    let progress = 0;
    const initialAnimation = () => {
      if (cleanupRef.current) return;
      
      progress += 0.5;
      if (progress <= 20) {
        setProgress(progress);
        animationRef.current = requestAnimationFrame(initialAnimation);
      } else {
        // After initial animation, switch to polling
        setIsPolling(true);
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
        }
      }
    };
    
    animationRef.current = requestAnimationFrame(initialAnimation);

    return () => {
      cleanupRef.current = true;
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [assessmentId]);
  
  // ✅ FIXED: Enhanced polling mechanism with proper error handling and limits
  useEffect(() => {
    if (!isPolling || !assessmentId) return;

    let pollCount = 0;
    const maxPollAttempts = 30; // Maximum 30 attempts (about 2-3 minutes)
    let timeoutId: NodeJS.Timeout;

    const pollStatus = async () => {
      // ✅ STOP: Check if component was unmounted or max attempts reached
      if (cleanupRef.current) return;
      
      try {
        pollCount++;
        
        // ✅ STOP: Maximum attempts reached to prevent endless polling
        if (pollCount > maxPollAttempts) {
          console.log('Max polling attempts reached, completing assessment...');
          setProgress(95);
          setTimeout(() => {
            if (!cleanupRef.current && onComplete) {
              onComplete();
            }
          }, 2000);
          return;
        }

        const response = await fetch(`/api/assessment/${assessmentType}/${assessmentId}/progress`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Handle real progress if available
          if (data.progress && typeof data.progress === 'number') {
            setProgress(Math.max(20, data.progress));
          } else {
            // Simulate gradual progress if real progress not available
            setProgress(prev => {
              const increment = (95 - prev) * 0.1;
              return Math.min(95, prev + increment);
            });
          }
          
          // Check if resume was detected
          if (data.hasResume && !resumeDetected) {
            setResumeDetected(true);
          }
          
          // ✅ PROPER: Multiple completion checks
          if (data.completed || data.aiProcessed === true || data.status === 'completed') {
            setProgress(100);
            setTimeout(() => {
              if (!cleanupRef.current && onComplete) {
                onComplete();
              }
            }, 1000);
            return;
          }
          
          // ✅ HANDLE: AI processing errors
          if (data.aiError) {
            console.log('AI processing error detected:', data.aiError);
            setTimeout(() => {
              if (!cleanupRef.current && onComplete) {
                onComplete();
              }
            }, 2000);
            return;
          }
          
          // Continue polling with increasing delay
          const nextPollDelay = Math.min(8000, 2000 + (pollCount * 200));
          
          if (!cleanupRef.current) {
            timeoutId = setTimeout(pollStatus, nextPollDelay);
          }
          
        } else if (response.status === 404) {
          // ✅ HANDLE: Missing progress endpoint gracefully
          console.log('Progress endpoint not found, using fallback simulation...');
          simulateProgressAdvance();
          
          // If we've tried enough times, just complete
          if (pollCount > 10) {
            console.log('Progress endpoint unavailable, completing assessment...');
            setTimeout(() => {
              if (!cleanupRef.current && onComplete) {
                onComplete();
              }
            }, 3000);
            return;
          }
          
          if (!cleanupRef.current) {
            timeoutId = setTimeout(pollStatus, 4000);
          }
        } else {
          // Other HTTP errors - fallback to simulation
          console.log(`Progress API returned ${response.status}, using simulation...`);
          simulateProgressAdvance();
          
          if (!cleanupRef.current) {
            timeoutId = setTimeout(pollStatus, 3000);
          }
        }
      } catch (error) {
        console.error("Error polling assessment status:", error);
        
        // ✅ GRACEFUL: Error handling with completion after too many errors
        if (pollCount > 15) {
          console.log('Too many polling errors, completing assessment...');
          setTimeout(() => {
            if (!cleanupRef.current && onComplete) {
              onComplete();
            }
          }, 2000);
          return;
        }
        
        simulateProgressAdvance();
        
        if (!cleanupRef.current) {
          timeoutId = setTimeout(pollStatus, 4000);
        }
      }
    };
    
    const simulateProgressAdvance = () => {
      setProgress(prev => {
        if (prev >= 95) return 95;
        return prev + (95 - prev) * 0.15; // Slightly faster simulation
      });
    };
    
    // Start polling
    pollStatus();
    
    // ✅ CLEANUP: Proper cleanup function
    return () => {
      cleanupRef.current = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      pollCount = maxPollAttempts + 1; // Stop polling immediately
    };
  }, [isPolling, assessmentId, assessmentType, onComplete, resumeDetected]);

  // ✅ FALLBACK: Force completion timeout to prevent infinite processing screen
  useEffect(() => {
    // Fallback timeout - force completion after 3 minutes
    const fallbackTimeout = setTimeout(() => {
      if (!cleanupRef.current) {
        console.log('Fallback timeout reached, forcing completion...');
        setProgress(100);
        if (onComplete) {
          onComplete();
        }
      }
    }, 180000); // 3 minutes

    return () => {
      clearTimeout(fallbackTimeout);
    };
  }, [onComplete]);
  
  // Update step text based on progress
  useEffect(() => {
    if (progress < 15) setCurrentStep(0);
    else if (progress < 30) setCurrentStep(1);
    else if (progress < 50) setCurrentStep(2);
    else if (progress < 70) setCurrentStep(3);
    else if (progress < 90) setCurrentStep(4);
    else setCurrentStep(5);
  }, [progress]);
  
  // Generate advanced particles with different sizes, speeds, and opacity
  const generateParticles = (): Particle[] => {
    const particles: Particle[] = [];
    const particleTypes = [
      { count: 15, size: [4, 8], opacity: [0.2, 0.4], color: 'white' },
      { count: 10, size: [6, 12], opacity: [0.1, 0.3], color: 'white' },
      { count: 5, size: [2, 5], opacity: [0.4, 0.6], color: 'white' },
    ];
    
    let id = 0;
    particleTypes.forEach(type => {
      for (let i = 0; i < type.count; i++) {
        const size = type.size[0] + Math.random() * (type.size[1] - type.size[0]);
        particles.push({
          id: id++,
          delay: Math.random() * 5,
          duration: 5 + Math.random() * 15,
          size,
          startX: Math.random() * 100,
          startY: 100 + Math.random() * 30,
          opacity: type.opacity[0] + Math.random() * (type.opacity[1] - type.opacity[0]),
          color: type.color
        });
      }
    });
    
    return particles;
  };
  
  const particles = generateParticles();

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50 p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 backdrop-blur-sm">
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.startX}%`,
              top: `${particle.startY}%`,
              opacity: particle.opacity,
              backgroundColor: particle.color,
              animation: `float ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all">
        {/* Header with gradient based on assessment type */}
        <div className={`bg-gradient-to-r ${selectedAssessment.color} p-6 text-white relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <div className="absolute w-40 h-40 rounded-full bg-white/20 -top-10 -left-10 blur-md"></div>
            <div className="absolute w-20 h-20 rounded-full bg-white/20 bottom-10 right-10 blur-sm"></div>
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <h1 className="text-xl font-bold">
              {selectedAssessment.title} Analysis
            </h1>
            <span className="text-2xl" aria-hidden="true">{selectedAssessment.icon}</span>
          </div>
        </div>
        
        <div className="p-8 text-center">
          {/* Current step display */}
          <div className="h-16 flex items-center justify-center">
            <p className="text-gray-800 font-medium animate-fadeIn transition-opacity">
              {steps[currentStep]}
            </p>
          </div>
          
          {/* Progress bar with animated gradient */}
          <div className="relative w-full h-4 bg-gray-100 rounded-full mt-6 overflow-hidden">
            <div 
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r ${selectedAssessment.color}`}
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse-light"></div>
            </div>
          </div>
          
          {/* Progress percentage */}
          <p className="mt-3 text-gray-600 text-sm font-medium">
            {Math.round(progress)}% complete
          </p>
          
          {/* Enhanced AI processing visualization */}
          <div className="mt-8 flex justify-center">
            <div className="relative w-20 h-20">
              {/* Outer spinning ring */}
              <div className={`absolute inset-0 rounded-full border-4 border-gray-100 border-t-transparent animate-spin`} style={{ animationDuration: '3s' }}></div>
              
              {/* Middle ring */}
              <div className="absolute inset-2 rounded-full border-4 border-gray-100 border-b-transparent animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
              
              {/* Inner icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`bg-gradient-to-br ${selectedAssessment.color} p-3 rounded-full shadow-lg`}>
                  <svg 
                    viewBox="0 0 24 24" 
                    className="w-6 h-6 text-white" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M7.75 12L10.58 14.83L16.25 9.17" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="animate-dash"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced message with resume detection */}
          <div className="mt-6 space-y-3">
            <p className="text-sm text-gray-600">
              {selectedAssessment.message}
            </p>
            
            {resumeDetected && (
              <div className="p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700 flex items-center animate-fadeIn">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Your resume is being analyzed to provide tailored recommendations for your professional profile.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Enhanced animation styling */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-120px) rotate(6deg);
          }
        }
        
        @keyframes pulse-light {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes dash {
          0% {
            stroke-dasharray: 1, 150;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -35;
          }
          100% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -124;
          }
        }
        
        .animate-pulse-light {
          animation: pulse-light 2s infinite;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-dash {
          animation: dash 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AssessmentProcessingScreen;