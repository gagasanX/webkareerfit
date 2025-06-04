'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CouponInputProps {
  assessmentId: string;
  assessmentType: string;
  originalPrice: number;
  onApplyCoupon: (discount: number, finalPrice: number) => void;
  // CRITICAL FIX: Add tier prop to send correct pricing info
  tier?: string;
}

// FIXED: Define interface for validation payload
interface CouponValidationPayload {
  code: string;
  assessmentId: string;
  tier?: string;
}

export default function CouponInput({ 
  assessmentId, 
  assessmentType, 
  originalPrice, 
  onApplyCoupon,
  tier 
}: CouponInputProps) {
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  
  const handleCouponChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCouponCode(e.target.value);
    // Clear messages when user starts typing again
    setError(null);
    setSuccess(null);
  };
  
  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Please enter a coupon code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // FIXED: Use object spread to conditionally include tier
      const validationPayload: CouponValidationPayload = {
        code: couponCode,
        assessmentId: assessmentId,
        ...(tier && { tier }), // Only include tier if it exists
      };
      
      console.log('Sending coupon validation request:', validationPayload);
      
      const response = await fetch('/api/coupon/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationPayload),
      });
      
      const data = await response.json();
      
      console.log('Coupon validation response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Error validating coupon');
      }
      
      // Success - show the savings message
      setSuccess(data.message);
      setAppliedCoupon(couponCode);
      
      // CRITICAL FIX: Verify the discount calculation makes sense
      console.log('Coupon calculation verification:', {
        originalPrice: originalPrice,
        apiOriginalPrice: data.originalPrice,
        finalPrice: data.finalPrice,
        discount: data.discount,
        match: originalPrice === data.originalPrice
      });
      
      // Call the parent handler to update UI
      onApplyCoupon(data.discount, data.finalPrice);
      
      // CRITICAL FIX: Check if final price is 0 (free) with proper calculation
      if (data.finalPrice === 0) {
        console.log('✅ Coupon provides 100% discount - processing free assessment');
        
        // Show processing message
        setSuccess('Coupon provides 100% discount! Processing your free assessment...');
        
        // Apply the coupon to the assessment
        console.log('Applying coupon to assessment...');
        const applyResponse = await fetch('/api/coupon/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: couponCode,
            assessmentId,
          }),
        });
        
        if (!applyResponse.ok) {
          const applyError = await applyResponse.json();
          throw new Error(applyError.message || 'Error applying free coupon');
        }
        
        const applyData = await applyResponse.json();
        console.log('Coupon applied successfully:', applyData);
        
        // Process the free assessment
        console.log('Processing free assessment...');
        const completeResponse = await fetch('/api/payment/complete-free', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assessmentId,
          }),
        });
        
        if (!completeResponse.ok) {
          const completeError = await completeResponse.json();
          throw new Error(completeError.message || 'Error processing free assessment');
        }
        
        const completeData = await completeResponse.json();
        console.log('Free assessment completed:', completeData);
        
        // CRITICAL FIX: Use the redirect URL from the API response
        const redirectUrl = completeData.redirectUrl || `/assessment/${assessmentType}/${assessmentId}`;
        console.log(`Redirecting to: ${redirectUrl}`);
        
        // Show success message before redirect
        setSuccess('Free assessment activated! Redirecting...');
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push(redirectUrl);
        }, 1500);
      } else {
        console.log(`✅ Coupon applied - Final price: RM${data.finalPrice}`);
      }
      
    } catch (err) {
      console.error('Coupon validation/application error:', err);
      setError(err instanceof Error ? err.message : 'Error applying coupon. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // FIXED: Reset function to use original price correctly
  const resetCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setSuccess(null);
    setError(null);
    onApplyCoupon(0, originalPrice); // Reset to original price
  };
  
  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            id="couponCode"
            name="couponCode"
            value={couponCode}
            onChange={handleCouponChange}
            placeholder="Enter coupon code"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#7e43f1] focus:border-[#7e43f1]"
            disabled={!!appliedCoupon || isLoading}
          />
          {appliedCoupon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        
        <button
          type="button"
          onClick={validateCoupon}
          disabled={isLoading || !!appliedCoupon}
          className={`px-4 py-2 rounded-lg font-medium ${
            appliedCoupon 
              ? 'bg-green-100 text-green-700 cursor-not-allowed' 
              : 'bg-[#7e43f1] text-white hover:bg-[#6a38d1]'
          } disabled:opacity-70 whitespace-nowrap`}
        >
          {isLoading ? 'Applying...' : appliedCoupon ? 'Applied' : 'Apply Coupon'}
        </button>
        
        {appliedCoupon && (
          <button
            type="button"
            onClick={resetCoupon}
            className="text-red-500 hover:text-red-700 text-sm whitespace-nowrap"
          >
            Remove
          </button>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      
      {success && (
        <p className="mt-2 text-sm text-green-600">{success}</p>
      )}
      
      {/* FIXED: Display correct discount calculation */}
      {appliedCoupon && (
        <div className="mt-3 text-sm">
          <div className="flex justify-between items-center text-gray-500">
            <span>Original price:</span>
            <span>RM {originalPrice.toFixed(2)}</span>
          </div>
          {/* Note: The actual discount amount will be calculated by the parent component based on API response */}
        </div>
      )}
    </div>
  );
}