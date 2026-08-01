import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function isSyncConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Singleton Supabase client; null when env vars are absent so the whole app degrades gracefully. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!isSyncConfigured() || typeof window === "undefined") { client = null; return client; }
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true } },
  );
  return client;
}
