import { createClient } from '@supabase/supabase-js';

// Public values by design: the publishable key is meant to ship in browser code.
// Data access is protected by Row Level Security (supabase/migrations). Never put
// the secret / service_role key in this app.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://kcxcpxxoqgjyvowwprmf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_V9ALXZhbTPK0fIzG8cljBA_iesumBOM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
