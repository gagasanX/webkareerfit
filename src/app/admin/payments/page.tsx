'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  Download, 
  Eye, 
  Filter, 
  Calendar, 
  CreditCard, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  XCircle 
} from 'lucide-react';

interface Transaction {
  id: string;
  userId: string;
  userName: string;
  assessmentId: string;
  assessmentTitle: string;
  amount: number;
  currency: string;
  status: string;
  gateway: string;
  referenceId: string;
  createdAt: string;
  updatedAt: string;
}

interface RevenueStats {
  totalRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageTransactionValue: number;
  currency: string;
}

interface PaymentMethodBreakdown {
  gateway: string;
  count: number;
  totalAmount: number;
}

export default function PaymentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentGatewayFilter, setPaymentGatewayFilter] = useState<string>('all');
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [paymentMethodBreakdown, setPaymentMethodBreakdown] = useState<PaymentMethodBreakdown[]>([]);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<number>(0);

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
      fetchData();
    }
  }, [status, session, router, page, rowsPerPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch transactions
      const response = await fetch(
        `/api/admin/payments?page=${page}&limit=${rowsPerPage}&search=${searchTerm}&startDate=${startDate}&endDate=${endDate}&status=${statusFilter}&gateway=${paymentGatewayFilter}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment data');
      }
      
      const data = await response.json();
      setTransactions(data.transactions);
      setStats(data.stats);
      setPaymentMethodBreakdown(data.paymentMethodBreakdown);
      setLoading(false);
    } catch (error) {
      setError('Error loading payment data. Please try again.');
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchData();
  };

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailsDialogOpen(true);
  };

  const handleExportCSV = async () => {
    try {
      // Request CSV export
      const response = await fetch(
        `/api/admin/payments/export?startDate=${startDate}&endDate=${endDate}&status=${statusFilter}&gateway=${paymentGatewayFilter}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-report-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError('Error exporting data. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'successful':
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {status}
          </span>
        );
      case 'pending':
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            {status}
          </span>
        );
      case 'failed':
      case 'cancelled':
      case 'refunded':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading && transactions.length === 0 && !stats) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-transparent border-gray-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Payment Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Tabs for switching between Overview and Transactions */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex">
          <button
            onClick={() => handleTabChange(0)}
            className={`${
              tabValue === 0
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } py-4 px-1 mr-8 font-medium text-sm border-b-2`}
          >
            Overview
          </button>
          <button
            onClick={() => handleTabChange(1)}
            className={`${
              tabValue === 1
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } py-4 px-1 mr-8 font-medium text-sm border-b-2`}
          >
            Transactions
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {tabValue === 0 && (
        <>
          {/* Revenue Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <h3 className="text-2xl font-bold mt-1">
                {stats ? formatCurrency(stats.totalRevenue, stats.currency) : 'N/A'}
              </h3>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-500">Transactions</p>
              <h3 className="text-2xl font-bold mt-1">
                {stats ? stats.totalTransactions.toLocaleString() : 'N/A'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {stats 
                  ? `${stats.successfulTransactions.toLocaleString()} successful, ${stats.failedTransactions.toLocaleString()} failed` 
                  : ''}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-500">Average Transaction</p>
              <h3 className="text-2xl font-bold mt-1">
                {stats ? formatCurrency(stats.averageTransactionValue, stats.currency) : 'N/A'}
              </h3>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-500">Success Rate</p>
              <h3 className="text-2xl font-bold mt-1">
                {stats && stats.totalTransactions > 0
                  ? `${Math.round((stats.successfulTransactions / stats.totalTransactions) * 100)}%`
                  : 'N/A'}
              </h3>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Payment Method Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transactions
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % of Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentMethodBreakdown.map((method, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {method.gateway}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {method.count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(method.totalAmount, stats?.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {stats && stats.totalRevenue > 0
                          ? `${Math.round((method.totalAmount / stats.totalRevenue) * 100)}%`
                          : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Revenue Chart Placeholder */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Monthly Revenue</h2>
            <div className="h-64 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-center">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Revenue chart visualization would appear here</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Transactions Tab */}
      {tabValue === 1 && (
        <>
          {/* Filter Controls */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="search"
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="Search transactions"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <div className="flex space-x-2">
                  <div className="w-1/2">
                    <input
                      type="date"
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="w-1/2">
                    <input
                      type="date"
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="successful">Successful</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="gateway" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Gateway
                </label>
                <select
                  id="gateway"
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={paymentGatewayFilter}
                  onChange={(e) => setPaymentGatewayFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSearch}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </button>
              
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assessment
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gateway
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <div className="w-8 h-8 border-4 border-t-transparent border-gray-700 rounded-full animate-spin"></div>
                        </div>
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.userName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.assessmentTitle || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(transaction.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.gateway}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => handleViewDetails(transaction)}
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

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(page > 0 ? page - 1 : 0)}
                  disabled={page === 0}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{page * rowsPerPage + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min((page + 1) * rowsPerPage, transactions.length)}
                    </span>{' '}
                    of <span className="font-medium">{transactions.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setPage(page > 0 ? page - 1 : 0)}
                      disabled={page === 0}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {/* Current Page Indicator */}
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Page {page + 1}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Transaction Details Modal */}
      {detailsDialogOpen && selectedTransaction && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                    <CreditCard className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Transaction Details
                    </h3>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Transaction ID</p>
                        <p className="text-sm font-medium">{selectedTransaction.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Reference ID</p>
                        <p className="text-sm font-medium">{selectedTransaction.referenceId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">User</p>
                        <p className="text-sm font-medium">{selectedTransaction.userName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">User ID</p>
                        <p className="text-sm font-medium">{selectedTransaction.userId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Assessment</p>
                        <p className="text-sm font-medium">{selectedTransaction.assessmentTitle}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Assessment ID</p>
                        <p className="text-sm font-medium">{selectedTransaction.assessmentId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="text-sm font-medium">
                          {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="text-sm font-medium">{getStatusBadge(selectedTransaction.status)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Payment Gateway</p>
                        <p className="text-sm font-medium">{selectedTransaction.gateway}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="text-sm font-medium">
                          {new Date(selectedTransaction.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Last Updated</p>
                        <p className="text-sm font-medium">
                          {new Date(selectedTransaction.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setDetailsDialogOpen(false)}
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