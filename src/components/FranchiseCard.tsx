import React from 'react';
import { MapPin, DollarSign, Building2, Store, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface FranchiseCardProps {
  franchise: {
    id: string;
    name: string;
    location: string;
    details?: {
      short_description: string | null;
      investment_amount: number;
      main_image_url: string | null;
    } | null;
    category?: {
      name: string;
    } | null;
    featured?: boolean;
    adId?: string;
  };
  onRequestInfo: (franchiseId: string) => void;
  isSelected: boolean;
}

export default function FranchiseCard({ franchise, onRequestInfo, isSelected }: FranchiseCardProps) {
  const recordMetric = async (metricType: 'view' | 'click' | 'request_info') => {
    if (franchise.featured && franchise.adId) {
      try {
        await supabase
          .from('ad_metrics')
          .insert({
            ad_id: franchise.adId,
            metric_type: metricType
          });
      } catch (error) {
        console.error('Error recording metric:', error);
      }
    }
  };

  // Record view when component mounts
  React.useEffect(() => {
    recordMetric('view');
  }, []);

  const handleClick = () => {
    recordMetric('click');
  };

  const handleRequestInfo = () => {
    recordMetric('request_info');
    onRequestInfo(franchise.id);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden relative">
      {/* Featured Ribbon */}
      {franchise.featured && (
        <div className="absolute top-4 right-0 z-10">
          <div className="bg-yellow-400 text-yellow-900 py-1 px-4 shadow-md font-medium text-sm flex items-center transform translate-x-2">
            <Star className="h-4 w-4 mr-1" />
            Featured
          </div>
        </div>
      )}

      {/* Franchise Image */}
      <div className="h-48 w-full overflow-hidden">
        {franchise.details?.main_image_url ? (
          <img
            src={franchise.details.main_image_url}
            alt={franchise.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <Store className="h-12 w-12 text-gray-400" />
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Category */}
        {franchise.category && (
          <div className="flex items-center mb-2">
            <Building2 className="h-4 w-4 text-indigo-600 mr-1" />
            <span className="text-sm text-indigo-600">{franchise.category.name}</span>
          </div>
        )}

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {franchise.name}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {franchise.details?.short_description || 'No description available'}
        </p>

        {/* Investment Range */}
        <div className="flex items-center mb-2">
          <DollarSign className="h-4 w-4 text-gray-500 mr-1" />
          <span className="text-sm text-gray-600">
            Investment: £{franchise.details?.investment_amount?.toLocaleString() || 'N/A'}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center mb-4">
          <MapPin className="h-4 w-4 text-gray-500 mr-1" />
          <span className="text-sm text-gray-600">{franchise.location}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleRequestInfo}
              className="form-checkbox h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">Request Info</span>
          </label>
          
          <Link 
            to={`/franchise/${franchise.id}`}
            onClick={handleClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}