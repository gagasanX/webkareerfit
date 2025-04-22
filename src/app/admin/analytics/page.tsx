'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Download, 
  Calendar, 
  Filter, 
  Users, 
  TrendingUp, 
  DollarSign,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';

// Define chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#52BE80'];

interface AnalyticsData {
  userMetrics: {
    totalUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    usersByDate: Array<{ date: string; count: number }>;
    usersByType: Array<{ type: string; count: number }>;
  };
  assessmentMetrics: {
    totalAssessments: number;
    assessmentsToday: number;
    assessmentsThisWeek: number;
    assessmentsThisMonth: number;
    completionRate: number;
    assessmentsByDate: Array<{ date: string; count: number }>;
    assessmentsByType: Array<{ type: string; count: number }>;
  };
  revenueMetrics: {
    totalRevenue: number;
    revenueToday: number;
    revenueThisWeek: number;
    revenueThisMonth: number;
    averageOrderValue: number;
    revenueByDate: Array<{ date: string; amount: number }>;
    revenueByAssessmentType: Array<{ type: string; amount: number }>;
  };
  conversionMetrics: {
    globalConversionRate: number;
    conversionBySource: Array<{ source: string; rate: number; count: number }>;
    conversionFunnel: Array<{ stage: string; count: number; rate: number }>;
    abandonmentRate: number;
  };
}

export default function AnalyticsDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('last30days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [exportLoading, setExportLoading] = useState<boolean>(false);

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
      fetchAnalyticsData();
    }
  }, [status, session, router, dateRange, startDate, endDate]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Construct the URL with query parameters for date range
      let url = `/api/admin/analytics?range=${dateRange}`;
      
      if (dateRange === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
      setLoading(false);
    } catch (error) {
      setError('Error loading analytics data. Please try again.');
      setLoading(false);
    }
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRange = e.target.value;
    setDateRange(newRange);
    
    // Reset custom dates if not using custom range
    if (newRange !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      // Construct the URL with query parameters for date range
      let url = `/api/admin/analytics/export?range=${dateRange}`;
      
      if (dateRange === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to export analytics data');
      }
      
      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a download link and trigger click
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExportLoading(false);
    } catch (error) {
      setError('Error exporting analytics data. Please try again.');
      setExportLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading && !analyticsData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </span>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-gray-500" />
            <h2 className="text-lg font-medium">Date Range</h2>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            <select
              value={dateRange}
              onChange={handleDateRangeChange}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisYear">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}
            
            <button
              onClick={handleExportData}
              disabled={exportLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {exportLoading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Download className="h-5 w-5 mr-2" />
              )}
              Export Data
            </button>
          </div>
        </div>
      </div>

      {analyticsData && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* User Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="bg-indigo-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                  <p className="text-2xl font-bold">{analyticsData.userMetrics.totalUsers.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">
                    <span className="text-green-600">+{analyticsData.userMetrics.newUsersThisMonth.toLocaleString()}</span> this month
                  </p>
                </div>
              </div>
            </div>
            
            {/* Assessment Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Assessments</h3>
                  <p className="text-2xl font-bold">{analyticsData.assessmentMetrics.totalAssessments.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">
                    {formatPercent(analyticsData.assessmentMetrics.completionRate)} completion rate
                  </p>
                </div>
              </div>
            </div>
            
            {/* Revenue Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                  <p className="text-2xl font-bold">{formatCurrency(analyticsData.revenueMetrics.totalRevenue)}</p>
                  <p className="text-sm text-gray-500">
                    <span className="text-green-600">{formatCurrency(analyticsData.revenueMetrics.revenueThisMonth)}</span> this month
                  </p>
                </div>
              </div>
            </div>
            
            {/* Conversion Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
                  <p className="text-2xl font-bold">{formatPercent(analyticsData.conversionMetrics.globalConversionRate)}</p>
                  <p className="text-sm text-gray-500">
                    {formatPercent(analyticsData.conversionMetrics.abandonmentRate)} abandonment
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* User Growth Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4">User Growth</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analyticsData.userMetrics.usersByDate}
                    margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={-45} textAnchor="end" height={50} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} users`, 'Users']} />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} name="Users" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Revenue Trend Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4">Revenue Trend</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analyticsData.revenueMetrics.revenueByDate}
                    margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={-45} textAnchor="end" height={50} />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#82ca9d" activeDot={{ r: 8 }} name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Assessment Type Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4">Assessment Type Distribution</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.assessmentMetrics.assessmentsByType}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="type"
                      label={({ type, count }) => `${type}: ${count}`}
                    >
                      {analyticsData.assessmentMetrics.assessmentsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} assessments`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Revenue by Assessment Type */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4">Revenue by Assessment Type</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData.revenueMetrics.revenueByAssessmentType}
                    margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" angle={-45} textAnchor="end" height={50} />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
                    <Legend />
                    <Bar dataKey="amount" fill="#8884d8" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Conversion Funnel */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4">Conversion Funnel</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData.conversionMetrics.conversionFunnel}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="stage" width={100} />
                    <Tooltip formatter={(value) => [`${value} users`, 'Count']} />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" name="Users" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <h3 className="text-md font-medium mb-2">Conversion Rates</h3>
                <div className="space-y-2">
                  {analyticsData.conversionMetrics.conversionFunnel.map((item, index, arr) => {
                    // Skip the first item since there's no previous step
                    if (index === 0) return null;
                    
                    const previousStep = arr[index - 1];
                    const conversionRate = previousStep.count > 0 
                      ? (item.count / previousStep.count)
                      : 0;
                    
                    return (
                      <div key={index} className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          {previousStep.stage} → {item.stage}
                        </span>
                        <span className="text-sm font-medium">{formatPercent(conversionRate)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Conversion by Source */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4">Conversion by Source</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData.conversionMetrics.conversionBySource}
                    margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source" angle={-45} textAnchor="end" height={50} />
                    <YAxis tickFormatter={(value) => formatPercent(value)} />
                    <Tooltip formatter={(value) => [formatPercent(value as number), 'Conversion Rate']} />
                    <Legend />
                    <Bar dataKey="rate" fill="#82ca9d" name="Conversion Rate" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}