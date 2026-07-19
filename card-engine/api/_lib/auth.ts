import type { VercelRequest } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Vercel doesn't route folders starting with `_`, so this file isn't a
// public endpoint — it's a shared helper for the api/*.ts handlers.

export interface AuthedUser {
  userId: string;
  email: string | null;
  isAnonymous: boolean;
  isAdmin: boolean;
}

let cachedClient: SupabaseClient | null = null;

function getServerSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  cachedClient = createClient(url, anon, { auth: { persistSession: false } });
  return cachedClient;
}

/**
 * Validate the caller's Supabase JWT from the `Authorization: Bearer …` header
 * and, if it checks out, look up their profiles.role to fill `isAdmin`.
 *
 * Returns null when the token is missing/invalid or Supabase is unconfigured
 * (dev path). Handlers must reject unauthenticated calls themselves — this
 * helper stays silent so callers can decide the error shape.
 */
export async function verifyUser(req: VercelRequest): Promise<AuthedUser | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  const header = req.headers.authorization ?? req.headers.Authorization;
  const token = typeof header === 'string' && header.startsWith('Bearer ')
    ? header.slice('Bearer '.length).trim()
    : null;
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle();

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    isAnonymous: data.user.is_anonymous ?? false,
    isAdmin: profile?.role === 'admin',
  };
}
