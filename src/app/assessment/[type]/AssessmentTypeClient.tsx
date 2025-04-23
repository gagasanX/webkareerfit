'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

export function AssessmentTypeClient({ assessmentType }: { assessmentType: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState('basic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  
  // Authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/assessment/${assessmentType}`);
      return;
    }
    
    if (status === 'authenticated') {
      setLoading(false);
    }
  }, [status, router, assessmentType]);

  // Calculate prices based on tier
  const tierPrices = {
    basic: 50,
    standard: 100,
    premium: 250,
  };
  
  const selectedPrice = tierPrices[selectedTier as keyof typeof tierPrices];
  
  // Map assessment types to readable labels
  const assessmentLabels: {[key: string]: string} = {
    fjrl: 'First Job Readiness Level',
    ijrl: 'Ideal Job Readiness Level',
    cdrl: 'Career Development Readiness Level',
    ccrl: 'Career Comeback Readiness Level',
    ctrl: 'Career Transition Readiness Level',
    rrl: 'Retirement Readiness Level',
    irl: 'Internship Readiness Level',
  };
  
  const assessmentLabel = assessmentLabels[assessmentType] || assessmentType.toUpperCase();
  
  // Handle tier selection
  const handleTierSelect = (tier: string) => {
    console.log(`Selected tier: ${tier} with price: ${tierPrices[tier as keyof typeof tierPrices]}`);
    setSelectedTier(tier);
    setDebugInfo(`Selected ${tier} tier - RM ${tierPrices[tier as keyof typeof tierPrices]}`);
  };
  
  // Handle start assessment
  const handleStartAssessment = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    setDebugInfo(`Starting assessment with tier: ${selectedTier}, price: RM ${selectedPrice}`);
    
    try {
      // Create the assessment
      setDebugInfo(`Creating assessment with type: ${assessmentType}, tier: ${selectedTier}`);
      const createResponse = await fetch('/api/assessment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: assessmentType,
          tier: selectedTier,
        }),
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to create assessment');
      }
      
      const assessment = await createResponse.json();
      console.log('Assessment created:', assessment);
      setDebugInfo(`Assessment created with ID: ${assessment.id}, tier: ${assessment.tier}`);
      
      // IMPORTANT: Update the tier and price regardless of which tier was selected
      // This ensures the tier is explicitly set for all cases
      console.log(`Updating assessment tier to: ${selectedTier}`);
      setDebugInfo(`Updating tier to: ${selectedTier}, price: RM ${selectedPrice}`);
      
      const updateTierResponse = await fetch(`/api/assessment/${assessmentType}/${assessment.id}/update-tier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: selectedTier,
        }),
      });
      
      if (!updateTierResponse.ok) {
        console.error('Failed to update tier, but continuing...');
        setDebugInfo(`Error updating tier: ${updateTierResponse.status}`);
      } else {
        const updateResult = await updateTierResponse.json();
        console.log('Tier update result:', updateResult);
        setDebugInfo(`Tier updated successfully. Result: ${JSON.stringify(updateResult)}`);
      }
      
      // Double-check the assessment after update
      const verifyResponse = await fetch(`/api/assessment/${assessmentType}/${assessment.id}`, {
        method: 'GET',
      });
      
      if (verifyResponse.ok) {
        const verifiedAssessment = await verifyResponse.json();
        setDebugInfo(`Verified assessment: tier=${verifiedAssessment.tier}, price=${verifiedAssessment.price}`);
      }
      
      // Add a slight delay to ensure the database update propagates
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to payment with cache-busting query parameter
      const now = new Date().getTime();
      router.push(`/payment/${assessment.id}?t=${now}`);
    } catch (err) {
      console.error('Error starting assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to start assessment. Please try again.');
      setDebugInfo(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  };
  
  // Handle coupon code (placeholder)
  const handleApplyCoupon = () => {
    // Coupon logic would go here
    console.log('Applying coupon:', couponCode);
  };
  
  if (loading) return <div className="flex justify-center items-center min-h-screen">
    <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
  </div>;
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{assessmentLabel}</h1>
      <p className="text-gray-600 mb-8">Career satisfaction prediction</p>
      
      {debugInfo && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <strong>Debug Info:</strong> {debugInfo}
        </div>
      )}
      
      <div className="bg-blue-50 p-4 rounded-md mb-8">
        <h2 className="font-medium mb-3">Assessment Process:</h2>
        <ol className="space-y-2 list-decimal pl-6">
          <li>Select your preferred assessment package</li>
          <li>Complete payment to unlock the assessment</li>
          <li>Answer a series of targeted questions (10-20 minutes)</li>
          <li>Receive your detailed personalized report</li>
          <li>For Premium tier: Schedule your expert consultation</li>
        </ol>
        
        <div className="mt-4 bg-blue-100 p-3 rounded text-sm text-blue-800">
          <strong>Note:</strong> Your assessment results are confidential and will only be shared with you. You can access your results anytime from your dashboard.
        </div>
      </div>
      
      <h2 className="text-xl font-bold mb-6">Choose Your Package</h2>
      
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Basic Analysis Tier */}
        <div 
          className={`border rounded-lg p-6 cursor-pointer transition-all ${
            selectedTier === 'basic' 
              ? 'border-2 border-[#38b6ff] ring-2 ring-[#38b6ff] ring-opacity-30' 
              : 'hover:border-gray-300'
          }`}
          onClick={() => handleTierSelect('basic')}
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold">Basic Analysis</h3>
            <div className="w-5 h-5 rounded-full flex items-center justify-center">
              {selectedTier === 'basic' ? (
                <div className="w-5 h-5 rounded-full border-2 border-[#38b6ff] flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[#38b6ff]"></div>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
              )}
            </div>
          </div>
          
          <div className="text-xl font-bold text-gray-800 mb-4">RM 50</div>
          
          <p className="text-sm text-gray-600 mb-4">
            Essential insights to understand your career profile
          </p>
          
          <ul className="space-y-2">
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">Core assessment results</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">Strength and weakness identification</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">Basic career alignment indicators</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">Digital report delivery</span>
            </li>
          </ul>
        </div>
        
        {/* Basic Report Tier */}
        <div 
          className={`border rounded-lg p-6 cursor-pointer transition-all ${
            selectedTier === 'standard' 
              ? 'border-2 border-[#38b6ff] ring-2 ring-[#38b6ff] ring-opacity-30' 
              : 'hover:border-gray-300'
          }`}
          onClick={() => handleTierSelect('standard')}
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold">Basic Report</h3>
            <div className="w-5 h-5 rounded-full flex items-center justify-center">
              {selectedTier === 'standard' ? (
                <div className="w-5 h-5 rounded-full border-2 border-[#38b6ff] flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[#38b6ff]"></div>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
              )}
            </div>
          </div>
          
          <div className="text-xl font-bold text-gray-800 mb-4">RM 100</div>
          
          <p className="text-sm text-gray-600 mb-4">
            Comprehensive analysis with detailed recommendations
          </p>
          
          <ul className="space-y-2">
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">All Basic Analysis features</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">Detailed personality assessment</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">Comprehensive career recommendations</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">Development path suggestions</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">Personalized action plan</span>
            </li>
          </ul>
        </div>
        
        {/* Full Report + Interview Tier */}
        <div 
          className={`border rounded-lg p-6 cursor-pointer transition-all ${
            selectedTier === 'premium' 
              ? 'border-2 border-[#38b6ff] ring-2 ring-[#38b6ff] ring-opacity-30' 
              : 'hover:border-gray-300'
          }`}
          onClick={() => handleTierSelect('premium')}
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold">Full Report + Interview</h3>
            <div className="w-5 h-5 rounded-full flex items-center justify-center">
              {selectedTier === 'premium' ? (
                <div className="w-5 h-5 rounded-full border-2 border-[#38b6ff] flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[#38b6ff]"></div>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
              )}
            </div>
          </div>
          
          <div className="text-xl font-bold text-gray-800 mb-4">RM 250</div>
          
          <p className="text-sm text-gray-600 mb-4">
            Complete analysis with professional consultation
          </p>
          
          <ul className="space-y-2">
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">All Basic Report features</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">20-minute Interview Session</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">Personalized Q&A session</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">Custom career roadmap</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">Follow-up report and resources</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2" />
              <span className="text-sm">Priority email support (30 days)</span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Coupon Section */}
      <div className="flex flex-col md:flex-row items-center gap-3 mb-8">
        <input 
          type="text" 
          className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#38b6ff]"
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
        />
        <button 
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          onClick={handleApplyCoupon}
        >
          Apply
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      <button
        onClick={handleStartAssessment}
        disabled={isProcessing}
        className="w-full bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white py-3 rounded-md hover:shadow-lg transition-all disabled:opacity-70"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          `Start Assessment for RM ${selectedPrice}`
        )}
      </button>
      
      <p className="text-xs text-center text-gray-500 mt-3">
        Secure payment processing with FPX or credit card
      </p>
    </div>
  );
}