import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, adminSupabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { Loader2, AlertCircle, Trash2 } from 'lucide-react';

interface FranchisorAccount {
  id: string;
  full_name: string;
  company_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  franchise_count: number;
  email: string;
  categories: string[];
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedAccounts: FranchisorAccount[];
}

function DeleteModal({ isOpen, onClose, onConfirm, selectedAccounts }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Account Deletion</h3>
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete the following account{selectedAccounts.length > 1 ? 's' : ''}?
          </p>
          <ul className="mt-2 space-y-1">
            {selectedAccounts.map(account => (
              <li key={account.id} className="text-sm text-gray-700">
                • {account.company_name} ({account.email})
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-red-600 font-medium">
            This action cannot be undone. All associated franchises and data will be permanently deleted.
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
            Delete Account{selectedAccounts.length > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAccounts() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<FranchisorAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      console.log('Fetching franchisor accounts...');
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, status, created_at')
        .eq('user_type', 'franchisor');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Fetched profiles:', profiles);

      if (!profiles || profiles.length === 0) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      // Get all users from auth admin API
      const { data: authData, error: authError } = await adminSupabase
        .auth.admin.listUsers();

      if (authError) {
        console.error('Error fetching auth users:', authError);
        throw authError;
      }

      // Create a map of user IDs to emails
      const emailMap = new Map(authData.users.map(user => [user.id, user.email]));

      // Get franchise counts and categories for each profile
      const accountsWithDetails = await Promise.all(
        profiles.map(async (profile) => {
          // Get franchise count
          const { count } = await supabase
            .from('franchises')
            .select('*', { count: 'exact', head: true })
            .eq('franchisor_id', profile.id);

          // Get unique categories for franchisor's franchises
          const { data: categoryData } = await supabase
            .from('franchises')
            .select(`
              franchise_category_mappings (
                category:franchise_categories(name)
              )
            `)
            .eq('franchisor_id', profile.id);

          // Extract unique category names
          const categories = Array.from(new Set(
            categoryData?.flatMap(franchise => 
              franchise.franchise_category_mappings.map(mapping => mapping.category.name)
            ) || []
          ));

          return {
            ...profile,
            franchise_count: count || 0,
            email: emailMap.get(profile.id) || 'N/A',
            categories
          };
        })
      );

      console.log('Final accounts data:', accountsWithDetails);
      setAccounts(accountsWithDetails);
    } catch (err: any) {
      console.error('Error in fetchAccounts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccounts = async () => {
    setDeleting(true);
    try {
      for (const accountId of selectedAccounts) {
        // Delete auth user
        const { error: authError } = await adminSupabase
          .auth.admin.deleteUser(accountId);

        if (authError) throw authError;

        // Profile and related data will be deleted automatically through RLS policies and cascade deletes
      }

      // Refresh the accounts list
      await fetchAccounts();
      setSelectedAccounts([]);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Error deleting accounts:', err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      }
      return [...prev, accountId];
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
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
          <h1 className="text-2xl font-semibold text-gray-900">Franchisor Accounts</h1>
          {selectedAccounts.length > 0 && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedAccounts.length})
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
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
                    Company Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categories
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franchises
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedAccounts.includes(account.id)}
                        onChange={() => handleSelectAccount(account.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/admin/franchisor/${account.id}/franchises`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {account.company_name || 'N/A'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.email}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {account.categories.length > 0 ? (
                          account.categories.map((category, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                            >
                              {category}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No categories</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/admin/franchisor/${account.id}/franchises`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {account.franchise_count}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(account.status)}`}>
                        {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(account.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                      No franchisor accounts found
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
        onConfirm={handleDeleteAccounts}
        selectedAccounts={accounts.filter(account => selectedAccounts.includes(account.id))}
      />
    </AdminLayout>
  );
}