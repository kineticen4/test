import React from 'react';
import { X, CreditCard, Loader2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  franchise: {
    name: string;
  } | null;
  selectedDuration: string;
  amount: number;
  onConfirm: () => void;
  processing: boolean;
}

export default function PaymentModal({
  isOpen,
  onClose,
  franchise,
  selectedDuration,
  amount,
  onConfirm,
  processing
}: PaymentModalProps) {
  if (!isOpen) return null;

  const formatDuration = (duration: string) => {
    switch (duration) {
      case '1w':
        return '1 Week';
      case '2w':
        return '2 Weeks';
      case '1m':
        return '1 Month';
      case '6m':
        return '6 Months';
      default:
        return duration;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Featured Ad Details</h2>
            <button
              onClick={onClose}
              disabled={processing}
              className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">Franchise</label>
                <p className="mt-1 text-base text-gray-900">{franchise?.name || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Duration</label>
                <p className="mt-1 text-base text-gray-900">{formatDuration(selectedDuration)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Amount</label>
                <p className="mt-1 text-base text-gray-900">£{amount.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-700">
                <CreditCard className="h-5 w-5" />
                <p className="text-sm font-medium">Secure Payment with Stripe</p>
              </div>
              <p className="mt-2 text-sm text-blue-600">
                You will be redirected to Stripe's secure payment page to complete your transaction.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={processing}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                'Proceed to Payment'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}