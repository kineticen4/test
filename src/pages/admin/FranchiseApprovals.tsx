import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { Check, X, Loader2, Eye, Store } from 'lucide-react';

interface PendingFranchise {
  id: string;
  name: string;
  location: string;
  franchisor: {
    full_name: string | null;
    company_name: string | null;
  } | null;
  created_at: string;
  details: {
    short_description: string | null;
  } | null;
}

export default function AdminFranchiseApprovals() {
  const [pendingFranchises, setPendingFranchises] = useState<PendingFranchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingFranchises();
  }, []);

  const fetchPendingFranchises = async () => {
    try {
      const { data, error } = await supabase
        .from('franchises')
        .select(`
          *,
          franchisor:profiles!franchises_franchisor_id_fkey(full_name, company_name),
          details:franchise_details(short_description)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPendingFranchises(data);
    } catch (error) {
      console.error('Error fetching pending franchises:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (franchiseId: string, approved: boolean) => {
    setProcessingId(franchiseId);
    try {
      const { error } = await supabase
        .from('franchises')
        .update({ 
          status: approved ? 'approved' : 'rejected',
          approved_at: approved ? new Date().toISOString() : null
        })
        .eq('id', franchiseId);

      if (error) throw error;
      
      // Refresh the list
      await fetchPendingFranchises();
    } catch (error) {
      console.error('Error processing franchise:', error);
    } finally {
      setProcessingId(null);
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
        <h1 className="text-2xl font-semibold text-gray-900">Franchise Approvals</h1>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franchise Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franchisor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingFranchises.map((franchise) => (
                  <tr key={franchise.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{franchise.name}</div>
                      {franchise.details?.short_description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {franchise.details.short_description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {franchise.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {franchise.franchisor ? (
                        <>
                          <div className="text-sm font-medium text-gray-900">
                            {franchise.franchisor.company_name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {franchise.franchisor.full_name || 'N/A'}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">Unknown Franchisor</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(franchise.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproval(franchise.id, true)}
                          disabled={processingId === franchise.id}
                          className="text-green-600 hover:text-green-900"
                          title="Approve"
                        >
                          {processingId === franchise.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Check className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleApproval(franchise.id, false)}
                          disabled={processingId === franchise.id}
                          className="text-red-600 hover:text-red-900"
                          title="Reject"
                        >
                          <X className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {/* TODO: Implement view details */}}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingFranchises.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No pending franchises found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}