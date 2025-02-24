import React, { useEffect, useState } from 'react';
import { supabase, adminSupabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { Check, X, Loader2 } from 'lucide-react';

interface PendingAccount {
  id: string;
  full_name: string;
  email: string;
  company_name: string;
  created_at: string;
}

export default function AdminAccountApprovals() {
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPendingAccounts();
  }, []);

  const fetchPendingAccounts = async () => {
    try {
      console.log('Fetching pending accounts...');
      
      // First get all pending franchisor profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'franchisor')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Fetched pending profiles:', profiles);

      if (!profiles) {
        setPendingAccounts([]);
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

      // Combine profile data with emails
      const accountsWithEmails = profiles.map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        email: emailMap.get(profile.id) || 'N/A',
        company_name: profile.company_name || 'N/A',
        created_at: profile.created_at
      }));

      console.log('Final pending accounts:', accountsWithEmails);
      setPendingAccounts(accountsWithEmails);
    } catch (err: any) {
      console.error('Error in fetchPendingAccounts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (accountId: string, approved: boolean) => {
    setProcessingId(accountId);
    try {
      console.log(`Processing account ${accountId}, approved: ${approved}`);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          status: approved ? 'approved' : 'rejected',
          approved_at: approved ? new Date().toISOString() : null
        })
        .eq('id', accountId);

      if (updateError) {
        console.error('Error updating account:', updateError);
        throw updateError;
      }

      console.log('Account processed successfully');
      
      // Refresh the list
      await fetchPendingAccounts();
    } catch (err: any) {
      console.error('Error processing account:', err);
      setError(err.message);
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
        <h1 className="text-2xl font-semibold text-gray-900">Account Approvals</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                    Requested
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingAccounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.company_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(account.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproval(account.id, true)}
                          disabled={processingId === account.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          title="Approve"
                        >
                          {processingId === account.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Check className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleApproval(account.id, false)}
                          disabled={processingId === account.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Reject"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingAccounts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No pending accounts found
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