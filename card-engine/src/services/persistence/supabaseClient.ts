import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;
let cachedUserId: string | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && key);
}

export function getSupabaseClient(): SupabaseClient | null {
  // Cached client wins — this covers the test override path where a
  // fake client has been injected without any env vars set.
  if (client) return client;
  if (!isSupabaseConfigured()) return null;
  client = createClient(url!, key!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Custom key so this doesn't collide with any other Supabase-using
      // app on the same origin during dev.
      storageKey: 'card-engine-auth',
    },
  });
  return client;
}

export type EnsureSessionReason =
  | 'not_configured'
  | 'anon_disabled'
  | 'network'
  | 'unknown';

export type EnsureSessionResult =
  | { ok: true; session: Session }
  | { ok: false; reason: EnsureSessionReason; message: string };

// Reuse an existing session if one is stored; otherwise sign in anonymously.
// Anonymous sign-in must be enabled in the Supabase dashboard
// (Authentication → Providers → Anonymous Sign-Ins). If it is disabled we
// surface `anon_disabled` so the PersistenceGate can fall back cleanly.
export async function ensureSession(): Promise<EnsureSessionResult> {
  const c = getSupabaseClient();
  if (!c) return { ok: false, reason: 'not_configured', message: 'Supabase env vars not set.' };

  const { data: existing } = await c.auth.getSession();
  if (existing.session) {
    cachedUserId = existing.session.user.id;
    return { ok: true, session: existing.session };
  }

  const { data, error } = await c.auth.signInAnonymously();
  if (error) {
    const msg = error.message ?? '';
    const lower = msg.toLowerCase();
    if (lower.includes('anonymous') && (lower.includes('disabled') || lower.includes('not enabled'))) {
      return { ok: false, reason: 'anon_disabled', message: msg };
    }
    if (lower.includes('fetch') || lower.includes('network')) {
      return { ok: false, reason: 'network', message: msg };
    }
    return { ok: false, reason: 'unknown', message: msg };
  }
  if (!data.session) return { ok: false, reason: 'unknown', message: 'signInAnonymously returned no session.' };
  cachedUserId = data.session.user.id;
  return { ok: true, session: data.session };
}

// Cached after ensureSession() resolves. Adapters read this synchronously
// when attaching user_id to writes.
export function getCurrentUserId(): string | null {
  return cachedUserId;
}

// Test-only override. Lets adapter/migration tests inject a fake client
// without needing real env vars. Not used by application code.
export function __setClientForTest(next: SupabaseClient | null, userId: string | null): void {
  client = next;
  cachedUserId = userId;
}
