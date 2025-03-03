import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Store, LayoutDashboard, Users, Building2, UserCheck, ClipboardCheck, MessageCircle, Megaphone, Settings } from 'lucide-react';
import UserMenu from './UserMenu';
import { supabase } from '../lib/supabase';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface PendingCounts {
  accounts: number;
  franchises: number;
  messages: number;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const [pendingCounts, setPendingCounts] = React.useState<PendingCounts>({
    accounts: 0,
    franchises: 0,
    messages: 0
  });
  const [isAdvertisingOpen, setIsAdvertisingOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchPendingCounts = async () => {
      // Fetch pending accounts count
      const { count: pendingAccounts } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('user_type', 'franchisor');

      // Fetch pending franchises count
      const { count: pendingFranchises } = await supabase
        .from('franchises')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch unread messages count
      const { count: unreadMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .eq('receiver_id', (await supabase.auth.getUser()).data.user?.id);

      setPendingCounts({
        accounts: pendingAccounts || 0,
        franchises: pendingFranchises || 0,
        messages: unreadMessages || 0
      });
    };

    fetchPendingCounts();
  }, []);

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin/dashboard'
    },
    {
      name: 'Accounts',
      icon: Users,
      path: '/admin/accounts'
    },
    {
      name: 'Account Approvals',
      icon: UserCheck,
      path: '/admin/account-approvals',
      badge: pendingCounts.accounts > 0 ? pendingCounts.accounts : undefined
    },
    {
      name: 'Franchise Approvals',
      icon: ClipboardCheck,
      path: '/admin/franchise-approvals',
      badge: pendingCounts.franchises > 0 ? pendingCounts.franchises : undefined
    },
    {
      name: 'Messages',
      icon: MessageCircle,
      path: '/admin/messages',
      badge: pendingCounts.messages > 0 ? pendingCounts.messages : undefined
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold">Admin Portal</span>
            </div>
            <div className="flex items-center">
              <UserMenu userType="admin" />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <div className="w-64 min-h-screen bg-white shadow-sm">
          <nav className="mt-5 px-2">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon
                        className={`mr-3 h-5 w-5 ${
                          isActive
                            ? 'text-indigo-700'
                            : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      {item.name}
                    </div>
                    {item.badge && (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Advertising Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsAdvertisingOpen(!isAdvertisingOpen)}
                  className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    location.pathname.startsWith('/admin/advertising')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Megaphone
                    className={`mr-3 h-5 w-5 ${
                      location.pathname.startsWith('/admin/advertising')
                        ? 'text-indigo-700'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  Advertising
                </button>
                {isAdvertisingOpen && (
                  <div className="pl-10 space-y-1 mt-1">
                    <Link
                      to="/admin/advertising/featured"
                      className={`block px-2 py-2 text-sm font-medium rounded-md ${
                        location.pathname === '/admin/advertising/featured'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      Featured Ads
                    </Link>
                    <Link
                      to="/admin/advertising/banners"
                      className={`block px-2 py-2 text-sm font-medium rounded-md ${
                        location.pathname === '/admin/advertising/banners'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      Banner Ads
                    </Link>
                    <Link
                      to="/admin/advertising/settings"
                      className={`block px-2 py-2 text-sm font-medium rounded-md ${
                        location.pathname === '/admin/advertising/settings'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>

        <div className="flex-1 min-w-0 bg-white">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}