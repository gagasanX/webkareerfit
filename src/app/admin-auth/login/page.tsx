'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // First check if user is an admin
      const checkResponse = await fetch('/api/auth/check-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const checkData = await checkResponse.json();

      if (!checkResponse.ok || !checkData.isAdmin) {
        setError('Invalid credentials or user is not an administrator');
        setIsLoading(false);
        return;
      }

      // Proceed with login if user is an admin
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (err) {
      setError('An error occurred during login');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 py-10 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 p-6 text-white">
            <h1 className="text-2xl font-bold text-center">Admin Login</h1>
            <p className="text-center text-gray-300 mt-2">Restricted Access</p>
          </div>

          <div className="p-6 md:p-8">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-gray-700 to-gray-900 text-white py-2 px-4 rounded-lg hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-opacity-50 disabled:opacity-70"
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </button>
              </div>

              <div className="mt-4 text-center text-sm text-gray-600">
                <Link href="/" className="text-gray-700 hover:underline">
                  Return to main site
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}