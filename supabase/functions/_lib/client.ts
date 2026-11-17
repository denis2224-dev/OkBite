import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function serverClient(keyName: string): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get(keyName);
  if (!url || !key) throw new Error('Missing server-side Supabase configuration');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function adminClient(): SupabaseClient {
  return serverClient('SUPABASE_SERVICE_ROLE_KEY');
}

export function anonClient(): SupabaseClient {
  return serverClient('SUPABASE_ANON_KEY');
}
