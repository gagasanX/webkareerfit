'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Types
interface Assessment {
  id: string;
  type: string;
  status: string;
  tier?: string;
  createdAt: Date;
  payment?: Payment | null;
}

interface Payment {
  id: string;
  status: string;
  amount: number;
}

interface PricingTier {
  id: string;
  name: string;
  price: number;
  features: string[];
  description: string;
}

// Assessment pricing tiers
const pricingTiers: PricingTier[] = [
  {
    id: 'basic',
    name: 'Basic Analysis',
    price: 50,
    description: 'Essential insights to understand your career profile',
    features: [
      'Core assessment results',
      'Strength and weakness identification',
      'Basic career alignment indicators',
      'Digital report delivery'
    ]
  },
  {
    id: 'standard',
    name: 'Basic Report',
    price: 100,
    description: 'Comprehensive analysis with detailed recommendations',
    features: [
      'All Basic Analysis features',
      'Detailed personality assessment',
      'Comprehensive career recommendations',
      'Development path suggestions',
      'Personalized action plan'
    ]
  },
  {
    id: 'premium',
    name: 'Full Report + Interview',
    price: 250,
    description: 'Complete analysis with professional consultation',
    features: [
      'All Basic Report features',
      '20-minute Interview Session',
      'Personalized Q&A session',
      'Custom career roadmap',
      'Follow-up report and resources',
      'Priority email support (30 days)'
    ]
  }
];

// Assessment types
const assessmentTypes = [
  {
    id: 'fjrl',
    label: 'First Job Readiness Level',
    description: 'Ideal for fresh graduates and those entering the workforce',
    icon: '🚀',
    color: '#38b6ff',
    features: [
      'Career path identification',
      'Skills gap analysis',
      'Personalized job readiness report',
      'Entry-level position recommendations'
    ]
  },
  {
    id: 'ijrl',
    label: 'Ideal Job Readiness Level',
    description: 'Find the perfect career match for your skills and personality',
    icon: '✨',
    color: '#7e43f1',
    features: [
      'Comprehensive personality assessment',
      'Skills and interests alignment',
      'Top 10 ideal job matches',
      'Career satisfaction prediction'
    ]
  },
  {
    id: 'cdrl',
    label: 'Career Development Readiness Level',
    description: 'Plan your growth path in your current career',
    icon: '📈',
    color: '#fcb3b3',
    features: [
      'Professional growth roadmap',
      'Advancement opportunities analysis',
      'Leadership potential assessment',
      'Skill development recommendations'
    ]
  },
  {
    id: 'ccrl',
    label: 'Career Comeback Readiness Level',
    description: 'Returning to work after a break? This assessment is for you',
    icon: '🔄',
    color: '#38b6ff',
    features: [
      'Skills relevance evaluation',
      'Return-to-work strategy',
      'Market value assessment',
      'Confidence rebuilding guidance'
    ]
  },
  {
    id: 'ctrl',
    label: 'Career Transition Readiness Level',
    description: 'Changing careers? Evaluate your transition readiness',
    icon: '🔀',
    color: '#7e43f1',
    features: [
      'Transferable skills analysis',
      'Industry alignment assessment',
      'Transition difficulty prediction',
      'Step-by-step career switch plan'
    ]
  },
  {
    id: 'rrl',
    label: 'Retirement Readiness Level',
    description: 'Plan your retirement transition effectively',
    icon: '🌴',
    color: '#fcb3b3',
    features: [
      'Post-career satisfaction planning',
      'Skills and interests inventory',
      'Part-time work opportunities',
      'Life purpose rediscovery'
    ]
  },
  {
    id: 'irl',
    label: 'Internship Readiness Level',
    description: 'Prepare for successful internship experiences',
    icon: '🎓',
    color: '#38b6ff',
    features: [
      'Industry fit analysis',
      'Internship success predictors',
      'Skills development priorities',
      'Workplace readiness evaluation'
    ]
  }
];

// Client Component for Assessment Type Details Page
function AssessmentTypeDetails({ 
  assessmentType, 
  onBack, 
  sessionStatus 
}: { 
  assessmentType: any;
  onBack: () => void;
  sessionStatus: string;
}) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<string>('standard');
  const [loading, setLoading] = useState(false);
  
  // 🔥 REMOVED: Coupon-related state
  // const [couponCode, setCouponCode] = useState('');
  // const [couponApplied, setCouponApplied] = useState(false);
  // const [couponError, setCouponError] = useState('');
  // const [discountedPrice, setDiscountedPrice] = useState(0);

  // Get base price for the selected tier
  const basePrice = pricingTiers.find(t => t.id === selectedTier)?.price || 0;

  // 🔥 REMOVED: applyCoupon function

  const startAssessment = async (typeId: string, tierId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: typeId,
          tier: tierId,
          // 🔥 REMOVED: couponCode: couponApplied ? couponCode : null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create assessment');
      }

      const data = await response.json();
      router.push(`/payment/${data.id}`);
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <button 
            onClick={onBack}
            className="text-[#38b6ff] hover:text-[#7e43f1] flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to All Assessments
          </button>
          
          <Link href="/dashboard" className="text-[#7e43f1] hover:text-[#38b6ff] flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Header */}
          <div 
            className="p-6 text-white"
            style={{ backgroundColor: assessmentType.color }}
          >
            <div className="flex items-center">
              <span className="text-4xl mr-4">{assessmentType.icon}</span>
              <div>
                <h1 className="text-2xl font-bold">{assessmentType.label}</h1>
                <p className="text-white/80 mt-1">{assessmentType.description}</p>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-medium text-gray-900 mb-4">Assessment Overview</h2>
              <p className="text-gray-600 mb-6">
                The {assessmentType.label} assessment is designed to help you understand your readiness level and provide actionable insights to advance your career journey.
              </p>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">What You'll Get:</h3>
              <ul className="space-y-2 mb-6">
                {assessmentType.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">Assessment Process:</h3>
              <ol className="list-decimal list-inside space-y-2 mb-6 text-gray-700">
                <li>Select your preferred assessment package</li>
                <li>Complete payment to unlock the assessment</li>
                <li>Answer a series of targeted questions (10-20 minutes)</li>
                <li>Receive your detailed personalized report</li>
                <li>For Premium tier: Schedule your expert consultation</li>
              </ol>
              
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-blue-800 text-sm">
                  <span className="font-bold">Note:</span> Your assessment results are confidential and will only be shared with you. You can access your results anytime from your dashboard.
                </p>
              </div>
            </div>
            
            {/* Pricing tiers */}
            <div>
              <h2 className="text-xl font-medium text-gray-900 mb-4">Choose Your Package</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {pricingTiers.map((tier) => (
                  <div 
                    key={tier.id}
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${
                      selectedTier === tier.id
                        ? 'border-[#7e43f1] bg-purple-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedTier(tier.id);
                      // 🔥 REMOVED: Reset coupon when tier changes
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{tier.name}</h3>
                      <div className={`w-5 h-5 rounded-full border ${
                        selectedTier === tier.id 
                          ? 'border-[#7e43f1] bg-[#7e43f1]' 
                          : 'border-gray-300'
                      } flex items-center justify-center`}>
                        {selectedTier === tier.id && (
                          <div className="w-3 h-3 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <span className="text-2xl font-bold text-gray-900">RM {tier.price}</span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{tier.description}</p>
                    
                    <div className="space-y-2">
                      {tier.features.map((feature, index) => (
                        <div key={index} className="flex items-start">
                          <svg className="h-4 w-4 text-green-500 mr-1 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 🔥 REMOVED: Coupon input section */}

              {/* 🔥 REMOVED: Coupon error/success messages */}

              {/* Updated start button - NO COUPON LOGIC */}
              <button
                onClick={() => startAssessment(assessmentType.id, selectedTier)}
                disabled={loading}
                className={`mt-4 w-full py-3 ${
                  loading ? 'bg-gray-400' : 'bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] hover:from-[#7e43f1] hover:to-[#38b6ff]'
                } text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl`}
              >
                {loading ? 'Processing...' : `Start Assessment for RM ${basePrice}`}
              </button>
              
              <div className="text-center mt-4 text-xs text-gray-500">
                Secure payment processing with PayPal or credit card
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fallback component for AssessmentTypeDetails
function AssessmentTypeDetailsFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-gray-200 animate-pulse h-32"></div>
          
          {/* Content */}
          <div className="p-6">
            <div className="mb-6">
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="h-20 bg-gray-200 rounded animate-pulse mb-6"></div>
              
              <div className="h-6 bg-gray-200 rounded animate-pulse mb-4 w-1/3"></div>
              <div className="space-y-3 mb-6">
                <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
              </div>
              
              <div className="h-6 bg-gray-200 rounded animate-pulse mb-4 w-1/3"></div>
              <div className="space-y-3 mb-6">
                <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            
            <div className="h-8 bg-gray-200 rounded animate-pulse mb-4 w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Client Component for Assessment Selection
function AssessmentSelectionClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(searchParams?.get('type'));
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/assessment');
      return;
    }

    if (status === 'authenticated') {
      fetchAssessments();
    }
  }, [status, router]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/assessment');
      if (!response.ok) {
        throw new Error('Failed to fetch assessments');
      }
      const data = await response.json();
      setAssessments(data);
    } catch (error) {
      setError('Error loading assessments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If we're still loading authentication status, show nothing yet
  if (status === 'loading') {
    return null;
  }

  // If we're loading assessments, show the loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  // If a type is selected, show the details page for that assessment type
  if (selectedType) {
    const assessmentType = assessmentTypes.find(t => t.id === selectedType);
    
    if (!assessmentType) {
      router.push('/assessment');
      return null;
    }

    return (
      <AssessmentTypeDetails 
        assessmentType={assessmentType} 
        onBack={() => setSelectedType(null)}
        sessionStatus={status}
      />
    );
  }

  // Filter assessments by status
  const completedAssessments = assessments.filter(a => a.status === 'completed');

  // Main assessment selection page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-end mb-6">
          <Link href="/dashboard" className="text-[#7e43f1] hover:text-[#38b6ff] flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">Choose Your Assessment</h1>
          <p className="mt-2 text-lg text-gray-600">Discover the right assessment to advance your career journey</p>
          <div className="mt-3 inline-flex bg-white rounded-lg p-1">
            <div className="text-sm text-gray-600 px-3 py-2 rounded-md">
              Available in 3 tiers: 
              <span className="ml-1 font-medium">Basic Analysis (RM50)</span>, 
              <span className="ml-1 font-medium">Basic Report (RM100)</span>, 
              <span className="ml-1 font-medium">Full Report + Interview (RM250)</span>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        {/* Completed assessments section */}
        {completedAssessments.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Completed Assessments</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {completedAssessments.map((assessment, index) => {
                const assessmentType = assessmentTypes.find(t => t.id === assessment.type);
                const tierName = assessment.tier 
                  ? pricingTiers.find(t => t.id === assessment.tier)?.name
                  : 'Standard';
                return (
                  <div key={index} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div 
                      className="p-3 text-white"
                      style={{ backgroundColor: assessmentType?.color || '#38b6ff' }}
                    >
                      <div className="flex items-center">
                        <span className="text-xl mr-2">{assessmentType?.icon || '📝'}</span>
                        <div>
                          <h3 className="font-medium text-sm">{assessmentType?.label || assessment.type}</h3>
                          <div className="text-xs text-white/80">{tierName}</div>
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-xs text-gray-500 mb-2">Completed on {new Date(assessment.createdAt).toLocaleDateString()}</div>
                      <Link 
                        href={`/assessment/${assessment.type}/results/${assessment.id}`}
                        className="w-full inline-block text-center py-2 bg-white border border-[#7e43f1] text-[#7e43f1] rounded-lg text-xs hover:bg-[#7e43f1] hover:text-white transition-colors"
                      >
                        View Results
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Available assessments section */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Assessments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessmentTypes.map((type, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div 
                className="p-4 text-white"
                style={{ backgroundColor: type.color }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{type.label}</h3>
                  <span className="text-2xl">{type.icon}</span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-gray-600 text-sm mb-4 h-12">{type.description}</p>
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-500">Starting from</div>
                    <div className="text-xl font-bold text-gray-900">RM 50</div>
                  </div>
                  <div className="text-xs text-white bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] px-2 py-1 rounded-full">
                    3 packages available
                  </div>
                </div>
                
                <div className="space-y-1 mb-4">
                  {type.features.slice(0, 2).map((feature, i) => (
                    <div key={i} className="flex items-center text-xs text-gray-600">
                      <svg className="h-3 w-3 text-green-500 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{feature}</span>
                    </div>
                  ))}
                  {type.features.length > 2 && (
                    <div className="text-xs text-gray-500">+{type.features.length - 2} more features</div>
                  )}
                </div>
                
                <button
                  onClick={() => setSelectedType(type.id)}
                  className="w-full py-2 bg-[#7e43f1] text-white rounded-lg text-sm hover:bg-[#6a38d1]"
                >
                  View Packages
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pricing tiers comparison */}
        <div className="mt-16 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Package Comparison</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Features</th>
                  {pricingTiers.map(tier => (
                    <th key={tier.id} className="px-4 py-3 text-center">
                      <div className="font-medium text-gray-900">{tier.name}</div>
                      <div className="text-lg font-bold text-gray-900">RM {tier.price}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 text-gray-700">Assessment Questionnaire</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 text-gray-700">Core Strengths & Weaknesses</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 text-gray-700">Career Alignment Score</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 text-gray-700">Detailed Personality Profile</td>
                  <td className="px-4 py-3 text-center text-red-500">✗</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 text-gray-700">Career Recommendations</td>
                  <td className="px-4 py-3 text-center text-red-500">✗</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 text-gray-700">Development Path Suggestions</td>
                  <td className="px-4 py-3 text-center text-red-500">✗</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 text-gray-700">Interview Session (20-mins)</td>
                  <td className="px-4 py-3 text-center text-red-500">✗</td>
                  <td className="px-4 py-3 text-center text-red-500">✗</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 text-gray-700">Personalized Q&A Session</td>
                  <td className="px-4 py-3 text-center text-red-500">✗</td>
                  <td className="px-4 py-3 text-center text-red-500">✗</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 text-gray-700">Custom Career Roadmap</td>
                  <td className="px-4 py-3 text-center text-red-500">✗</td>
                  <td className="px-4 py-3 text-center text-red-500">✗</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-700">Priority Support</td>
                  <td className="px-4 py-3 text-center text-red-500">✗</td>
                  <td className="px-4 py-3 text-center text-red-500">✗</td>
                  <td className="px-4 py-3 text-center text-green-500">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* FAQ section */}
        <div className="mt-16">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-5 shadow-sm">
              <h3 className="font-medium text-gray-900 mb-2">How long does an assessment take?</h3>
              <p className="text-gray-600 text-sm">Most assessments take between 10-20 minutes to complete. You can save your progress and return later if needed.</p>
            </div>
            <div className="bg-white rounded-lg p-5 shadow-sm">
              <h3 className="font-medium text-gray-900 mb-2">What's the difference between the packages?</h3>
              <p className="text-gray-600 text-sm">The Basic Analysis provides core insights, the Basic Report adds detailed recommendations, and the Full Report includes a personal consultation with a career expert.</p>
            </div>
            <div className="bg-white rounded-lg p-5 shadow-sm">
              <h3 className="font-medium text-gray-900 mb-2">When is the expert consultation scheduled?</h3>
              <p className="text-gray-600 text-sm">After completing your assessment, If you take ultimate plan, you'll receive a link to schedule your 20-minute interview session at a time convenient for you within the next 14 days.</p>
            </div>
            <div className="bg-white rounded-lg p-5 shadow-sm">
              <h3 className="font-medium text-gray-900 mb-2">Do you offer refunds?</h3>
              <p className="text-gray-600 text-sm">Satisfaction guarantee. If you're not happy with your assessment, contact our support team within 7 days of completion.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fallback component for AssessmentSelectionClient
function AssessmentSelectionFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-end mb-6">
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div className="text-center mb-12">
          <div className="h-10 bg-gray-200 rounded animate-pulse w-1/2 mx-auto mb-4"></div>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4 mx-auto mb-4"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse w-2/3 mx-auto"></div>
        </div>
        
        <div className="h-8 bg-gray-200 rounded animate-pulse mb-4 w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-200 h-20 animate-pulse"></div>
              <div className="p-4">
                <div className="h-12 bg-gray-200 rounded animate-pulse mb-4"></div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundaries
export default function AssessmentPage() {
  return (
    <Suspense fallback={<AssessmentSelectionFallback />}>
      <AssessmentSelectionClient />
    </Suspense>
  );
}