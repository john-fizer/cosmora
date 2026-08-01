import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export async function sendMagicLink(email: string): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: "Sync is not configured" };
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/dashboard/settings` },
  });
  return error ? { error: error.message } : {};
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: "Sync is not configured" };
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/dashboard/settings` },
  });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

/** Subscribe to auth changes; returns unsubscribe. Callback gets the user id or null. */
export function onAuthChange(cb: (userId: string | null) => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_evt, session) => cb(session?.user?.id ?? null));
  return () => data.subscription.unsubscribe();
}
