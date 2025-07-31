'use client';

import { useState } from 'react';

interface CouponInputProps {
  onApply: (code: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  appliedCoupon?: {
    code: string;
    discount: number;
  } | null;
}

export default function CouponInput({ 
  onApply, 
  isLoading = false, 
  disabled = false,
  appliedCoupon = null 
}: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.trim()) {
      onApply(couponCode.trim());
    }
  };

  if (appliedCoupon) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <div className="flex justify-between items-center">
          <span className="text-green-800">
            Coupon "{appliedCoupon.code}" applied (-RM{appliedCoupon.discount.toFixed(2)})
          </span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Coupon Code
      </label>
      <div className="flex space-x-2">
        <input
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          placeholder="Enter coupon code"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled || isLoading}
        />
        <button
          type="submit"
          disabled={!couponCode.trim() || disabled || isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Applying...' : 'Apply'}
        </button>
      </div>
    </form>
  );
}
