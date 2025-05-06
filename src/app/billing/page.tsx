'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  gatewayPaymentId: string | null;
  assessment: {
    id: string;
    type: string;
    tier: string;
    status: string;
  };
}

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assessment type labels for display
  const assessmentLabels: Record<string, string> = {
    fjrl: 'First Job Readiness Level',
    ijrl: 'Ideal Job Readiness Level',
    cdrl: 'Career Development Readiness Level',
    ccrl: 'Career Comeback Readiness Level',
    ctrl: 'Career Transition Readiness Level',
    rrl: 'Retirement Readiness Level',
    irl: 'Internship Readiness Level',
  };

  // Package tier labels
  const packageLabels: Record<string, string> = {
    basic: 'Basic Analysis',
    standard: 'Basic Report',
    premium: 'Full Report + Interview'
  };

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/billing');
      return;
    }

    // Fetch user's payment data
    if (status === 'authenticated') {
      fetchPayments();
    }
  }, [status, router]);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/payments');
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment data');
      }
      
      const data = await response.json();
      setPayments(data.payments);
    } catch (err) {
      setError('Unable to load your billing information. Please try again later.');
      console.error('Error fetching payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate the total amount spent
  const totalSpent = payments
    .filter(payment => payment.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-2xl font-bold">Billing Summary</h1>
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Return to Dashboard
              </Link>
            </div>
            <p className="opacity-90">View your payment history and assessment purchases</p>
          </div>

          {error ? (
            <div className="p-6">
              <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                {error}
              </div>
            </div>
          ) : (
            <>
              {/* Summary Card */}
              <div className="p-6 border-b">
                <div className="flex flex-wrap gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg flex-1 min-w-[200px]">
                    <p className="text-sm text-gray-500">Total Spent</p>
                    <p className="text-2xl font-bold text-gray-800">RM {totalSpent.toFixed(2)}</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg flex-1 min-w-[200px]">
                    <p className="text-sm text-gray-500">Total Assessments</p>
                    <p className="text-2xl font-bold text-gray-800">{payments.length}</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg flex-1 min-w-[200px]">
                    <p className="text-sm text-gray-500">Completed Payments</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {payments.filter(p => p.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment History List */}
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment History</h2>
                
                {payments.length === 0 ? (
                  <div className="text-center p-8">
                    <p className="text-gray-500">You haven't made any payments yet.</p>
                    <Link 
                      href="/assessment"
                      className="mt-4 inline-block px-6 py-2 bg-[#7e43f1] text-white rounded-lg font-medium hover:bg-[#6e33e1]"
                    >
                      Take an Assessment
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-3 text-sm font-semibold text-gray-600">Assessment</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-600">Date</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-600">Amount</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-600">Status</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => (
                          <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-gray-800">
                                  {assessmentLabels[payment.assessment.type] || payment.assessment.type}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {packageLabels[payment.assessment.tier] || payment.assessment.tier}
                                </p>
                              </div>
                            </td>
                            <td className="p-3">
                              <p className="text-sm text-gray-600">{formatDate(payment.createdAt)}</p>
                            </td>
                            <td className="p-3">
                              <p className="font-medium text-gray-800">RM {payment.amount.toFixed(2)}</p>
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                payment.status === 'completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : payment.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`}>
                                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <Link
                                  href={`/assessment/${payment.assessment.type}/${payment.assessment.id}`}
                                  className="text-sm text-[#7e43f1] hover:text-[#6e33e1]"
                                >
                                  View Assessment
                                </Link>
                                
                                {payment.status === 'pending' && (
                                  <Link
                                    href={`/payment/${payment.assessment.id}`}
                                    className="text-sm text-[#38b6ff] hover:text-[#2896df]"
                                  >
                                    Pay Now
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}