import type { VercelRequest } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Vercel doesn't route folders starting with `_`, so this file isn't a
// public endpoint — it's a shared helper for the api/*.ts handlers.

export type ProfileRole = 'user' | 'admin' | 'lore_director';

export interface AuthedUser {
  userId: string;
  email: string | null;
  isAnonymous: boolean;
  /** Strict. Authority — admin dashboards, grants, moderation. */
  isAdmin: boolean;
  /** Whatever `profiles.role` says, or null if the lookup could not run. */
  role: ProfileRole | null;
  /**
   * Admin or lore director. Spends without needing a crystal balance.
   *
   * NOT the spend gate on its own — see api/_lib/spendGate.ts. Gating spend on
   * ROLE would lock every ordinary player out of forging permanently, even
   * after being granted crystals, which is the opposite of what the economy is
   * for. This flag exists only so the two operators can never accidentally lock
   * themselves out of their own tools by running their balance to zero.
   */
  isPrivileged: boolean;
  /**
   * False when the role lookup could not run at all (no service-role key).
   *
   * Handlers must be able to tell "we asked and you are not allowed" from "we
   * could not ask". Both deny — failing closed is right — but a whole
   * environment denying everyone is a misconfiguration, not an intrusion, and
   * the two should not look identical in `api_usage_events`.
   */
  roleLookupAvailable: boolean;
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
  let role: ProfileRole | null = null;
  if (admin) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle();
    role = (profile?.role as ProfileRole | undefined) ?? null;
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    isAnonymous: data.user.is_anonymous ?? false,
    isAdmin: role === 'admin',
    role,
    isPrivileged: isPrivilegedRole(role),
    roleLookupAvailable: admin !== null,
  };
}

/**
 * Is this an operator account? Exported so it can be tested without a live
 * Supabase — the case that matters most is `null`.
 *
 * `null` is NOT privileged. That covers "no profiles row" and "service-role key
 * missing" alike. Such a caller can still spend if they hold crystals; they
 * just get no bypass.
 */
export function isPrivilegedRole(role: ProfileRole | null): boolean {
  return role === 'admin' || role === 'lore_director';
}
