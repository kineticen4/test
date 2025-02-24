import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import FranchisorLayout from '../../components/FranchisorLayout';
import { Loader2, Star, Mail, Phone, Calendar, CheckCircle2, XCircle, Eye } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  created_at: string;
  franchise: {
    name: string;
  };
}

interface LeadDetailsModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

function LeadDetailsModal({ lead, isOpen, onClose }: LeadDetailsModalProps) {
  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Lead Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Franchise</h3>
              <p className="mt-1 text-sm text-gray-900">{lead.franchise.name}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Contact Information</h3>
              <div className="mt-1 space-y-1">
                <p className="text-sm text-gray-900">{lead.name}</p>
                <div className="flex items-center space-x-4">
                  <a href={`mailto:${lead.email}`} className="flex items-center text-sm text-indigo-600 hover:text-indigo-900">
                    <Mail className="h-4 w-4 mr-1" />
                    {lead.email}
                  </a>
                  <a href={`tel:${lead.phone}`} className="flex items-center text-sm text-indigo-600 hover:text-indigo-900">
                    <Phone className="h-4 w-4 mr-1" />
                    {lead.phone}
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Message</h3>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{lead.message}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Date Submitted</h3>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(lead.created_at).toLocaleString()}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <p className="mt-1 text-sm text-gray-900 capitalize">{lead.status}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('franchise_leads')
        .select(`
          *,
          franchise:franchises(name)
        `)
        .eq('franchisor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setLeads(data);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('franchise_leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      // Update local state
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));
    } catch (err: any) {
      console.error('Error updating lead status:', err);
      setError(err.message);
    }
  };

  const handleViewLead = async (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);

    // If the lead is new, mark it as contacted
    if (lead.status === 'new') {
      await updateLeadStatus(lead.id, 'contacted');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'converted':
        return 'bg-indigo-100 text-indigo-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLeads = selectedStatus === 'all' 
    ? leads 
    : leads.filter(lead => lead.status === selectedStatus);

  const stats = [
    {
      name: 'Total Leads',
      value: leads.length,
      icon: Star,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'New',
      value: leads.filter(l => l.status === 'new').length,
      icon: Mail,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      name: 'Qualified',
      value: leads.filter(l => l.status === 'qualified').length,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Converted',
      value: leads.filter(l => l.status === 'converted').length,
      icon: CheckCircle2,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    }
  ];

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
          <h1 className="text-2xl font-semibold text-gray-900">Lead Management</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
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
                </dd>
              </div>
            );
          })}
        </div>

        {/* Filter */}
        <div className="bg-white p-4 shadow rounded-lg">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Filter by Status:
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="all">All Leads</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        </div>

        {/* Leads List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franchise
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className={lead.status === 'new' ? 'bg-blue-50' : undefined}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => handleViewLead(lead)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <select
                          value={lead.status}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="qualified">Qualified</option>
                          <option value="converted">Converted</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                      <div className="flex items-center space-x-4 mt-1">
                        <a href={`mailto:${lead.email}`} className="flex items-center text-sm text-gray-500 hover:text-indigo-600">
                          <Mail className="h-4 w-4 mr-1" />
                          {lead.email}
                        </a>
                        <a href={`tel:${lead.phone}`} className="flex items-center text-sm text-gray-500 hover:text-indigo-600">
                          <Phone className="h-4 w-4 mr-1" />
                          {lead.phone}
                        </a>
                      </div>
                      <div className="mt-2 text-sm text-gray-500 line-clamp-2">
                        {lead.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.franchise.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(lead.status)}`}>
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No leads found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <LeadDetailsModal
        lead={selectedLead}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLead(null);
        }}
      />
    </FranchisorLayout>
  );
}