'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  CreditCard, 
  Tag, 
  BarChart4, 
  Settings,
  UserCog,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

// Navigation Item interface
interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

// Admin Layout component
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Check if user is admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin-auth/login');
    } else if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  // Navigation items
  const navigation: NavItem[] = [
    { 
      name: 'Dashboard', 
      href: '/admin/dashboard', 
      icon: <LayoutDashboard size={20} /> 
    },
    { 
      name: 'User Management', 
      href: '/admin/users', 
      icon: <Users size={20} />,
      children: [
        { name: 'All Users', href: '/admin/users', icon: <Users size={20} /> },
        { name: 'Clerks', href: '/admin/clerks', icon: <UserCog size={20} /> },
      ]
    },
    { 
      name: 'Assessments', 
      href: '/admin/assessments', 
      icon: <ClipboardList size={20} /> 
    },
    { 
      name: 'Payments', 
      href: '/admin/payments', 
      icon: <CreditCard size={20} /> 
    },
    { 
      name: 'Coupons', 
      href: '/admin/coupons', 
      icon: <Tag size={20} /> 
    },
    { 
      name: 'Reports', 
      href: '/admin/reports', 
      icon: <BarChart4 size={20} /> 
    },
    { 
      name: 'Settings', 
      href: '/admin/settings', 
      icon: <Settings size={20} /> 
    },
  ];

  const toggleExpand = (name: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Check if current path is active
  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  // Render nav item with potential children
  const renderNavItem = (item: NavItem, depth = 0) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const expanded = expandedItems[item.name];
    
    return (
      <div key={item.name}>
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors
            ${active 
              ? 'bg-gray-800 text-white' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }
            ${depth > 0 ? 'ml-6' : ''}
          `}
          onClick={() => hasChildren ? toggleExpand(item.name) : router.push(item.href)}
        >
          <div className="flex items-center">
            <span className="mr-3">{item.icon}</span>
            <span>{item.name}</span>
          </div>
          {hasChildren && (
            <span>
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          )}
        </div>
        
        {hasChildren && expanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // If loading or not authenticated as admin, show loading state
  if (status === 'loading' || (status === 'authenticated' && !session?.user?.isAdmin)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-transparent border-gray-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 bg-gray-800">
          <div className="flex items-center">
            <span className="text-xl font-bold text-white">Admin Portal</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-gray-400 rounded-md hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white lg:hidden"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-2 py-4 space-y-1">
          {navigation.map(item => renderNavItem(item))}

          {/* Logout button */}
          <div
            className="flex items-center px-3 py-2 mt-6 text-gray-300 rounded-md cursor-pointer hover:bg-gray-700 hover:text-white"
            onClick={() => {
              router.push('/api/auth/signout');
            }}
          >
            <LogOut size={20} className="mr-3" />
            <span>Logout</span>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navbar */}
        <div className="flex items-center justify-between h-16 px-4 bg-white shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 text-gray-400 rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 lg:hidden"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center">
            <div className="mr-4 text-right">
              <div className="text-sm font-medium text-gray-700">
                {session?.user?.name || 'Admin User'}
              </div>
              <div className="text-xs text-gray-500">
                {session?.user?.email}
              </div>
            </div>
            <div className="flex items-center justify-center w-8 h-8 text-white bg-gray-700 rounded-full">
              {session?.user?.name ? session.user.name[0].toUpperCase() : 'A'}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}