import React from 'react';
import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  userType: 'admin' | 'franchisor' | 'customer';
  isLogin?: boolean;
}

export default function AuthLayout({ children, title, userType, isLogin = true }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Store className="mx-auto h-12 w-12 text-indigo-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{title}</h2>
        </div>
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
          
          {userType !== 'admin' && (
            <div className="mt-6 text-center text-sm">
              {isLogin ? (
                <p>
                  Don't have an account?{' '}
                  <Link
                    to={`/${userType}/signup`}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Sign up
                  </Link>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <Link
                    to={`/${userType}/login`}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Log in
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}