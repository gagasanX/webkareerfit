// /src/app/payment/[assessmentId]/MinimalPaymentClient.tsx - WITH DEBUG LOGS
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MinimalPaymentClientProps {
  assessmentId: string;
  assessmentType: string;
  tier: string;
  basePrice: number;
}

export default function MinimalPaymentClient({
  assessmentId,
  assessmentType,
  tier,
  basePrice
}: MinimalPaymentClientProps) {
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState(basePrice);
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState<string | null>(null);

  // 🔥 DEBUG: Log initial state
  console.log('💰 Initial Payment State:', {
    assessmentId,
    assessmentType,
    tier,
    basePrice,
    finalPrice,
    discount,
    couponApplied
  });

  // 🔥 ENHANCED: Coupon validation with comprehensive debugging
  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      console.log('❌ Empty coupon code');
      return;
    }
    
    console.log('🎫 Starting coupon validation...');
    console.log('📊 Current State BEFORE validation:', {
      couponCode: couponCode.trim(),
      basePrice,
      finalPrice,
      discount,
      couponApplied,
      assessmentId
    });
    
    try {
      const requestPayload = {
        code: couponCode.trim(),
        assessmentId,
        originalPrice: basePrice
      };
      
      console.log('📤 Sending request:', requestPayload);
      
      const response = await fetch('/api/coupon/quick-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      const data = await response.json();
      console.log('📥 Full API Response:', data);

      if (data.valid === true) {
        console.log('✅ Coupon is VALID!');
        console.log('💰 Price calculation:', {
          originalPrice: basePrice,
          finalPrice: data.finalPrice,
          discount: data.discount,
          savings: data.discount
        });

        // Update states
        console.log('🔄 Updating states...');
        setFinalPrice(data.finalPrice);
        setDiscount(data.discount);
        setCouponApplied(couponCode.trim());
        setError(null);
        
        console.log('✅ States updated successfully');
        console.log('📊 New State AFTER validation:', {
          finalPrice: data.finalPrice,
          discount: data.discount,
          couponApplied: couponCode.trim(),
          error: null
        });
        
      } else {
        console.log('❌ Coupon is INVALID');
        console.log('❌ Reason:', data.message);
        setError(data.message || 'Invalid coupon code');
      }
    } catch (err) {
      console.error('💥 Coupon validation ERROR:', err);
      setError('Failed to validate coupon');
    }
  };

  // 🔥 ENHANCED: Payment handler with debugging
  const handlePayment = async () => {
    console.log('💳 Starting payment process...');
    console.log('💰 Payment Details:', {
      assessmentId,
      couponApplied,
      finalPrice,
      discount,
      isFree: finalPrice <= 0
    });

    setIsProcessing(true);
    setError(null);

    try {
      const paymentPayload = {
        assessmentId,
        couponCode: couponApplied,
        expectedAmount: finalPrice
      };
      
      console.log('📤 Payment request:', paymentPayload);

      const response = await fetch('/api/payment/simple-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentPayload)
      });

      const data = await response.json();
      console.log('📥 Payment response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      if (data.paymentUrl) {
        console.log('🔗 Redirecting to payment gateway:', data.paymentUrl);
        window.location.href = data.paymentUrl;
      } else {
        console.log('🎉 Free assessment, redirecting to assessment');
        router.push(`/assessment/${assessmentType}/${assessmentId}`);
      }
    } catch (err) {
      console.error('💥 Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // 🔥 ENHANCED: Remove coupon function
  const removeCoupon = () => {
    console.log('🗑️ Removing coupon...');
    console.log('📊 State BEFORE removing coupon:', {
      finalPrice,
      discount,
      couponApplied,
      couponCode
    });
    
    setFinalPrice(basePrice);
    setDiscount(0);
    setCouponApplied(null);
    setCouponCode('');
    setError(null);
    
    console.log('✅ Coupon removed');
    console.log('📊 State AFTER removing coupon:', {
      finalPrice: basePrice,
      discount: 0,
      couponApplied: null,
      couponCode: ''
    });
  };

  const isFree = finalPrice <= 0;

  // 🔥 DEBUG: Log render state
  console.log('🎨 Rendering with state:', {
    couponCode,
    finalPrice,
    discount,
    couponApplied,
    isFree,
    isProcessing,
    error
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">Assessment Payment</h1>
        <p className="text-gray-600">{assessmentType.toUpperCase()} - {tier}</p>
        {/* 🔥 DEBUG: Show current state */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
            <strong>DEBUG:</strong> Base: RM{basePrice} | Final: RM{finalPrice} | Discount: RM{discount} | Applied: {couponApplied || 'None'}
          </div>
        )}
      </div>

      {/* Pricing Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between mb-2">
          <span>Original Price:</span>
          <span>RM {basePrice.toFixed(2)}</span>
        </div>
        
        {discount > 0 && (
          <div className="flex justify-between mb-2 text-green-600">
            <span>Discount:</span>
            <span>-RM {discount.toFixed(2)}</span>
          </div>
        )}
        
        <hr className="my-2" />
        <div className="flex justify-between font-bold text-lg">
          <span>Total:</span>
          <span className={isFree ? 'text-green-600' : ''}>
            {isFree ? 'FREE' : `RM ${finalPrice.toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* Coupon Section */}
      {!couponApplied ? (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Coupon Code (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value);
                console.log('🎫 Coupon code changed:', e.target.value);
              }}
              placeholder="Enter coupon code"
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isProcessing}
            />
            <button
              onClick={() => {
                console.log('🎫 Apply coupon button clicked');
                validateCoupon();
              }}
              disabled={!couponCode.trim() || isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              Apply
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-green-800">
              ✅ "{couponApplied}" applied - Saved RM {discount.toFixed(2)}
            </span>
            <button
              onClick={() => {
                console.log('🗑️ Remove coupon button clicked');
                removeCoupon();
              }}
              className="text-green-600 hover:text-green-800 text-sm"
              disabled={isProcessing}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Free Assessment Notice */}
      {isFree && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">
          🎉 Your assessment is free! No payment required.
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={() => {
          console.log('💳 Payment button clicked');
          handlePayment();
        }}
        disabled={isProcessing}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 transition-all"
      >
        {isProcessing ? (
          'Processing...'
        ) : isFree ? (
          'Start Assessment Now'
        ) : (
          `Pay RM ${finalPrice.toFixed(2)}`
        )}
      </button>

      {/* Security Badge */}
      <p className="text-xs text-gray-500 text-center mt-4">
        🔒 Secured with bank-level encryption
      </p>
    </div>
  );
}