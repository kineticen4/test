import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { Loader2, Check, Trash2 } from 'lucide-react';

interface FeaturedAd {
  id: string;
  franchise: {
    name: string;
    franchisor: {
      company_name: string;
    };
  };
  start_date: string;
  end_date: string;
  status: string;
  payment_status: string;
  amount: number;
  created_at: string;
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedAds: FeaturedAd[];
}

function DeleteModal({ isOpen, onClose, onConfirm, selectedAds }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete the following featured ad{selectedAds.length > 1 ? 's' : ''}?
          </p>
          <ul className="mt-2 space-y-1">
            {selectedAds.map(ad => (
              <li key={ad.id} className="text-sm text-gray-700">
                • {ad.franchise.name} ({ad.franchise.franchisor.company_name})
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-red-600 font-medium">
            This action cannot be undone. The listings will be removed from featured ads immediately.
          </p>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            Delete Ad{selectedAds.length > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FeaturedAds() {
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<FeaturedAd[]>([]);
  const [error, setError] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_ads')
        .select(`
          *,
          franchise:franchises (
            name,
            franchisor:profiles (
              company_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setAds(data);
        // Calculate total revenue from completed payments
        const revenue = data
          .filter(ad => ad.payment_status === 'completed')
          .reduce((sum, ad) => sum + ad.amount, 0);
        setTotalRevenue(revenue);
      }
    } catch (err: any) {
      console.error('Error fetching ads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAds = async () => {
    if (selectedAds.length === 0) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('featured_ads')
        .delete()
        .in('id', selectedAds);

      if (error) throw error;

      // Refresh the ads list
      await fetchAds();
      // Clear selection
      setSelectedAds([]);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Error deleting ads:', err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAd = (adId: string) => {
    setSelectedAds(prev => {
      if (prev.includes(adId)) {
        return prev.filter(id => id !== adId);
      }
      return [...prev, adId];
    });
  };

  const handlePaymentReceived = async () => {
    if (selectedAds.length === 0) return;
    
    setProcessingPayment(true);
    try {
      // Update payment status for all selected ads
      const { error } = await supabase
        .from('featured_ads')
        .update({ 
          payment_status: 'completed',
          status: 'active' // Also activate the ad when payment is received
        })
        .in('id', selectedAds);

      if (error) throw error;

      // Refresh the ads list
      await fetchAds();
      // Clear selection
      setSelectedAds([]);
    } catch (err: any) {
      console.error('Error updating payment status:', err);
      setError(err.message);
    } finally {
      setProcessingPayment(false);
    }
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Featured Ads</h1>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-indigo-600">
              £{totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md">
            {error}
          </div>
        )}

        {/* Action buttons */}
        {selectedAds.length > 0 && (
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={deleting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedAds.length})
            </button>
            <button
              onClick={handlePaymentReceived}
              disabled={processingPayment}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Mark Payment Received ({selectedAds.length})
                </>
              )}
            </button>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="sr-only">Select</span>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franchise
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franchisor
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
                {ads.map((ad) => (
                  <tr key={ad.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedAds.includes(ad.id)}
                        onChange={() => handleSelectAd(ad.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {ad.franchise?.name || 'Unknown Franchise'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {ad.franchise?.franchisor?.company_name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ad.start_date).toLocaleDateString()} - {new Date(ad.end_date).toLocaleDateString()}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      £{ad.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {ads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                      No featured ads found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAds}
        selectedAds={ads.filter(ad => selectedAds.includes(ad.id))}
      />
    </AdminLayout>
  );
}