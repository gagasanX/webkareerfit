'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Define interfaces for user profile and form data
interface UserProfile {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  skills?: string | null;
  education?: string | null;
  experience?: string | null;
  isAdmin: boolean;
  isAffiliate: boolean;
  affiliateCode?: string | null;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  bio: string;
  skills: string;
  education: string;
  experience: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(true); // Default to editing mode to match your screenshot
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    bio: '',
    skills: '',
    education: '',
    experience: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/profile');
      return;
    }

    if (status === 'authenticated') {
      fetchUserProfile();
    }
  }, [status, router]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      setUserProfile(data);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        bio: data.bio || '',
        skills: data.skills || '',
        education: data.education || '',
        experience: data.experience || ''
      });
    } catch (error) {
      setError('Error loading profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const data = await response.json();
      setUserProfile(data);
      setSuccess('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error updating profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle click on Save Changes button
  const handleSaveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    handleSubmit(e);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-[#38b6ff] hover:underline mb-4 inline-block">
          &larr; Back to Dashboard
        </Link>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
            <h1 className="text-2xl font-bold">Your Profile</h1>
            <p className="text-white/80 mt-1">Manage your personal information and preferences</p>
          </div>
          
          {/* Profile content */}
          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}
            
            <div className="flex flex-col md:flex-row md:space-x-6">
              {/* Left column - Avatar and basic info */}
              <div className="w-full md:w-1/3 flex flex-col items-center mb-6 md:mb-0">
                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] flex items-center justify-center text-white text-4xl font-bold mb-4">
                  {formData.name?.charAt(0) || 'U'}
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-4">Profile picture will be based on your name initial</p>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-4 py-2 rounded-lg"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(false)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
                    >
                      Cancel Editing
                    </button>
                  )}
                </div>
                
                {userProfile?.isAffiliate && (
                  <div className="mt-6 text-center p-4 bg-green-50 rounded-lg">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-2">
                      Affiliate Member
                    </span>
                    <p className="text-sm text-gray-600 mb-2">
                      Your referral code:
                    </p>
                    <div className="bg-white p-2 rounded border border-gray-200 text-center font-medium">
                      {userProfile.affiliateCode || 'KF-' + userProfile.id.substring(0, 6).toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right column - Profile details */}
              <div className="w-full md:w-2/3">
                {/* Edit mode form */}
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7e43f1]"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7e43f1]"
                        required
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7e43f1]"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                      About Me
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={3}
                      value={formData.bio}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7e43f1]"
                      placeholder="Tell us a bit about yourself"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
                      Skills (comma separated)
                    </label>
                    <input
                      type="text"
                      id="skills"
                      name="skills"
                      value={formData.skills}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7e43f1]"
                      placeholder="Leadership, Communication, Problem Solving"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">
                      Education
                    </label>
                    <textarea
                      id="education"
                      name="education"
                      rows={2}
                      value={formData.education}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7e43f1]"
                      placeholder="Your educational background"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                      Experience
                    </label>
                    <textarea
                      id="experience"
                      name="experience"
                      rows={2}
                      value={formData.experience}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7e43f1]"
                      placeholder="Your work experience"
                    ></textarea>
                  </div>
                </form>
                
                {/* Save button - added outside the form to prevent form submission */}
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleSaveClick}
                    disabled={isSaving}
                    className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
                
                <div className="pt-6 mt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Account Options</h3>
                  <div className="space-y-2">
                    <Link href="/profile/change-password" className="text-[#38b6ff] hover:underline block">
                      Change Password
                    </Link>
                    {!userProfile?.isAffiliate && (
                      <Link href="/affiliate/join" className="text-[#38b6ff] hover:underline block">
                        Join Affiliate Program
                      </Link>
                    )}
                    <button 
                      className="text-red-600 hover:underline block" 
                      onClick={() => {
                        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                          // Handle account deletion
                          alert('Account deletion would be triggered here');
                        }
                      }}
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}