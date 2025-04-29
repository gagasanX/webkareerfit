'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CouponInput from '@/components/CouponInput';

interface PaymentClientProps {
  assessment: any;
  basePrice: number;
  assessmentLabel: string;
  packageLabel: string;
  user: any;
}

export default function PaymentClient({ 
  assessment, 
  basePrice, 
  assessmentLabel,
  packageLabel,
  user 
}: PaymentClientProps) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState<number>(basePrice);
  const [discount, setDiscount] = useState<number>(0);
  
  console.log(`[PaymentClient] Initial render - Tier: ${assessment.tier}, Base Price: ${basePrice}, Final Price: ${finalPrice}`);
  
  // Ensure finalPrice is properly initialized and updated when basePrice changes
  useEffect(() => {
    console.log(`[PaymentClient] basePrice changed: ${basePrice}`);
    setFinalPrice(basePrice - discount);
  }, [basePrice, discount]);
  
  // Check if the assessment is free (price is 0)
  const isFree = finalPrice <= 0;
  
  // If the assessment is free, process it automatically and redirect
  useEffect(() => {
    const processFreeAssessment = async () => {
      if (isFree && !isProcessing) {
        setIsProcessing(true);
        try {
          // Process the free assessment
          const response = await fetch('/api/payment/complete-free', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              assessmentId: assessment.id,
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to process free assessment');
          }
          
          // Redirect to the assessment page
          router.push(`/assessment/${assessment.type}/${assessment.id}`);
        } catch (err) {
          setError('Error processing free assessment. Please try again.');
          setIsProcessing(false);
        }
      }
    };
    
    processFreeAssessment();
  }, [isFree, assessment, router, isProcessing]);
  
  const handleApplyCoupon = (discountAmount: number, newPrice: number) => {
    console.log(`[PaymentClient] Coupon applied - Discount: ${discountAmount}, New Price: ${newPrice}`);
    setDiscount(discountAmount);
    setFinalPrice(newPrice);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    // Always prevent default to stop form from reloading the page
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    console.log("Submit handler called");
    
    if (isProcessing) {
      console.log("Already processing, ignoring click");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    console.log(`[PaymentClient] Submitting payment - Amount: ${finalPrice}, Method: ${paymentMethod}`);
    
    try {
      // If the assessment is free, use the free completion endpoint
      if (isFree) {
        const response = await fetch('/api/payment/complete-free', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assessmentId: assessment.id,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to process free assessment');
        }
        
        // Redirect to assessment page
        router.push(`/assessment/${assessment.type}/${assessment.id}`);
        return;
      }
      
      // For paid assessments, proceed with normal payment flow using the create endpoint
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentId: assessment.id,
          amount: finalPrice,
          method: paymentMethod,
          // Include the tier for debugging
          tier: assessment.tier
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment');
      }
      
      const data = await response.json();
      console.log(`[PaymentClient] Payment created successfully - Redirecting to: ${data.paymentUrl}`);
      
      // Redirect to payment gateway
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('No payment URL provided');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment processing failed. Please try again.');
      setIsProcessing(false);
    }
  };
  
  // Debug output
  console.log("[PaymentClient Debug]", {
    isFree,
    isProcessing,
    paymentMethod,
    finalPrice,
    basePrice,
    assessmentId: assessment.id,
    tier: assessment.tier
  });
  
  // If assessment is free and being processed, show a loading state
  if (isFree && isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto"></div>
          <h2 className="mt-4 text-xl font-bold text-gray-800">Processing Your Free Assessment</h2>
          <p className="mt-2 text-gray-600">You'll be redirected to your assessment shortly...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
            <h1 className="text-2xl font-bold">Assessment Payment</h1>
            <p className="opacity-90">Complete your payment to access your assessment</p>
          </div>
          
          <div className="p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Order Summary */}
              <div>
                <h2 className="text-lg font-medium text-gray-800 mb-4">Order Summary</h2>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Assessment Type:</span>
                    <span className="font-medium">{assessmentLabel}</span>
                  </div>
                  
                  <div className="flex justify-between mb-4">
                    <span className="text-gray-600">Package:</span>
                    <span className="font-medium">{packageLabel}</span>
                  </div>
                  
                  <div className="border-t border-gray-200 my-3 pt-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">Base Price:</span>
                      <span>RM {basePrice.toFixed(2)}</span>
                    </div>
                    
                    {discount > 0 && (
                      <div className="flex justify-between mb-1 text-green-600">
                        <span>Discount:</span>
                        <span>-RM {discount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between mt-2 font-bold">
                      <span>Total Amount:</span>
                      <span>RM {finalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Coupon Section */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Have a coupon code?</h3>
                  <CouponInput
                    assessmentId={assessment.id}
                    assessmentType={assessment.type}
                    originalPrice={basePrice}
                    onApplyCoupon={handleApplyCoupon}
                  />
                </div>
              </div>
              
              {/* Payment Methods */}
              {!isFree && (
                <div>
                  <h2 className="text-lg font-medium text-gray-800 mb-4">Payment Method</h2>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-3">
                      <label className="flex items-center p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="card"
                          checked={paymentMethod === 'card'}
                          onChange={() => setPaymentMethod('card')}
                          className="h-4 w-4 text-[#7e43f1] focus:ring-[#7e43f1]"
                        />
                        <div className="ml-3">
                          <span className="font-medium text-gray-800">Credit/Debit Card</span>
                          <p className="text-xs text-gray-500 mt-1">Pay securely with your card</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="fpx"
                          checked={paymentMethod === 'fpx'}
                          onChange={() => setPaymentMethod('fpx')}
                          className="h-4 w-4 text-[#7e43f1] focus:ring-[#7e43f1]"
                        />
                        <div className="ml-3">
                          <span className="font-medium text-gray-800">Online Banking (FPX)</span>
                          <p className="text-xs text-gray-500 mt-1">Pay using your local bank account</p>
                        </div>
                      </label>
                    </div>
                    
                    {error && (
                      <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                        {error}
                      </div>
                    )}
                    
                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <button
                        type="submit" 
                        onClick={handleSubmit}
                        disabled={isProcessing}
                        className="flex-1 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white py-2 px-4 rounded-lg hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#7e43f1] focus:ring-opacity-50 disabled:opacity-70"
                      >
                        {isProcessing ? 'Processing...' : `Pay RM ${finalPrice.toFixed(2)}`}
                      </button>
                      
                      <Link
                        href="/dashboard"
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-center"
                      >
                        Cancel
                      </Link>
                    </div>
                  </form>
                </div>
              )}
              
              {/* Free Assessment Message */}
              {isFree && (
                <div>
                  <h2 className="text-lg font-medium text-gray-800 mb-4">Free Assessment</h2>
                  
                  <div className="bg-green-50 p-4 rounded-lg text-green-800">
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-medium">Your assessment is free!</p>
                        <p className="text-sm mt-1">Your coupon has been applied successfully. No payment is required.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleSubmit}
                      disabled={isProcessing}
                      className="flex-1 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white py-2 px-4 rounded-lg hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#7e43f1] focus:ring-opacity-50 disabled:opacity-70"
                    >
                      {isProcessing ? 'Processing...' : 'Start Assessment Now'}
                    </button>
                    
                    <Link
                      href="/dashboard"
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-center"
                    >
                      Cancel
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main page payment button (visible in your screenshot) - make sure this is rendered on the page */}
      {basePrice > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="px-8 py-3 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] text-white font-bold rounded-lg hover:shadow-lg text-lg"
          >
            {isProcessing ? 'Processing...' : `Start Assessment for RM ${finalPrice}`}
          </button>
        </div>
      )}
    </div>
  );
}