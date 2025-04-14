'use client';

// src/app/clerk/reports/page.tsx
import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AssessmentTypeStats {
  type: string;
  count: number;
}

interface AssessmentStatusStats {
  status: string;
  count: number;
}

interface MonthlyStats {
  month: string;
  assessments: number;
  revenue: number;
}

interface ReportData {
  typeStats: AssessmentTypeStats[];
  statusStats: AssessmentStatusStats[];
  monthlyStats: MonthlyStats[];
  totalAssessments: number;
  totalRevenue: number;
  averagePrice: number;
}

export default function ClerkReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeStats, setTypeStats] = useState<AssessmentTypeStats[]>([]);
  const [statusStats, setStatusStats] = useState<AssessmentStatusStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [totalAssessments, setTotalAssessments] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averagePrice, setAveragePrice] = useState(0);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/clerk/reports');
        
        if (!response.ok) {
          throw new Error('Failed to load reports data');
        }
        
        const data: ReportData = await response.json();
        
        setTypeStats(data.typeStats);
        setStatusStats(data.statusStats);
        setMonthlyStats(data.monthlyStats);
        setTotalAssessments(data.totalAssessments);
        setTotalRevenue(data.totalRevenue);
        setAveragePrice(data.averagePrice);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  // Function to get a readable assessment type name
  const getAssessmentTypeName = (type: string): string => {
    const types: Record<string, string> = {
      'fjrl': 'First Job',
      'ijrl': 'Ideal Job',
      'cdrl': 'Career Dev',
      'ccrl': 'Career Comeback',
      'ctrl': 'Career Transition',
      'rrl': 'Retirement',
      'irl': 'Internship',
    };
    
    return types[type] || type.toUpperCase();
  };

  // Colors for pie charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
  
  // Function to format number as currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom label renderer for Pie charts
  const renderCustomizedTypeLabel = ({ type, count }: { type: string; count: number }) => 
    `${getAssessmentTypeName(type)}: ${count}`;

  // Custom formatter for tooltip
  const typeTooltipFormatter = (value: number, name: string) => 
    [value, getAssessmentTypeName(name)];

  // Custom formatter for legend
  const typeLegendFormatter = (value: string) => 
    getAssessmentTypeName(value);

  // Custom label renderer for Status Pie chart
  const renderCustomizedStatusLabel = ({ status, count }: { status: string; count: number }) => 
    `${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`;

  // Custom formatter for status tooltip
  const statusTooltipFormatter = (value: number, name: string) => 
    [value, name.charAt(0).toUpperCase() + name.slice(1)];

  // Custom formatter for status legend
  const statusLegendFormatter = (value: string) => 
    value.charAt(0).toUpperCase() + value.slice(1);

  // Custom formatter for revenue tooltip
  const revenueTooltipFormatter = (value: number, name: string) => {
    if (name === 'revenue') {
      return [formatCurrency(value), 'Revenue'];
    }
    return [value, 'Assessments'];
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Reports & Analytics</h2>
      
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-12 h-12 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg text-red-700 mb-6">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Total Assessments</h3>
              <p className="text-3xl font-bold text-indigo-600">{totalAssessments}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Total Revenue</h3>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Average Price</h3>
              <p className="text-3xl font-bold text-amber-600">{formatCurrency(averagePrice)}</p>
            </div>
          </div>
          
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assessment Types Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment Types</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="type"
                      label={renderCustomizedTypeLabel}
                    >
                      {typeStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={typeTooltipFormatter} />
                    <Legend formatter={typeLegendFormatter} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Assessment Status Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment Status</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="status"
                      label={renderCustomizedStatusLabel}
                    >
                      {statusStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={statusTooltipFormatter} />
                    <Legend formatter={statusLegendFormatter} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Monthly Stats Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Performance</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyStats}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip formatter={revenueTooltipFormatter} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="assessments" name="Assessments" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}