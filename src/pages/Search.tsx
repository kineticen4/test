import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MainHeader from '../components/MainHeader';
import FranchiseCard from '../components/FranchiseCard';
import RequestInfoModal from '../components/RequestInfoModal';
import { Loader2, Building2, Search as SearchIcon, ChevronDown, Star, MapPin, DollarSign, Store } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

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

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mainCategory, setMainCategory] = useState<Category | null>(null);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFranchises, setSelectedFranchises] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [featuredAds, setFeaturedAds] = useState<any[]>([]);

  const categoryId = searchParams.get('category');
  const investmentRange = searchParams.get('investment');

  useEffect(() => {
    fetchAllCategories();
    fetchFranchises();
    fetchFeaturedAds();
  }, [categoryId, investmentRange]);

  const fetchAllCategories = async () => {
    try {
      // First fetch all categories
      const { data: allCategories, error: categoriesError } = await supabase
        .from('franchise_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      if (allCategories) {
        // Filter main categories (those without parent_id)
        const mainCats = allCategories.filter(cat => !cat.parent_id);
        setCategories(mainCats);

        // If we have a selected category
        if (categoryId) {
          const selectedCat = allCategories.find(cat => cat.id === categoryId);
          if (selectedCat) {
            if (selectedCat.parent_id) {
              // If selected category is a subcategory, set its parent as main category
              const parentCat = allCategories.find(cat => cat.id === selectedCat.parent_id);
              if (parentCat) {
                setMainCategory(parentCat);
                // Get all subcategories of the parent
                const subs = allCategories.filter(cat => cat.parent_id === parentCat.id);
                setSubCategories(subs);
              }
            } else {
              // If selected category is a main category
              setMainCategory(selectedCat);
              // Get its subcategories
              const subs = allCategories.filter(cat => cat.parent_id === selectedCat.id);
              setSubCategories(subs);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    }
  };

  const fetchFeaturedAds = async () => {
    try {
      const { data } = await supabase
        .from('featured_ads')
        .select(`
          id,
          franchise:franchises(
            id,
            name,
            location,
            details:franchise_details(
              short_description,
              investment_amount,
              main_image_url
            )
          )
        `)
        .eq('status', 'active')
        .eq('payment_status', 'completed')
        .gte('end_date', new Date().toISOString())
        .limit(3);

      if (data) {
        const validAds = data.filter(ad => 
          ad.franchise && 
          ad.franchise.details && 
          ad.franchise.name && 
          ad.franchise.location
        );
        setFeaturedAds(validAds);
      }
    } catch (error) {
      console.error('Error fetching featured ads:', error);
    }
  };

  const fetchFranchises = async () => {
    try {
      setLoading(true);
      
      let query = supabase
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
          categories:franchise_category_mappings(
            category:franchise_categories(name)
          )
        `)
        .eq('status', 'approved');

      if (categoryId) {
        query = query.eq('franchise_category_mappings.category_id', categoryId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (data) {
        let filteredData = data;
        if (investmentRange) {
          const [min, max] = investmentRange.split('-').map(Number);
          filteredData = data.filter(franchise => {
            const amount = franchise.details?.investment_amount || 0;
            if (max) {
              return amount >= min && amount <= max;
            } else {
              return amount >= min;
            }
          });
        }

        const formattedFranchises = filteredData.map(franchise => ({
          ...franchise,
          category: franchise.categories?.[0]?.category || null
        }));
        setFranchises(formattedFranchises);
      }
    } catch (err: any) {
      console.error('Error fetching franchises:', err);
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

  const handleInvestmentChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('investment', value);
    } else {
      params.delete('investment');
    }
    setSearchParams(params);
  };

  const handleCategoryChange = (catId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('category', catId);
    setSearchParams(params);
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

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-blue-700">
        <div className="absolute inset-0">
          <img
            className="h-full w-full object-cover mix-blend-multiply filter brightness-50"
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80"
            alt="Hero background"
          />
        </div>
        <div className="relative max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {mainCategory?.name || 'Find Your Perfect Franchise'}
          </h1>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end gap-4">
            {/* Main Category Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <div className="relative">
                <select
                  value={categoryId || ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Subcategories Filter */}
            {subCategories.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                <div className="relative">
                  <select
                    value={categoryId || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  >
                    <option value={mainCategory?.id || ''}>All {mainCategory?.name}</option>
                    {subCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Investment Range Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Investment Range</label>
              <div className="relative">
                <select
                  value={investmentRange || ''}
                  onChange={(e) => handleInvestmentChange(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                >
                  <option value="">Any Amount</option>
                  <option value="0-50000">Under £50,000</option>
                  <option value="50000-100000">£50,000 - £100,000</option>
                  <option value="100000-250000">£100,000 - £250,000</option>
                  <option value="250000-500000">£250,000 - £500,000</option>
                  <option value="500000+">£500,000+</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Search Button */}
            <button
              onClick={() => fetchFranchises()}
              className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <SearchIcon className="h-5 w-5 mr-2" />
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Featured Ads */}
          <div className="w-full lg:w-72 flex-shrink-0">
            {featuredAds.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm sticky top-4">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Star className="h-5 w-5 text-yellow-400 mr-2" />
                    Featured Opportunities
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  {featuredAds.map((ad) => (
                    <div key={ad.id} className="bg-white rounded-lg shadow-md overflow-hidden relative">
                      {/* Featured Ribbon */}
                      <div className="absolute top-4 right-0 z-10">
                        <div className="bg-yellow-400 text-yellow-900 py-1 px-4 shadow-md font-medium text-sm flex items-center transform translate-x-2">
                          <Star className="h-4 w-4 mr-1" />
                          Featured
                        </div>
                      </div>

                      {/* Image */}
                      <div className="h-40 w-full overflow-hidden">
                        {ad.franchise.details?.main_image_url ? (
                          <img
                            src={ad.franchise.details.main_image_url}
                            alt={ad.franchise.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <Store className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-medium text-gray-900 line-clamp-1 mb-2">
                          {ad.franchise.name}
                        </h3>

                        {ad.franchise.details?.short_description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {ad.franchise.details.short_description}
                          </p>
                        )}

                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="line-clamp-1">{ad.franchise.location}</span>
                        </div>

                        <div className="flex items-center text-sm text-gray-600 mb-3">
                          <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                          <span>£{ad.franchise.details?.investment_amount?.toLocaleString()}</span>
                        </div>

                        <button
                          onClick={() => navigate(`/franchise/${ad.franchise.id}`)}
                          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
                {error}
              </div>
            )}

            {/* Results Count */}
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Showing {franchises.length} result{franchises.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Franchises Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                    Try adjusting your search criteria to find more opportunities.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
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
    </div>
  );
}