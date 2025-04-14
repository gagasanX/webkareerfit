'use client';

// src/components/clerk/ClerkSidebar.tsx
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  HomeIcon, 
  UsersIcon, 
  ClipboardCheckIcon, 
  ChartBarIcon,
  LogOutIcon
} from 'lucide-react';

export default function ClerkSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/clerk/dashboard',
      icon: HomeIcon,
    },
    {
      name: 'Users',
      href: '/clerk/users',
      icon: UsersIcon,
    },
    {
      name: 'Assessments',
      href: '/clerk/assessments',
      icon: ClipboardCheckIcon,
    },
    {
      name: 'Reports',
      href: '/clerk/reports',
      icon: ChartBarIcon,
    },
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } bg-indigo-800 text-white h-screen transition-all duration-300 ease-in-out sticky top-0`}
    >
      <div className="flex items-center justify-between p-4 border-b border-indigo-700">
        {!collapsed && (
          <div className="flex items-center">
            <span className="font-bold text-xl">Clerk Panel</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-md hover:bg-indigo-700 focus:outline-none ${
            collapsed ? 'mx-auto' : ''
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {collapsed ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            )}
          </svg>
        </button>
      </div>

      <div className="py-4">
        <div className="flex flex-col space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  isActive
                    ? 'bg-indigo-900 text-white'
                    : 'text-indigo-200 hover:bg-indigo-700'
                } flex items-center px-4 py-3 transition-colors duration-200`}
              >
                <Icon className="h-5 w-5" />
                {!collapsed && <span className="ml-3">{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-0 w-full border-t border-indigo-700 p-4">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <p className="text-sm font-medium text-indigo-200">
                {session?.user?.name}
              </p>
              <p className="text-xs text-indigo-300">
                {session?.user?.email}
              </p>
            </div>
          )}
          <button
            onClick={() => signOut()}
            className={`p-2 rounded-full hover:bg-indigo-700 ${
              collapsed ? 'mx-auto' : ''
            }`}
            title="Sign out"
          >
            <LogOutIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}