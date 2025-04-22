'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Tag, Percent, DollarSign, Hash, Users } from 'lucide-react';

export default function CreateCouponPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    discountPercentage: 10,
    maxDiscount: undefined as number | undefined,
    expiresAt: getDefaultExpiryDate(),
    maxUses: 100
  });

  // Generate default expiry date (1 month from now)
  function getDefaultExpiryDate() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  }

  // Generate random coupon code
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code: result });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'discountPercentage' || name === 'maxDiscount' || name === 'maxUses') {
      // Convert to number and ensure it's positive
      const numValue = parseFloat(value);
      setFormData({
        ...formData,
        [name]: isNaN(numValue) ? (name === 'maxDiscount' ? undefined : 0) : Math.max(0, numValue)
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(false);
    
    try {
      // Validate form
      if (!formData.code) {
        throw new Error('Coupon code is required');
      }
      
      if (formData.discountPercentage <= 0 || formData.discountPercentage > 100) {
        throw new Error('Discount percentage must be between 1 and 100');
      }
      
      if (formData.maxUses <= 0) {
        throw new Error('Maximum uses must be greater than 0');
      }
      
      // Send API request
      const response = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: formData.code,
          discountPercentage: formData.discountPercentage,
          maxDiscount: formData.maxDiscount,
          expiresAt: new Date(formData.expiresAt).toISOString(),
          maxUses: formData.maxUses
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create coupon');
      }
      
      // Set success state
      setFormSuccess(true);
      
      // Reset form after a delay
      setTimeout(() => {
        router.push('/admin/coupons');
      }, 2000);
      
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create New Coupon</h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-600 rounded-md hover:bg-gray-100"
        >
          Back
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {formSuccess && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-md">
            Coupon created successfully! Redirecting...
          </div>
        )}
        
        {formError && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
            {formError}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Coupon Code*
              </label>
              <div className="flex">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="SUMMER50"
                  />
                </div>
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="ml-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Create a unique code for this coupon. Uppercase letters and numbers recommended.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Discount Percentage*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Percent className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  name="discountPercentage"
                  value={formData.discountPercentage}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="10"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                The percentage discount to apply (1-100%).
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Maximum Discount Amount (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  name="maxDiscount"
                  value={formData.maxDiscount || ''}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="50.00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">RM</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Maximum discount amount in RM. Leave empty for no limit.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Expiry Date*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  name="expiresAt"
                  value={formData.expiresAt}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="block w-full pl-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <p className="text-xs text-gray-500">
                The date when this coupon will expire.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Maximum Uses*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  name="maxUses"
                  value={formData.maxUses}
                  onChange={handleChange}
                  min="1"
                  className="block w-full pl-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="100"
                />
              </div>
              <p className="text-xs text-gray-500">
                Maximum number of times this coupon can be used.
              </p>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}