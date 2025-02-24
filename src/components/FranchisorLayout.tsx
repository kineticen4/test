import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Store, LayoutDashboard, Plus, ListFilter, MessageCircle, Megaphone, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import UserMenu from './UserMenu';

interface FranchisorLayoutProps {
  children: React.ReactNode;
}

interface NotificationCounts {
  leads: number;
  messages: number;
  support: number;
}

export default function FranchisorLayout({ children }: FranchisorLayoutProps) {
  const location = useLocation();
  const [isAdvertisingOpen, setIsAdvertisingOpen] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>({
    leads: 0,
    messages: 0,
    support: 0
  });

  useEffect(() => {
    fetchNotificationCounts();
    
    // Set up real-time subscriptions
    const leadsSubscription = supabase
      .channel('leads-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'franchise_leads'
      }, () => {
        fetchNotificationCounts();
      })
      .subscribe();

    const messagesSubscription = supabase
      .channel('messages-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {
        fetchNotificationCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadsSubscription);
      supabase.removeChannel(messagesSubscription);
    };
  }, []);

  const fetchNotificationCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get new leads count
      const { count: newLeads } = await supabase
        .from('franchise_leads')
        .select('*', { count: 'exact', head: true })
        .eq('franchisor_id', user.id)
        .eq('status', 'new');

      // Get unread messages count (including support messages)
      const { count: unreadMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false);

      setNotificationCounts({
        leads: newLeads || 0,
        messages: 0, // Not used currently
        support: unreadMessages || 0 // All messages are treated as support messages for now
      });
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  };

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/franchisor/dashboard'
    },
    {
      name: 'Add Franchise',
      icon: Plus,
      path: '/franchisor/add-franchise'
    },
    {
      name: 'My Franchises',
      icon: ListFilter,
      path: '/franchisor/franchises'
    },
    {
      name: 'Leads',
      icon: Users,
      path: '/franchisor/leads',
      badge: notificationCounts.leads
    },
    {
      name: 'Support',
      icon: MessageCircle,
      path: '/franchisor/support',
      badge: notificationCounts.support
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
              <span className="ml-2 text-xl font-semibold">Franchisor Portal</span>
            </div>
            <div className="flex items-center">
              <UserMenu userType="franchisor" />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Left Sidebar */}
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
                    {item.badge > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
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
                    location.pathname.startsWith('/franchisor/advertising')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Megaphone
                    className={`mr-3 h-5 w-5 ${
                      location.pathname.startsWith('/franchisor/advertising')
                        ? 'text-indigo-700'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  Advertising
                </button>
                {isAdvertisingOpen && (
                  <div className="pl-10 space-y-1 mt-1">
                    <Link
                      to="/franchisor/advertising/featured"
                      className={`block px-2 py-2 text-sm font-medium rounded-md ${
                        location.pathname === '/franchisor/advertising/featured'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      Featured Ads
                    </Link>
                    <Link
                      to="/franchisor/advertising/banners"
                      className={`block px-2 py-2 text-sm font-medium rounded-md ${
                        location.pathname === '/franchisor/advertising/banners'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      Banner Ads
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 bg-white">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}