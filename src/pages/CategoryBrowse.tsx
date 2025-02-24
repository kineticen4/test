import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MainHeader from '../components/MainHeader';
import FranchiseCard from '../components/FranchiseCard';
import RequestInfoModal from '../components/RequestInfoModal';
import { Loader2, Building2 } from 'lucide-react';

interface Franchise {
  id: string;
  name: string;
  location: string;
  details: {
    short_description: string | null;
    investment_amount: number;
    main_image_url: string | null;
  } | null;
  category?: {
    name: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

export default function CategoryBrowse() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFranchises, setSelectedFranchises] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategoryAndFranchises();
  }, [categoryId]);

  const fetchCategoryAndFranchises = async () => {
    try {
      setLoading(true);
      
      // Fetch category details
      const { data: categoryData, error: categoryError } = await supabase
        .from('franchise_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (categoryError) throw categoryError;
      setCategory(categoryData);

      // Fetch franchises in this category
      const { data: franchisesData, error: franchisesError } = await supabase
        .from('franchises')
        .select(`
          id,
          name,
          location,
          details:franchise_details(
            short_description,
            investment_amount,
            main_image_url
          ),
          categories:franchise_category_mappings!inner(
            category:franchise_categories!inner(
              name
            )
          )
        `)
        .eq('franchise_category_mappings.category_id', categoryId)
        .eq('status', 'approved');

      if (franchisesError) throw franchisesError;
      
      if (franchisesData) {
        const formattedFranchises = franchisesData.map(franchise => ({
          ...franchise,
          category: franchise.categories?.[0]?.category || null
        }));
        setFranchises(formattedFranchises);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestInfo = (franchiseId: string) => {
    setSelectedFranchises(prev => {
      if (prev.includes(franchiseId)) {
        return prev.filter(id => id !== franchiseId);
      }
      return [...prev, franchiseId];
    });
  };

  const handleSubmitRequest = async (formData: {
    name: string;
    email: string;
    phone: string;
    message: string;
  }) => {
    setIsModalOpen(false);
    setSelectedFranchises([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <MainHeader />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <MainHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <Building2 className="h-6 w-6 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              {category?.name || 'Category'}
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Browse available franchise opportunities in {category?.name.toLowerCase()}.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Franchises Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {franchises.length > 0 ? (
            franchises.map((franchise) => (
              <FranchiseCard
                key={franchise.id}
                franchise={franchise}
                onRequestInfo={handleRequestInfo}
                isSelected={selectedFranchises.includes(franchise.id)}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No franchises found</h3>
              <p className="mt-1 text-sm text-gray-500">
                There are no franchises available in this category at the moment.
              </p>
            </div>
          )}
        </div>

        {/* Request Info Panel */}
        {selectedFranchises.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="text-gray-900">
                You have selected <span className="font-semibold">{selectedFranchises.length}</span> franchise{selectedFranchises.length === 1 ? '' : 's'}
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Request Information →
              </button>
            </div>
          </div>
        )}

        {/* Request Info Modal */}
        <RequestInfoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedFranchises={franchises.filter(f => selectedFranchises.includes(f.id))}
          onSubmit={handleSubmitRequest}
        />
      </main>
    </div>
  );
}