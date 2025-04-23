'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  HelpCircle,
  Info
} from 'lucide-react';

interface CommissionSetting {
  id: string;
  type: string;
  name: string;
  baseRate: number;
  minReferrals: number;
  maxRate: number;
  isActive: boolean;
}

interface TierSetting {
  id: string;
  name: string;
  minReferrals: number;
  commissionRate: number;
  isActive: boolean;
}

export default function CommissionSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [globalRate, setGlobalRate] = useState<number>(10);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSetting[]>([]);
  const [tiers, setTiers] = useState<TierSetting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin-auth/login');
      return;
    }

    if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/dashboard');
      return;
    }

    if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchCommissionSettings();
    }
  }, [status, session, router]);

  const fetchCommissionSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/affiliates/commission');
      
      if (!response.ok) {
        throw new Error('Failed to fetch commission settings');
      }
      
      const data = await response.json();
      setGlobalRate(data.globalRate || 10);
      setCommissionSettings(data.commissionSettings || []);
      setTiers(data.tiers || []);
      setLoading(false);
    } catch (error) {
      setError('Error loading commission settings. Please try again.');
      setLoading(false);
    }
  };

  const handleGlobalRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (isNaN(value) || value < 0 || value > 100) return;
    setGlobalRate(value);
  };

  const handleCommissionChange = (id: string, field: keyof CommissionSetting, value: any) => {
    setCommissionSettings(current =>
      current.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleTierChange = (id: string, field: keyof TierSetting, value: any) => {
    setTiers(current =>
      current.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const addTier = () => {
    const newTier: TierSetting = {
      id: `new-tier-${Date.now()}`,
      name: `Tier ${tiers.length + 1}`,
      minReferrals: tiers.length > 0 ? Math.max(...tiers.map(t => t.minReferrals)) + 5 : 5,
      commissionRate: globalRate + 5,
      isActive: true
    };
    setTiers([...tiers, newTier]);
  };

  const removeTier = (id: string) => {
    setTiers(current => current.filter(item => item.id !== id));
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/affiliates/commission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          globalRate,
          commissionSettings,
          tiers
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save commission settings');
      }
      
      setSuccess('Commission settings saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      setError('Error saving commission settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-transparent border-gray-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link 
          href="/admin/affiliates"
          className="inline-flex items-center text-gray-600 hover:text-gray-800 mr-4"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back
        </Link>
        <h1 className="text-2xl font-bold">Commission Settings</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </span>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {success}
          </span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Global Commission Rate</h2>
          
          <div className="flex items-center mb-6">
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Commission Rate (%)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={globalRate}
                  onChange={handleGlobalRateChange}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="10"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
            </div>
            
            <div className="ml-4 text-sm text-gray-500 flex items-start">
              <Info className="h-5 w-5 mr-1 flex-shrink-0 text-gray-400" />
              <span>This is the default commission rate for all affiliates unless overridden by assessment-specific rates or tier bonuses.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Assessment-Specific Commission Rates</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assessment Type
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Base Rate (%)
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commissionSettings.map((setting) => (
                  <tr key={setting.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {setting.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {setting.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={setting.baseRate}
                          onChange={(e) => handleCommissionChange(setting.id, 'baseRate', parseFloat(e.target.value))}
                          className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={setting.isActive}
                          onChange={(e) => handleCommissionChange(setting.id, 'isActive', e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Tier-Based Commission Rates</h2>
            <button
              type="button"
              onClick={addTier}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Tier
            </button>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <HelpCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Tiers allow affiliates to earn higher commission rates based on their performance. Set minimum referral requirements for each tier.
                </p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier Name
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min. Referrals
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission Rate (%)
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tiers.map((tier, index) => (
                  <tr key={tier.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => handleTierChange(tier.id, 'name', e.target.value)}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        value={tier.minReferrals}
                        onChange={(e) => handleTierChange(tier.id, 'minReferrals', parseInt(e.target.value))}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-24 sm:text-sm border-gray-300 rounded-md"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tier.commissionRate}
                        onChange={(e) => handleTierChange(tier.id, 'commissionRate', parseFloat(e.target.value))}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-24 sm:text-sm border-gray-300 rounded-md"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={tier.isActive}
                          onChange={(e) => handleTierChange(tier.id, 'isActive', e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => removeTier(tier.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}