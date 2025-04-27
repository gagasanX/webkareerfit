'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Filter, 
  AlertCircle,
  CheckCircle,
  Clock,
  UserCheck,
  RefreshCw,
  Users,
  Check,
  X
} from 'lucide-react';

interface Assessment {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  userName?: string;
  completedAt?: string;
  tier?: string;
  price?: number;
  manualProcessing?: boolean;
  assignedClerkId?: string | null;
  assignedClerk?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
}

interface Clerk {
  id: string;
  name: string | null;
  email: string;
}

export default function AdminAssessmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [clerks, setClerks] = useState<Clerk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingClerks, setLoadingClerks] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState<boolean>(false);
  const [selectedClerkId, setSelectedClerkId] = useState<string>('');
  const [assigningAssessment, setAssigningAssessment] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPrice, setFilterPrice] = useState<string>('all');
  const [filterProcessing, setFilterProcessing] = useState<string>('all');

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
      fetchAssessments();
      fetchClerks();
    }
  }, [status, session, router, page, rowsPerPage]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      // Build the query parameters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
        search: searchTerm,
      });
      
      if (filterStatus !== 'all') queryParams.append('status', filterStatus);
      if (filterType !== 'all') queryParams.append('type', filterType);
      if (filterPrice !== 'all') queryParams.append('price', filterPrice);
      if (filterProcessing !== 'all') queryParams.append('manualProcessing', filterProcessing === 'manual' ? 'true' : 'false');
      
      const response = await fetch(`/api/admin/assessments?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch assessments');
      }
      const data = await response.json();
      setAssessments(data.assessments || []);
      setLoading(false);
    } catch (error) {
      setError('Error loading assessments. Please try again.');
      setLoading(false);
    }
  };

  const fetchClerks = async () => {
    setLoadingClerks(true);
    try {
      const response = await fetch('/api/admin/clerks');
      if (!response.ok) {
        throw new Error('Failed to fetch clerks');
      }
      const data = await response.json();
      setClerks(data.clerks || []);
    } catch (error) {
      console.error('Error loading clerks:', error);
    } finally {
      setLoadingClerks(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchAssessments();
  };

  const handleFilterChange = () => {
    setPage(0);
    fetchAssessments();
  };

  const handleDeleteClick = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setDeleteDialogOpen(true);
  };

  const handleAssignClick = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setSelectedClerkId(assessment.assignedClerkId || '');
    setAssignDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAssessment) return;
    
    try {
      const response = await fetch(`/api/admin/assessments/${selectedAssessment.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete assessment');
      }
      
      // Remove the deleted assessment from the list
      setAssessments(assessments.filter(a => a.id !== selectedAssessment.id));
      setDeleteDialogOpen(false);
      setSelectedAssessment(null);
    } catch (error) {
      setError('Error deleting assessment. Please try again.');
    }
  };

  const handleAssignConfirm = async () => {
    if (!selectedAssessment) return;
    
    try {
      setAssigningAssessment(true);
      
      const response = await fetch(`/api/admin/assessments/${selectedAssessment.id}/reassign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: selectedClerkId || null,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reassign assessment');
      }
      
      // Update the assessment in the list
      const data = await response.json();
      
      setAssessments(prev => 
        prev.map(a => a.id === selectedAssessment.id 
          ? {
              ...a,
              assignedClerkId: selectedClerkId || null,
              assignedClerk: clerks.find(c => c.id === selectedClerkId) || null,
              status: selectedClerkId ? 'in_review' : 'pending_review'
            } 
          : a
        )
      );
      
      setAssignDialogOpen(false);
      setSelectedAssessment(null);
      setSelectedClerkId('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error reassigning assessment. Please try again.');
    } finally {
      setAssigningAssessment(false);
    }
  };

  const handleViewResults = (assessmentId: string, assessmentType: string) => {
    router.push(`/admin/assessments/${assessmentType}/results/${assessmentId}`);
  };

  const handleEditAssessment = (assessmentId: string) => {
    router.push(`/admin/assessments/edit/${assessmentId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'in_progress':
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            Processing
          </span>
        );
      case 'in_review':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <UserCheck className="w-3 h-3 mr-1" />
            In Review
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Cancelled
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
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

  const getProcessingType = (assessment: Assessment) => {
    if (assessment.manualProcessing || assessment.price === 100 || assessment.price === 250) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Users className="w-3 h-3 mr-1" />
          Manual
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <FileText className="w-3 h-3 mr-1" />
        AI
      </span>
    );
  };

  const getAssignmentInfo = (assessment: Assessment) => {
    if (!assessment.manualProcessing && assessment.price !== 100 && assessment.price !== 250) {
      return (
        <span className="text-gray-500">N/A</span>
      );
    }
    
    if (!assessment.assignedClerkId) {
      return (
        <span className="text-yellow-600">Unassigned</span>
      );
    }
    
    const clerkName = assessment.assignedClerk?.name || 'Unknown';
    const clerkEmail = assessment.assignedClerk?.email || '';
    
    return (
      <div>
        <div className="font-medium">{clerkName}</div>
        <div className="text-xs text-gray-500">{clerkEmail}</div>
      </div>
    );
  };

  const formatPrice = (price?: number) => {
    if (!price && price !== 0) return 'N/A';
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(price);
  };

  // Get assessment type name
  const getAssessmentTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      'fjrl': 'First Job Readiness',
      'ijrl': 'Ideal Job Readiness',
      'cdrl': 'Career Development',
      'ccrl': 'Career Comeback',
      'ctrl': 'Career Transition',
      'rrl': 'Retirement Readiness',
      'irl': 'Internship Readiness',
    };
    
    return typeMap[type] || type.toUpperCase();
  };

  // Memoize the filtered assessments to avoid recalculating on every render
  const filteredAssessments = useMemo(() => {
    return assessments;
  }, [assessments]);

  if (loading && assessments.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-transparent border-gray-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Assessment Management</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
          <div className="w-full md:w-1/3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="filterStatus" className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="pending_review">Pending Review</option>
                <option value="in_review">In Review</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label htmlFor="filterType" className="block text-xs font-medium text-gray-500 mb-1">Assessment Type</label>
              <select
                id="filterType"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">All Types</option>
                <option value="fjrl">First Job Readiness</option>
                <option value="ijrl">Ideal Job Readiness</option>
                <option value="cdrl">Career Development</option>
                <option value="ccrl">Career Comeback</option>
                <option value="ctrl">Career Transition</option>
                <option value="rrl">Retirement Readiness</option>
                <option value="irl">Internship Readiness</option>
              </select>
            </div>
            <div>
              <label htmlFor="filterPrice" className="block text-xs font-medium text-gray-500 mb-1">Package</label>
              <select
                id="filterPrice"
                value={filterPrice}
                onChange={(e) => setFilterPrice(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">All Packages</option>
                <option value="50">RM50 (Basic)</option>
                <option value="100">RM100 (Standard)</option>
                <option value="250">RM250 (Premium)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2">
            <div className="flex items-center">
              <label htmlFor="filterProcessing" className="block text-xs font-medium text-gray-500 mr-2">Processing:</label>
              <div className="flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => setFilterProcessing('all')}
                  className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                    filterProcessing === 'all'
                      ? 'bg-indigo-50 text-indigo-700 z-10'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterProcessing('manual')}
                  className={`relative inline-flex items-center px-4 py-2 border-t border-b border-r border-gray-300 text-sm font-medium ${
                    filterProcessing === 'manual'
                      ? 'bg-indigo-50 text-indigo-700 z-10'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => setFilterProcessing('ai')}
                  className={`relative inline-flex items-center px-4 py-2 rounded-r-md border-t border-b border-r border-gray-300 text-sm font-medium ${
                    filterProcessing === 'ai'
                      ? 'bg-indigo-50 text-indigo-700 z-10'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  AI
                </button>
              </div>
            </div>
          </div>
          <div className="w-full md:w-1/2 flex justify-end">
            <button
              onClick={handleFilterChange}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </button>
            <button
              onClick={fetchAssessments}
              className="ml-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Package
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processing
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-t-transparent border-gray-700 rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredAssessments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    No assessments found
                  </td>
                </tr>
              ) : (
                filteredAssessments.map((assessment) => (
                  <tr key={assessment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assessment.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getAssessmentTypeName(assessment.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {assessment.userName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatPrice(assessment.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getProcessingType(assessment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getAssignmentInfo(assessment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(assessment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewResults(assessment.id, assessment.type)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Results"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {(assessment.manualProcessing || assessment.price === 100 || assessment.price === 250) && (
                          <button
                            onClick={() => handleAssignClick(assessment)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Assign to Clerk"
                          >
                            <UserCheck className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditAssessment(assessment.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Edit Assessment"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(assessment)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Assessment"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
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
                Showing <span className="font-medium">{filteredAssessments.length > 0 ? page * rowsPerPage + 1 : 0}</span> to{' '}
                <span className="font-medium">
                  {Math.min((page + 1) * rowsPerPage, filteredAssessments.length)}
                </span>{' '}
                of <span className="font-medium">{filteredAssessments.length}</span> results
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

      {/* Delete Confirmation Modal */}
      {deleteDialogOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Confirm Deletion
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this assessment? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteConfirm}
                >
                  Delete
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Clerk Modal */}
      {assignDialogOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                    <UserCheck className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Assign Assessment to Clerk
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-4">
                        Select a clerk to assign this assessment to for manual review.
                      </p>
                      
                      <div className="mb-4">
                        <label htmlFor="clerkSelect" className="block text-sm font-medium text-gray-700 mb-1">
                          Select Clerk
                        </label>
                        <select
                          id="clerkSelect"
                          value={selectedClerkId}
                          onChange={(e) => setSelectedClerkId(e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                          <option value="">-- Unassign --</option>
                          {loadingClerks ? (
                            <option disabled>Loading clerks...</option>
                          ) : clerks.length === 0 ? (
                            <option disabled>No clerks available</option>
                          ) : (
                            clerks.map((clerk) => (
                              <option key={clerk.id} value={clerk.id}>
                                {clerk.name || clerk.email}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                      
                      <div className="bg-yellow-50 p-3 rounded-md">
                        <p className="text-xs text-yellow-800">
                          {!selectedClerkId 
                            ? 'Unassigning will return this assessment to the pending review pool.'
                            : 'Assigning will change the status to "In Review" and notify the clerk.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  onClick={handleAssignConfirm}
                  disabled={assigningAssessment || loadingClerks}
                >
                  {assigningAssessment ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : selectedClerkId ? 'Assign to Clerk' : 'Unassign'}
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setAssignDialogOpen(false)}
                  disabled={assigningAssessment}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}