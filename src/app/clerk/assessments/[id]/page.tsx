'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react';

interface AssessmentData {
  id: string;
  type: string;
  status: string;
  tier: string;
  createdAt: string;
  updatedAt: string;
  price: number;
  data: any;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    createdAt: string;
  };
  payment: {
    id: string;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    coupon: {
      code: string;
      discountPercentage: number;
    } | null;
  } | null;
}

export default function AssessmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/clerk/assessments/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to load assessment');
        }
        
        const data = await response.json();
        setAssessment(data.assessment);
        setSelectedStatus(data.assessment.status);
        setSelectedTier(data.assessment.tier);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [params.id]);

  const updateAssessment = async () => {
    try {
      setUpdating(true);
      setUpdateSuccess(false);
      
      const response = await fetch(`/api/clerk/assessments/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: selectedStatus,
          tier: selectedTier,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update assessment');
      }
      
      // Update local state with new values
      setAssessment(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: selectedStatus,
          tier: selectedTier,
        };
      });
      
      setUpdateSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUpdating(false);
    }
  };

  // Function to get a readable assessment type name
  const getAssessmentTypeName = (type: string) => {
    const types: Record<string, string> = {
      'fjrl': 'First Job Readiness Level',
      'ijrl': 'Ideal Job Readiness Level',
      'cdrl': 'Career Development Readiness Level',
      'ccrl': 'Career Comeback Readiness Level',
      'ctrl': 'Career Transition Readiness Level',
      'rrl': 'Retirement Readiness Level',
      'irl': 'Internship Readiness Level',
    };
    
    return types[type] || type.toUpperCase();
  };
  
  // Function to get status icon
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return null;
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
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="mr-4 p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold">Assessment Details</h2>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-12 h-12 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg text-red-700 mb-6">
          {error}
        </div>
      ) : assessment ? (
        <div className="space-y-6">
          {/* Success message */}
          {updateSuccess && (
            <div className="bg-green-50 p-4 rounded-lg text-green-700 flex items-center">
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              Assessment updated successfully
            </div>
          )}
          
          {/* Assessment Information */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Assessment Information</h3>
                <div className="flex items-center">
                  {getStatusIcon(assessment.status)}
                  <span className="ml-2 text-sm font-medium">
                    {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Assessment ID</p>
                  <p className="mt-1">{assessment.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Type</p>
                  <p className="mt-1">{getAssessmentTypeName(assessment.type)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Tier</p>
                  <p className="mt-1">{assessment.tier.charAt(0).toUpperCase() + assessment.tier.slice(1)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Created</p>
                  <p className="mt-1">{format(new Date(assessment.createdAt), 'PPP p')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Updated</p>
                  <p className="mt-1">{format(new Date(assessment.updatedAt), 'PPP p')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Price</p>
                  <p className="mt-1">{formatPrice(assessment.price)}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* User Information */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">User Information</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="mt-1">{assessment.user.name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1">{assessment.user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="mt-1">{assessment.user.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">User Since</p>
                  <p className="mt-1">{format(new Date(assessment.user.createdAt), 'PPP')}</p>
                </div>
              </div>
              <div className="mt-4">
                <Link
                  href={`/clerk/users/${assessment.user.id}`}
                  className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                >
                  View User Profile
                </Link>
              </div>
            </div>
          </div>
          
          {/* Payment Information */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Payment Information</h3>
            </div>
            <div className="p-6">
              {assessment.payment ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payment ID</p>
                    <p className="mt-1">{assessment.payment.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Amount</p>
                    <p className="mt-1">{formatPrice(assessment.payment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Method</p>
                    <p className="mt-1">{assessment.payment.method}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="mt-1">{assessment.payment.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payment Date</p>
                    <p className="mt-1">{format(new Date(assessment.payment.createdAt), 'PPP')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Coupon</p>
                    <p className="mt-1">
                      {assessment.payment.coupon
                        ? `${assessment.payment.coupon.code} (${assessment.payment.coupon.discountPercentage}% off)`
                        : 'None'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">No payment information available</p>
              )}
            </div>
          </div>
          
          {/* Update Assessment */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Update Assessment</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="status"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="tier" className="block text-sm font-medium text-gray-700">
                    Tier
                  </label>
                  <select
                    id="tier"
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={updateAssessment}
                  disabled={updating}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update Assessment'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Assessment Data (if applicable) */}
          {assessment.data && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Assessment Data</h3>
              </div>
              <div className="p-6">
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                  {JSON.stringify(assessment.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">Assessment not found</p>
        </div>
      )}
    </div>
  );
}