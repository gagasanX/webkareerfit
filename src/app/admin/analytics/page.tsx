'use client';

import { useState, useEffect } from 'react';
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
  Calendar,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart,
  Target
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
}

// ===== COMPONENTS =====
const MetricCard = ({ title, value, change, changeType, icon, color }: MetricCardProps) => (
  <div className="bg-white rounded-lg shadow p-6">
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
      <div className={`${color} p-3 rounded-lg`}>
        {icon}
      </div>
    </div>
  </div>
);

const SimpleBarChart = ({ data, title }: { data: any[], title: string }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <div className="space-y-3">
      {data.slice(0, 5).map((item, index) => {
        const maxValue = Math.max(...data.map(d => d.count || d.revenue || d.value));
        const percentage = maxValue > 0 ? ((item.count || item.revenue || item.value) / maxValue) * 100 : 0;
        
        return (
          <div key={index} className="flex items-center">
            <div className="w-20 text-sm text-gray-600 truncate">
              {item.type || item.status || item.tier || item.label}
            </div>
            <div className="flex-1 mx-3">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
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

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setError(null);
      
      let url = `/api/admin/analytics?range=${dateRange}`;
      
      if (dateRange === 'custom') {
        if (customStartDate) url += `&startDate=${customStartDate}`;
        if (customEndDate) url += `&endDate=${customEndDate}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('API returned unsuccessful response');
      }
      
      setData(result.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchAnalytics();
    }
  }, [status, session, dateRange, customStartDate, customEndDate]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const handleExport = async () => {
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
  };

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toFixed(2)}`;
  };

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
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleRefresh}
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
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your business performance and metrics</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
          value={data.overview.totalUsers}
          icon={<Users className="h-6 w-6 text-white" />}
          color="bg-blue-600"
        />
        
        <MetricCard
          title="Assessments"
          value={data.overview.totalAssessments}
          icon={<ClipboardList className="h-6 w-6 text-white" />}
          color="bg-green-600"
        />
        
        <MetricCard
          title="Revenue"
          value={formatCurrency(data.overview.totalRevenue)}
          icon={<DollarSign className="h-6 w-6 text-white" />}
          color="bg-purple-600"
        />
        
        <MetricCard
          title="Commissions"
          value={formatCurrency(data.overview.totalCommissions)}
          icon={<TrendingUp className="h-6 w-6 text-white" />}
          color="bg-yellow-600"
        />
        
        <MetricCard
          title="Active Affiliates"
          value={data.overview.activeAffiliates}
          icon={<UserCheck className="h-6 w-6 text-white" />}
          color="bg-indigo-600"
        />
        
        <MetricCard
          title="Pending Reviews"
          value={data.overview.pendingAssessments}
          icon={<Clock className="h-6 w-6 text-white" />}
          color="bg-red-600"
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
        {/* Top Affiliates Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Affiliates Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Referrals</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.topAffiliates.slice(0, 5).map((affiliate, index) => (
                  <tr key={affiliate.id}>
                    <td className="px-4 py-2 text-sm text-gray-900 truncate">{affiliate.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{affiliate.totalReferrals}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(affiliate.totalEarnings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clerks Performance Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Clerks Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Assigned</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Completed</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Time (h)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.clerksPerformance.slice(0, 5).map((clerk, index) => (
                  <tr key={clerk.id}>
                    <td className="px-4 py-2 text-sm text-gray-900 truncate">{clerk.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{clerk.assignedCount}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{clerk.completedCount}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{clerk.avgProcessingTime.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}