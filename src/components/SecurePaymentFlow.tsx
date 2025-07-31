// /src/components/SecurePaymentFlow.tsx - REPLACE CouponInput dan PaymentClient
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SecurePaymentFlowProps {
  assessmentId: string;
  assessmentType: string;
  tier: string;
  user: any;
}

export default function SecurePaymentFlow({ 
  assessmentId, 
  assessmentType, 
  tier,
  user 
}: SecurePaymentFlowProps) {
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      // Generate unique idempotency key
      const idempotencyKey = `${assessmentId}-${Date.now()}-${Math.random().toString(36)}`;
      
      // SINGLE SECURE API CALL
      const response = await fetch('/api/payment/secure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId,
          idempotencyKey,
          couponCode: couponCode.trim() || undefined
        })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      // Handle response
      if (data.status === 'processing' && data.paymentUrl) {
        // Redirect to payment gateway
        window.location.href = data.paymentUrl;
      } else if (data.status === 'completed') {
        // Free assessment - redirect directly
        router.push(data.paymentUrl);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Assessment Payment</h2>
      
      <div className="mb-4">
        <p><strong>Type:</strong> {assessmentType}</p>
        <p><strong>Package:</strong> {tier}</p>
        <p className="text-sm text-gray-600">Final price calculated securely on server</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Coupon Code (Optional)
        </label>
        <input
          type="text"
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          disabled={isProcessing}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={isProcessing}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 transition-all"
      >
        {isProcessing ? 'Processing...' : 'Process Payment Securely'}
      </button>

      <p className="text-xs text-gray-500 mt-2 text-center">
        🔒 Secured with bank-level encryption & fraud protection
      </p>
    </div>
  );
}