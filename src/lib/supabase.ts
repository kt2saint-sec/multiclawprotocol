import { createClient } from "@supabase/supabase-js";

// These are loaded from .env.local (gitignored)
// Create your Supabase project at https://supabase.com/dashboard
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Check if Supabase is configured (has real credentials) */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
