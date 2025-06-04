'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { User, Assessment, assessmentTypes } from '@/app/types';

// Icon components
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const AssessmentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
  </svg>
);

const AffiliateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
  </svg>
);

const PaymentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
);

const NotificationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 3a1 1 0 10-2 0v6.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L14 12.586V6z" clipRule="evenodd" />
  </svg>
);

// Component for donut chart
interface DonutChartProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const DonutChart = ({ percentage = 0, size = 100, strokeWidth = 10, color = '#38b6ff' }: DonutChartProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Show minimum 5% for visual representation even if 0%
  const displayPercentage = percentage === 0 ? 5 : percentage;
  const strokeDashoffset = circumference - (displayPercentage / 100) * circumference;
  
  return (
    <div className="flex justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#e6e6e6"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill="#333"
        >
          {percentage}%
        </text>
      </svg>
    </div>
  );
};

// Bar chart component - Fixed for mobile and 0% display
const BarChart = () => (
  <div className="w-full h-32 sm:h-36 flex items-end justify-between px-2 sm:px-4">
    <div className="flex flex-col items-center flex-1 mx-1">
      <div className="h-2 w-4 sm:w-6 md:w-8 bg-[#fcb3b3] rounded-t-md"></div>
      <span className="text-xs mt-1 text-gray-500 text-center">Strengths</span>
    </div>
    <div className="flex flex-col items-center flex-1 mx-1">
      <div className="h-2 w-4 sm:w-6 md:w-8 bg-[#38b6ff] rounded-t-md"></div>
      <span className="text-xs mt-1 text-gray-500 text-center">Skills</span>
    </div>
    <div className="flex flex-col items-center flex-1 mx-1">
      <div className="h-2 w-4 sm:w-6 md:w-8 bg-[#38b6ff] rounded-t-md"></div>
      <span className="text-xs mt-1 text-gray-500 text-center">Experience</span>
    </div>
    <div className="flex flex-col items-center flex-1 mx-1">
      <div className="h-2 w-4 sm:w-6 md:w-8 bg-[#fcb3b3] rounded-t-md"></div>
      <span className="text-xs mt-1 text-gray-500 text-center">Alignment</span>
    </div>
    <div className="flex flex-col items-center flex-1 mx-1">
      <div className="h-2 w-4 sm:w-6 md:w-8 bg-[#7e43f1] rounded-t-md"></div>
      <span className="text-xs mt-1 text-gray-500 text-center">Potential</span>
    </div>
  </div>
);

// User menu component interface
interface UserMenuProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

// User menu component
const UserMenu = ({ user, isOpen, onClose }: UserMenuProps) => (
  <div className={`absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg py-2 z-50 ${isOpen ? 'block' : 'hidden'}`}>
    <div className="px-4 py-2 border-b border-gray-100">
      <p className="text-sm font-medium text-gray-800">{user?.name}</p>
      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
    </div>
    
    <Link href="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
      <UserIcon />
      <span className="ml-2">Profile</span>
    </Link>
    
    {user?.isAdmin && (
      <Link href="/admin" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
        <SettingsIcon />
        <span className="ml-2">Admin Panel</span>
      </Link>
    )}
    
    <button 
      onClick={() => signOut({ callbackUrl: '/login' })} 
      className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
    >
      <LogoutIcon />
      <span className="ml-2">Sign Out</span>
    </button>
  </div>
);

// Confirmation Dialog component
interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmButtonText: string;
  cancelButtonText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog = ({
  isOpen,
  title,
  message,
  confirmButtonText,
  cancelButtonText,
  onConfirm,
  onCancel
}: ConfirmationDialogProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        {/* Dialog */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button 
              type="button" 
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onConfirm}
            >
              {confirmButtonText}
            </button>
            <button 
              type="button" 
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onCancel}
            >
              {cancelButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ CRITICAL FIX: Status mapping helper function
const getAssessmentStatus = (status: string) => {
  switch (status) {
    case 'draft':
      return {
        text: 'Draft',
        color: 'bg-gray-100 text-gray-800'
      };
    case 'in_progress':
      return {
        text: 'In Progress',
        color: 'bg-yellow-100 text-yellow-800'
      };
    case 'submitted':
      return {
        text: 'Submitted',
        color: 'bg-blue-100 text-blue-800'
      };
    case 'pending_review':
      return {
        text: 'Under Review',
        color: 'bg-blue-100 text-blue-800'
      };
    case 'processing':
      return {
        text: 'Processing',
        color: 'bg-indigo-100 text-indigo-800'
      };
    case 'completed':
      return {
        text: 'Completed',
        color: 'bg-green-100 text-green-800'
      };
    case 'cancelled':
      return {
        text: 'Cancelled',
        color: 'bg-red-100 text-red-800'
      };
    default:
      return {
        text: 'Unknown',
        color: 'bg-gray-100 text-gray-800'
      };
  }
};

// ✅ CRITICAL FIX: Action button helper function
const getAssessmentActions = (assessment: any, confirmCancel: (id: string, type: string) => void) => {
  const { status, payment, id, type } = assessment;
  
  // Completed assessments
  if (status === 'completed') {
    return (
      <Link 
        href={`/assessment/${type}/results/${id}`}
        className="text-[#38b6ff] hover:text-[#7e43f1] bg-blue-50 hover:bg-blue-100 px-1 sm:px-2 py-1 rounded text-xs"
      >
        View Results
      </Link>
    );
  }
  
  // Cancelled assessments
  if (status === 'cancelled') {
    return (
      <span className="text-gray-400 px-1 sm:px-2 py-1 text-xs">Cancelled</span>
    );
  }
  
  // Submitted/Under Review assessments - show view status
  if (status === 'submitted' || status === 'pending_review' || status === 'processing') {
    // Determine the correct status page based on tier/price
    let statusUrl = `/assessment/${type}/results/${id}`; // fallback
    
    if (payment?.amount >= 250 || (assessment as any).tier === 'premium') {
      statusUrl = `/assessment/${type}/premium-results/${id}`;
    } else if (payment?.amount >= 100 || (assessment as any).tier === 'standard') {
      statusUrl = `/assessment/${type}/standard-results/${id}`;
    } else {
      statusUrl = `/assessment/${type}/processing/${id}`;
    }
    
    return (
      <div className="flex space-x-1 sm:space-x-2">
        <Link 
          href={statusUrl}
          className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1 sm:px-2 py-1 rounded text-xs"
        >
          View Status
        </Link>
      </div>
    );
  }
  
  // Draft/In Progress assessments
  if (payment?.status === 'completed') {
    return (
      <div className="flex space-x-1 sm:space-x-2">
        <Link 
          href={`/assessment/${type}/${id}`}
          className="text-[#38b6ff] hover:text-[#7e43f1] bg-blue-50 hover:bg-blue-100 px-1 sm:px-2 py-1 rounded text-xs"
        >
          Continue
        </Link>
        <button
          onClick={() => confirmCancel(id, type)}
          className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-1 sm:px-2 py-1 rounded text-xs"
        >
          Cancel
        </button>
      </div>
    );
  } else {
    // Payment not completed
    return (
      <div className="flex space-x-1 sm:space-x-2">
        <Link 
          href={`/payment/${id}`}
          className="text-[#38b6ff] hover:text-[#7e43f1] bg-blue-50 hover:bg-blue-100 px-1 sm:px-2 py-1 rounded text-xs"
        >
          Pay Now
        </Link>
        <button
          onClick={() => confirmCancel(id, type)}
          className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-1 sm:px-2 py-1 rounded text-xs"
        >
          Cancel
        </button>
      </div>
    );
  }
};

export default function DashboardClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // States
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  
  // States for confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCancelAssessment, setPendingCancelAssessment] = useState<{id: string; type: string} | null>(null);

  // Fetch user data
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchUserData();
    }
  }, [status, router]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const data = await response.json();
      setUserData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Function to open confirmation dialog for cancellation
  const confirmCancel = (assessmentId: string, assessmentType: string) => {
    setPendingCancelAssessment({ id: assessmentId, type: assessmentType });
    setShowConfirmDialog(true);
  };
  
  // Function to handle cancellation after confirmation
  const handleCancel = async () => {
    if (!pendingCancelAssessment) return;
    
    const { id, type } = pendingCancelAssessment;
    setCancelingId(id);
    setShowConfirmDialog(false);
    
    try {
      const response = await fetch(`/api/assessment/${type}/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        fetchUserData();
      } else {
        alert('Failed to cancel assessment. Please try again.');
      }
    } catch (error) {
      console.error('Error cancelling assessment:', error);
      alert('An error occurred while trying to cancel the assessment.');
    } finally {
      setCancelingId(null);
      setPendingCancelAssessment(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-800">Error Loading Dashboard</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <button 
              onClick={fetchUserData}
              className="mt-6 px-6 py-2 bg-[#7e43f1] text-white rounded-lg hover:bg-[#6a38d1]"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User data is loaded
  const user = userData;
  if (!user) return null;

  // Calculate statistics - All set to 0 for now
  const totalAssessments = user.assessments?.length || 0;
  const completedAssessments = user.assessments?.filter(a => a.status === 'completed').length || 0;
  const completionRate = 0; // Set to 0
  
  // ✅ CRITICAL FIX: Better pending assessment filtering
  const pendingAssessments = user.assessments?.filter(a => 
    a.status === 'draft' || 
    a.status === 'in_progress' || 
    (a.status !== 'completed' && a.status !== 'cancelled' && a.payment?.status !== 'completed')
  ) || [];
  
  const pendingPayments = user.assessments?.filter(a => a.payment?.status !== 'completed') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex">
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        title="Cancel Assessment"
        message="Are you sure you want to cancel this assessment? This action cannot be undone."
        confirmButtonText="Yes, Cancel"
        cancelButtonText="No, Keep It"
        onConfirm={handleCancel}
        onCancel={() => {
          setShowConfirmDialog(false);
          setPendingCancelAssessment(null);
        }}
      />
      
      {/* Sidebar */}
      <aside className="w-16 sm:w-20 bg-white shadow-lg flex flex-col items-center py-4 sm:py-8 fixed h-full z-40">
        {/* Logo - Changed to KF text */}
        <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-1 rounded-full mb-6 sm:mb-10 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
          <span className="text-white font-bold text-sm sm:text-base">KF</span>
        </div>
        
        <nav className="flex flex-col items-center space-y-4 sm:space-y-8">
          <Link 
            href="/dashboard" 
            className="text-[#7e43f1] p-2 sm:p-3 rounded-xl bg-purple-50"
            aria-label="Dashboard"
          >
            <HomeIcon />
          </Link>
          <Link 
            href="/profile" 
            className="text-gray-400 hover:text-[#7e43f1] p-2 sm:p-3 rounded-xl hover:bg-purple-50 transition-colors"
            aria-label="Profile"
          >
            <UserIcon />
          </Link>
          <Link 
            href="/assessment" 
            className="text-gray-400 hover:text-[#7e43f1] p-2 sm:p-3 rounded-xl hover:bg-purple-50 transition-colors"
            aria-label="Assessments"
          >
            <AssessmentIcon />
          </Link>
          <Link 
            href="/affiliate" 
            className={`text-gray-400 hover:text-[#7e43f1] p-2 sm:p-3 rounded-xl hover:bg-purple-50 transition-colors ${!user.isAffiliate && 'opacity-50'}`}
            aria-label="Affiliate Dashboard"
          >
            <AffiliateIcon />
          </Link>
          <Link 
            href="/billing" 
            className="text-gray-400 hover:text-[#7e43f1] p-2 sm:p-3 rounded-xl hover:bg-purple-50 transition-colors"
            aria-label="Billing"
          >
            <PaymentIcon />
          </Link>
        </nav>
        
        <div className="mt-auto">
          <Link 
            href="/settings" 
            className="text-gray-400 hover:text-[#7e43f1] p-2 sm:p-3 rounded-xl hover:bg-purple-50 transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon />
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-16 sm:ml-20 p-3 sm:p-6">
        {/* Header with greeting and user menu */}
        <header className="flex justify-between items-center mb-4 sm:mb-6">
          <div>
            <h1 className="text-gray-500 text-sm">Hi, {user.name}</h1>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Welcome Back!</h2>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Notifications */}
            <div className="relative">
              <button 
                className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notifications"
              >
                <NotificationIcon />
                {pendingAssessments.length > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {pendingAssessments.length}
                  </span>
                )}
              </button>
              
              {/* Notifications dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-800">Notifications</p>
                  </div>
                  
                  {pendingAssessments.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">No new notifications</div>
                  ) : (
                    <div>
                      {pendingPayments.length > 0 && (
                        <Link href="/payment" className="flex items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-100">
                          <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                            <PaymentIcon />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-800">Payment required</p>
                            <p className="text-xs text-gray-500">You have {pendingPayments.length} pending payment(s)</p>
                          </div>
                        </Link>
                      )}
                      
                      {pendingAssessments.map((assessment, index) => (
                        <Link 
                          key={index}
                          href={`/assessment/${assessment.type}/${assessment.id}`} 
                          className="flex items-center px-4 py-3 hover:bg-gray-50"
                        >
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                            <AssessmentIcon />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-800">Complete your assessment</p>
                            <p className="text-xs text-gray-500">{assessmentTypes.find(t => t.id === assessment.type)?.label}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* User menu */}
            <div className="relative">
              <button 
                className="flex items-center space-x-2 p-1 rounded-full border border-gray-200 hover:border-gray-300 transition-colors"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] flex items-center justify-center text-white font-medium">
                  {user.name?.charAt(0)}
                </div>
              </button>
              
              <UserMenu 
                user={user} 
                isOpen={userMenuOpen}
                onClose={() => setUserMenuOpen(false)}
              />
            </div>
          </div>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left column (2/3 width on large screens) */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Reminder card */}
            <div className="rounded-xl bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-4 sm:p-5 text-white relative overflow-hidden shadow-sm">
              <div className="flex">
                <div className="flex-1 z-10">
                  <h3 className="text-sm font-medium opacity-80">Reminder</h3>
                  <p className="text-base sm:text-lg font-medium mt-2">Ready to discover your ideal career path?</p>
                  <p className="mt-1 opacity-90 text-sm mb-4">Complete your assessment for personalized insights.</p>
                  
                  <div className="flex space-x-3">
                    <Link 
                      href={pendingAssessments.length > 0 
                        ? `/assessment/${pendingAssessments[0].type}/${pendingAssessments[0].id}` 
                        : "/assessment"
                      } 
                      className="bg-white text-[#7e43f1] px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
                    >
                      {pendingAssessments.length > 0 ? 'Continue Assessment' : 'Start Now'}
                    </Link>
                    <Link href="/assessment" className="bg-white/20 text-white px-3 sm:px-4 py-2 rounded-lg text-sm hover:bg-white/30 transition-colors">
                      View All
                    </Link>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="relative h-24 w-24 sm:h-32 sm:w-32">
                    <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-sm"></div>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -bottom-10 -right-10 w-32 sm:w-40 h-32 sm:h-40 rounded-full bg-white/10 backdrop-blur-sm"></div>
              <div className="absolute top-5 right-16 sm:right-20 w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-white/10 backdrop-blur-sm"></div>
            </div>
            
            {/* Stats section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <h3 className="text-gray-500 text-xs uppercase">Career Readiness</h3>
                <div className="flex items-center mt-1">
                  <div className="text-xl sm:text-2xl font-bold text-[#7e43f1]">{completionRate}%</div>
                </div>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className="bg-[#7e43f1] h-2 rounded-full" 
                    style={{ width: completionRate === 0 ? '2px' : `${completionRate}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <h3 className="text-gray-500 text-xs uppercase">Assessments Completed</h3>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-xl sm:text-2xl font-bold text-[#38b6ff]">{completedAssessments}</div>
                  <div className="text-xs bg-blue-100 text-blue-600 rounded-full px-2 py-1">
                    {totalAssessments > 0 ? `${completedAssessments}/${totalAssessments}` : 'No assessments'}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {totalAssessments > 0 ? 
                    `${totalAssessments - completedAssessments} assessment${totalAssessments - completedAssessments !== 1 ? 's' : ''} pending` : 
                    'Start your first assessment'}
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <h3 className="text-gray-500 text-xs uppercase">Career Match Score</h3>
                <div className="flex items-center mt-1">
                  <div className="text-xl sm:text-2xl font-bold text-[#fcb3b3]">
                    {completedAssessments > 0 ? '0%' : 'N/A'}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {completedAssessments > 0 ? 
                    'Based on your assessment results' : 
                    'Complete an assessment to see your score'}
                </div>
              </div>
            </div>
            
            {/* Charts section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-700 text-sm sm:text-base">Competency Profile</h3>
                  <Link href="/assessment/results" className="text-xs text-[#38b6ff] hover:underline">View More</Link>
                </div>
                <div className="flex justify-center">
                  <BarChart />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-700 text-sm sm:text-base">Compatibility of Skills</h3>
                  <Link href="/assessment/results" className="text-xs text-[#38b6ff] hover:underline">View More</Link>
                </div>
                <DonutChart percentage={0} color="#7e43f1" size={80} />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="text-xs flex items-center">
                    <div className="w-2 h-2 rounded-full bg-[#7e43f1] mr-1"></div>
                    <span>Technical Skills</span>
                  </div>
                  <div className="text-xs flex items-center">
                    <div className="w-2 h-2 rounded-full bg-[#38b6ff] mr-1"></div>
                    <span>Soft Skills</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* All assessments section */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-700">Your Assessments</h3>
                <Link href="/assessment" className="text-xs text-[#38b6ff] hover:underline">View All</Link>
              </div>
              
              {totalAssessments === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="mt-2 text-gray-700 font-medium">No assessments yet</h4>
                  <p className="mt-1 text-sm text-gray-500">Start your first career assessment</p>
                  <Link href="/assessment" className="mt-4 inline-block px-4 py-2 bg-[#7e43f1] text-white rounded-lg text-sm">
                    Start Assessment
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                        <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {user.assessments?.map((assessment, index) => {
                        const assessmentType = assessmentTypes.find(t => t.id === assessment.type);
                        const statusInfo = getAssessmentStatus(assessment.status);
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="mr-1 sm:mr-2 text-sm">{assessmentType?.icon}</span>
                                <span className="text-xs sm:text-sm font-medium text-gray-900">
                                  {assessmentType?.label || assessment.type}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-1 sm:px-2 py-1 ${statusInfo.color}`}>
                                {statusInfo.text}
                              </span>
                            </td>
                            <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {new Date(assessment.createdAt).toLocaleDateString()}
                            </td>
                            <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${
                                assessment.payment?.status === 'completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {assessment.payment?.status === 'completed' ? 'Paid' : 'Unpaid'}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-1 sm:space-x-2">
                                {getAssessmentActions(assessment, confirmCancel)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          
          {/* Right column (1/3 width on large screens) */}
          <div className="space-y-4 sm:space-y-6">
            {/* Upcoming assessments section */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-700">Upcoming Assessments</h3>
                <Link 
                  href="/assessment" 
                  className="p-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                  aria-label="Add assessment"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
              
              {pendingAssessments.length === 0 ? (
                <div className="text-center py-4 sm:py-6">
                  <div className="mx-auto flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-gray-700 font-medium">No scheduled assessments</h4>
                  <p className="mt-1 text-sm text-gray-500">Plan your next career assessment</p>
                  <Link href="/assessment" className="mt-4 inline-block px-4 py-2 bg-[#7e43f1] text-white rounded-lg text-sm">
                    Schedule Assessment
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingAssessments.map((assessment, index) => {
                    const assessmentType = assessmentTypes.find(t => t.id === assessment.type);
                    const statusInfo = getAssessmentStatus(assessment.status);
                    
                    return (
                      <Link
                        key={index}
                        href={assessment.payment?.status === 'completed' 
                          ? `/assessment/${assessment.type}/${assessment.id}` 
                          : `/payment/${assessment.id}`
                        }
                        className="flex items-center p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow"
                      >
                        <div 
                          className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: assessmentType?.color || '#38b6ff' }}
                        >
                          <span className="text-sm sm:text-lg">{assessmentType?.icon || '📝'}</span>
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {assessmentType?.label || assessment.type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {statusInfo.text} • {assessment.payment?.status === 'completed' ? 'Paid' : 'Payment required'}
                          </p>
                        </div>
                        <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          {new Date(assessment.createdAt).toLocaleDateString()}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Assessment selector */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-700">Available Assessments</h3>
              </div>
              
              <div className="space-y-3">
                {assessmentTypes.map((type, index) => (
                  <Link
                    key={index}
                    href={`/assessment?type=${type.id}`}
                    className="flex items-center p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow"
                  >
                    <div 
                      className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: type.color }}
                    >
                      <span className="text-sm sm:text-lg">{type.icon}</span>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-800">{type.label}</p>
                      <p className="text-xs text-gray-500">{type.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Affiliate section (conditionally displayed) */}
            {user.isAffiliate && (
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-700">Affiliate Dashboard</h3>
                  <Link href="/affiliate" className="text-xs text-[#38b6ff] hover:underline">View Details</Link>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700">Your Referral Code</div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium bg-gray-100 rounded-md px-2 py-1 border border-gray-200">
                        {user.affiliateCode || 'KF-' + user.id.substring(0, 6).toUpperCase()}
                      </span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-xs text-blue-700 mb-1">Referrals</div>
                      <div className="text-xl font-bold text-blue-800">
                        {user.affiliateStats?.totalReferrals || 0}
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs text-green-700 mb-1">Earnings</div>
                      <div className="text-xl font-bold text-green-800">
                        RM {user.affiliateStats?.totalEarnings.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Join affiliate section (conditionally displayed) */}
            {!user.isAffiliate && (
              <div className="bg-gradient-to-r from-[#fcb3b3] to-[#7e43f1] rounded-xl shadow-sm p-4 sm:p-5 text-white">
                <h3 className="font-medium mb-2">Become an Affiliate</h3>
                <p className="text-sm text-white/90 mb-4">Earn commissions by referring others to KareerFit assessments.</p>
                <Link href="/affiliate/join" className="inline-block bg-white text-[#7e43f1] px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow">
                  Join Program
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}