import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;
let cachedUserId: string | null = null;
let cachedUser: User | null = null;
let cachedIsAdmin: boolean | null = null;
const authListeners = new Set<() => void>();

function notifyAuthChange(): void {
  for (const fn of authListeners) fn();
}

export function subscribeToAuth(fn: () => void): () => void {
  authListeners.add(fn);
  return () => {
    authListeners.delete(fn);
  };
}

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
    cachedUser = existing.session.user;
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
  cachedUser = data.session.user;
  return { ok: true, session: data.session };
}

// True if the current session was created by signInAnonymously (no
// email attached yet). Used by AuthModal + the first-forge prompt.
export function isCurrentUserAnonymous(): boolean {
  const u = cachedUser;
  if (!u) return false;
  // supabase-js flags anonymous users; also fall back to "no email".
  const asAny = u as unknown as { is_anonymous?: boolean };
  if (typeof asAny.is_anonymous === 'boolean') return asAny.is_anonymous;
  return !u.email;
}

export function getCurrentUser(): User | null {
  return cachedUser;
}

// Fetch profile.role once per session. Returns null on network error
// or when there's no session. Cached; call clearRoleCache() on
// sign-in/sign-out.
export async function fetchIsAdmin(): Promise<boolean> {
  if (cachedIsAdmin !== null) return cachedIsAdmin;
  const c = getSupabaseClient();
  const uid = cachedUserId;
  if (!c || !uid) {
    cachedIsAdmin = false;
    return false;
  }
  const { data, error } = await c
    .from('profiles')
    .select('role')
    .eq('user_id', uid)
    .maybeSingle();
  if (error || !data) {
    cachedIsAdmin = false;
    return false;
  }
  cachedIsAdmin = data.role === 'admin';
  return cachedIsAdmin;
}

function clearRoleCache(): void {
  cachedIsAdmin = null;
}

// Sign-up / sign-in / sign-out --------------------------------------

export type AuthActionResult =
  | { ok: true; user: User }
  | { ok: false; message: string };

// Converts an anonymous session into a permanent email+password
// account, preserving the same auth.uid() so all existing cards +
// ledger rows continue to belong to the user. If the current session
// is NOT anonymous (already permanent), creates a separate account
// via signUp — caller should have prevented this UI-side.
export async function signUpWithEmail(email: string, password: string): Promise<AuthActionResult> {
  const c = getSupabaseClient();
  if (!c) return { ok: false, message: 'Supabase not configured.' };

  if (isCurrentUserAnonymous()) {
    // updateUser on an anon session attaches the email+password to
    // the same uid. Email verification, if enabled project-side, is
    // required before the account is fully permanent.
    const { data, error } = await c.auth.updateUser({ email, password });
    if (error) return { ok: false, message: error.message };
    if (!data.user) return { ok: false, message: 'updateUser returned no user.' };
    cachedUser = data.user;
    clearRoleCache();
    notifyAuthChange();
    return { ok: true, user: data.user };
  }

  const { data, error } = await c.auth.signUp({ email, password });
  if (error) return { ok: false, message: error.message };
  if (!data.user) return { ok: false, message: 'signUp returned no user.' };
  cachedUserId = data.user.id;
  cachedUser = data.user;
  clearRoleCache();
  notifyAuthChange();
  return { ok: true, user: data.user };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthActionResult> {
  const c = getSupabaseClient();
  if (!c) return { ok: false, message: 'Supabase not configured.' };

  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };
  if (!data.session) return { ok: false, message: 'signIn returned no session.' };
  cachedUserId = data.session.user.id;
  cachedUser = data.session.user;
  clearRoleCache();
  notifyAuthChange();
  return { ok: true, user: data.session.user };
}

export async function signOut(): Promise<void> {
  const c = getSupabaseClient();
  if (!c) return;
  await c.auth.signOut();
  cachedUserId = null;
  cachedUser = null;
  clearRoleCache();
  notifyAuthChange();
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
