'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    registrationCode: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Code verification, Step 2: Registration

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Verify registration code - check if it matches the secret code
    // ADMIN SECRET CODE: 1234567890ABC
    if (formData.registrationCode !== "1234567890ABC") {
      setError('Invalid admin registration code');
      setIsLoading(false);
      return;
    }

    // If code is valid, move to registration step
    setStep(2);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate form
    if (!formData.name || !formData.email || !formData.password) {
      setError('All fields are required');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      // Register new admin
      const response = await fetch('/api/auth/register-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          registrationCode: formData.registrationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Redirect to admin login
      router.push('/admin-auth/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 py-10 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 p-6 text-white">
            <h1 className="text-2xl font-bold text-center">Admin Registration</h1>
            <p className="text-center text-gray-300 mt-2">Restricted Access</p>
          </div>

          <div className="p-6 md:p-8">
            {step === 1 ? (
              <form onSubmit={verifyCode}>
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-gray-800 mb-2">Admin Access Verification</h2>
                  <p className="text-gray-600 text-sm mb-4">
                    Please enter the admin registration code to continue.
                  </p>
                  
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Code
                  </label>
                  <input
                    type="password"
                    name="registrationCode"
                    value={formData.registrationCode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700"
                    required
                    autoComplete="off"
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-gray-700 to-gray-900 text-white py-2 px-4 rounded-lg hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-opacity-50 disabled:opacity-70"
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
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
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
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
                    {isLoading ? 'Registering...' : 'Register as Admin'}
                  </button>
                </div>

                <div className="mt-4 text-center text-sm text-gray-600">
                  Already have an admin account?{' '}
                  <Link href="/admin-auth/login" className="text-gray-700 hover:underline">
                    Login here
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}