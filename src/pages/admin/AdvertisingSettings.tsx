import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { Loader2, Save } from 'lucide-react';

interface PricingTier {
  duration: string;
  price: number;
}

interface AdSettings {
  featured_pricing: PricingTier[];
  banner_pricing: PricingTier[];
}

export default function AdvertisingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState<AdSettings>({
    featured_pricing: [
      { duration: '1w', price: 99.99 },
      { duration: '2w', price: 179.99 },
      { duration: '1m', price: 299.99 },
      { duration: '6m', price: 1499.99 }
    ],
    banner_pricing: [
      { duration: '1w', price: 149.99 },
      { duration: '2w', price: 279.99 },
      { duration: '1m', price: 499.99 },
      { duration: '6m', price: 2499.99 }
    ]
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('advertising_settings')
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        setSettings(data);
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (type: 'featured' | 'banner', index: number, value: string) => {
    const newSettings = { ...settings };
    const pricing = type === 'featured' ? 'featured_pricing' : 'banner_pricing';
    newSettings[pricing][index].price = parseFloat(value) || 0;
    setSettings(newSettings);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('advertising_settings')
        .upsert({
          id: 1, // Single row for settings
          featured_pricing: settings.featured_pricing,
          banner_pricing: settings.banner_pricing,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setSuccess('Settings updated successfully');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Advertising Settings</h1>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-500 p-4 rounded-md">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Featured Ads Pricing */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Featured Ads Pricing</h2>
            <div className="space-y-4">
              {settings.featured_pricing.map((tier, index) => (
                <div key={tier.duration} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={tier.duration}
                      disabled
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Price (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tier.price}
                      onChange={(e) => handlePriceChange('featured', index, e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Banner Ads Pricing */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Banner Ads Pricing</h2>
            <div className="space-y-4">
              {settings.banner_pricing.map((tier, index) => (
                <div key={tier.duration} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={tier.duration}
                      disabled
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Price (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tier.price}
                      onChange={(e) => handlePriceChange('banner', index, e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}