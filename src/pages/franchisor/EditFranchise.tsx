import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import FranchisorLayout from '../../components/FranchisorLayout';
import { Edit, Plus, Minus, Loader2, Store } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface FAQ {
  question: string;
  answer: string;
}

interface Testimonial {
  authorName: string;
  content: string;
}

interface SuccessStory {
  title: string;
  content: string;
  imageFile: File | null;
  existingImageUrl?: string;
}

interface FranchiseData {
  id: string;
  name: string;
  location: string;
  details?: {
    short_description: string;
    long_description: string;
    investment_amount: number;
    main_image_url: string;
  };
  categories: {
    category: {
      id: string;
      name: string;
      parent_id: string | null;
    };
  }[];
  faqs: {
    id: string;
    question: string;
    answer: string;
  }[];
  testimonials: {
    id: string;
    author_name: string;
    content: string;
  }[];
  success_stories: {
    id: string;
    title: string;
    content: string;
    image_url: string;
  }[];
}

export default function EditFranchise() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [existingMainImageUrl, setExistingMainImageUrl] = useState('');
  
  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('');
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  
  // Gallery
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [existingGalleryUrls, setExistingGalleryUrls] = useState<string[]>([]);
  
  // FAQs
  const [faqs, setFaqs] = useState<FAQ[]>([{ question: '', answer: '' }]);
  
  // Testimonials
  const [testimonials, setTestimonials] = useState<Testimonial[]>([{ authorName: '', content: '' }]);
  
  // Success Stories
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([{ title: '', content: '', imageFile: null }]);

  useEffect(() => {
    fetchFranchise();
    fetchCategories();
  }, [id]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('franchise_categories')
      .select('*')
      .order('name');
    
    if (data) {
      setCategories(data);
    }
  };

  const fetchFranchise = async () => {
    if (!id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('franchises')
        .select(`
          *,
          details:franchise_details(*),
          categories:franchise_category_mappings(
            category:franchise_categories(*)
          ),
          faqs:franchise_faqs(*),
          testimonials:franchise_testimonials(*),
          success_stories:franchise_success_stories(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (data) {
        // Set basic info
        setName(data.name);
        setLocation(data.location);
        
        // Set details
        if (data.details) {
          setShortDescription(data.details.short_description || '');
          setLongDescription(data.details.long_description || '');
          setInvestmentAmount(data.details.investment_amount?.toString() || '');
          setExistingMainImageUrl(data.details.main_image_url || '');
        }

        // Set categories
        const mainCategory = data.categories.find(c => !c.category.parent_id);
        const subCategories = data.categories.filter(c => c.category.parent_id);
        
        if (mainCategory) {
          setSelectedMainCategory(mainCategory.category.id);
        }
        
        setSelectedSubCategories(subCategories.map(c => c.category.id));

        // Set FAQs
        if (data.faqs && data.faqs.length > 0) {
          setFaqs(data.faqs.map(faq => ({
            question: faq.question,
            answer: faq.answer
          })));
        }

        // Set testimonials
        if (data.testimonials && data.testimonials.length > 0) {
          setTestimonials(data.testimonials.map(testimonial => ({
            authorName: testimonial.author_name,
            content: testimonial.content
          })));
        }

        // Set success stories
        if (data.success_stories && data.success_stories.length > 0) {
          setSuccessStories(data.success_stories.map(story => ({
            title: story.title,
            content: story.content,
            imageFile: null,
            existingImageUrl: story.image_url
          })));
        }
      }
    } catch (err: any) {
      console.error('Error fetching franchise:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Upload main image if changed
      let mainImageUrl = existingMainImageUrl;
      if (mainImageFile) {
        const fileExt = mainImageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `main-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('franchise-images')
          .upload(filePath, mainImageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('franchise-images')
          .getPublicUrl(filePath);

        mainImageUrl = publicUrl;
      }

      // Update franchise basic info
      const { error: franchiseError } = await supabase
        .from('franchises')
        .update({
          name,
          location,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (franchiseError) throw franchiseError;

      // Update franchise details using upsert
      const { error: detailsError } = await supabase
        .from('franchise_details')
        .upsert({
          franchise_id: id,
          short_description: shortDescription,
          long_description: longDescription,
          investment_amount: parseFloat(investmentAmount),
          main_image_url: mainImageUrl
        }, {
          onConflict: 'franchise_id'
        });

      if (detailsError) throw detailsError;

      // Update categories
      // First, remove all existing category mappings
      await supabase
        .from('franchise_category_mappings')
        .delete()
        .eq('franchise_id', id);

      // Then add new category mappings
      const categoryIds = [selectedMainCategory, ...selectedSubCategories].filter(Boolean);
      for (const categoryId of categoryIds) {
        const { error: categoryError } = await supabase
          .from('franchise_category_mappings')
          .insert({
            franchise_id: id,
            category_id: categoryId
          });

        if (categoryError) throw categoryError;
      }

      // Update FAQs
      await supabase
        .from('franchise_faqs')
        .delete()
        .eq('franchise_id', id);

      for (const faq of faqs) {
        if (faq.question && faq.answer) {
          const { error: faqError } = await supabase
            .from('franchise_faqs')
            .insert({
              franchise_id: id,
              question: faq.question,
              answer: faq.answer
            });

          if (faqError) throw faqError;
        }
      }

      // Update testimonials
      await supabase
        .from('franchise_testimonials')
        .delete()
        .eq('franchise_id', id);

      for (const testimonial of testimonials) {
        if (testimonial.authorName && testimonial.content) {
          const { error: testimonialError } = await supabase
            .from('franchise_testimonials')
            .insert({
              franchise_id: id,
              author_name: testimonial.authorName,
              content: testimonial.content
            });

          if (testimonialError) throw testimonialError;
        }
      }

      // Update success stories
      await supabase
        .from('franchise_success_stories')
        .delete()
        .eq('franchise_id', id);

      for (const story of successStories) {
        if (story.title && story.content) {
          let storyImageUrl = story.existingImageUrl || '';
          
          if (story.imageFile) {
            const fileExt = story.imageFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `success-stories/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('franchise-images')
              .upload(filePath, story.imageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('franchise-images')
              .getPublicUrl(filePath);

            storyImageUrl = publicUrl;
          }

          const { error: storyError } = await supabase
            .from('franchise_success_stories')
            .insert({
              franchise_id: id,
              title: story.title,
              content: story.content,
              image_url: storyImageUrl
            });

          if (storyError) throw storyError;
        }
      }

      navigate('/franchisor/franchises');
    } catch (err: any) {
      console.error('Error updating franchise:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const mainCategories = categories.filter(cat => !cat.parent_id);
  const subCategories = categories.filter(cat => cat.parent_id === selectedMainCategory);

  const handleMainCategoryChange = (categoryId: string) => {
    setSelectedMainCategory(categoryId);
    setSelectedSubCategories([]); // Reset sub-categories when main category changes
  };

  const handleSubCategoryChange = (categoryId: string) => {
    setSelectedSubCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

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
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-md">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Franchise Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Short Description
                </label>
                <textarea
                  required
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Long Description
                </label>
                <textarea
                  required
                  value={longDescription}
                  onChange={(e) => setLongDescription(e.target.value)}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Investment Amount (£)
                </label>
                <input
                  type="number"
                  required
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Main Image
                </label>
                {existingMainImageUrl && (
                  <div className="mt-2 mb-4">
                    <img
                      src={existingMainImageUrl}
                      alt="Current main image"
                      className="h-32 w-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setMainImageFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Categories</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Main Category
                </label>
                <select
                  value={selectedMainCategory}
                  onChange={(e) => handleMainCategoryChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select a main category</option>
                  {mainCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMainCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub Categories
                  </label>
                  <div className="space-y-2">
                    {subCategories.map((category) => (
                      <label key={category.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedSubCategories.includes(category.id)}
                          onChange={() => handleSubCategoryChange(category.id)}
                          className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FAQs */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">FAQs</h2>
              <button
                type="button"
                onClick={() => setFaqs([...faqs, { question: '', answer: '' }])}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add FAQ
              </button>
            </div>
            
            {faqs.map((faq, index) => (
              <div key={index} className="mb-4 p-4 border rounded-md">
                <div className="flex justify-between mb-2">
                  <h3 className="text-sm font-medium">FAQ #{index + 1}</h3>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => setFaqs(faqs.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Question</label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const newFaqs = [...faqs];
                        newFaqs[index].question = e.target.value;
                        setFaqs(newFaqs);
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Answer</label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) => {
                        const newFaqs = [...faqs];
                        newFaqs[index].answer = e.target.value;
                        setFaqs(newFaqs);
                      }}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Testimonials</h2>
              <button
                type="button"
                onClick={() => setTestimonials([...testimonials, { authorName: '', content: '' }])}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Testimonial
              </button>
            </div>
            
            {testimonials.map((testimonial, index) => (
              <div key={index} className="mb-4 p-4 border rounded-md">
                <div className="flex justify-between mb-2">
                  <h3 className="text-sm font-medium">Testimonial #{index + 1}</h3>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => setTestimonials(testimonials.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Author Name</label>
                    <input
                      type="text"
                      value={testimonial.authorName}
                      onChange={(e) => {
                        const newTestimonials = [...testimonials];
                        newTestimonials[index].authorName = e.target.value;
                        setTestimonials(newTestimonials);
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Content</label>
                    <textarea
                      value={testimonial.content}
                      onChange={(e) => {
                        const newTestimonials = [...testimonials];
                        newTestimonials[index].content = e.target.value;
                        setTestimonials(newTestimonials);
                      }}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Success Stories */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Success Stories</h2>
              <button
                type="button"
                onClick={() => setSuccessStories([...successStories, { title: '', content: '', imageFile: null }])}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Success Story
              </button>
            </div>
            
            {successStories.map((story, index) => (
              <div key={index} className="mb-4 p-4 border rounded-md">
                <div className="flex justify-between mb-2">
                  <h3 className="text-sm font-medium">Success Story #{index + 1}</h3>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => setSuccessStories(successStories.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={story.title}
                      onChange={(e) => {
                        const newStories = [...successStories];
                        newStories[index].title = e.target.value;
                        setSuccessStories(newStories);
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Content</label>
                    <textarea
                      value={story.content}
                      onChange={(e) => {
                        const newStories = [...successStories];
                        newStories[index].content = e.target.value;
                        setSuccessStories(newStories);
                      }}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Image</label>
                    {story.existingImageUrl && (
                      <div className="mt-2 mb-4">
                        <img
                          src={story.existingImageUrl}
                          alt="Current story image"
                          className="h-32 w-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const newStories = [...successStories];
                        newStories[index].imageFile = e.target.files?.[0] || null;
                        setSuccessStories(newStories);
                      }}
                      className="mt-1 block w-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/franchisor/franchises')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </FranchisorLayout>
  );
}