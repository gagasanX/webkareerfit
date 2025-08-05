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
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

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

  // Generate and download PDF receipt
  const downloadPdfReceipt = async (payment: Payment) => {
    if (payment.status !== 'completed') {
      alert('PDF receipt is only available for completed payments.');
      return;
    }

    setDownloadingPdf(payment.id);
    
    try {
      // Generate PDF content
      const pdfContent = generatePdfReceiptContent(payment);
      
      // Create and download PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to download your receipt.');
        return;
      }

      printWindow.document.open();
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      // Auto-print which will show save as PDF dialog
      printWindow.onload = function() {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF receipt. Please try again.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Generate PDF receipt content with CONSISTENT BRANDING
  const generatePdfReceiptContent = (payment: Payment): string => {
    const receiptDate = formatDate(payment.createdAt);
    const assessmentName = assessmentLabels[payment.assessment.type] || payment.assessment.type;
    const packageName = packageLabels[payment.assessment.tier] || payment.assessment.tier;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - CAREERXPERT SOLUTIONS</title>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
          }
          .header { 
            background: linear-gradient(135deg, #38b6ff 0%, #7e43f1 100%); 
            color: white; 
            padding: 30px; 
            border-radius: 10px; 
            margin-bottom: 30px; 
            text-align: center;
          }
          .header h1 { margin: 0 0 10px 0; font-size: 28px; }
          .header p { margin: 0; opacity: 0.9; }
          .receipt-info { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 10px; 
            margin-bottom: 30px; 
          }
          .receipt-info h2 { 
            margin: 0 0 15px 0; 
            color: #2d3748; 
            border-bottom: 2px solid #e2e8f0; 
            padding-bottom: 10px; 
          }
          .info-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 10px; 
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .info-row:last-child { border-bottom: none; }
          .info-label { font-weight: 600; color: #4a5568; }
          .info-value { color: #2d3748; }
          .amount-section { 
            background: #f0fff4; 
            border: 2px solid #c6f6d5; 
            padding: 20px; 
            border-radius: 10px; 
            margin-bottom: 30px; 
            text-align: center;
          }
          .total-amount { 
            font-size: 32px; 
            font-weight: bold; 
            color: #22543d; 
            margin: 10px 0;
          }
          .status-badge { 
            display: inline-block;
            background: #48bb78; 
            color: white; 
            padding: 5px 15px; 
            border-radius: 20px; 
            font-size: 14px; 
            font-weight: bold;
          }
          .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #e2e8f0; 
            color: #718096; 
            font-size: 14px;
          }
          .company-info {
            background: #edf2f7;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          .company-info h3 {
            margin: 0 0 10px 0;
            color: #2d3748;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Payment Receipt</h1>
          <p>CAREERXPERT SOLUTIONS - AI Agency for Employment</p>
        </div>

        <div class="company-info">
          <h3>CAREERXPERT SOLUTIONS</h3>
          <p>AI Agency for Employment</p>
          <p>Email: hellocoach@kareerfit.com</p>
          <p>Website: www.kareerfit.com</p>
        </div>

        <div class="receipt-info">
          <h2>Payment Details</h2>
          <div class="info-row">
            <span class="info-label">Receipt No:</span>
            <span class="info-value">#${payment.id.substring(0, 8).toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Date:</span>
            <span class="info-value">${receiptDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Customer:</span>
            <span class="info-value">${session?.user?.name || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${session?.user?.email || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Method:</span>
            <span class="info-value">${payment.method.toUpperCase()}</span>
          </div>
          ${payment.gatewayPaymentId ? `
          <div class="info-row">
            <span class="info-label">Transaction ID:</span>
            <span class="info-value">${payment.gatewayPaymentId}</span>
          </div>
          ` : ''}
        </div>

        <div class="receipt-info">
          <h2>Service Details</h2>
          <div class="info-row">
            <span class="info-label">Assessment Type:</span>
            <span class="info-value">${assessmentName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Package:</span>
            <span class="info-value">${packageName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Assessment ID:</span>
            <span class="info-value">${payment.assessment.id.substring(0, 8).toUpperCase()}</span>
          </div>
        </div>

        <div class="amount-section">
          <h2 style="margin: 0 0 10px 0; color: #22543d;">Total Amount Paid</h2>
          <div class="total-amount">RM ${payment.amount.toFixed(2)}</div>
          <div class="status-badge">PAID</div>
        </div>

        <div class="footer">
          <p><strong>Thank you for choosing CAREERXPERT SOLUTIONS!</strong></p>
          <p>This is an official receipt for your payment. Please keep this for your records.</p>
          <p>Generated on ${new Date().toLocaleDateString('en-MY')} at ${new Date().toLocaleTimeString('en-MY')}</p>
          <p style="margin-top: 20px; font-size: 12px;">
            For support or inquiries, please contact us at hellocoach@kareerfit.com
          </p>
        </div>
      </body>
      </html>
    `;
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
            <p className="opacity-90">View your payment history and download receipts</p>
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
                                {payment.status === 'completed' && (
                                  <button
                                    onClick={() => downloadPdfReceipt(payment)}
                                    disabled={downloadingPdf === payment.id}
                                    className="text-sm text-[#7e43f1] hover:text-[#6e33e1] disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {downloadingPdf === payment.id ? (
                                      <>
                                        <div className="w-3 h-3 border border-t-transparent border-[#7e43f1] rounded-full animate-spin"></div>
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download PDF
                                      </>
                                    )}
                                  </button>
                                )}
                                
                                {payment.status === 'pending' && (
                                  <Link
                                    href={`/payment/${payment.assessment.id}`}
                                    className="text-sm text-[#38b6ff] hover:text-[#2896df] flex items-center gap-1"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
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