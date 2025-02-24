import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Building2, MapPin, DollarSign, Store, Loader2, Star } from 'lucide-react';
import MainHeader from '../components/MainHeader';

interface FranchiseDetails {
  id: string;
  name: string;
  location: string;
  franchisor_id: string;
  details: {
    short_description: string;
    long_description: string;
    investment_amount: number;
    main_image_url: string;
  };
  categories: {
    category: {
      id: string;
      name: string;
    };
  }[];
  gallery: {
    image_url: string;
  }[];
  testimonials: {
    author_name: string;
    content: string;
  }[];
  success_stories: {
    title: string;
    content: string;
    image_url: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
}

interface FeaturedAd {
  id: string;
  franchise: {
    id: string;
    name: string;
    location: string;
    details: {
      short_description: string | null;
      investment_amount: number;
      main_image_url: string | null;
    } | null;
  } | null;
}

type TabType = 'gallery' | 'testimonials' | 'success-stories';

export default function FranchiseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [franchise, setFranchise] = useState<FranchiseDetails | null>(null);
  const [featuredAds, setFeaturedAds] = useState<FeaturedAd[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('gallery');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showTabContent, setShowTabContent] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  useEffect(() => {
    fetchFranchiseDetails();
  }, [id]);

  const fetchFranchiseDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('franchises')
        .select(`
          *,
          details:franchise_details(*),
          categories:franchise_category_mappings(
            category:franchise_categories(*)
          ),
          gallery:franchise_gallery(*),
          testimonials:franchise_testimonials(*),
          success_stories:franchise_success_stories(*),
          faqs:franchise_faqs(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return;
      
      setFranchise(data);
      
      // Set default message only if we have franchise data
      setFormData(prev => ({
        ...prev,
        message: `I am interested in learning more about ${data.name}.`
      }));

      // Fetch featured ads in the same category
      if (data.categories?.[0]?.category?.id) {
        const { data: featuredAdsData } = await supabase
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
          .gte('end_date', new Date().toISOString());

        if (featuredAdsData) {
          // Filter out any ads with null franchise data
          const validAds = featuredAdsData.filter(ad => 
            ad.franchise && 
            ad.franchise.details && 
            ad.franchise.name && 
            ad.franchise.location
          );
          setFeaturedAds(validAds);
        }
      }
    } catch (error) {
      console.error('Error fetching franchise details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!franchise) return;
    
    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('franchise_leads')
        .insert({
          franchise_id: franchise.id,
          franchisor_id: franchise.franchisor_id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message
        });

      if (error) throw error;

      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: ''
      });
    } catch (err: any) {
      console.error('Error submitting lead:', err);
      setError('Failed to submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { id: TabType; name: string }[] = [
    { id: 'gallery', name: 'Gallery' },
    { id: 'testimonials', name: 'Testimonials' },
    { id: 'success-stories', name: 'Success Stories' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <MainHeader />
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (!franchise) {
    return (
      <div className="min-h-screen bg-gray-100">
        <MainHeader />
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-gray-500">Franchise not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <MainHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative">
          <div className="h-96 w-full overflow-hidden">
            {franchise.details?.main_image_url ? (
              <img
                src={franchise.details.main_image_url}
                alt={franchise.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <Store className="h-20 w-20 text-gray-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">{franchise.name}</h1>
                <p className="text-xl md:text-2xl">{franchise.details?.short_description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg overflow-hidden">
                {/* Tabs Section - Moved to top */}
                <div className="border-b border-gray-200">
                  <nav className="flex">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setShowTabContent(true);
                        }}
                        className={`
                          flex-1 text-center py-4 px-1 border-b-2 font-medium text-sm
                          ${activeTab === tab.id && showTabContent
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }
                        `}
                      >
                        {tab.name}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                {showTabContent && (
                  <div className="p-6">
                    {activeTab === 'gallery' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {franchise.gallery?.map((item, index) => (
                          <div key={index} className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
                            <img
                              src={item.image_url}
                              alt={`Gallery image ${index + 1}`}
                              className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'testimonials' && (
                      <div className="grid gap-6 md:grid-cols-2">
                        {franchise.testimonials?.map((testimonial, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-6">
                            <div className="text-gray-600 italic mb-4">{testimonial.content}</div>
                            <div className="font-medium text-gray-900">- {testimonial.author_name}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'success-stories' && (
                      <div className="space-y-8">
                        {franchise.success_stories?.map((story, index) => (
                          <div key={index} className="bg-white rounded-lg overflow-hidden">
                            {story.image_url && (
                              <img
                                src={story.image_url}
                                alt={story.title}
                                className="w-full h-64 object-cover"
                              />
                            )}
                            <div className="p-6">
                              <h3 className="text-xl font-semibold text-gray-900 mb-4">{story.title}</h3>
                              <p className="text-gray-600">{story.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Franchise Details Section */}
                <div className="border-t border-gray-200 p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Franchise Details</h2>
                  <div className="space-y-4">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-5 w-5 mr-3 text-indigo-600" />
                      <span>{franchise.location}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="h-5 w-5 mr-3 text-indigo-600" />
                      <span>Investment: £{franchise.details?.investment_amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Building2 className="h-5 w-5 mr-3 text-indigo-600" />
                      <span>{franchise.categories?.map(c => c.category.name).join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* About Section */}
                <div className="border-t border-gray-200 p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">About {franchise.name}</h2>
                  <div className="prose max-w-none">
                    <p className="text-gray-600 leading-relaxed">{franchise.details?.long_description}</p>
                  </div>
                </div>

                {/* FAQs Section */}
                {franchise.faqs && franchise.faqs.length > 0 && (
                  <div className="border-t border-gray-200 p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
                    <dl className="space-y-6">
                      {franchise.faqs.map((faq, index) => (
                        <div key={index} className="bg-gray-50 p-6 rounded-lg">
                          <dt className="text-lg font-medium text-gray-900">{faq.question}</dt>
                          <dd className="mt-2 text-gray-600">{faq.answer}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Request Information Form */}
                <div className="border-t border-gray-200 p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Request Information</h2>
                  {success ? (
                    <div className="bg-green-50 text-green-800 p-4 rounded-md">
                      Thank you for your interest! We'll be in touch with you shortly.
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="max-w-2xl">
                      {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
                          {error}
                        </div>
                      )}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Your Name
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Email Address
                          </label>
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Message
                          </label>
                          <textarea
                            required
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            rows={4}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full md:w-auto flex justify-center items-center py-2 px-8 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                              Sending...
                            </>
                          ) : (
                            'Submit Request'
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar - Only Featured Ads */}
            <div className="lg:col-span-1">
              {featuredAds.length > 0 && (
                <div className="bg-white rounded-lg p-6 shadow-sm sticky top-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Featured Opportunities
                  </h3>
                  <div className="space-y-4">
                    {featuredAds.map((ad) => {
                      if (!ad.franchise?.details) return null;

                      return (
                        <div key={ad.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                          {/* Image Section */}
                          <div className="h-48 w-full overflow-hidden">
                            {ad.franchise.details.main_image_url ? (
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

                          {/* Content Section */}
                          <div className="p-4">
                            <div className="flex items-center mb-2">
                              <Star className="h-4 w-4 text-yellow-400 mr-2" />
                              <h4 className="font-medium text-gray-900">{ad.franchise.name}</h4>
                            </div>
                            
                            {ad.franchise.details.short_description && (
                              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                {ad.franchise.details.short_description}
                              </p>
                            )}

                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                              <span>{ad.franchise.location}</span>
                            </div>

                            <div className="flex items-center text-sm text-gray-600">
                              <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                              <span>Investment: £{ad.franchise.details.investment_amount.toLocaleString()}</span>
                            </div>

                            <button
                              onClick={() => navigate(`/franchise/${ad.franchise.id}`)}
                              className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}