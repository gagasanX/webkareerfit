// /src/app/admin/assessments/page.tsx
// Main assessment management interface for admins
// Features: List, filter, search, bulk operations, stats dashboard
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Search,
  Filter,
  Download,
  Eye,
  UserPlus,
  CheckSquare,
  Clock,
  AlertCircle,
  Users,
  BarChart3,
  RefreshCw,
  ChevronDown,
  Calendar,
  FileText
} from 'lucide-react';

// ===== TYPES =====
interface Assessment {
  id: string;
  type: string;
  tier: string;
  status: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  manualProcessing: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  assignedClerk: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  payment: {
    id: string;
    amount: number;
    status: string;
    method: string;
  } | null;
  _count: {
    referrals: number;
  };
}

interface AssessmentStats {
  totalAssessments: number;
  completedAssessments: number;
  pendingAssessments: number;
  inProgressAssessments: number;
  cancelledAssessments: number;
  manualProcessingCount: number;
  averageCompletionTime: number;
  totalRevenue: number;
  conversionRate: number;
}

interface AssessmentTypeBreakdown {
  type: string;
  count: number;
  completed: number;
  pending: number;
  revenue: number;
  avgPrice: number;
  completionRate: number;
}

interface AvailableClerk {
  id: string;
  name: string | null;
  email: string;
  currentWorkload: number;
}

interface Filters {
  search: string;
  status: string;
  type: string;
  tier: string;
  assignedClerk: string;
  manualProcessing: string;
  dateFrom: string;
  dateTo: string;
}

// ===== COMPONENTS =====
const StatCard = ({ title, value, subtitle, icon, color }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      <div className={`${color} p-3 rounded-lg`}>
        {icon}
      </div>
    </div>
  </div>
);

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
export default function AssessmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [typeBreakdown, setTypeBreakdown] = useState<AssessmentTypeBreakdown[]>([]);
  const [availableClerks, setAvailableClerks] = useState<AvailableClerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(10);

  // Filters
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    type: 'all',
    tier: 'all',
    assignedClerk: 'all',
    manualProcessing: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const [showFilters, setShowFilters] = useState(false);

  // Authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin-auth/login');
    } else if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  // Enhanced fetch with comprehensive debugging
  const fetchAssessments = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        includeStats: 'true',
        ...filters
      });

      console.log('🔍 Frontend Debug - Fetching with params:', params.toString());
      console.log('🔍 Frontend Debug - Current filters:', filters);

      const response = await fetch(`/api/admin/assessments?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch assessments: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'API returned unsuccessful response');
      }
      
      // 🚨 COMPREHENSIVE DEBUGGING
      console.log('🎯 Frontend Debug - Full API Response:', result);
      console.log('📊 Frontend Debug - Assessment count:', result.assessments?.length);
      console.log('📊 Frontend Debug - Total count from API:', result.pagination?.totalCount);
      console.log('🔍 Frontend Debug - Looking for assessment:', 'cmdron9ix0004t67lj3aoo2di');
      
      // Check if our specific assessment is in the response
      const targetAssessment = result.assessments?.find((a: Assessment) => a.id === 'cmdron9ix0004t67lj3aoo2di');
      console.log('🎯 Frontend Debug - Target assessment found:', targetAssessment ? 'YES ✅' : 'NO ❌');
      
      if (targetAssessment) {
        console.log('✅ Frontend Debug - Assessment details:', {
          id: targetAssessment.id,
          type: targetAssessment.type,
          status: targetAssessment.status,
          createdAt: targetAssessment.createdAt,
          user: targetAssessment.user?.email
        });
      } else {
        console.log('❌ Frontend Debug - Assessment not in response. All IDs in this page:');
        result.assessments?.forEach((a: Assessment, index: number) => {
          console.log(`   ${index + 1}. ${a.id} (${a.type}, ${a.status}, ${a.createdAt})`);
        });
        
        console.log('🔍 Frontend Debug - Checking if in other pages...');
        console.log('📄 Frontend Debug - Current page:', currentPage, 'of', result.pagination?.totalPages);
        console.log('📄 Frontend Debug - Items per page:', limit);
        console.log('📄 Frontend Debug - Total items:', result.pagination?.totalCount);
      }
      
      // Safely set data with fallbacks
      const safeAssessments = Array.isArray(result.assessments) ? result.assessments : [];
      setAssessments(safeAssessments);
      
      // Enhanced stats validation and fallbacks
      if (result.stats && typeof result.stats === 'object') {
        const safeStats = {
          totalAssessments: Number(result.stats.totalAssessments) || 0,
          completedAssessments: Number(result.stats.completedAssessments) || 0,
          pendingAssessments: Number(result.stats.pendingAssessments) || 0,
          inProgressAssessments: Number(result.stats.inProgressAssessments) || 0,
          cancelledAssessments: Number(result.stats.cancelledAssessments) || 0,
          manualProcessingCount: Number(result.stats.manualProcessingCount) || 0,
          // Enhanced completion time handling
          averageCompletionTime: (() => {
            const time = result.stats.averageCompletionTime;
            if (time === null || time === undefined || isNaN(Number(time))) {
              return 0;
            }
            return Number(time);
          })(),
          totalRevenue: Number(result.stats.totalRevenue) || 0,
          conversionRate: Number(result.stats.conversionRate) || 0
        };
        setStats(safeStats);
      } else {
        setStats(null);
      }
      
      setTypeBreakdown(Array.isArray(result.typeBreakdown) ? result.typeBreakdown : []);
      setAvailableClerks(Array.isArray(result.availableClerks) ? result.availableClerks : []);
      setTotalPages(Number(result.pagination?.totalPages) || 1);
      setTotalCount(Number(result.pagination?.totalCount) || 0);
      
      // 🚨 FINAL STATE CHECK
      console.log('📝 Frontend Debug - Setting assessments state with', safeAssessments.length, 'items');
      console.log('📝 Frontend Debug - Pagination:', {
        currentPage,
        totalPages: Number(result.pagination?.totalPages) || 1,
        totalCount: Number(result.pagination?.totalCount) || 0,
        limit
      });
      
    } catch (err) {
      console.error('❌ Frontend Debug - Error fetching assessments:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assessments';
      setError(errorMessage);
      
      // Set safe fallbacks to prevent UI crashes
      setAssessments([]);
      setStats(null);
      setTypeBreakdown([]);
      setAvailableClerks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchAssessments();
    }
  }, [status, session, currentPage, limit, filters]);

  // Handle filter changes
  const handleFilterChange = (key: keyof Filters, value: string) => {
    console.log('🔧 Frontend Debug - Filter changed:', key, '=', value);
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    console.log('🧹 Frontend Debug - Clearing all filters');
    setFilters({
      search: '',
      status: 'all',
      type: 'all',
      tier: 'all',
      assignedClerk: 'all',
      manualProcessing: 'all',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1);
  };

  // Handle selection
  const handleSelectAssessment = (assessmentId: string) => {
    setSelectedAssessments(prev => {
      if (prev.includes(assessmentId)) {
        return prev.filter(id => id !== assessmentId);
      } else {
        return [...prev, assessmentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedAssessments.length === assessments.length) {
      setSelectedAssessments([]);
    } else {
      setSelectedAssessments(assessments.map(a => a.id));
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: string, additionalData?: any) => {
    if (selectedAssessments.length === 0) return;
    
    setBulkActionLoading(true);
    
    try {
      const response = await fetch('/api/admin/assessments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentIds: selectedAssessments,
          action,
          ...additionalData
        })
      });
      
      if (!response.ok) {
        throw new Error('Bulk action failed');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh data
        await fetchAssessments();
        setSelectedAssessments([]);
        setShowBulkActions(false);
      }
    } catch (err) {
      console.error('Bulk action error:', err);
      setError(err instanceof Error ? err.message : 'Bulk action failed');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `RM ${amount.toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  // 🚨 RENDER DEBUG
  console.log('🎨 Frontend Debug - Rendering with assessments:', assessments.length);
  console.log('🎨 Frontend Debug - First few assessments:', assessments.slice(0, 3).map(a => ({
    id: a.id.substring(0, 8),
    type: a.type,
    status: a.status,
    createdAt: a.createdAt
  })));

  if (loading && assessments.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-transparent border-gray-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* DEBUG INFO PANEL - TEMPORARY */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-blue-800 mb-2">🔍 Debug Info (Remove when fixed)</h3>
        <div className="text-xs text-blue-700 space-y-1">
          <div>Total assessments in database: {totalCount}</div>
          <div>Assessments on current page: {assessments.length}</div>
          <div>Current page: {currentPage} of {totalPages}</div>
          <div>Target assessment (cmdron9ix0004t67lj3aoo2di): {assessments.find(a => a.id === 'cmdron9ix0004t67lj3aoo2di') ? '✅ FOUND' : '❌ NOT FOUND'}</div>
          <div>Active filters: {Object.entries(filters).filter(([_, value]) => value && value !== 'all').map(([key, value]) => `${key}=${value}`).join(', ') || 'None'}</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Assessment Management</h1>
          <p className="text-gray-600">Manage and track all assessments</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={fetchAssessments}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            <ChevronDown className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Stats Cards with Loading States */}
      {loading && !stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Total Assessments"
            value={stats.totalAssessments || 0}
            icon={<FileText className="h-6 w-6 text-white" />}
            color="bg-blue-600"
          />
          
          <StatCard
            title="Completed"
            value={stats.completedAssessments || 0}
            subtitle={`${(stats.conversionRate || 0).toFixed(1)}% completion rate`}
            icon={<CheckSquare className="h-6 w-6 text-white" />}
            color="bg-green-600"
          />
          
          <StatCard
            title="Pending"
            value={stats.pendingAssessments || 0}
            icon={<Clock className="h-6 w-6 text-white" />}
            color="bg-yellow-600"
          />
          
          <StatCard
            title="In Progress"
            value={stats.inProgressAssessments || 0}
            icon={<Users className="h-6 w-6 text-white" />}
            color="bg-blue-600"
          />
          
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue || 0)}
            subtitle={`${(stats.averageCompletionTime || 0).toFixed(1)}h avg completion`}
            icon={<BarChart3 className="h-6 w-6 text-white" />}
            color="bg-purple-600"
          />
        </div>
      ) : null}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search assessments..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Types</option>
                <option value="ccrl">CCRL</option>
                <option value="cdrl">CDRL</option>
                <option value="ctrl">CTRL</option>
                <option value="fjrl">FJRL</option>
                <option value="ijrl">IJRL</option>
                <option value="irl">IRL</option>
                <option value="rrl">RRL</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
              <select
                value={filters.tier}
                onChange={(e) => handleFilterChange('tier', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Tiers</option>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Clerk</label>
              <select
                value={filters.assignedClerk}
                onChange={(e) => handleFilterChange('assignedClerk', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Clerks</option>
                <option value="unassigned">Unassigned</option>
                {availableClerks.map(clerk => (
                  <option key={clerk.id} value={clerk.id}>
                    {clerk.name || clerk.email} ({clerk.currentWorkload})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manual Processing</label>
              <select
                value={filters.manualProcessing}
                onChange={(e) => handleFilterChange('manualProcessing', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All</option>
                <option value="true">Manual Only</option>
                <option value="false">Automated Only</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4 space-x-3">
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedAssessments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckSquare className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">
                {selectedAssessments.length} assessment(s) selected
              </span>
            </div>
            
            <div className="flex space-x-2">
              <select
                onChange={(e) => {
                  if (e.target.value === 'assign_clerk') {
                    setShowBulkActions(true);
                  } else if (e.target.value) {
                    handleBulkAction(e.target.value);
                  }
                }}
                className="text-sm border border-blue-300 rounded px-3 py-1"
                defaultValue=""
                disabled={bulkActionLoading}
              >
                <option value="">Select Action...</option>
                <option value="assign_clerk">Assign to Clerk</option>
                <option value="bulk_process">Mark as Completed</option>
                <option value="update_status">Update Status</option>
              </select>
              
              <button
                onClick={() => setSelectedAssessments([])}
                className="text-sm text-gray-600 hover:text-gray-800"
                disabled={bulkActionLoading}
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assessments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedAssessments.length === assessments.length && assessments.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assessment
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Clerk
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assessments.length > 0 ? (
                assessments.map((assessment) => (
                  <tr 
                    key={assessment.id} 
                    className={`hover:bg-gray-50 ${
                      assessment.id === 'cmdron9ix0004t67lj3aoo2di' 
                        ? 'bg-yellow-100 border-2 border-yellow-400' 
                        : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedAssessments.includes(assessment.id)}
                        onChange={() => handleSelectAssessment(assessment.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {assessment.type.toUpperCase()}
                          {assessment.id === 'cmdron9ix0004t67lj3aoo2di' && (
                            <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-1 rounded">TARGET</span>
                          )}
                        </div>
                        <div className="flex items-center mt-1">
                          <TierBadge tier={assessment.tier} />
                          {assessment.manualProcessing && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              Manual
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {assessment.id.substring(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {assessment.user.name || 'Unnamed User'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {assessment.user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={assessment.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {assessment.assignedClerk ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {assessment.assignedClerk.name || 'Unnamed Clerk'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {assessment.assignedClerk.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {assessment.payment ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(assessment.payment.amount)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {assessment.payment.status} • {assessment.payment.method}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No payment</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>Created: {formatDate(assessment.createdAt)}</div>
                        {assessment.reviewedAt && (
                          <div>Reviewed: {formatDate(assessment.reviewedAt)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => router.push(`/admin/assessments/${assessment.id}`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    {loading ? 'Loading assessments...' : 'No assessments found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((currentPage - 1) * limit) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * limit, totalCount)}
                  </span>{' '}
                  of <span className="font-medium">{totalCount}</span> results
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
                
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Modal for Clerk Assignment */}
      {showBulkActions && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Assign Clerk to Selected Assessments
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Clerk
                  </label>
                  <select
                    id="clerkSelect"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Choose a clerk...</option>
                    {availableClerks.map(clerk => (
                      <option key={clerk.id} value={clerk.id}>
                        {clerk.name || clerk.email} (Current workload: {clerk.currentWorkload})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notesTextarea"
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Add any notes for the clerk..."
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => {
                    const clerkSelect = document.getElementById('clerkSelect') as HTMLSelectElement;
                    const notesTextarea = document.getElementById('notesTextarea') as HTMLTextAreaElement;
                    
                    if (clerkSelect.value) {
                      handleBulkAction('assign_clerk', {
                        clerkId: clerkSelect.value,
                        notes: notesTextarea.value
                      });
                    }
                  }}
                  disabled={bulkActionLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {bulkActionLoading ? 'Assigning...' : 'Assign Clerk'}
                </button>
                
                <button
                  onClick={() => setShowBulkActions(false)}
                  disabled={bulkActionLoading}
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