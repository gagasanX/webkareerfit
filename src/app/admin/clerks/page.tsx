'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { SearchIcon, PlusIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';

interface ClerkUser {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  assessmentCount: number;
}

interface NewClerkData {
  email: string;
  makeClerk: boolean;
}

export default function AdminClerksPage() {
  const [clerks, setClerks] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClerkData, setNewClerkData] = useState<NewClerkData>({
    email: '',
    makeClerk: true
  });
  const [addingClerk, setAddingClerk] = useState(false);
  const [addClerkError, setAddClerkError] = useState<string | null>(null);
  const [addClerkSuccess, setAddClerkSuccess] = useState(false);
  const [removingClerkId, setRemovingClerkId] = useState<string | null>(null);

  // Fetch clerks from API
  useEffect(() => {
    const fetchClerks = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/clerks?search=${searchTerm}`);
        
        if (!response.ok) {
          throw new Error('Failed to load clerks');
        }
        
        const data = await response.json();
        setClerks(data.clerks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchClerks();
  }, [searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleAddClerk = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddClerkError(null);
    setAddClerkSuccess(false);
    
    try {
      setAddingClerk(true);
      
      const response = await fetch('/api/admin/clerks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newClerkData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add clerk');
      }
      
      setAddClerkSuccess(true);
      
      // Reset form and refresh clerks list
      setNewClerkData({
        email: '',
        makeClerk: true
      });
      
      // Fetch updated list of clerks
      const clerksResponse = await fetch(`/api/admin/clerks?search=${searchTerm}`);
      const clerksData = await clerksResponse.json();
      setClerks(clerksData.clerks);
      
      // Close modal after delay
      setTimeout(() => {
        setShowAddModal(false);
        setAddClerkSuccess(false);
      }, 2000);
    } catch (err) {
      setAddClerkError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setAddingClerk(false);
    }
  };
  
  const removeClerk = async (id: string) => {
    try {
      setRemovingClerkId(id);
      
      const response = await fetch(`/api/admin/clerks/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to remove clerk');
      }
      
      // Remove clerk from list
      setClerks(clerks.filter(clerk => clerk.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove clerk');
    } finally {
      setRemovingClerkId(null);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Clerk Management</h1>
      
      {/* Search and Add Clerk */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <form onSubmit={handleSearch} className="flex-1 w-full">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <SearchIcon className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="search"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search clerks by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </form>
        
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Clerk
        </button>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 p-4 rounded-lg text-red-700 mb-6">
          {error}
        </div>
      )}
      
      {/* Clerks Table */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-12 h-12 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
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
                    Added On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assessments Managed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clerks.length > 0 ? (
                  clerks.map((clerk) => (
                    <tr key={clerk.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {clerk.name || 'Unnamed Clerk'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {clerk.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(clerk.createdAt), 'PP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {clerk.assessmentCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => removeClerk(clerk.id)}
                          disabled={removingClerkId === clerk.id}
                          className="text-red-600 hover:text-red-900 focus:outline-none disabled:opacity-50"
                        >
                          {removingClerkId === clerk.id ? 'Removing...' : 'Remove Clerk Access'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No clerks found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Add Clerk Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Add New Clerk</h3>
            </div>
            <form onSubmit={handleAddClerk}>
              <div className="p-6">
                {addClerkSuccess && (
                  <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center">
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Clerk added successfully!
                  </div>
                )}
                
                {addClerkError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                    {addClerkError}
                  </div>
                )}
                
                <p className="mb-4 text-sm text-gray-500">
                  Enter the email of an existing user to assign them clerk privileges, or a new email to create a new clerk account.
                </p>
                
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={newClerkData.email}
                    onChange={(e) => setNewClerkData({ ...newClerkData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newClerkData.makeClerk}
                      onChange={(e) => setNewClerkData({ ...newClerkData, makeClerk: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Make this user a clerk</span>
                  </label>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingClerk || !newClerkData.email}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {addingClerk ? 'Adding...' : 'Add Clerk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}