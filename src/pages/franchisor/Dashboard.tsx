import React, { useEffect, useState } from 'react';
import { Eye, MousePointerClick, MessageSquare, Calendar, Store, User, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FranchisorLayout from '../../components/FranchisorLayout';

interface AdMetrics {
  totalViews: number;
  totalClicks: number;
  totalRequests: number;
  recentMetrics: {
    date: string;
    views: number;
    clicks: number;
    requests: number;
  }[];
}

interface ActivityItem {
  id: string;
  type: 'lead' | 'view' | 'click' | 'request_info';
  franchiseName: string;
  details: string;
  timestamp: string;
}

export default function FranchisorDashboard() {
  const [adMetrics, setAdMetrics] = useState<AdMetrics>({
    totalViews: 0,
    totalClicks: 0,
    totalRequests: 0,
    recentMetrics: []
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdMetrics();
    fetchRecentActivity();
  }, []);

  const fetchAdMetrics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get all active featured ads for this franchisor
    const { data: ads } = await supabase
      .from('featured_ads')
      .select('id, franchise_id')
      .eq('status', 'active')
      .eq('payment_status', 'completed');

    if (!ads || ads.length === 0) return;

    const adIds = ads.map(ad => ad.id);

    // Get total metrics
    const { data: metrics } = await supabase
      .from('ad_metrics')
      .select('metric_type, created_at')
      .in('ad_id', adIds)
      .order('created_at', { ascending: false });

    if (!metrics) return;

    // Calculate totals
    const totalViews = metrics.filter(m => m.metric_type === 'view').length;
    const totalClicks = metrics.filter(m => m.metric_type === 'click').length;
    const totalRequests = metrics.filter(m => m.metric_type === 'request_info').length;

    // Calculate daily metrics for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    });

    const recentMetrics = last7Days.map(date => {
      const dayMetrics = metrics.filter(m => 
        m.created_at.startsWith(date)
      );

      return {
        date,
        views: dayMetrics.filter(m => m.metric_type === 'view').length,
        clicks: dayMetrics.filter(m => m.metric_type === 'click').length,
        requests: dayMetrics.filter(m => m.metric_type === 'request_info').length
      };
    });

    setAdMetrics({
      totalViews,
      totalClicks,
      totalRequests,
      recentMetrics
    });
  };

  const fetchRecentActivity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch recent leads
      const { data: leads } = await supabase
        .from('franchise_leads')
        .select(`
          id,
          created_at,
          franchise:franchises(name)
        `)
        .eq('franchisor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent ad metrics
      const { data: metrics } = await supabase
        .from('ad_metrics')
        .select(`
          id,
          metric_type,
          created_at,
          ad:featured_ads(
            franchise:franchises(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Combine and format activities
      const activities: ActivityItem[] = [];

      if (leads) {
        leads.forEach(lead => {
          activities.push({
            id: `lead-${lead.id}`,
            type: 'lead',
            franchiseName: lead.franchise?.name || 'Unknown Franchise',
            details: 'New lead received',
            timestamp: lead.created_at
          });
        });
      }

      if (metrics) {
        metrics.forEach(metric => {
          const franchiseName = metric.ad?.franchise?.name || 'Unknown Franchise';
          let details = '';
          switch (metric.metric_type) {
            case 'view':
              details = 'Franchise listing viewed';
              break;
            case 'click':
              details = 'Franchise details clicked';
              break;
            case 'request_info':
              details = 'Information requested';
              break;
          }

          activities.push({
            id: `metric-${metric.id}`,
            type: metric.metric_type,
            franchiseName,
            details,
            timestamp: metric.created_at
          });
        });
      }

      // Sort by timestamp and take the most recent 10
      activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lead':
        return User;
      case 'view':
        return Eye;
      case 'click':
        return MousePointerClick;
      case 'request_info':
        return MessageSquare;
      default:
        return Store;
    }
  };

  const adMetricCards = [
    {
      name: 'Total Views',
      value: adMetrics.totalViews,
      icon: Eye,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      name: 'Total Clicks',
      value: adMetrics.totalClicks,
      icon: MousePointerClick,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
    },
    {
      name: 'Information Requests',
      value: adMetrics.totalRequests,
      icon: MessageSquare,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100'
    }
  ];

  return (
    <FranchisorLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

        {/* Ad Performance Section */}
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900">Featured Ad Performance</h2>
          
          {/* Ad Metrics Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {adMetricCards.map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.name}
                  className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
                >
                  <dt>
                    <div className={`absolute rounded-md p-3 ${metric.bgColor}`}>
                      <Icon className={`h-6 w-6 ${metric.color}`} />
                    </div>
                    <p className="ml-16 text-sm font-medium text-gray-500 truncate">
                      {metric.name}
                    </p>
                  </dt>
                  <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                    <p className="text-2xl font-semibold text-gray-900">
                      {metric.value}
                    </p>
                  </dd>
                </div>
              );
            })}
          </div>

          {/* Recent Performance Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Last 7 Days Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clicks
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Information Requests
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adMetrics.recentMetrics.map((day) => (
                    <tr key={day.date}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {day.views}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {day.clicks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {day.requests}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Activity
            </h3>
            <div className="mt-4">
              {loading ? (
                <div className="flex justify-center py-4">
                  <TrendingUp className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {recentActivity.map((activity, index) => {
                      const Icon = getActivityIcon(activity.type);
                      return (
                        <li key={activity.id}>
                          <div className="relative pb-8">
                            {index !== recentActivity.length - 1 && (
                              <span
                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                aria-hidden="true"
                              />
                            )}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center ring-8 ring-white">
                                  <Icon className="h-4 w-4 text-indigo-600" />
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-500">
                                    {activity.details} for{' '}
                                    <span className="font-medium text-gray-900">
                                      {activity.franchiseName}
                                    </span>
                                  </p>
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                  <time dateTime={activity.timestamp}>
                                    {new Date(activity.timestamp).toLocaleString()}
                                  </time>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent activity to display
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </FranchisorLayout>
  );
}