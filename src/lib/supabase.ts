import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Null until Supabase env vars are configured — the dashboard then shows demo data.
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;
