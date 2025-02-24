import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../../lib/supabase';
import FranchisorLayout from '../../components/FranchisorLayout';
import PaymentModal from '../../components/PaymentModal';
import { Loader2, Plus, Calendar, DollarSign, Store, X } from 'lucide-react';

// Initialize Stripe with the publishable key from environment variables
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface PricingTier {
  duration: string;
  price: number;
}

interface FeaturedAd {
  id: string;
  franchise: {
    name: string;
  };
  start_date: string;
  end_date: string;
  status: string;
  payment_status: string;
  amount: number;
  created_at: string;
}

export default function FeaturedAds() {
  const [selectedFranchise, setSelectedFranchise] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [franchises, setFranchises] = useState<Array<{
    id: string;
    name: string;
  }>>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [featuredAds, setFeaturedAds] = useState<FeaturedAd[]>([]);
  const [showDurationModal, setShowDurationModal] = useState(false);

  useEffect(() => {
    fetchFranchises();
    fetchPricingTiers();
    fetchFeaturedAds();
  }, []);

  const fetchFranchises = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('franchises')
        .select('id, name')
        .eq('franchisor_id', user.id)
        .eq('status', 'approved');

      if (error) throw error;
      if (data) setFranchises(data);
    } catch (err: any) {
      console.error('Error fetching franchises:', err);
      setError(err.message);
    }
  };

  const fetchPricingTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('advertising_settings')
        .select('featured_pricing')
        .single();

      if (error) throw error;
      if (data) setPricingTiers(data.featured_pricing);
    } catch (err: any) {
      console.error('Error fetching pricing tiers:', err);
      setError(err.message);
    }
  };

  const fetchFeaturedAds = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('featured_ads')
        .select(`
          *,
          franchise:franchises(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setFeaturedAds(data);
    } catch (err: any) {
      console.error('Error fetching featured ads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirm = async () => {
    try {
      setProcessing(true);
      setError('');

      const selectedTier = pricingTiers.find(tier => tier.duration === selectedDuration);
      if (!selectedTier) throw new Error('Invalid duration selected');

      const now = new Date();
      let endDate = new Date(now);

      switch (selectedDuration) {
        case '1w':
          endDate.setDate(endDate.getDate() + 7);
          break;
        case '2w':
          endDate.setDate(endDate.getDate() + 14);
          break;
        case '1m':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case '6m':
          endDate.setMonth(endDate.getMonth() + 6);
          break;
      }

      // Create featured ad
      const { data: ad, error: createError } = await supabase
        .from('featured_ads')
        .insert({
          franchise_id: selectedFranchise,
          amount: selectedTier.price,
          start_date: now.toISOString(),
          end_date: endDate.toISOString(),
          status: 'pending_payment',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create Stripe Checkout Session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adId: ad.id,
          franchiseId: selectedFranchise,
          amount: selectedTier.price,
          duration: selectedDuration,
          userId: user.id
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create checkout session');
      }

      const { sessionId } = responseData;
      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Redirect to Stripe Checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId
      });

      if (stripeError) {
        throw stripeError;
      }

      // Reset form and close modal
      setSelectedFranchise('');
      setSelectedDuration('');
      setIsPaymentModalOpen(false);
    } catch (err: any) {
      console.error('Error creating featured ad:', err);
      setError(err.message || 'Failed to process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateAd = () => {
    setSelectedFranchise('');
    setSelectedDuration('');
    setShowDurationModal(true);
  };

  const handleDurationSelected = () => {
    if (!selectedFranchise || !selectedDuration) {
      setError('Please select both a franchise and duration');
      return;
    }
    setShowDurationModal(false);
    setIsPaymentModalOpen(true);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <FranchisorLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </FranchisorLayout>
    );
  }

  return (
    <FranchisorLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Featured Ads</h1>
          <button
            onClick={handleCreateAd}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Featured Ad
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md">
            {error}
          </div>
        )}

        {/* Duration Selection Modal */}
        {showDurationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Create Featured Ad</h2>
                  <button
                    onClick={() => setShowDurationModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Franchise Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select Franchise
                    </label>
                    <select
                      value={selectedFranchise}
                      onChange={(e) => setSelectedFranchise(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">Select a franchise</option>
                      {franchises.map((franchise) => (
                        <option key={franchise.id} value={franchise.id}>
                          {franchise.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select Duration
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      {pricingTiers.map((tier) => (
                        <button
                          key={tier.duration}
                          onClick={() => setSelectedDuration(tier.duration)}
                          className={`p-4 border rounded-lg text-left ${
                            selectedDuration === tier.duration
                              ? 'border-indigo-500 ring-2 ring-indigo-500'
                              : 'border-gray-300 hover:border-indigo-500'
                          }`}
                        >
                          <div className="font-medium text-gray-900">
                            {tier.duration === '1w' && '1 Week'}
                            {tier.duration === '2w' && '2 Weeks'}
                            {tier.duration === '1m' && '1 Month'}
                            {tier.duration === '6m' && '6 Months'}
                          </div>
                          <div className="text-sm text-gray-500">
                            £{tier.price.toFixed(2)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDurationModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDurationSelected}
                    disabled={!selectedFranchise || !selectedDuration}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          franchise={franchises.find(f => f.id === selectedFranchise)}
          selectedDuration={selectedDuration}
          amount={pricingTiers.find(tier => tier.duration === selectedDuration)?.price || 0}
          onConfirm={handlePaymentConfirm}
          processing={processing}
        />

        {/* Featured Ads List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franchise
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {featuredAds.map((ad) => (
                  <tr key={ad.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Store className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {ad.franchise?.name || 'Unknown Franchise'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(ad.start_date).toLocaleDateString()} - {new Date(ad.end_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(ad.status)}`}>
                        {ad.status.replace('_', ' ').charAt(0).toUpperCase() + ad.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ad.payment_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ad.payment_status.charAt(0).toUpperCase() + ad.payment_status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        {ad.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                  </tr>
                ))}
                {featuredAds.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No featured ads found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </FranchisorLayout>
  );
}