'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  Search, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  ChevronDown,
  Edit,
  Trash,
  Shield,
  UserCog
} from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isAdmin: boolean;
  isClerk: boolean;
  isAffiliate: boolean;
  createdAt: string;
  _count: {
    assessments: number;
    payments: number;
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userCount, setUserCount] = useState(0);

  // Filter options
  const [filters, setFilters] = useState({
    role: 'all', // all, user, admin, clerk, affiliate
  });

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/users?search=${searchTerm}&page=${currentPage}&role=${filters.role}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to load users');
        }
        
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.totalPages);
        setUserCount(data.totalCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [searchTerm, currentPage, filters.role, actionSuccess]); // Refresh when actionSuccess changes

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
  };

  const toggleDropdown = (userId: string) => {
    if (showDropdown === userId) {
      setShowDropdown(null);
    } else {
      setShowDropdown(userId);
    }
  };

  const changeUserRole = async (userId: string, role: string, value: boolean) => {
    if (actionLoading) return; // Prevent multiple actions
    
    setActionLoading(userId);
    setActionSuccess(null);
    setShowDropdown(null);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          value
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update user role');
      }
      
      // Show success message
      setActionSuccess(`User role updated successfully`);
      
      // Update users list locally
      setUsers(users.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            [role]: value,
            role: value ? role.replace('is', '').toUpperCase() : user.role
          };
        }
        return user;
      }));
      
      // Clear success message after delay
      setTimeout(() => {
        setActionSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId: string) => {
    if (actionLoading) return; // Prevent multiple actions
    
    setActionLoading(userId);
    setConfirmDelete(null);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete user');
      }
      
      // Show success message
      setActionSuccess(`User deleted successfully`);
      
      // Remove user from list
      setUsers(users.filter(user => user.id !== userId));
      
      // Clear success message after delay
      setTimeout(() => {
        setActionSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      {/* Search and filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <form onSubmit={handleSearch} className="w-full md:w-1/2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="search"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search users by email, name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </form>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={filters.role}
              onChange={(e) => {
                setFilters({...filters, role: e.target.value});
                setCurrentPage(1); // Reset to first page on filter change
              }}
            >
              <option value="all">All Roles</option>
              <option value="user">Regular Users</option>
              <option value="admin">Admins</option>
              <option value="clerk">Clerks</option>
              <option value="affiliate">Affiliates</option>
            </select>
          </div>
          
          <button
            type="button"
            onClick={() => router.push('/admin/users/create')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Add User
          </button>
        </div>
      </div>
      
      {/* Success Message */}
      {actionSuccess && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {actionSuccess}
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
          <XCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      
      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-12 h-12 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-700">
              {userCount} users found
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                            {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || 'Unnamed User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-1">
                          {user.isAdmin && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Admin
                            </span>
                          )}
                          {user.isClerk && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              Clerk
                            </span>
                          )}
                          {user.isAffiliate && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Affiliate
                            </span>
                          )}
                          {!user.isAdmin && !user.isClerk && !user.isAffiliate && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              User
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(user.createdAt), 'PP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div>Assessments: {user._count.assessments}</div>
                          <div>Payments: {user._count.payments}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative">
                          <button
                            onClick={() => toggleDropdown(user.id)}
                            className="text-gray-500 hover:text-gray-700 focus:outline-none"
                          >
                            <span className="sr-only">Open options</span>
                            <div className="flex items-center">
                              <span className="mr-1">Actions</span>
                              <ChevronDown className="h-4 w-4" />
                            </div>
                          </button>
                          
                          {showDropdown === user.id && (
                            <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => router.push(`/admin/users/${user.id}`)}
                                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </button>
                                
                                <button
                                  onClick={() => changeUserRole(user.id, 'isAdmin', !user.isAdmin)}
                                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  {user.isAdmin ? 'Remove Admin Role' : 'Make Admin'}
                                </button>
                                
                                <button
                                  onClick={() => changeUserRole(user.id, 'isClerk', !user.isClerk)}
                                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <UserCog className="h-4 w-4 mr-2" />
                                  {user.isClerk ? 'Remove Clerk Role' : 'Make Clerk'}
                                </button>
                                
                                <button
                                  onClick={() => setConfirmDelete(user.id)}
                                  className="flex w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete User
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {confirmDelete === user.id && (
                            <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 p-4">
                              <p className="text-sm text-gray-700 mb-3">
                                Are you sure you want to delete this user? This action cannot be undone.
                              </p>
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => deleteUser(user.id)}
                                  className="px-3 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Loading overlay for actions */}
      {actionLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin mr-3"></div>
              <p className="text-gray-700">Processing...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}