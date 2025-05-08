import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://sethhceiojxrevvpzupf.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNldGhoY2Vpb2p4cmV2dnB6dXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NDcyMDAsImV4cCI6MjA1ODEyMzIwMH0.dYLDhmxgP9k-fOAGAddH8UNCETMF8fHKNhSPWpDNisM';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon Key is missing. Make sure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in your .env file.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase; 