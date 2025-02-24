import React, { useEffect, useState } from 'react';
import { Clock, Users, Building2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';

interface LoginActivity {
  id: string;
  full_name: string;
  company_name: string;
  last_login: string;
}

interface DashboardStats {
  pendingAccounts: number;
  pendingFranchises: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingAccounts: 0,
    pendingFranchises: 0
  });
  const [loginActivity, setLoginActivity] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch pending accounts count
        const { count: pendingAccounts } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Fetch pending franchises count
        const { count: pendingFranchises } = await supabase
          .from('franchises')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Fetch login activity
        const { data: activity } = await supabase
          .from('profiles')
          .select('id, full_name, company_name, last_login')
          .eq('user_type', 'franchisor')
          .order('last_login', { ascending: false })
          .limit(10);

        if (activity) {
          setLoginActivity(activity);
        }

        setStats({
          pendingAccounts: pendingAccounts || 0,
          pendingFranchises: pendingFranchises || 0
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      name: 'Pending Account Approvals',
      value: stats.pendingAccounts,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Pending Franchise Approvals',
      value: stats.pendingFranchises,
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.name}
                className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
              >
                <dt>
                  <div className={`absolute rounded-md p-3 ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <p className="ml-16 text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </p>
                </dt>
                <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                  <p className="text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </p>
                  {stat.value > 0 && (
                    <div className="ml-2">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    </div>
                  )}
                </dd>
              </div>
            );
          })}
        </div>

        {/* Login Activity Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Franchisor Login Activity
            </h3>
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
                      Last Login
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loginActivity.map((activity) => (
                    <tr key={activity.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {activity.company_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activity.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activity.last_login ? (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                            {new Date(activity.last_login).toLocaleString()}
                          </div>
                        ) : (
                          'Never'
                        )}
                      </td>
                    </tr>
                  ))}
                  {loginActivity.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                        No login activity found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}