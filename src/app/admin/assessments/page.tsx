'use client';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Search,
  Filter,
  Eye,
  CheckSquare,
  Clock,
  AlertCircle,
  Users,
  BarChart3,
  RefreshCw,
  ChevronDown,
  FileText,
  Loader2
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

// ===== SKELETON COMPONENTS =====
const StatCardSkeleton = memo(() => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
        <div className="h-3 bg-gray-200 rounded w-12"></div>
      </div>
      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
));

const TableRowSkeleton = memo(() => (
  <tr className="animate-pulse">
    <td className="px-6 py-4"><div className="h-4 w-4 bg-gray-200 rounded"></div></td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
        <div className="h-3 bg-gray-200 rounded w-12"></div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-3 bg-gray-200 rounded w-32"></div>
      </div>
    </td>
    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-16"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-20"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
    </td>
    <td className="px-6 py-4"><div className="h-4 w-4 bg-gray-200 rounded"></div></td>
  </tr>
));

// ===== OPTIMIZED COMPONENTS =====
const StatCard = memo(({ title, value, subtitle, icon, color, loading }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}) => {
  if (loading) return <StatCardSkeleton />;
  
  return (
    <div className="bg-white rounded-lg shadow p-6 transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
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
        <div className={`${color} p-3 rounded-lg shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
});

const StatusBadge = memo(({ status }: { status: string }) => {
  const style = useMemo(() => {
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
  }, [status]);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
});

const TierBadge = memo(({ tier }: { tier: string }) => {
  const style = useMemo(() => {
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
  }, [tier]);

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${style}`}>
      {tier.toUpperCase()}
    </span>
  );
});

const AssessmentRow = memo(({ 
  assessment, 
  isSelected, 
  onSelect, 
  onView 
}: {
  assessment: Assessment;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onView: (id: string) => void;
}) => {
  const handleSelect = useCallback(() => {
    onSelect(assessment.id);
  }, [assessment.id, onSelect]);

  const handleView = useCallback(() => {
    onView(assessment.id);
  }, [assessment.id, onView]);

  const formatCurrency = useCallback((amount: number) => `RM ${amount.toFixed(2)}`, []);
  const formatDate = useCallback((dateString: string) => new Date(dateString).toLocaleDateString(), []);

  return (
    <tr className="hover:bg-gray-50 transition-colors duration-150">
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleSelect}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {assessment.type.toUpperCase()}
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
          onClick={handleView}
          className="text-indigo-600 hover:text-indigo-900 transition-colors duration-150"
        >
          <Eye className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
});

// ===== MAIN COMPONENT =====
export default function AssessmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State management
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [availableClerks, setAvailableClerks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
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

  // ⚡ OPTIMIZED: Memoized fetch function
  const fetchAssessments = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        includeStats: 'true',
        ...filters
      });

      const response = await fetch(`/api/admin/assessments?${params}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch assessments: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'API returned unsuccessful response');
      }
      
      // Safe data handling
      setAssessments(Array.isArray(result.assessments) ? result.assessments : []);
      setStats(result.stats || null);
      setAvailableClerks(Array.isArray(result.availableClerks) ? result.availableClerks : []);
      setTotalPages(Number(result.pagination?.totalPages) || 1);
      setTotalCount(Number(result.pagination?.totalCount) || 0);
      
    } catch (err) {
      console.error('Error fetching assessments:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assessments';
      setError(errorMessage);
      setAssessments([]);
      setStats(null);
      setAvailableClerks([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, filters]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchAssessments();
    }
  }, [status, session, fetchAssessments]);

  // ⚡ OPTIMIZED: Memoized filter handlers
  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
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
  }, []);

  // ⚡ OPTIMIZED: Memoized selection handlers
  const handleSelectAssessment = useCallback((assessmentId: string) => {
    setSelectedAssessments(prev => {
      if (prev.includes(assessmentId)) {
        return prev.filter(id => id !== assessmentId);
      } else {
        return [...prev, assessmentId];
      }
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedAssessments.length === assessments.length) {
      setSelectedAssessments([]);
    } else {
      setSelectedAssessments(assessments.map(a => a.id));
    }
  }, [selectedAssessments.length, assessments]);

  const handleViewAssessment = useCallback((assessmentId: string) => {
    router.push(`/admin/assessments/${assessmentId}`);
  }, [router]);

  // ⚡ OPTIMIZED: Memoized bulk action handler
  const handleBulkAction = useCallback(async (action: string, additionalData?: any) => {
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
        await fetchAssessments();
        setSelectedAssessments([]);
      }
    } catch (err) {
      console.error('Bulk action error:', err);
      setError(err instanceof Error ? err.message : 'Bulk action failed');
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedAssessments, fetchAssessments]);

  // ⚡ OPTIMIZED: Memoized formatters
  const formatCurrency = useCallback((amount: number) => `RM ${amount.toFixed(2)}`, []);

  // ⚡ OPTIMIZED: Memoized computed values
  const hasFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => value && value !== 'all');
  }, [filters]);

  if (loading && assessments.length === 0) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assessment Management</h1>
            <p className="text-gray-600 mt-1">Loading assessments...</p>
          </div>
          <div className="flex items-center space-x-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>

        {/* Skeleton Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Skeleton Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-right">
                    <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assessment Management</h1>
          <p className="text-gray-600 mt-1">Manage and track all assessments efficiently</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={fetchAssessments}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all duration-150 shadow-sm hover:shadow-md"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-all duration-150 shadow-sm hover:shadow-md ${
              hasFilters 
                ? 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100' 
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasFilters && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Active
              </span>
            )}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Total Assessments"
          value={stats?.totalAssessments || 0}
          icon={<FileText className="h-6 w-6 text-white" />}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          loading={loading && !stats}
        />
        
        <StatCard
          title="Completed"
          value={stats?.completedAssessments || 0}
          subtitle={`${(stats?.conversionRate || 0).toFixed(1)}% completion rate`}
          icon={<CheckSquare className="h-6 w-6 text-white" />}
          color="bg-gradient-to-br from-green-500 to-green-600"
          loading={loading && !stats}
        />
        
        <StatCard
          title="Pending"
          value={stats?.pendingAssessments || 0}
          icon={<Clock className="h-6 w-6 text-white" />}
          color="bg-gradient-to-br from-yellow-500 to-yellow-600"
          loading={loading && !stats}
        />
        
        <StatCard
          title="In Progress"
          value={stats?.inProgressAssessments || 0}
          icon={<Users className="h-6 w-6 text-white" />}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          loading={loading && !stats}
        />
        
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          subtitle={`${(stats?.averageCompletionTime || 0).toFixed(1)}h avg completion`}
          icon={<BarChart3 className="h-6 w-6 text-white" />}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          loading={loading && !stats}
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
                  placeholder="Search assessments..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Tier</label>
              <select
                value={filters.tier}
                onChange={(e) => handleFilterChange('tier', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
              >
                <option value="all">All Tiers</option>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end mt-6 space-x-3">
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-150"
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
                    // Implement clerk assignment modal
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
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-150"
                disabled={bulkActionLoading}
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assessments Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
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
                  <AssessmentRow
                    key={assessment.id}
                    assessment={assessment}
                    isSelected={selectedAssessments.includes(assessment.id)}
                    onSelect={handleSelectAssessment}
                    onView={handleViewAssessment}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center">
                      <FileText className="h-12 w-12 text-gray-400 mb-4" />
                      <p>No assessments found</p>
                      {hasFilters && (
                        <button
                          onClick={clearFilters}
                          className="mt-2 text-indigo-600 hover:text-indigo-800"
                        >
                          Clear filters to see all assessments
                        </button>
                      )}
                    </div>
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
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors duration-150"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors duration-150"
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
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-150"
                  >
                    Previous
                  </button>
                  
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-150"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}