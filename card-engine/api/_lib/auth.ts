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
let cachedAdminClient: SupabaseClient | null = null;

function getServerSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  cachedClient = createClient(url, anon, { auth: { persistSession: false } });
  return cachedClient;
}

// Service-role client used only for the profiles.role lookup. Anon-key
// SELECTs on profiles are RLS-scoped and return nothing without an auth
// context, so we'd always report isAdmin=false. Service role bypasses.
function getAdminClient(): SupabaseClient | null {
  if (cachedAdminClient) return cachedAdminClient;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedAdminClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedAdminClient;
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

  // Role lookup must bypass RLS — see getAdminClient comment.
  const admin = getAdminClient();
  let role: string | null = null;
  if (admin) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle();
    role = profile?.role ?? null;
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    isAnonymous: data.user.is_anonymous ?? false,
    isAdmin: role === 'admin',
  };
}
