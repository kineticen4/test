import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { MessageCircle, Send, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  subject: string;
  content: string;
  created_at: string;
  read: boolean;
  sender: {
    id: string;
    full_name: string;
    company_name: string;
    user_type: string;
  } | null;
}

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFranchisor, setSelectedFranchisor] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [franchisors, setFranchisors] = useState<Array<{
    id: string;
    full_name: string;
    company_name: string;
  }>>([]);

  useEffect(() => {
    fetchMessages();
    fetchFranchisors();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(
            id,
            full_name,
            company_name,
            user_type
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setMessages(data);

      // Mark received messages as read
      const unreadMessages = data?.filter(m => 
        m.receiver_id === user.id && !m.read
      ) || [];

      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true })
          .in('id', unreadMessages.map(m => m.id));
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFranchisors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, company_name')
        .eq('user_type', 'franchisor')
        .eq('status', 'approved');

      if (error) throw error;
      if (data) setFranchisors(data);
    } catch (err: any) {
      console.error('Error fetching franchisors:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFranchisor) {
      setError('Please select a franchisor');
      return;
    }

    setSending(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Send message
      const { error: sendError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedFranchisor,
          subject,
          content
        });

      if (sendError) throw sendError;

      // Clear form and refresh messages
      setSelectedFranchisor('');
      setSubject('');
      setContent('');
      await fetchMessages();
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Messages</h1>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md">
            {error}
          </div>
        )}

        {/* New Message Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Send Message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="franchisor" className="block text-sm font-medium text-gray-700">
                Select Franchisor
              </label>
              <select
                id="franchisor"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={selectedFranchisor}
                onChange={(e) => setSelectedFranchisor(e.target.value)}
              >
                <option value="">Select a franchisor</option>
                {franchisors.map((franchisor) => (
                  <option key={franchisor.id} value={franchisor.id}>
                    {franchisor.company_name} ({franchisor.full_name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                id="content"
                required
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {sending ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Message History */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">Message History</h3>
          </div>
          <div className="border-t border-gray-200">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : messages.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {messages.map((message) => (
                  <li key={message.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <MessageCircle className={`h-5 w-5 ${
                          message.sender?.user_type === 'franchisor' ? 'text-indigo-600' : 'text-gray-400'
                        }`} />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{message.subject}</p>
                          <p className="text-sm text-gray-500">
                            From: {message.sender?.company_name ? 
                              `${message.sender.company_name} (${message.sender.full_name})` : 
                              message.sender?.full_name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      {message.content}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center py-6 text-gray-500">No messages yet</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}