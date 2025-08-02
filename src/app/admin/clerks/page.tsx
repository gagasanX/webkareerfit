'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users,
  UserCheck,
  UserMinus,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Clerk {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  role: string;
}

export default function ClerksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clerks, setClerks] = useState<Clerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingClerkId, setDeletingClerkId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin-auth/login');
    } else if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/dashboard');
    } else if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchClerks();
    }
  }, [status, session, router]);

  const fetchClerks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/clerks');
      if (!response.ok) {
        throw new Error('Failed to fetch clerks');
      }
      
      const data = await response.json();
      if (!data.clerks) {
        throw new Error('Invalid response format');
      }
      
      setClerks(data.clerks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clerks');
      setClerks([]);
    } finally {
      setLoading(false);
    }
  };

  const removeClerk = async (clerkId: string) => {
    try {
      setDeletingClerkId(clerkId);
      
      const response = await fetch(`/api/admin/clerks/${clerkId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove clerk');
      }
      
      // Refresh the clerks list
      await fetchClerks();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove clerk');
    } finally {
      setDeletingClerkId(null);
    }
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
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchClerks}
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manage Clerks</h1>
          <p className="text-gray-600">Review and manage assessment clerks</p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={fetchClerks}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          
          <Link 
            href="/admin/users"
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Add New Clerk
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned Since
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clerks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No clerks found
                </td>
              </tr>
            ) : (
              clerks.map((clerk) => (
                <tr key={clerk.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {clerk.name || 'Unnamed Clerk'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{clerk.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(clerk.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => removeClerk(clerk.id)}
                      disabled={deletingClerkId === clerk.id}
                      className="inline-flex items-center text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {deletingClerkId === clerk.id ? (
                        <Clock className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4 mr-1" />
                      )}
                      Remove Clerk
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
