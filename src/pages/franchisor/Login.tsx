import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AuthLayout from '../../components/AuthLayout';
import { Loader2 } from 'lucide-react';

export default function FranchisorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Sign in with email/password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // 2. Get user profile and check status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type, status')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) throw profileError;

      // 3. Check user type and status
      if (profile?.user_type !== 'franchisor') {
        throw new Error('Unauthorized access');
      }

      if (profile?.status === 'pending') {
        // Sign out the user since they're not approved yet
        await supabase.auth.signOut();
        throw new Error('Your account is still awaiting approval. Please check your email for confirmation once your account has been approved.');
      }

      if (profile?.status === 'rejected') {
        // Sign out the user since they're rejected
        await supabase.auth.signOut();
        throw new Error('Your account application has been rejected. Please contact support for more information.');
      }

      // If approved, update last login time
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (updateError) {
        console.error('Error updating last login:', updateError);
      }

      navigate('/franchisor/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message);
      
      // Additional error handling for specific cases
      if (err.message.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Franchisor Login" userType="franchisor">
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm whitespace-pre-line">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}