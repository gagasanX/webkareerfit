'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Client component that uses useSearchParams
function PaymentStatusClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'unknown' | 'loading'>('loading');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated') {
      checkPaymentStatus();
    }
  }, [status, router, searchParams]);
  
  const checkPaymentStatus = async () => {
    // Extract the relevant parameters based on the payment gateway
    const billplzId = searchParams.get('billplz[id]');
    const billplzPaid = searchParams.get('billplz[paid]');
    const billplzSignature = searchParams.get('billplz[x_signature]');
    const toyyibStatus = searchParams.get('status');
    const toyyibBillCode = searchParams.get('billcode');
    
    // If we have Billplz parameters
    if (billplzId) {
      try {
        // Create a set of all URL parameters to verify on server
        const billplzParams = {
          id: billplzId,
          paid: billplzPaid === 'true' ? 'true' : 'false',
          x_signature: billplzSignature || '',
        };
        
        // Call API to verify payment and update database
        const response = await fetch('/api/payment/verify-redirect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gateway: 'billplz',
            params: billplzParams
          }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setPaymentStatus(data.status === 'completed' ? 'success' : 'failed');
          setPaymentDetails({
            gateway: 'Billplz',
            reference: billplzId,
            assessmentId: data.assessmentId || null,
            assessmentType: data.assessmentType || null,
            redirectUrl: data.redirectUrl || null,
            isManualProcessing: data.isManualProcessing || false
          });
        } else {
          console.error('Payment verification failed:', data.message);
          // Still show status based on URL parameters as fallback
          if (billplzPaid === 'true') {
            setPaymentStatus('success');
          } else {
            setPaymentStatus('failed');
          }
          setPaymentDetails({
            gateway: 'Billplz',
            reference: billplzId
          });
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        // Fallback to URL parameter status
        if (billplzPaid === 'true') {
          setPaymentStatus('success');
        } else {
          setPaymentStatus('failed');
        }
        setPaymentDetails({
          gateway: 'Billplz',
          reference: billplzId
        });
      }
    } 
    // If we have Toyyibpay parameters
    else if (toyyibBillCode) {
      // Similar logic for Toyyibpay
      try {
        const toyyibParams = {
          billcode: toyyibBillCode,
          status: toyyibStatus || '',
        };
        
        const response = await fetch('/api/payment/verify-redirect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gateway: 'toyyibpay',
            params: toyyibParams
          }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setPaymentStatus(data.status === 'completed' ? 'success' : 'failed');
          setPaymentDetails({
            gateway: 'ToyyibPay',
            reference: toyyibBillCode,
            assessmentId: data.assessmentId || null,
            assessmentType: data.assessmentType || null,
            redirectUrl: data.redirectUrl || null,
            isManualProcessing: data.isManualProcessing || false
          });
        } else {
          // Fallback handling similar to Billplz
          if (toyyibStatus === '1') {
            setPaymentStatus('success');
          } else {
            setPaymentStatus('failed');
          }
          setPaymentDetails({
            gateway: 'ToyyibPay',
            reference: toyyibBillCode
          });
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        // Fallback handling
        if (toyyibStatus === '1') {
          setPaymentStatus('success');
        } else {
          setPaymentStatus('failed');
        }
        setPaymentDetails({
          gateway: 'ToyyibPay',
          reference: toyyibBillCode
        });
      }
    } else {
      setPaymentStatus('unknown');
    }
  };
  
  const getAssessmentUrl = () => {
    // If we have a specific redirect URL from the server, use that
    if (paymentDetails?.redirectUrl) {
      return paymentDetails.redirectUrl;
    }
    
    // If we have assessment details, build the URL for results page
    if (paymentDetails?.assessmentId && paymentDetails?.assessmentType) {
      return `/assessment/${paymentDetails.assessmentType}/results/${paymentDetails.assessmentId}`;
    }
    
    // Default to dashboard
    return '/dashboard';
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
          {/* Header with appropriate color based on status */}
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : paymentStatus === 'failed' ? (
                <div className="bg-white rounded-full p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : (
                <div className="bg-white rounded-full p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
          
          <div className="p-6">
            {paymentStatus === 'success' && (
              <div className="text-center">
                <p className="mb-6 text-gray-600">
                  Thank you for your payment. Your assessment is now available.
                  {paymentDetails?.isManualProcessing 
                    ? ' Our experts will review it and provide personalized results.' 
                    : ''}
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
                    {paymentDetails.isManualProcessing && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <p className="text-blue-600">
                          Your assessment will be manually reviewed by our experts. This typically takes 1-2 business days.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex flex-col space-y-3">
                  <Link
                    href={getAssessmentUrl()}
                    className="px-6 py-3 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white rounded-lg font-medium hover:shadow-lg transition-shadow text-center"
                  >
                    {paymentDetails?.isManualProcessing 
                      ? 'View Assessment Status' 
                      : 'Go to Assessment'}
                  </Link>
                </div>
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
                  We couldn't determine the status of your payment. Please check your dashboard or contact support.
                </p>
                
                <div className="flex flex-col space-y-3">
                  <Link
                    href="/dashboard"
                    className="px-6 py-3 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white rounded-lg font-medium hover:shadow-lg transition-shadow text-center"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer with support info */}
          <div className="bg-gray-50 p-4 text-center text-sm text-gray-500 border-t border-gray-100">
            <p>If you need assistance, please contact our support team.</p>
            <p className="mt-1">support@kareerfit.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fallback component for Suspense
function PaymentStatusFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
          {/* Header placeholder */}
          <div className="p-6 bg-gray-200 h-40">
            <div className="flex justify-center mb-4">
              <div className="bg-gray-300 rounded-full p-2 h-16 w-16"></div>
            </div>
            <div className="h-8 bg-gray-300 w-1/2 mx-auto"></div>
          </div>
          
          {/* Content placeholder */}
          <div className="p-6">
            <div className="text-center">
              <div className="h-4 bg-gray-200 w-3/4 mx-auto mb-6"></div>
              
              <div className="bg-gray-100 rounded-lg p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <div className="h-4 bg-gray-200 w-24"></div>
                  <div className="h-4 bg-gray-200 w-20"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 w-24"></div>
                  <div className="h-4 bg-gray-200 w-20"></div>
                </div>
              </div>
              
              <div className="h-12 bg-gray-200 rounded-lg mb-3"></div>
              <div className="h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
          
          {/* Footer placeholder */}
          <div className="bg-gray-100 p-4 text-center">
            <div className="h-4 bg-gray-200 w-2/3 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 w-1/3 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<PaymentStatusFallback />}>
      <PaymentStatusClient />
    </Suspense>
  );
}