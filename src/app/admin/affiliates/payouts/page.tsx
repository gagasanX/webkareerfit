'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ChevronDown, 
  CheckCircle, 
  AlertCircle, 
  DollarSign,
  CreditCard,
  Calendar,
  Download,
  FileText,
  Filter,
  Eye,
  Users
} from 'lucide-react';

interface Payout {
  id: string;
  userId: string;
  userName: string;
  email: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  method: string;
  createdAt: string;
  processedAt?: string;
  transactionId?: string;
  notes?: string;
}

interface AffiliateWithPending {
  id: string;
  userId: string;
  userName: string;
  email: string;
  pendingAmount: number;
  lastPayout?: {
    amount: number;
    date: string;
  };
}

export default function AffiliatePayoutsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [view, setView] = useState<'all' | 'pending'>('all');
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingAffiliates, setPendingAffiliates] = useState<AffiliateWithPending[]>([]);
  const [selectedAffiliates, setSelectedAffiliates] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingPayout, setProcessingPayout] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bulkAmount, setBulkAmount] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<string>('bank_transfer');
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [payoutNotes, setPayoutNotes] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin-auth/login');
      return;
    }

    if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/dashboard');
      return;
    }

    if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchPayoutsData();
    }
  }, [status, session, router, view, filterStatus]);

  const fetchPayoutsData = async () => {
    try {
      setLoading(true);
      
      if (view === 'all') {
        // Fetch all payouts with optional filter
        const response = await fetch(`/api/admin/affiliates/payouts?status=${filterStatus}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch payouts data');
        }
        
        const data = await response.json();
        setPayouts(data.payouts || []);
      } else {
        // Fetch affiliates with pending payouts
        const response = await fetch('/api/admin/affiliates/payouts/pending');
        
        if (!response.ok) {
          throw new Error('Failed to fetch pending payouts data');
        }
        
        const data = await response.json();
        setPendingAffiliates(data.affiliates || []);
        setBulkAmount(calculateSelectedAmount(data.affiliates, selectedAffiliates));
      }
      
      setLoading(false);
    } catch (error) {
      setError('Error loading payouts data. Please try again.');
      setLoading(false);
    }
  };

  const calculateSelectedAmount = (affiliates: AffiliateWithPending[], selected: string[]) => {
    return affiliates
      .filter(affiliate => selected.includes(affiliate.userId))
      .reduce((sum, affiliate) => sum + affiliate.pendingAmount, 0);
  };

  const toggleSelectAll = () => {
    if (selectedAffiliates.length === pendingAffiliates.length) {
      // Deselect all
      setSelectedAffiliates([]);
      setBulkAmount(0);
    } else {
      // Select all
      const allIds = pendingAffiliates.map(affiliate => affiliate.userId);
      setSelectedAffiliates(allIds);
      setBulkAmount(calculateSelectedAmount(pendingAffiliates, allIds));
    }
  };

  const toggleAffiliateSelection = (userId: string) => {
    const isSelected = selectedAffiliates.includes(userId);
    let newSelection: string[];
    
    if (isSelected) {
      // Remove from selection
      newSelection = selectedAffiliates.filter(id => id !== userId);
    } else {
      // Add to selection
      newSelection = [...selectedAffiliates, userId];
    }
    
    setSelectedAffiliates(newSelection);
    setBulkAmount(calculateSelectedAmount(pendingAffiliates, newSelection));
  };

  const handleCreatePayout = async () => {
    if (selectedAffiliates.length === 0) {
      setError('Please select at least one affiliate');
      return;
    }
    
    setProcessingPayout(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/affiliates/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          affiliateIds: selectedAffiliates,
          method: payoutMethod,
          notes: payoutNotes
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payouts');
      }
      
      setSuccess('Payouts created successfully');
      setSelectedAffiliates([]);
      setBulkAmount(0);
      setPayoutNotes('');
      
      // Refresh data after creating payouts
      fetchPayoutsData();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      setError('Error creating payouts. Please try again.');
    } finally {
      setProcessingPayout(false);
    }
  };

  const handleViewPayout = (payout: Payout) => {
    setSelectedPayout(payout);
    setIsDetailsModalOpen(true);
  };

  const handleStatusChange = async (payoutId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/affiliates/payouts/${payoutId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          transactionId: selectedPayout?.transactionId || '',
          notes: payoutNotes
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update payout status');
      }
      
      setSuccess('Payout status updated successfully');
      
      // Update the payouts list
      setPayouts(payouts.map(payout => 
        payout.id === payoutId 
          ? {...payout, status: newStatus as any, notes: payoutNotes} 
          : payout
      ));
      
      setIsDetailsModalOpen(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      setError('Error updating payout status. Please try again.');
    }
  };

  const formatCurrency = (amount: number, currency = 'MYR') => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CreditCard className="w-3 h-3 mr-1" />
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Calendar className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  if (loading && pendingAffiliates.length === 0 && payouts.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-transparent border-gray-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link 
          href="/admin/affiliates"
          className="inline-flex items-center text-gray-600 hover:text-gray-800 mr-4"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back
        </Link>
        <h1 className="text-2xl font-bold">Affiliate Payouts</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </span>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {success}
          </span>
        </div>
      )}

      {/* View Toggle */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h2 className="text-lg font-medium text-gray-900">Payout Management</h2>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage affiliate payouts
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:flex-none">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setView('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  view === 'all'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-1" />
                Payout History
              </button>
              <button
                type="button"
                onClick={() => setView('pending')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  view === 'pending'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="h-4 w-4 inline mr-1" />
                Create Payouts
              </button>
            </div>
          </div>
        </div>
      </div>

      {view === 'all' ? (
        /* Payout History View */
        <>
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-64">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </button>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Affiliate
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        No payouts found
                      </td>
                    </tr>
                  ) : (
                    payouts.map((payout) => (
                      <tr key={payout.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{payout.userName}</div>
                          <div className="text-sm text-gray-500">{payout.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(payout.amount, payout.currency)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(payout.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payout.method}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewPayout(payout)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Create Payouts View */
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Payouts</h2>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={selectedAffiliates.length === pendingAffiliates.length && pendingAffiliates.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="select-all" className="ml-2 text-sm text-gray-700">
                    Select All
                  </label>
                </div>
                
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 mr-2">Payout Method:</span>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="paypal">PayPal</option>
                    <option value="wallet_credit">Wallet Credit</option>
                  </select>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Select
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Affiliate
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pending Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Payout
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingAffiliates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          No affiliates with pending payouts
                        </td>
                      </tr>
                    ) : (
                      pendingAffiliates.map((affiliate) => (
                        <tr key={affiliate.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedAffiliates.includes(affiliate.userId)}
                              onChange={() => toggleAffiliateSelection(affiliate.userId)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{affiliate.userName}</div>
                            <div className="text-sm text-gray-500">{affiliate.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(affiliate.pendingAmount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {affiliate.lastPayout ? (
                              <div>
                                <div className="text-sm text-gray-900">
                                  {formatCurrency(affiliate.lastPayout.amount)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(affiliate.lastPayout.date).toLocaleDateString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">No previous payouts</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6">
                <div className="text-sm font-medium text-gray-700 mb-2">Payout Notes (Optional)</div>
                <textarea
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  rows={3}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Add notes about this payout (internal only)"
                ></textarea>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
              <div className="text-lg font-medium text-gray-900">
                Total: {formatCurrency(bulkAmount)}
              </div>
              <button
                type="button"
                onClick={handleCreatePayout}
                disabled={selectedAffiliates.length === 0 || processingPayout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {processingPayout ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Process Payouts
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Payout Details Modal */}
      {isDetailsModalOpen && selectedPayout && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Payout Details
                    </h3>
                    
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Affiliate</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedPayout.userName} ({selectedPayout.email})</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Amount</label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(selectedPayout.amount, selectedPayout.currency)}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <p className="mt-1">{getStatusBadge(selectedPayout.status)}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Method</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedPayout.method}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Created Date</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {new Date(selectedPayout.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        {selectedPayout.processedAt && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Processed Date</label>
                            <p className="mt-1 text-sm text-gray-900">
                              {new Date(selectedPayout.processedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {selectedPayout.status === 'processing' || selectedPayout.status === 'completed' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                          <div className="mt-1">
                            <input
                              type="text"
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              value={selectedPayout.transactionId || ''}
                              onChange={(e) => setSelectedPayout({...selectedPayout, transactionId: e.target.value})}
                              disabled={selectedPayout.status === 'completed'}
                            />
                          </div>
                        </div>
                      ) : null}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                          rows={3}
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={payoutNotes || selectedPayout.notes || ''}
                          onChange={(e) => setPayoutNotes(e.target.value)}
                          disabled={selectedPayout.status === 'completed'}
                          placeholder="Add notes about this payout (internal only)"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {selectedPayout.status === 'pending' ? (
                  <>
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => handleStatusChange(selectedPayout.id, 'processing')}
                    >
                      Mark as Processing
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => handleStatusChange(selectedPayout.id, 'failed')}
                    >
                      Mark as Failed
                    </button>
                  </>
                ) : selectedPayout.status === 'processing' ? (
                  <>
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => handleStatusChange(selectedPayout.id, 'completed')}
                    >
                      Mark as Completed
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => handleStatusChange(selectedPayout.id, 'failed')}
                    >
                      Mark as Failed
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}