'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Icon Components
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const CreditCardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

// Tab Navigation Component
interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => {
  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: <UserIcon /> },
    { id: 'privacy', label: 'Privacy & Data', icon: <ShieldIcon /> },
    { id: 'billing', label: 'Billing & Payments', icon: <CreditCardIcon /> },
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${
              activeTab === tab.id
                ? 'border-[#7e43f1] text-[#7e43f1]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

// Profile Information Section
interface ProfileSectionProps {
  userData: any;
  onUpdate: () => void;
  loading: boolean;
}

const ProfileSection = ({ userData, onUpdate, loading }: ProfileSectionProps) => {
  const [formData, setFormData] = useState({
    phone: userData?.phone || '',
    location: userData?.location || '',
    jobTitle: userData?.jobTitle || '',
    company: userData?.company || '',
    experienceLevel: userData?.experienceLevel || 'Entry Level (0-2 years)',
    industry: userData?.industry || '',
    careerGoals: userData?.careerGoals || [],
    interests: userData?.interests || []
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userData) {
      setFormData({
        phone: userData.phone || '',
        location: userData.location || '',
        jobTitle: userData.jobTitle || '',
        company: userData.company || '',
        experienceLevel: userData.experienceLevel || 'Entry Level (0-2 years)',
        industry: userData.industry || '',
        careerGoals: userData.careerGoals || [],
        interests: userData.interests || []
      });
    }
  }, [userData]);

  const experienceLevels = [
    'Entry Level (0-2 years)',
    'Mid Level (2-5 years)',
    'Senior Level (5-10 years)',
    'Executive Level (10+ years)',
    'Student/Graduate'
  ];

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
    'Retail', 'Consulting', 'Government', 'Non-profit', 'Media & Entertainment',
    'Real Estate', 'Transportation', 'Energy', 'Agriculture', 'Other'
  ];

  const careerGoalOptions = [
    'Leadership Development', 'Technical Skills', 'Career Change', 'Salary Increase',
    'Work-Life Balance', 'Remote Work', 'Entrepreneurship', 'Specialization',
    'Management Role', 'International Experience'
  ];

  const interestOptions = [
    'Artificial Intelligence', 'Data Science', 'Digital Marketing', 'Project Management',
    'Software Development', 'Design', 'Sales', 'Human Resources', 'Finance',
    'Operations', 'Strategy', 'Innovation', 'Sustainability', 'Research'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      alert('Profile updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleArrayToggle = (array: string[], value: string, field: 'careerGoals' | 'interests') => {
    const newArray = array.includes(value)
      ? array.filter(item => item !== value)
      : [...array, value];
    
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7e43f1] focus:ring-[#7e43f1]"
              placeholder="+60 12-345-6789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7e43f1] focus:ring-[#7e43f1]"
              placeholder="Kuala Lumpur, Malaysia"
            />
          </div>
        </div>
      </div>

      {/* Professional Background */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Background</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Title
            </label>
            <input
              type="text"
              value={formData.jobTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7e43f1] focus:ring-[#7e43f1]"
              placeholder="Software Engineer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7e43f1] focus:ring-[#7e43f1]"
              placeholder="Tech Corp Sdn Bhd"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Experience Level *
            </label>
            <select
              value={formData.experienceLevel}
              onChange={(e) => setFormData(prev => ({ ...prev, experienceLevel: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7e43f1] focus:ring-[#7e43f1]"
              required
            >
              {experienceLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <select
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7e43f1] focus:ring-[#7e43f1]"
            >
              <option value="">Select Industry</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Career Preferences */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Career Preferences</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Career Goals (Select all that apply)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {careerGoalOptions.map(goal => (
              <label key={goal} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.careerGoals.includes(goal)}
                  onChange={() => handleArrayToggle(formData.careerGoals, goal, 'careerGoals')}
                  className="rounded border-gray-300 text-[#7e43f1] focus:ring-[#7e43f1]"
                />
                <span className="text-sm text-gray-700">{goal}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Areas of Interest (Select all that apply)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {interestOptions.map(interest => (
              <label key={interest} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.interests.includes(interest)}
                  onChange={() => handleArrayToggle(formData.interests, interest, 'interests')}
                  className="rounded border-gray-300 text-[#7e43f1] focus:ring-[#7e43f1]"
                />
                <span className="text-sm text-gray-700">{interest}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
};

// Privacy & Data Section
interface PrivacySectionProps {
  userData: any;
  onUpdate: () => void;
  loading: boolean;
}

const PrivacySection = ({ userData, onUpdate, loading }: PrivacySectionProps) => {
  const [formData, setFormData] = useState({
    researchConsent: userData?.researchConsent || false,
    marketingEmails: userData?.marketingEmails || false,
    productUpdates: userData?.productUpdates || true,
    cookiesAnalytics: userData?.cookiesAnalytics || true,
    cookiesMarketing: userData?.cookiesMarketing || false,
    cookiesFunctional: userData?.cookiesFunctional || true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userData) {
      setFormData({
        researchConsent: userData.researchConsent || false,
        marketingEmails: userData.marketingEmails || false,
        productUpdates: userData.productUpdates || true,
        cookiesAnalytics: userData.cookiesAnalytics || true,
        cookiesMarketing: userData.cookiesMarketing || false,
        cookiesFunctional: userData.cookiesFunctional || true
      });
    }
  }, [userData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch('/api/user/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update privacy settings');
      }

      alert('Privacy settings updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      alert('Failed to update privacy settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field: string) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field as keyof typeof prev] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Research Consent */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Research Consent</h3>
        <div className="space-y-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.researchConsent}
              onChange={() => handleToggle('researchConsent')}
              className="mt-1 rounded border-gray-300 text-[#7e43f1] focus:ring-[#7e43f1]"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Allow anonymous data usage for research
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Help us improve our assessments by allowing anonymous usage of your assessment data for research purposes. 
                This data will never be linked to your identity and helps us develop better career insights.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Marketing Preferences */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Marketing Preferences</h3>
        <div className="space-y-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.marketingEmails}
              onChange={() => handleToggle('marketingEmails')}
              className="mt-1 rounded border-gray-300 text-[#7e43f1] focus:ring-[#7e43f1]"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Marketing emails
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Receive promotional emails about new assessments, career tips, and special offers.
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.productUpdates}
              onChange={() => handleToggle('productUpdates')}
              className="mt-1 rounded border-gray-300 text-[#7e43f1] focus:ring-[#7e43f1]"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Product updates
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Get notified about new features, assessment types, and platform improvements.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Cookie Settings */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cookie Settings</h3>
        <div className="space-y-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.cookiesFunctional}
              onChange={() => handleToggle('cookiesFunctional')}
              disabled
              className="mt-1 rounded border-gray-300 text-[#7e43f1] focus:ring-[#7e43f1]"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Functional cookies
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Essential cookies required for the website to function properly. These cannot be disabled.
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.cookiesAnalytics}
              onChange={() => handleToggle('cookiesAnalytics')}
              className="mt-1 rounded border-gray-300 text-[#7e43f1] focus:ring-[#7e43f1]"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Analytics cookies
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Help us understand how you use our website so we can improve your experience.
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.cookiesMarketing}
              onChange={() => handleToggle('cookiesMarketing')}
              className="mt-1 rounded border-gray-300 text-[#7e43f1] focus:ring-[#7e43f1]"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Marketing cookies
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Used to show you relevant advertisements and track the effectiveness of our marketing campaigns.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
};

// Billing & Payments Section
interface BillingSectionProps {
  paymentMethods: any[];
  invoices: any[];
  onUpdate: () => void;
  loading: boolean;
}

const BillingSection = ({ paymentMethods, invoices, onUpdate, loading }: BillingSectionProps) => {
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/user/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCard),
      });

      if (!response.ok) {
        throw new Error('Failed to add payment method');
      }

      setNewCard({ cardNumber: '', expiryDate: '', cvv: '', cardholderName: '' });
      setShowAddCard(false);
      alert('Payment method added successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error adding payment method:', error);
      alert('Failed to add payment method. Please try again.');
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      const response = await fetch(`/api/user/payment-methods/${methodId}/default`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }

      alert('Default payment method updated!');
      onUpdate();
    } catch (error) {
      console.error('Error setting default payment method:', error);
      alert('Failed to update default payment method.');
    }
  };

  const handleRemoveCard = async (methodId: string) => {
    if (confirm('Are you sure you want to remove this payment method?')) {
      try {
        const response = await fetch(`/api/user/payment-methods/${methodId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to remove payment method');
        }

        alert('Payment method removed successfully!');
        onUpdate();
      } catch (error) {
        console.error('Error removing payment method:', error);
        alert('Failed to remove payment method.');
      }
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/user/invoices/${invoiceId}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Methods */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
          <button
            onClick={() => setShowAddCard(true)}
            className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Add Payment Method
          </button>
        </div>

        {!paymentMethods || paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
              <CreditCardIcon />
            </div>
            <p className="text-gray-500 mt-2">No payment methods added</p>
            <p className="text-sm text-gray-400">Add a payment method to continue with assessments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                    <CreditCardIcon />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {method.brand} ending in {method.last4}
                    </p>
                    {method.expiryDate && (
                      <p className="text-sm text-gray-500">Expires {method.expiryDate}</p>
                    )}
                    {method.isDefault && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckIcon />
                        <span className="ml-1">Default</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!method.isDefault && (
                    <button
                      onClick={() => handleSetDefault(method.id)}
                      className="text-sm text-[#7e43f1] hover:text-[#6a38d1]"
                    >
                      Set as Default
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveCard(method.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Card Form */}
        {showAddCard && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">Add New Card</h4>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={newCard.cardholderName}
                    onChange={(e) => setNewCard(prev => ({ ...prev, cardholderName: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7e43f1] focus:ring-[#7e43f1]"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={newCard.cardNumber}
                    onChange={(e) => setNewCard(prev => ({ ...prev, cardNumber: e.target.value.replace(/\s/g, '') }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7e43f1] focus:ring-[#7e43f1]"
                    placeholder="1234 5678 9012 3456"
                    maxLength={16}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={newCard.expiryDate}
                    onChange={(e) => setNewCard(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7e43f1] focus:ring-[#7e43f1]"
                    placeholder="MM/YY"
                    maxLength={5}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={newCard.cvv}
                    onChange={(e) => setNewCard(prev => ({ ...prev, cvv: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7e43f1] focus:ring-[#7e43f1]"
                    placeholder="123"
                    maxLength={4}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddCard(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#7e43f1] text-white rounded-lg hover:bg-[#6a38d1]"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Invoice Downloads */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Downloads</h3>
        
        {!invoices || invoices.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
              <DownloadIcon />
            </div>
            <p className="text-gray-500 mt-2">No invoices available</p>
            <p className="text-sm text-gray-400">Your payment history will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {invoice.description || `Assessment Payment - RM${invoice.amount}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      RM {invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        invoice.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : invoice.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="text-[#7e43f1] hover:text-[#6a38d1] flex items-center"
                        disabled={invoice.status !== 'completed'}
                      >
                        <DownloadIcon />
                        <span className="ml-1">Download</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Settings Page
export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

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
      
      // Fetch user profile data
      const userResponse = await fetch('/api/user');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserData(userData);
      }

      // Fetch payment methods
      const paymentResponse = await fetch('/api/user/payments');
      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json();
        setPaymentMethods(paymentData.paymentMethods || []);
        setInvoices(paymentData.invoices || []);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <ProfileSection
            userData={userData}
            onUpdate={fetchUserData}
            loading={loading}
          />
        );
      case 'privacy':
        return (
          <PrivacySection
            userData={userData}
            onUpdate={fetchUserData}
            loading={loading}
          />
        );
      case 'billing':
        return (
          <BillingSection
            paymentMethods={paymentMethods}
            invoices={invoices}
            onUpdate={fetchUserData}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/dashboard"
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">Manage your account preferences and privacy settings</p>
        </div>

        {/* Settings Content */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}