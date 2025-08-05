'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp,
  Users,
  ClipboardList,
  DollarSign,
  UserCheck,
  Clock,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react';

// ===== TYPES =====
interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalAssessments: number;
    totalRevenue: number;
    totalCommissions: number;
    activeAffiliates: number;
    pendingAssessments: number;
  };
  userGrowth: Array<{
    date: string;
    users: number;
    assessments: number;
    revenue: number;
  }>;
  assessmentTypes: Array<{
    type: string;
    count: number;
    revenue: number;
    avgPrice: number;
  }>;
  assessmentStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  revenueBreakdown: Array<{
    tier: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
  topAffiliates: Array<{
    id: string;
    name: string;
    email: string;
    totalReferrals: number;
    totalEarnings: number;
    conversionRate: number;
  }>;
  clerksPerformance: Array<{
    id: string;
    name: string;
    email: string;
    assignedCount: number;
    completedCount: number;
    avgProcessingTime: number;
  }>;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

// ===== SKELETON COMPONENTS =====
const MetricCardSkeleton = memo(() => (
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

const ChartSkeleton = memo(() => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center">
          <div className="w-20 h-4 bg-gray-200 rounded"></div>
          <div className="flex-1 mx-3">
            <div className="bg-gray-200 rounded-full h-2"></div>
          </div>
          <div className="w-16 h-4 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  </div>
));

const TableSkeleton = memo(() => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-40 mb-4"></div>
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      ))}
    </div>
  </div>
));

// ===== OPTIMIZED COMPONENTS =====
const MetricCard = memo(({ title, value, change, changeType, icon, color, loading }: MetricCardProps) => {
  if (loading) return <MetricCardSkeleton />;
  
  return (
    <div className="bg-white rounded-lg shadow p-6 transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change && (
            <div className={`flex items-center mt-1 text-sm ${
              changeType === 'positive' ? 'text-green-600' :
              changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {changeType === 'positive' && <ArrowUp className="h-4 w-4 mr-1" />}
              {changeType === 'negative' && <ArrowDown className="h-4 w-4 mr-1" />}
              {change}
            </div>
          )}
        </div>
        <div className={`${color} p-3 rounded-lg shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
});

const SimpleBarChart = memo(({ data, title, loading }: { data: any[], title: string, loading?: boolean }) => {
  if (loading) return <ChartSkeleton />;
  
  const maxValue = Math.max(...data.map(d => d.count || d.revenue || d.value));
  
  return (
    <div className="bg-white rounded-lg shadow p-6 transform transition-all duration-200 hover:shadow-lg">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {data.slice(0, 5).map((item, index) => {
          const percentage = maxValue > 0 ? ((item.count || item.revenue || item.value) / maxValue) * 100 : 0;
          
          return (
            <div key={index} className="flex items-center group">
              <div className="w-20 text-sm text-gray-600 truncate">
                {item.type || item.status || item.tier || item.label}
              </div>
              <div className="flex-1 mx-3">
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out transform group-hover:scale-105"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="w-16 text-sm font-medium text-right">
                {typeof (item.count || item.revenue || item.value) === 'number' 
                  ? (item.count || item.revenue || item.value).toLocaleString()
                  : (item.count || item.revenue || item.value)
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const DataTable = memo(({ 
  title, 
  data, 
  columns, 
  loading 
}: { 
  title: string, 
  data: any[], 
  columns: { key: string, label: string, align?: 'left' | 'right' }[],
  loading?: boolean 
}) => {
  if (loading) return <TableSkeleton />;
  
  return (
    <div className="bg-white rounded-lg shadow p-6 transform transition-all duration-200 hover:shadow-lg">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-2 text-${col.align || 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.slice(0, 5).map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-sm text-gray-900 text-${col.align || 'left'}`}>
                    {typeof item[col.key] === 'number' ? item[col.key].toLocaleString() : item[col.key] || 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ===== MAIN COMPONENT =====
export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('last30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin-auth/login');
    } else if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  // ⚡ OPTIMIZED: Fetch analytics with better error handling and caching
  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      
      let url = `/api/admin/analytics?range=${dateRange}`;
      
      if (dateRange === 'custom') {
        if (customStartDate) url += `&startDate=${customStartDate}`;
        if (customEndDate) url += `&endDate=${customEndDate}`;
      }
      
      // Add timestamp to prevent aggressive caching during development
      url += `&t=${Date.now()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analytics fetch failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'API returned unsuccessful response');
      }
      
      // Enhanced data validation with safe fallbacks
      const safeData: AnalyticsData = {
        overview: {
          totalUsers: Number(result.data.overview?.totalUsers) || 0,
          totalAssessments: Number(result.data.overview?.totalAssessments) || 0,
          totalRevenue: Number(result.data.overview?.totalRevenue) || 0,
          totalCommissions: Number(result.data.overview?.totalCommissions) || 0,
          activeAffiliates: Number(result.data.overview?.activeAffiliates) || 0,
          pendingAssessments: Number(result.data.overview?.pendingAssessments) || 0,
        },
        userGrowth: Array.isArray(result.data.userGrowth) ? result.data.userGrowth.map((item: any) => ({
          date: item.date || '',
          users: Number(item.users) || 0,
          assessments: Number(item.assessments) || 0,
          revenue: Number(item.revenue) || 0
        })) : [],
        assessmentTypes: Array.isArray(result.data.assessmentTypes) ? result.data.assessmentTypes.map((item: any) => ({
          type: item.type || 'Unknown',
          count: Number(item.count) || 0,
          revenue: Number(item.revenue) || 0,
          avgPrice: Number(item.avgPrice) || 0
        })) : [],
        assessmentStatus: Array.isArray(result.data.assessmentStatus) ? result.data.assessmentStatus.map((item: any) => ({
          status: item.status || 'Unknown',
          count: Number(item.count) || 0,
          percentage: Number(item.percentage) || 0
        })) : [],
        revenueBreakdown: Array.isArray(result.data.revenueBreakdown) ? result.data.revenueBreakdown.map((item: any) => ({
          tier: item.tier || 'Unknown',
          count: Number(item.count) || 0,
          revenue: Number(item.revenue) || 0,
          percentage: Number(item.percentage) || 0
        })) : [],
        topAffiliates: Array.isArray(result.data.topAffiliates) ? result.data.topAffiliates.map((item: any) => ({
          id: item.id || '',
          name: item.name || 'Unknown',
          email: item.email || '',
          totalReferrals: Number(item.totalReferrals) || 0,
          totalEarnings: Number(item.totalEarnings) || 0,
          conversionRate: Number(item.conversionRate) || 0
        })) : [],
        clerksPerformance: Array.isArray(result.data.clerksPerformance) ? result.data.clerksPerformance.map((item: any) => ({
          id: item.id || '',
          name: item.name || 'Unknown',
          email: item.email || '',
          assignedCount: Number(item.assignedCount) || 0,
          completedCount: Number(item.completedCount) || 0,
          avgProcessingTime: Number(item.avgProcessingTime) || 0
        })) : []
      };
      
      setData(safeData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchAnalytics();
    }
  }, [status, session, fetchAnalytics]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = useCallback(async () => {
    try {
      let url = `/api/admin/analytics/export?range=${dateRange}&type=all`;
      
      if (dateRange === 'custom') {
        if (customStartDate) url += `&startDate=${customStartDate}`;
        if (customEndDate) url += `&endDate=${customEndDate}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `analytics-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export data');
    }
  }, [dateRange, customStartDate, customEndDate]);

  const formatCurrency = useCallback((amount: number) => {
    return `RM ${amount.toFixed(2)}`;
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-gray-600">Track your business performance and metrics</p>
          </div>
          <div className="flex items-center space-x-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading analytics...</span>
          </div>
        </div>

        {/* Skeleton Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>

        {/* Skeleton Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>

        {/* Skeleton Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <TableSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleRefresh}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 transition-colors duration-150"
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

  if (!data) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your business performance and metrics in real-time</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all duration-150 shadow-sm hover:shadow-md"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 transition-all duration-150 shadow-sm hover:shadow-md"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
            >
              <option value="today">Today</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisYear">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        <MetricCard
          title="Total Users"
          value={data.overview.totalUsers || 0}
          icon={<Users className="h-6 w-6 text-white" />}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        
        <MetricCard
          title="Assessments"
          value={data.overview.totalAssessments || 0}
          icon={<ClipboardList className="h-6 w-6 text-white" />}
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
        
        <MetricCard
          title="Revenue"
          value={formatCurrency(data.overview.totalRevenue || 0)}
          icon={<DollarSign className="h-6 w-6 text-white" />}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        
        <MetricCard
          title="Commissions"
          value={formatCurrency(data.overview.totalCommissions || 0)}
          icon={<TrendingUp className="h-6 w-6 text-white" />}
          color="bg-gradient-to-br from-yellow-500 to-yellow-600"
        />
        
        <MetricCard
          title="Active Affiliates"
          value={data.overview.activeAffiliates || 0}
          icon={<UserCheck className="h-6 w-6 text-white" />}
          color="bg-gradient-to-br from-indigo-500 to-indigo-600"
        />
        
        <MetricCard
          title="Pending Reviews"
          value={data.overview.pendingAssessments || 0}
          icon={<Clock className="h-6 w-6 text-white" />}
          color="bg-gradient-to-br from-red-500 to-red-600"
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SimpleBarChart 
          data={data.assessmentTypes} 
          title="Assessment Types"
        />
        
        <SimpleBarChart 
          data={data.assessmentStatus} 
          title="Assessment Status"
        />
        
        <SimpleBarChart 
          data={data.revenueBreakdown} 
          title="Revenue by Tier"
        />
        
        <SimpleBarChart 
          data={data.topAffiliates.map(a => ({ 
            label: a.name, 
            value: a.totalEarnings 
          }))} 
          title="Top Affiliates"
        />
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable
          title="Top Affiliates Performance"
          data={data.topAffiliates.slice(0, 5).map(affiliate => ({
            name: affiliate.name || 'Unknown',
            totalReferrals: affiliate.totalReferrals || 0,
            totalEarnings: formatCurrency(affiliate.totalEarnings || 0)
          }))}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'totalReferrals', label: 'Referrals', align: 'right' },
            { key: 'totalEarnings', label: 'Earnings', align: 'right' }
          ]}
        />

        <DataTable
          title="Clerks Performance"
          data={data.clerksPerformance.slice(0, 5).map(clerk => ({
            name: clerk.name || 'Unknown',
            assignedCount: clerk.assignedCount || 0,
            completedCount: clerk.completedCount || 0,
            avgProcessingTime: `${(clerk.avgProcessingTime || 0).toFixed(1)}h`
          }))}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'assignedCount', label: 'Assigned', align: 'right' },
            { key: 'completedCount', label: 'Completed', align: 'right' },
            { key: 'avgProcessingTime', label: 'Avg Time', align: 'right' }
          ]}
        />
      </div>
    </div>
  );
}