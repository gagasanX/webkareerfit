'use client';

// /src/app/payment/status/page.tsx - FINAL VERSION (Schema Compatible)

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface PaymentDetails {
  gateway: string;
  reference: string;
  assessmentId?: string;
  assessmentType?: string;
  redirectUrl?: string;
}

function PaymentStatusClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'unknown' | 'loading'>('loading');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated') {
      checkPaymentStatus();
    }
  }, [status, router]);
  
  const checkPaymentStatus = async () => {
    try {
      setError(null);
      
      // Extract Billplz parameters
      const billplzId = searchParams.get('billplz[id]');
      const billplzPaid = searchParams.get('billplz[paid]');
      const billplzSignature = searchParams.get('billplz[x_signature]');
      
      console.log('🔍 Payment status check:', {
        billplzId,
        billplzPaid,
        hasSignature: !!billplzSignature,
        allParams: Object.fromEntries(searchParams.entries())
      });
      
      if (billplzId) {
        const verificationData = {
          gateway: 'billplz',
          params: {
            id: billplzId,
            paid: billplzPaid === 'true' ? 'true' : 'false',
            x_signature: billplzSignature || '',
          }
        };
        
        console.log('📤 Sending verification:', verificationData);
        
        const response = await fetch('/api/payment/verify-redirect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(verificationData),
        });
        
        const data = await response.json();
        console.log('📥 Verification response:', data);
        
        if (response.ok && data.success) {
          setPaymentStatus(data.status === 'completed' ? 'success' : 'failed');
          setPaymentDetails({
            gateway: 'Billplz',
            reference: billplzId,
            assessmentId: data.assessmentId,
            assessmentType: data.assessmentType,
            redirectUrl: data.redirectUrl
          });
        } else {
          console.error('Verification failed:', data.message);
          setError(data.message || 'Verification failed');
          
          // Fallback based on URL params
          setPaymentStatus(billplzPaid === 'true' ? 'success' : 'failed');
          setPaymentDetails({
            gateway: 'Billplz',
            reference: billplzId
          });
        }
      } else {
        // Check for other payment gateways
        const toyyibBillCode = searchParams.get('billcode');
        const toyyibStatus = searchParams.get('status');
        
        if (toyyibBillCode) {
          setPaymentStatus(toyyibStatus === '1' ? 'success' : 'failed');
          setPaymentDetails({
            gateway: 'ToyyibPay',
            reference: toyyibBillCode
          });
        } else {
          setPaymentStatus('unknown');
          setError('No payment parameters found in URL');
        }
      }
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setPaymentStatus('unknown');
    }
  };
  
  const handleGoToAssessment = async () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    
    try {
      let targetUrl = '/dashboard';
      
      // Priority 1: Use redirect URL from API
      if (paymentDetails?.redirectUrl) {
        targetUrl = paymentDetails.redirectUrl;
        console.log('✅ Using API redirect URL:', targetUrl);
      }
      // Priority 2: Build URL from assessment data
      else if (paymentDetails?.assessmentId && paymentDetails?.assessmentType) {
        targetUrl = `/assessment/${paymentDetails.assessmentType}/${paymentDetails.assessmentId}`;
        console.log('✅ Building URL from assessment data:', targetUrl);
      }
      // Priority 3: Try to fetch assessment data by bill ID
      else if (paymentDetails?.reference) {
        console.log('🔍 Fetching assessment by bill ID...');
        try {
          const response = await fetch('/api/payment/get-assessment-by-bill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ billId: paymentDetails.reference })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.assessment) {
              targetUrl = `/assessment/${data.assessment.type}/${data.assessment.id}`;
              console.log('✅ Found assessment via bill lookup:', targetUrl);
              
              // Update state for future reference
              setPaymentDetails(prev => ({
                ...prev!,
                assessmentId: data.assessment.id,
                assessmentType: data.assessment.type,
                redirectUrl: targetUrl
              }));
            }
          } else {
            console.warn('⚠️ Bill lookup failed:', response.status);
          }
        } catch (error) {
          console.error('❌ Bill lookup error:', error);
        }
      }
      
      console.log('🚀 Navigating to:', targetUrl);
      
      // Navigate using Next.js router for internal routes
      if (targetUrl.startsWith('/')) {
        await router.push(targetUrl);
      } else {
        // For external URLs, use window.location
        window.location.href = targetUrl;
      }
      
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Fallback: Force page refresh to dashboard
      window.location.href = '/dashboard';
    } finally {
      setIsNavigating(false);
    }
  };
  
  if (status === 'loading' || paymentStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying payment status...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          
          {/* Header */}
          <div className={`p-6 text-white ${
            paymentStatus === 'success' 
              ? 'bg-gradient-to-r from-emerald-400 to-green-500' 
              : paymentStatus === 'failed'
              ? 'bg-gradient-to-r from-rose-400 to-red-500'
              : 'bg-gradient-to-r from-amber-400 to-orange-500'
          }`}>
            <div className="flex justify-center mb-4">
              {paymentStatus === 'success' ? (
                <div className="bg-white rounded-full p-2">
                  <svg className="h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : paymentStatus === 'failed' ? (
                <div className="bg-white rounded-full p-2">
                  <svg className="h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : (
                <div className="bg-white rounded-full p-2">
                  <svg className="h-12 w-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M6.938 17h10.124a1.5 1.5 0 001.313-2.25L13.313 7.5a1.5 1.5 0 00-2.626 0L5.625 14.75A1.5 1.5 0 006.938 17z" />
                  </svg>
                </div>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-center">
              {paymentStatus === 'success' 
                ? 'Payment Successful' 
                : paymentStatus === 'failed'
                ? 'Payment Failed'
                : 'Payment Status Unknown'}
            </h1>
          </div>
          
          {/* Content */}
          <div className="p-6">
            
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">⚠️ {error}</p>
              </div>
            )}
            
            {paymentStatus === 'success' && (
              <div className="text-center">
                <p className="mb-6 text-gray-600">
                  Thank you for your payment. Your assessment is now available.
                </p>
                
                {paymentDetails && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500">Payment Gateway:</span>
                      <span className="font-medium">{paymentDetails.gateway}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500">Reference:</span>
                      <span className="font-medium">{paymentDetails.reference}</span>
                    </div>
                    {paymentDetails.assessmentId && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Assessment:</span>
                        <span className="font-medium">{paymentDetails.assessmentType?.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={handleGoToAssessment}
                  disabled={isNavigating}
                  className="w-full px-6 py-3 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isNavigating ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    'Go to Assessment'
                  )}
                </button>
              </div>
            )}
            
            {paymentStatus === 'failed' && (
              <div className="text-center">
                <p className="mb-6 text-gray-600">
                  We couldn't process your payment. Please try again.
                </p>
                
                {paymentDetails && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500">Payment Gateway:</span>
                      <span className="font-medium">{paymentDetails.gateway}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reference:</span>
                      <span className="font-medium">{paymentDetails.reference}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col space-y-3">
                  <Link
                    href="/dashboard"
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center"
                  >
                    Back to Dashboard
                  </Link>
                  
                  <button
                    onClick={() => router.back()}
                    className="px-6 py-3 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
            
            {paymentStatus === 'unknown' && (
              <div className="text-center">
                <p className="mb-6 text-gray-600">
                  We couldn't determine your payment status. Please check your dashboard or contact support.
                </p>
                
                <div className="flex flex-col space-y-3">
                  <Link
                    href="/dashboard"
                    className="px-6 py-3 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white rounded-lg font-medium hover:shadow-lg transition-shadow text-center"
                  >
                    Go to Dashboard
                  </Link>
                  
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 p-4 text-center text-sm text-gray-500 border-t">
            <p>Need help? Contact support@kareerfit.com</p>
            {/* Debug info (remove in production) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs">Debug Info</summary>
                <pre className="text-xs mt-2 text-left overflow-auto">
                  {JSON.stringify({
                    paymentStatus,
                    paymentDetails,
                    error,
                    urlParams: Object.fromEntries(searchParams.entries())
                  }, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentStatusFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading payment status...</p>
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<PaymentStatusFallback />}>
      <PaymentStatusClient />
    </Suspense>
  );
}