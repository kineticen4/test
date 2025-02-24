import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { Loader2, Store, ArrowLeft } from 'lucide-react';

interface Franchise {
  id: string;
  name: string;
  location: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  details: {
    short_description: string | null;
    investment_amount: number;
    main_image_url: string | null;
  } | null;
  categories: {
    category: {
      name: string;
    };
  }[];
}

interface Franchisor {
  company_name: string;
  full_name: string;
}

export default function FranchisorFranchises() {
  const { franchisorId } = useParams();
  const navigate = useNavigate();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [franchisor, setFranchisor] = useState<Franchisor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [franchisorId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch franchisor details - removed email from select since it's not in the profiles table
      const { data: franchisorData, error: franchisorError } = await supabase
        .from('profiles')
        .select('company_name, full_name')
        .eq('id', franchisorId)
        .single();

      if (franchisorError) throw franchisorError;
      setFranchisor(franchisorData);

      // Fetch franchises with details and categories
      const { data: franchisesData, error: franchisesError } = await supabase
        .from('franchises')
        .select(`
          *,
          details:franchise_details(
            short_description,
            investment_amount,
            main_image_url
          ),
          categories:franchise_category_mappings(
            category:franchise_categories(name)
          )
        `)
        .eq('franchisor_id', franchisorId)
        .order('created_at', { ascending: false });

      if (franchisesError) throw franchisesError;
      setFranchises(franchisesData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/admin/accounts')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Accounts
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {franchisor?.company_name}'s Franchises
              </h1>
              <div className="mt-1 text-sm text-gray-500">
                Contact: {franchisor?.full_name}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Franchises Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {franchises.map((franchise) => (
            <div
              key={franchise.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Franchise Image */}
              <div className="h-48 w-full overflow-hidden bg-gray-100">
                {franchise.details?.main_image_url ? (
                  <img
                    src={franchise.details.main_image_url}
                    alt={franchise.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Store className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-gray-900">
                    {franchise.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(franchise.status)}`}>
                    {franchise.status.charAt(0).toUpperCase() + franchise.status.slice(1)}
                  </span>
                </div>

                <p className="mt-2 text-sm text-gray-500">
                  {franchise.details?.short_description || 'No description available'}
                </p>

                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <span className="font-medium text-gray-900">
                    £{franchise.details?.investment_amount?.toLocaleString() || 'N/A'}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{franchise.location}</span>
                </div>

                {/* Categories */}
                {franchise.categories && franchise.categories.length > 0 && (
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-1">
                      {franchise.categories.map((cat, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                        >
                          {cat.category.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={() => navigate(`/admin/franchise/${franchise.id}`)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}

          {franchises.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <Store className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No franchises</h3>
              <p className="mt-1 text-sm text-gray-500">
                This franchisor hasn't added any franchises yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}