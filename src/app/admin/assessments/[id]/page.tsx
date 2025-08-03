// /src/app/admin/assessments/[id]/page.tsx
// Individual assessment detail view and editor
// Features: View details, edit assessment, assign clerks, delete
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AssessmentFormViewer from '@/components/admin/AssessmentFormViewer';
import { 
  ArrowLeft,
  Edit,
  Save,
  X,
  Clock,
  User,
  CreditCard,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  UserCheck,
  DollarSign,
  Eye,
  Download,
  Trash2
} from 'lucide-react';

// ===== TYPES =====
interface AssessmentDetail {
  id: string;
  type: string;
  tier: string;
  status: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  manualProcessing: boolean;
  data: any;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    createdAt: string;
  };
  assignedClerk: {
    id: string;
    name: string | null;
    email: string;
    assignedAt: string;
  } | null;
  payment: {
    id: string;
    amount: number;
    status: string;
    method: string;
    gatewayPaymentId: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  referrals: Array<{
    id: string;
    affiliateId: string;
    affiliateName: string | null;
    affiliateEmail: string;
    commission: number;
    status: string;
    paidOut: boolean;
    createdAt: string;
  }>;
}

interface ActivityLog {
  id: string;
  eventType: string;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AvailableClerk {
  id: string;
  name: string | null;
  email: string;
  currentWorkload: number;
}

// ===== COMPONENTS =====
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(status)}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

const TierBadge = ({ tier }: { tier: string }) => {
  const getTierStyle = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'premium':
        return 'bg-purple-100 text-purple-800';
      case 'standard':
        return 'bg-blue-100 text-blue-800';
      case 'basic':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getTierStyle(tier)}`}>
      {tier.toUpperCase()}
    </span>
  );
};

// ===== MAIN COMPONENT =====
export default function AssessmentDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const assessmentId = params?.id as string;

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [activityHistory, setActivityHistory] = useState<ActivityLog[]>([]);
  const [availableClerks, setAvailableClerks] = useState<AvailableClerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    status: '',
    tier: '',
    assignedClerkId: '',
    reviewNotes: '',
    manualProcessing: false,
    price: 0
  });

  // Authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin-auth/login');
    } else if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  // Enhanced fetch with comprehensive error handling
  const fetchAssessment = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch(`/api/admin/assessments/${assessmentId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Assessment not found');
        }
        if (response.status === 403) {
          throw new Error('Access denied - Admin privileges required');
        }
        const errorText = await response.text();
        throw new Error(`Failed to fetch assessment: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'API returned unsuccessful response');
      }
      
      // Validate and safely set assessment data
      if (!result.assessment || typeof result.assessment !== 'object') {
        throw new Error('Invalid assessment data received');
      }
      
      setAssessment(result.assessment);
      setActivityHistory(Array.isArray(result.activityHistory) ? result.activityHistory : []);
      
      // Initialize edit form with safe defaults
      setEditForm({
        status: result.assessment.status || 'pending',
        tier: result.assessment.tier || 'basic',
        assignedClerkId: result.assessment.assignedClerk?.id || '',
        reviewNotes: result.assessment.reviewNotes || '',
        manualProcessing: Boolean(result.assessment.manualProcessing),
        price: Number(result.assessment.price) || 0
      });
      
    } catch (err) {
      console.error('Error fetching assessment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assessment';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available clerks
  const fetchClerks = async () => {
    try {
      const response = await fetch('/api/admin/assessments?includeStats=false&limit=1');
      if (response.ok) {
        const result = await response.json();
        setAvailableClerks(result.availableClerks || []);
      }
    } catch (err) {
      console.error('Error fetching clerks:', err);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isAdmin && assessmentId) {
      fetchAssessment();
      fetchClerks();
    }
  }, [status, session, assessmentId]);

  // Handle save changes
  const handleSave = async () => {
    if (!assessment) return;
    
    setSaving(true);
    
    try {
      const updateData: any = {};
      
      if (editForm.status !== assessment.status) {
        updateData.status = editForm.status;
      }
      
      if (editForm.tier !== assessment.tier) {
        updateData.tier = editForm.tier;
      }
      
      if (editForm.assignedClerkId !== (assessment.assignedClerk?.id || '')) {
        updateData.assignedClerkId = editForm.assignedClerkId || 'unassign';
      }
      
      if (editForm.reviewNotes !== (assessment.reviewNotes || '')) {
        updateData.reviewNotes = editForm.reviewNotes;
      }
      
      if (editForm.manualProcessing !== assessment.manualProcessing) {
        updateData.manualProcessing = editForm.manualProcessing;
      }
      
      if (editForm.price !== assessment.price) {
        updateData.price = editForm.price;
      }
      
      const response = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update assessment');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh data
        await fetchAssessment();
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error updating assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to update assessment');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete assessment');
      }
      
      // Redirect back to assessments list
      router.push('/admin/assessments');
    } catch (err) {
      console.error('Error deleting assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete assessment');
      setDeleteConfirm(false);
    }
  };

  const formatCurrency = (amount: number) => `RM ${amount.toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-transparent border-gray-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchAssessment}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Assessment not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link 
            href="/admin/assessments"
            className="mr-4 inline-flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back to Assessments
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Assessment Details</h1>
            <p className="text-gray-600">{assessment.type.toUpperCase()} • ID: {assessment.id}</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={fetchAssessment}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </button>
              
              <button
                onClick={() => {
                  setIsEditing(false);
                  // Reset form
                  setEditForm({
                    status: assessment.status,
                    tier: assessment.tier,
                    assignedClerkId: assessment.assignedClerk?.id || '',
                    reviewNotes: assessment.reviewNotes || '',
                    manualProcessing: assessment.manualProcessing,
                    price: assessment.price
                  });
                }}
                disabled={saving}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          )}
          
          <button
            onClick={() => setDeleteConfirm(true)}
            className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Assessment Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Assessment Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="text-lg font-bold">{assessment.type.toUpperCase()}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                {isEditing ? (
                  <select
                    value={editForm.tier}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tier: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                  </select>
                ) : (
                  <div><TierBadge tier={assessment.tier} /></div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                {isEditing ? (
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                ) : (
                  <div><StatusBadge status={assessment.status} /></div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    min="0"
                    max="10000"
                    step="0.01"
                  />
                ) : (
                  <div className="text-lg font-semibold">{formatCurrency(assessment.price)}</div>
                )}
              </div>
              
              <div className="col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isEditing ? editForm.manualProcessing : assessment.manualProcessing}
                    onChange={(e) => isEditing && setEditForm(prev => ({ ...prev, manualProcessing: e.target.checked }))}
                    disabled={!isEditing}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Requires Manual Processing</span>
                </label>
              </div>
            </div>
          </div>

          {/* Assigned Clerk */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Assigned Clerk</h2>
            
            {isEditing ? (
              <select
                value={editForm.assignedClerkId}
                onChange={(e) => setEditForm(prev => ({ ...prev, assignedClerkId: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Unassigned</option>
                {availableClerks.map(clerk => (
                  <option key={clerk.id} value={clerk.id}>
                    {clerk.name || clerk.email} (Workload: {clerk.currentWorkload})
                  </option>
                ))}
              </select>
            ) : (
              <div>
                {assessment.assignedClerk ? (
                  <div className="flex items-center">
                    <UserCheck className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <div className="font-medium">{assessment.assignedClerk.name || 'Unnamed Clerk'}</div>
                      <div className="text-sm text-gray-500">{assessment.assignedClerk.email}</div>
                      <div className="text-xs text-gray-400">Assigned: {formatDate(assessment.assignedClerk.assignedAt)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">No clerk assigned</div>
                )}
              </div>
            )}
          </div>

          {/* Review Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Review Notes</h2>
            
            {isEditing ? (
              <textarea
                value={editForm.reviewNotes}
                onChange={(e) => setEditForm(prev => ({ ...prev, reviewNotes: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                rows={4}
                placeholder="Add review notes..."
              />
            ) : (
              <div className="text-gray-700">
                {assessment.reviewNotes ? (
                  <p className="whitespace-pre-wrap">{assessment.reviewNotes}</p>
                ) : (
                  <p className="text-gray-500 italic">No review notes</p>
                )}
              </div>
            )}
          </div>

          {/* Assessment Form Responses - NEW SECTION */}
          {assessment.data && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Assessment Data</h2>
              <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(assessment.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - User Info, Payment, etc. */}
        <div className="space-y-6">
          {/* User Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              User Information
            </h2>
            
            <div className="space-y-3">
              <div>
                <div className="font-medium">{assessment.user.name || 'Unnamed User'}</div>
                <div className="text-sm text-gray-500">{assessment.user.email}</div>
                {assessment.user.phone && (
                  <div className="text-sm text-gray-500">{assessment.user.phone}</div>
                )}
              </div>
              
              <div className="text-xs text-gray-400">
                Member since: {formatDate(assessment.user.createdAt)}
              </div>
              
              <button
                onClick={() => router.push(`/admin/users/${assessment.user.id}`)}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                View User Profile →
              </button>
            </div>
          </div>

          {/* Payment Information */}
          {assessment.payment && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Information
              </h2>
              
              <div className="space-y-3">
                <div>
                  <div className="font-medium text-lg">{formatCurrency(assessment.payment.amount)}</div>
                  <div className="text-sm text-gray-500">
                    Status: <StatusBadge status={assessment.payment.status} />
                  </div>
                  <div className="text-sm text-gray-500">Method: {assessment.payment.method}</div>
                  {assessment.payment.gatewayPaymentId && (
                    <div className="text-xs text-gray-400">
                      Gateway ID: {assessment.payment.gatewayPaymentId}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-400">
                  Paid: {formatDate(assessment.payment.createdAt)}
                </div>
              </div>
            </div>
          )}

          {/* Referrals */}
          {assessment.referrals.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Referrals ({assessment.referrals.length})
              </h2>
              
              <div className="space-y-3">
                {assessment.referrals.map(referral => (
                  <div key={referral.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <div className="font-medium text-sm">
                      {referral.affiliateName || referral.affiliateEmail}
                    </div>
                    <div className="text-sm text-gray-500">
                      Commission: {formatCurrency(referral.commission)}
                    </div>
                    <div className="flex items-center text-xs">
                      <StatusBadge status={referral.status} />
                      {referral.paidOut && (
                        <span className="ml-2 text-green-600">✓ Paid</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Important Dates */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Important Dates
            </h2>
            
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Created</div>
                <div className="text-gray-500">{formatDate(assessment.createdAt)}</div>
              </div>
              
              <div>
                <div className="font-medium">Last Updated</div>
                <div className="text-gray-500">{formatDate(assessment.updatedAt)}</div>
              </div>
              
              {assessment.reviewedAt && (
                <div>
                  <div className="font-medium">Reviewed</div>
                  <div className="text-gray-500">{formatDate(assessment.reviewedAt)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Activity History */}
          {activityHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Recent Activity
              </h2>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activityHistory.map(log => (
                  <div key={log.id} className="text-sm border-b border-gray-100 pb-2 last:border-b-0">
                    <div className="font-medium">{log.eventType.replace('_', ' ')}</div>
                    <div className="text-xs text-gray-500">{formatDate(log.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Assessment
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this assessment? This action cannot be undone and will also delete any associated payments and referral data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleDelete}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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