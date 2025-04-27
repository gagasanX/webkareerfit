// src/app/clerk/assessments/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, FilterIcon, RefreshCw } from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Assessment {
  id: string;
  type: string;
  status: string;
  tier: string;
  createdAt: string;
  updatedAt: string;
  price: number;
  manualProcessing: boolean;
  assignedClerkId: string | null;
  user: User;
}

export default function ClerkAssessmentsPage() {
  const router = useRouter();
  const [unassignedAssessments, setUnassignedAssessments] = useState<Assessment[]>([]);
  const [assignedAssessments, setAssignedAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Fetch assessments with search and filters
  useEffect(() => {
    fetchAssessments();
  }, [page, searchTerm, filterStatus, filterType]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/clerk/assessments?page=${page}&search=${searchTerm}&status=${filterStatus}&type=${filterType}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load assessments');
      }
      
      const data = await response.json();
      
      setUnassignedAssessments(data.unassigned || []);
      setAssignedAssessments(data.assigned || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    fetchAssessments();
  };

  const acceptAssessment = async (id: string) => {
    try {
      setAcceptingId(id);
      const response = await fetch(`/api/clerk/assessments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept assessment');
      }
      
      // Refresh the assessments
      fetchAssessments();
    } catch (err) {
      console.error('Error accepting assessment:', err);
      alert(err instanceof Error ? err.message : 'An error occurred while accepting the assessment');
    } finally {
      setAcceptingId(null);
    }
  };

  // Function to get a readable assessment type name
  const getAssessmentTypeName = (type: string) => {
    const types: Record<string, string> = {
      'fjrl': 'First Job Readiness',
      'ijrl': 'Ideal Job Readiness',
      'cdrl': 'Career Development',
      'ccrl': 'Career Comeback',
      'ctrl': 'Career Transition',
      'rrl': 'Retirement Readiness',
      'irl': 'Internship Readiness',
    };
    
    return types[type] || type.toUpperCase();
  };
  
  // Function to get badge color based on status
  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'pending':
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_review':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Format status for display
  const formatStatus = (status: string) => {
    switch(status) {
      case 'pending_review':
        return 'Pending Review';
      case 'in_review':
        return 'In Review';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  // Function to format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(price);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Manual Assessment Management</h2>
        <button 
          onClick={fetchAssessments}
          className="px-3 py-2 bg-indigo-600 text-white rounded-md flex items-center gap-2 hover:bg-indigo-700"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <SearchIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Search by email, name, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>
          
          <div className="flex gap-4">
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="in_review">In Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
            
            <button
              type="submit"
              onClick={handleSearch}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {loading && unassignedAssessments.length === 0 && assignedAssessments.length === 0 ? (
        <div className="flex justify-center p-12">
          <div className="w-12 h-12 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg text-red-700 mb-6">
          {error}
        </div>
      ) : (
        <>
          {/* Unassigned Assessments Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Assessments Waiting for Review</h3>
            </div>
            
            {loading && unassignedAssessments.length === 0 ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : unassignedAssessments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No assessments waiting for review
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {unassignedAssessments.map((assessment) => (
                      <tr key={assessment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getAssessmentTypeName(assessment.type)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {assessment.user.name || 'User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {assessment.user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatPrice(assessment.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDistanceToNow(new Date(assessment.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => acceptAssessment(assessment.id)}
                            disabled={acceptingId === assessment.id}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              acceptingId === assessment.id
                                ? 'bg-gray-100 text-gray-500'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {acceptingId === assessment.id ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Accepting...
                              </span>
                            ) : (
                              'Accept for Review'
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Assigned Assessments Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Your Assigned Assessments</h3>
            </div>
            
            {loading && assignedAssessments.length === 0 ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : assignedAssessments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                You don't have any assigned assessments
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignedAssessments.map((assessment) => (
                      <tr key={assessment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getAssessmentTypeName(assessment.type)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {assessment.user.name || 'User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {assessment.user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(assessment.status)}`}>
                            {formatStatus(assessment.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatPrice(assessment.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDistanceToNow(new Date(assessment.updatedAt), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/clerk/assessments/${assessment.id}`}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full"
                          >
                            {assessment.status === 'completed' ? 'View' : 'Review'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
                <div className="flex justify-between flex-1 sm:hidden">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{page}</span> of{' '}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // Show pages around current page
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border ${
                              page === pageNum
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-600'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            } text-sm font-medium`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}