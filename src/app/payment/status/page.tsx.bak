'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function PaymentStatusPage() {
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
    const toyyibStatus = searchParams.get('status');
    const toyyibBillCode = searchParams.get('billcode');
    
    // Determine payment status from URL parameters
    if (billplzId && billplzPaid === 'true') {
      setPaymentStatus('success');
      setPaymentDetails({
        gateway: 'Billplz',
        reference: billplzId
      });
    } else if (billplzId && billplzPaid === 'false') {
      setPaymentStatus('failed');
      setPaymentDetails({
        gateway: 'Billplz',
        reference: billplzId
      });
    } else if (toyyibStatus === '1' && toyyibBillCode) {
      setPaymentStatus('success');
      setPaymentDetails({
        gateway: 'ToyyibPay',
        reference: toyyibBillCode
      });
    } else if (toyyibStatus && toyyibStatus !== '1' && toyyibBillCode) {
      setPaymentStatus('failed');
      setPaymentDetails({
        gateway: 'ToyyibPay',
        reference: toyyibBillCode
      });
    } else {
      setPaymentStatus('unknown');
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
                    className="px-6 py-3 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white rounded-lg font-medium hover:shadow-lg transition-shadow text-center"
                  >
                    Go to Dashboard
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