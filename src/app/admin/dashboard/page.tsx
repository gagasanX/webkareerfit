'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  ClipboardList, 
  CreditCard, 
  Tag, 
  BarChart4, 
  Settings,
  ArrowUpRight
} from 'lucide-react';

// Dashboard Card Component
interface DashboardCardProps {
  title: string;
  count: number | string;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  linkTo: string;
}

const DashboardCard = ({ 
  title, 
  count, 
  icon, 
  change, 
  changeType = 'neutral',
  linkTo 
}: DashboardCardProps) => {
  return (
    <Link href={linkTo} className="block">
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{count}</h3>
            
            {change && (
              <div className={`text-xs font-medium mt-1 flex items-center
                ${changeType === 'positive' ? 'text-green-600' : 
                  changeType === 'negative' ? 'text-red-600' : 
                  'text-gray-500'}`}
              >
                {changeType === 'positive' && <span className="mr-1">↑</span>}
                {changeType === 'negative' && <span className="mr-1">↓</span>}
                {change}
              </div>
            )}
          </div>
          <div className="bg-gray-100 p-3 rounded-lg">
            {icon}
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm text-indigo-600">
          <span>View details</span>
          <ArrowUpRight className="h-4 w-4 ml-1" />
        </div>
      </div>
    </Link>
  );
};

// Stats type definition
interface DashboardStats {
  userCount: number;
  assessmentCount: number;
  paymentAmount: number;
  couponCount: number;
  recentAssessments: any[];
  recentPayments: any[];
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    userCount: 0,
    assessmentCount: 0,
    paymentAmount: 0,
    couponCount: 0,
    recentAssessments: [],
    recentPayments: []
  });

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
      fetchDashboardStats();
    }
  }, [status, session, router]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-transparent border-gray-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome back, {session?.user?.name || 'Admin'}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard
          title="Total Users"
          count={stats.userCount}
          icon={<Users className="h-6 w-6 text-indigo-600" />}
          change="12% from last month"
          changeType="positive"
          linkTo="/admin/users"
        />
        
        <DashboardCard
          title="Assessments"
          count={stats.assessmentCount}
          icon={<ClipboardList className="h-6 w-6 text-green-600" />}
          change="5% from last month"
          changeType="positive"
          linkTo="/admin/assessments"
        />
        
        <DashboardCard
          title="Revenue"
          count={`RM ${stats.paymentAmount.toFixed(2)}`}
          icon={<CreditCard className="h-6 w-6 text-blue-600" />}
          change="8% from last month"
          changeType="positive"
          linkTo="/admin/payments"
        />
        
        <DashboardCard
          title="Active Coupons"
          count={stats.couponCount}
          icon={<Tag className="h-6 w-6 text-orange-600" />}
          linkTo="/admin/coupons"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Assessments */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Assessments</h2>
            <Link href="/admin/assessments" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          
          {stats.recentAssessments.length > 0 ? (
            <div className="space-y-4">
              {stats.recentAssessments.map((assessment) => (
                <div key={assessment.id} className="flex items-center border-b border-gray-100 pb-4">
                  <div className="flex-1">
                    <p className="font-medium">{assessment.type} Assessment</p>
                    <p className="text-sm text-gray-500">User: {assessment.userName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      Status: <span className={`${
                        assessment.status === 'completed' ? 'text-green-600' :
                        assessment.status === 'in_progress' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>{assessment.status}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent assessments</p>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Payments</h2>
            <Link href="/admin/payments" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          
          {stats.recentPayments.length > 0 ? (
            <div className="space-y-4">
              {stats.recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center border-b border-gray-100 pb-4">
                  <div className="flex-1">
                    <p className="font-medium">RM {payment.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Method: {payment.method}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      Status: <span className={`${
                        payment.status === 'completed' ? 'text-green-600' :
                        payment.status === 'pending' ? 'text-orange-600' :
                        'text-red-600'
                      }`}>{payment.status}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent payments</p>
          )}
        </div>
      </div>
    </div>
  );
}