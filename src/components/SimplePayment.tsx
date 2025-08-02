// /src/components/SimplePayment.tsx - WITH DEBUG LOGS
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SimplePaymentProps {
  assessmentId: string;
  assessmentType: string;
  tier: string;
  basePrice: number;
  assessmentLabel?: string;
  packageLabel?: string;
}

export default function SimplePayment({
  assessmentId,
  assessmentType, 
  tier,
  basePrice,
  assessmentLabel = 'Assessment',
  packageLabel = 'Package'
}: SimplePaymentProps) {
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState(basePrice);
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState<string | null>(null);

  // 🔥 DEBUG: Log component initialization
  console.log('🎨 SimplePayment component initialized:', {
    assessmentId,
    assessmentType,
    tier,
    basePrice,
    assessmentLabel,
    packageLabel
  });

  // 🔥 ENHANCED: Coupon application with debugging
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      console.log('❌ Empty coupon code in SimplePayment');
      return;
    }

    console.log('🎫 SimplePayment: Applying coupon...');
    console.log('📊 SimplePayment state BEFORE:', {
      couponCode: couponCode.trim(),
      basePrice,
      finalPrice,
      discount,
      couponApplied
    });

    try {
      const requestPayload = {
        code: couponCode.trim(),
        assessmentId,
        originalPrice: basePrice
      };
      
      console.log('📤 SimplePayment: Sending coupon request:', requestPayload);

      const response = await fetch('/api/coupon/quick-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      console.log('📡 SimplePayment response status:', response.status);
      const data = await response.json();
      console.log('📥 SimplePayment API response:', data);

      if (data.valid && data.finalPrice !== undefined) {
        console.log('✅ SimplePayment: Coupon valid, updating state...');
        
        setFinalPrice(data.finalPrice);
        setDiscount(data.discount || 0);
        setCouponApplied(couponCode.trim());
        setError(null);
        
        console.log('📊 SimplePayment state AFTER update:', {
          finalPrice: data.finalPrice,
          discount: data.discount || 0,
          couponApplied: couponCode.trim(),
          error: null
        });
      } else {
        console.log('❌ SimplePayment: Invalid coupon:', data.message);
        setError(data.message || 'Invalid coupon code');
      }
    } catch (err) {
      console.error('💥 SimplePayment coupon error:', err);
      setError('Failed to validate coupon');
    }
  };

  // 🔥 ENHANCED: Payment processing with debugging
  const processPayment = async () => {
    if (isProcessing) {
      console.log('⚠️ SimplePayment: Already processing payment');
      return;
    }
    
    console.log('💳 SimplePayment: Starting payment...');
    console.log('💰 SimplePayment payment details:', {
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
      
      console.log('📤 SimplePayment: Payment request:', paymentPayload);

      const response = await fetch('/api/payment/simple-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentPayload)
      });

      const data = await response.json();
      console.log('📥 SimplePayment: Payment response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      if (data.paymentUrl) {
        console.log('🔗 SimplePayment: Redirecting to gateway:', data.paymentUrl);
        window.location.href = data.paymentUrl;
      } else {
        console.log('🎉 SimplePayment: Free assessment, redirecting...');
        router.push(`/assessment/${assessmentType}/${assessmentId}`);
      }

    } catch (err) {
      console.error('💥 SimplePayment payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // 🔥 ENHANCED: Remove coupon function
  const removeCoupon = () => {
    console.log('🗑️ SimplePayment: Removing coupon...');
    console.log('📊 SimplePayment state BEFORE remove:', {
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
    
    console.log('✅ SimplePayment: Coupon removed');
    console.log('📊 SimplePayment state AFTER remove:', {
      finalPrice: basePrice,
      discount: 0,
      couponApplied: null,
      couponCode: ''
    });
  };

  const isFree = finalPrice <= 0;

  // 🔥 DEBUG: Log render state
  console.log('🎨 SimplePayment rendering with:', {
    couponCode,
    finalPrice,
    discount,
    couponApplied,
    isFree,
    isProcessing,
    error
  });

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">{assessmentLabel}</h1>
        <p className="text-gray-600">{packageLabel}</p>
        {/* 🔥 DEBUG: Show current state in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 p-2 bg-yellow-50 rounded text-xs border">
            <strong>DEBUG SimplePayment:</strong><br/>
            Base: RM{basePrice} | Final: RM{finalPrice} | Discount: RM{discount}<br/>
            Applied: {couponApplied || 'None'} | Free: {isFree ? 'Yes' : 'No'}
          </div>
        )}
      </div>

      {/* Pricing Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between mb-2">
          <span>Price:</span>
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
                console.log('🎫 SimplePayment coupon input changed:', e.target.value);
              }}
              placeholder="Enter coupon code"
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing}
            />
            <button
              onClick={() => {
                console.log('🎫 SimplePayment apply button clicked');
                applyCoupon();
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
              ✅ "{couponApplied}" applied
            </span>
            <button
              onClick={() => {
                console.log('🗑️ SimplePayment remove button clicked');
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
          console.log('💳 SimplePayment payment button clicked');
          processPayment();
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