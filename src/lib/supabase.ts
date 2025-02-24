import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://klclsvhncjutqxiglezc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsY2xzdmhuY2p1dHF4aWdsZXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1NDQxODIsImV4cCI6MjA1NDEyMDE4Mn0.t6-40WaZYgCGtpxDb3F8zAru_zZWPCprvxck1Vlflhg';

// Create a Supabase client with the anon key for regular operations
export const supabase = createClient(supabaseUrl, supabaseKey);

// Create a Supabase client with the service role key for admin operations
// IMPORTANT: Replace 'YOUR_SERVICE_ROLE_KEY' with the actual service role key
export const adminSupabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsY2xzdmhuY2p1dHF4aWdsZXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODU0NDE4MiwiZXhwIjoyMDU0MTIwMTgyfQ.hEJOqEQZrMXU3Gsn4ZoeUjmIBE7HXVMzYcA6xv-sPCw', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});