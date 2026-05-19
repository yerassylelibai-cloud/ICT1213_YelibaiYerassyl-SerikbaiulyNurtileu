import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Lazy Supabase client so the UI can load (and /api/health can report missing env)
 * before any RPC runs.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}
