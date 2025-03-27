'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User, Assessment, assessmentTypes } from '@/app/types';

// Import type definitions
interface ClientHeaderProps {
  userName: string;
  pendingAssessments: Assessment[];
  pendingPayments: Assessment[];
  user: User;
}

interface UserMenuProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

// Icon components
const NotificationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 3a1 1 0 10-2 0v6.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L14 12.586V6z" clipRule="evenodd" />
  </svg>
);

const AssessmentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
  </svg>
);

const PaymentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
  </svg>
);

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
    
    <Link href="/api/auth/signout" className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
      <LogoutIcon />
      <span className="ml-2">Sign Out</span>
    </Link>
  </div>
);

export function ClientHeader({ userName, pendingAssessments, pendingPayments, user }: ClientHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  return (
    <header className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-gray-500 text-sm">Hi, {userName}</h1>
        <h2 className="text-2xl font-bold text-gray-800">Welcome Back!</h2>
      </div>
      
      <div className="flex items-center space-x-3">
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
                        <p className="text-xs text-gray-500">
                          {assessmentTypes.find((t) => t.id === assessment.type)?.label || assessment.type}
                        </p>
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
              {userName.charAt(0)}
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
  );
}