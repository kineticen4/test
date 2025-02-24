import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Upload, Plus, Minus, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import UserMenu from '../../components/UserMenu';

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
}

export default function AddFranchise() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('');
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);

  // Basic Information
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  
  // Gallery
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  
  // FAQs
  const [faqs, setFaqs] = useState<FAQ[]>([{ question: '', answer: '' }]);
  
  // Testimonials
  const [testimonials, setTestimonials] = useState<Testimonial[]>([{ authorName: '', content: '' }]);
  
  // Success Stories
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([{ title: '', content: '', imageFile: null }]);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('franchise_categories')
        .select('*')
        .order('name');
      
      if (error) {
        setError('Failed to load categories');
      } else if (data) {
        setCategories(data);
      }
    };

    fetchCategories();
  }, []);

  const mainCategories = categories.filter(cat => !cat.parent_id);
  const subCategories = categories.filter(cat => cat.parent_id === selectedMainCategory);

  const uploadImage = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('franchise-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('franchise-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload main image
      let mainImageUrl = '';
      if (mainImageFile) {
        mainImageUrl = await uploadImage(mainImageFile, 'main-images');
      }

      // Create franchise with pending status
      const { data: franchise, error: franchiseError } = await supabase
        .from('franchises')
        .insert([
          {
            name,
            location,
            franchisor_id: user.id,
            status: 'pending' // Set initial status as pending
          }
        ])
        .select()
        .single();

      if (franchiseError) throw franchiseError;

      // Create franchise details
      const { error: detailsError } = await supabase
        .from('franchise_details')
        .insert([
          {
            franchise_id: franchise.id,
            short_description: shortDescription,
            long_description: longDescription,
            investment_amount: parseFloat(investmentAmount),
            main_image_url: mainImageUrl
          }
        ]);

      if (detailsError) throw detailsError;

      // Create category mappings
      const categoryIds = [selectedMainCategory, ...selectedSubCategories].filter(Boolean);
      for (const categoryId of categoryIds) {
        const { error: categoryError } = await supabase
          .from('franchise_category_mappings')
          .insert([
            {
              franchise_id: franchise.id,
              category_id: categoryId
            }
          ]);

        if (categoryError) throw categoryError;
      }

      // Upload gallery images
      for (const file of galleryFiles) {
        const imageUrl = await uploadImage(file, 'gallery');
        const { error: galleryError } = await supabase
          .from('franchise_gallery')
          .insert([
            {
              franchise_id: franchise.id,
              image_url: imageUrl
            }
          ]);

        if (galleryError) throw galleryError;
      }

      // Create FAQs
      for (const faq of faqs) {
        if (faq.question && faq.answer) {
          const { error: faqError } = await supabase
            .from('franchise_faqs')
            .insert([
              {
                franchise_id: franchise.id,
                question: faq.question,
                answer: faq.answer
              }
            ]);

          if (faqError) throw faqError;
        }
      }

      // Create testimonials
      for (const testimonial of testimonials) {
        if (testimonial.authorName && testimonial.content) {
          const { error: testimonialError } = await supabase
            .from('franchise_testimonials')
            .insert([
              {
                franchise_id: franchise.id,
                author_name: testimonial.authorName,
                content: testimonial.content
              }
            ]);

          if (testimonialError) throw testimonialError;
        }
      }

      // Create success stories
      for (const story of successStories) {
        if (story.title && story.content) {
          let storyImageUrl = '';
          if (story.imageFile) {
            storyImageUrl = await uploadImage(story.imageFile, 'success-stories');
          }

          const { error: storyError } = await supabase
            .from('franchise_success_stories')
            .insert([
              {
                franchise_id: franchise.id,
                title: story.title,
                content: story.content,
                image_url: storyImageUrl
              }
            ]);

          if (storyError) throw storyError;
        }
      }

      navigate('/franchisor/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setMainImageFile(e.target.files[0]);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setGalleryFiles(Array.from(e.target.files));
    }
  };

  const handleFAQChange = (index: number, field: keyof FAQ, value: string) => {
    const newFaqs = [...faqs];
    newFaqs[index][field] = value;
    setFaqs(newFaqs);
  };

  const handleTestimonialChange = (index: number, field: keyof Testimonial, value: string) => {
    const newTestimonials = [...testimonials];
    newTestimonials[index][field] = value;
    setTestimonials(newTestimonials);
  };

  const handleSuccessStoryChange = (index: number, field: keyof SuccessStory, value: string | File | null) => {
    const newStories = [...successStories];
    newStories[index][field] = value;
    setSuccessStories(newStories);
  };

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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold">Add New Franchise</span>
            </div>
            <div className="flex items-center">
              <UserMenu userType="franchisor" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleMainImageChange}
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

          {/* Gallery */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Gallery</h2>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryChange}
              className="mt-1 block w-full"
            />
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
                      onChange={(e) => handleFAQChange(index, 'question', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Answer</label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) => handleFAQChange(index, 'answer', e.target.value)}
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
                      onChange={(e) => handleTestimonialChange(index, 'authorName', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Content</label>
                    <textarea
                      value={testimonial.content}
                      onChange={(e) => handleTestimonialChange(index, 'content', e.target.value)}
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
                      onChange={(e) => handleSuccessStoryChange(index, 'title', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Content</label>
                    <textarea
                      value={story.content}
                      onChange={(e) => handleSuccessStoryChange(index, 'content', e.target.value)}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSuccessStoryChange(index, 'imageFile', e.target.files?.[0] || null)}
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
              onClick={() => navigate('/franchisor/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Saving...
                </>
              ) : (
                'Save Franchise'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}