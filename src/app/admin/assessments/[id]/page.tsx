'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  CreditCard, 
  FileText, 
  Eye, 
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  UserCheck,
  Star,
  BarChart3,
  Target,
  Lightbulb
} from 'lucide-react';

// ===== TYPES =====
interface AssessmentDetails {
  id: string;
  type: string;
  status: string;
  tier: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  manualProcessing: boolean;
  
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  
  originalData: any;
  processedResults: any;
  
  assignedClerk: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  
  reviewNotes: string | null;
  reviewedAt: string | null;
  
  payment: {
    id: string;
    amount: number;
    status: string;
    method: string;
    createdAt: string;
  } | null;
}

interface PackageAnalysis {
  name: string;
  features: string[];
  processingType: string;
  expectedDelivery: string;
  analysisDepth: string;
  currentStatus: string;
  isCompleted: boolean;
  hasClerkAssigned: boolean;
  clerkName: string | null;
  processingDuration: string | null;
}

export default function AssessmentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const [assessment, setAssessment] = useState<AssessmentDetails | null>(null);
  const [packageAnalysis, setPackageAnalysis] = useState<PackageAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'original' | 'results' | 'review'>('overview');

  useEffect(() => {
    if (params.id) {
      fetchAssessmentDetails(params.id as string);
    }
  }, [params.id]);

  const fetchAssessmentDetails = async (assessmentId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/assessments/${assessmentId}/view`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch assessment details');
      }
      
      const data = await response.json();
      setAssessment(data.data.assessment);
      setPackageAnalysis(data.data.packageAnalysis);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Completed
          </span>
        );
      case 'in_progress':
      case 'processing':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <Clock className="w-4 h-4 mr-1" />
            Processing
          </span>
        );
      case 'in_review':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
            <UserCheck className="w-4 h-4 mr-1" />
            In Review
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4 mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <AlertCircle className="w-4 h-4 mr-1" />
            {status}
          </span>
        );
    }
  };

  const getPackageBadge = (price: number) => {
    switch (price) {
      case 50:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <Star className="w-4 h-4 mr-1" />
            Basic (RM50)
          </span>
        );
      case 100:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
            <Star className="w-4 h-4 mr-1" />
            Standard (RM100)
          </span>
        );
      case 250:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gold-100 text-gold-800">
            <Star className="w-4 h-4 mr-1" />
            Premium (RM250)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            RM{price}
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error || 'Assessment not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Assessments
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assessment Details</h1>
            <p className="text-gray-600 mt-1">
              {assessment.type.toUpperCase()} - {assessment.user.name || assessment.user.email}
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 mt-4 md:mt-0">
            {getStatusBadge(assessment.status)}
            {getPackageBadge(assessment.price)}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'original', name: 'Original Data', icon: FileText },
            { id: 'results', name: 'Results', icon: Target },
            { id: 'review', name: 'Review Notes', icon: UserCheck }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              User Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900">{assessment.user.name || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{assessment.user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900">{assessment.user.phone || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Package Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2" />
              Package Details
            </h3>
            {packageAnalysis && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Package Type</label>
                  <p className="text-gray-900">{packageAnalysis.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Processing Type</label>
                  <p className="text-gray-900">{packageAnalysis.processingType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Analysis Depth</label>
                  <p className="text-gray-900">{packageAnalysis.analysisDepth}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Features</label>
                  <ul className="text-gray-900 text-sm mt-1">
                    {packageAnalysis.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Assessment Created</p>
                  <p className="text-sm text-gray-500">{formatDate(assessment.createdAt)}</p>
                </div>
              </div>
              
              {assessment.reviewedAt && (
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">Review Started</p>
                    <p className="text-sm text-gray-500">{formatDate(assessment.reviewedAt)}</p>
                  </div>
                </div>
              )}
              
              {assessment.completedAt && (
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">Assessment Completed</p>
                    <p className="text-sm text-gray-500">{formatDate(assessment.completedAt)}</p>
                    {packageAnalysis?.processingDuration && (
                      <p className="text-xs text-gray-400">Duration: {packageAnalysis.processingDuration}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          {assessment.payment && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Amount</label>
                  <p className="text-gray-900">RM {assessment.payment.amount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-gray-900">{assessment.payment.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Method</label>
                  <p className="text-gray-900">{assessment.payment.method}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Date</label>
                  <p className="text-gray-900">{formatDate(assessment.payment.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'original' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Original User Responses
          </h3>
          {assessment.originalData ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto">
                {JSON.stringify(assessment.originalData, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-gray-500 italic">No original data available</p>
          )}
        </div>
      )}

      {activeTab === 'results' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Processed Results & Analysis
          </h3>
          {assessment.processedResults ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto">
                {JSON.stringify(assessment.processedResults, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {assessment.status === 'completed' 
                  ? 'Results processing completed but no detailed analysis data available'
                  : 'Assessment results not yet available - still processing'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'review' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <UserCheck className="w-5 h-5 mr-2" />
            Review Notes & Clerk Information
          </h3>
          
          {assessment.assignedClerk ? (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-2">Assigned Clerk</h4>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-gray-900">{assessment.assignedClerk.name || 'Unnamed Clerk'}</p>
                <p className="text-gray-600 text-sm">{assessment.assignedClerk.email}</p>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-yellow-800">No clerk assigned - AI processed or awaiting assignment</p>
              </div>
            </div>
          )}

          {assessment.reviewNotes ? (
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">Review Notes</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{assessment.reviewNotes}</p>
              </div>
              {assessment.reviewedAt && (
                <p className="text-sm text-gray-500 mt-2">
                  Reviewed on: {formatDate(assessment.reviewedAt)}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No review notes available yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}