import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Search, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FranchiseCard from '../components/FranchiseCard';
import RequestInfoModal from '../components/RequestInfoModal';
import MainHeader from '../components/MainHeader';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  franchise_count: number;
}

interface FeaturedFranchise {
  id: string;
  adId: string;
  name: string;
  location: string;
  franchisor_id: string;
  details: {
    short_description: string | null;
    investment_amount: number;
    main_image_url: string | null;
  } | null;
  category?: {
    name: string;
  } | null;
  featured: boolean;
}

export default function Home() {
  const navigate = useNavigate();
  const [displayCategories, setDisplayCategories] = useState<Category[]>([]); // For grid display
  const [allCategories, setAllCategories] = useState<Category[]>([]); // For dropdown
  const [selectedCategory, setSelectedCategory] = useState('');
  const [investmentRange, setInvestmentRange] = useState('');
  const [featuredFranchises, setFeaturedFranchises] = useState<FeaturedFranchise[]>([]);
  const [selectedFranchises, setSelectedFranchises] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchFeaturedFranchises();
  }, []);

  const fetchCategories = async () => {
    try {
      // First get all main categories (no parent_id)
      const { data: mainCategories, error: mainError } = await supabase
        .from('franchise_categories')
        .select('id, name')
        .is('parent_id', null)
        .order('name');

      if (mainError) throw mainError;
      if (!mainCategories) return;

      // For each main category, count the franchises
      const categoriesWithCounts = await Promise.all(
        mainCategories.map(async (category) => {
          // Get all subcategories for this main category
          const { data: subCategories } = await supabase
            .from('franchise_categories')
            .select('id')
            .eq('parent_id', category.id);

          // Create array of category IDs including main and subcategories
          const categoryIds = [category.id, ...(subCategories?.map(sub => sub.id) || [])];

          // Count franchises in all these categories
          const { count } = await supabase
            .from('franchise_category_mappings')
            .select('*', { count: 'exact', head: true })
            .in('category_id', categoryIds);

          return {
            ...category,
            franchise_count: count || 0
          };
        })
      );

      // Set all categories for the dropdown
      setAllCategories(categoriesWithCounts);
      
      // Set first 9 categories for the grid display
      setDisplayCategories(categoriesWithCounts.slice(0, 9));
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchFeaturedFranchises = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_ads')
        .select(`
          id,
          franchise:franchises!inner(
            id,
            name,
            location,
            franchisor_id,
            details:franchise_details(
              short_description,
              investment_amount,
              main_image_url
            ),
            category:franchise_category_mappings(
              category:franchise_categories(name)
            )
          )
        `)
        .eq('status', 'active')
        .eq('payment_status', 'completed')
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
    
      if (data) {
        const formattedFranchises = data.map((item) => ({
          ...item.franchise,
          adId: item.id,
          category: item.franchise.category?.[0]?.category || null,
          featured: true
        }));
        setFeaturedFranchises(formattedFranchises);
      }
    } catch (error) {
      console.error('Error fetching featured franchises:', error);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedCategory) params.append('category', selectedCategory);
    if (investmentRange) params.append('investment', investmentRange);
    navigate(`/search?${params.toString()}`);
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

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/search?category=${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <MainHeader />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-blue-700">
        <div className="absolute inset-0">
          <img
            className="w-full h-full object-cover mix-blend-multiply filter brightness-50"
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80"
            alt="Hero background"
          />
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Find Your Perfect Franchise
          </h1>
          <p className="mt-6 text-xl text-gray-100 max-w-3xl">
            Compare thousands of franchise opportunities and find the perfect business for your future.
            Start your entrepreneurial journey today.
          </p>
          
          {/* Search Filters */}
          <div className="mt-10 max-w-4xl bg-white rounded-lg shadow-lg p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <div className="mt-1 relative">
                  <select
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {allCategories.map((category) => (
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Investment Range</label>
                <div className="mt-1 relative">
                  <select
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                    value={investmentRange}
                    onChange={(e) => setInvestmentRange(e.target.value)}
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
              
              <button
                onClick={handleSearch}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Search className="h-5 w-5 mr-2" />
                Search Franchises
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Franchises */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Featured Opportunities
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Discover our hand-picked selection of premium franchise opportunities
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredFranchises.length > 0 ? (
              featuredFranchises.map((franchise) => (
                <FranchiseCard 
                  key={`featured-${franchise.adId}`}
                  franchise={franchise}
                  onRequestInfo={handleRequestInfo}
                  isSelected={selectedFranchises.includes(franchise.id)}
                />
              ))
            ) : (
              <div className="col-span-3 text-center text-gray-500">
                No featured franchises available at the moment
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Browse by Category Section */}
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Browse by Category
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Explore franchise opportunities across various industries
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {displayCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="relative group bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Store className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {category.franchise_count} {category.franchise_count === 1 ? 'franchise' : 'franchises'}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-indigo-600 group-hover:text-indigo-500">
                    View opportunities →
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button
              onClick={() => navigate('/categories')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              View All Categories
            </button>
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
        selectedFranchises={featuredFranchises.filter(f => selectedFranchises.includes(f.id))}
        onSubmit={handleSubmitRequest}
      />
    </div>
  );
}