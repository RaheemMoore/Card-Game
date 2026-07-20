import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;
let cachedUserId: string | null = null;
let cachedUser: User | null = null;
let cachedIsAdmin: boolean | null = null;
let cachedRole: SessionRole | null = null;
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

  // Bridge Supabase's own auth events into our cache + notify system so
  // out-of-band session changes (OAuth redirect callback, token refresh,
  // sign-out from another tab) update the UI without a manual reload.
  client.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      cachedUserId = session.user.id;
      cachedUser = session.user;
    } else {
      cachedUserId = null;
      cachedUser = null;
    }
    clearRoleCache();
    notifyAuthChange();
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
    // Refresh so the cached user reflects any server-side changes
    // (email attached, role updated, admin-driven confirmation, etc.)
    // that happened out of band since the token was last minted.
    // On refresh failure we fall back to the cached session.
    const { data: refreshed } = await c.auth.refreshSession();
    const session = refreshed.session ?? existing.session;
    cachedUserId = session.user.id;
    cachedUser = session.user;
    return { ok: true, session };
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
export type SessionRole = 'user' | 'admin' | 'lore_director';

// Fetch profile.role once per session. Returns 'user' on network error
// or when there's no session. Cached; call clearRoleCache() on
// sign-in/sign-out.
export async function fetchMyRole(): Promise<SessionRole> {
  if (cachedRole !== null) return cachedRole;
  const c = getSupabaseClient();
  const uid = cachedUserId;
  if (!c || !uid) {
    cachedRole = 'user';
    return cachedRole;
  }
  const { data, error } = await c
    .from('profiles')
    .select('role')
    .eq('user_id', uid)
    .maybeSingle();
  if (error || !data) {
    cachedRole = 'user';
    return cachedRole;
  }
  cachedRole = (data.role as SessionRole) ?? 'user';
  cachedIsAdmin = cachedRole === 'admin';
  return cachedRole;
}

export async function fetchIsAdmin(): Promise<boolean> {
  if (cachedIsAdmin !== null) return cachedIsAdmin;
  return (await fetchMyRole()) === 'admin';
}

function clearRoleCache(): void {
  cachedIsAdmin = null;
  cachedRole = null;
}

// Sign-up / sign-in / sign-out --------------------------------------

export type AuthActionResult =
  | { ok: true; user: User; needsEmailConfirmation?: boolean }
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
    // the same uid. If email verification is enabled project-side, the
    // email lands in email_change (pending) and needs a link-click
    // before the account is fully permanent.
    const { data, error } = await c.auth.updateUser({ email, password });
    if (error) return { ok: false, message: error.message };
    if (!data.user) return { ok: false, message: 'updateUser returned no user.' };
    cachedUser = data.user;
    clearRoleCache();
    notifyAuthChange();
    const needsEmailConfirmation = !data.user.email || data.user.email !== email;
    return { ok: true, user: data.user, needsEmailConfirmation };
  }

  const { data, error } = await c.auth.signUp({ email, password });
  if (error) return { ok: false, message: error.message };
  if (!data.user) return { ok: false, message: 'signUp returned no user.' };
  cachedUserId = data.user.id;
  cachedUser = data.user;
  clearRoleCache();
  notifyAuthChange();
  // signUp: if no session came back, email confirmation is required.
  const needsEmailConfirmation = !data.session;
  return { ok: true, user: data.user, needsEmailConfirmation };
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

// Kicks off Google OAuth. Always uses signInWithOAuth — Supabase will
// reuse the Google-linked user if one exists, or create it on first
// sign-in. If the caller was anonymous, that anonymous session is
// discarded (its cards live under a uid nobody can reach). Linking
// anon → google would preserve the uid, but Supabase rejects link
// attempts when the Google identity is already tied to another user,
// which is the common case for returning players — so we take the
// simpler, always-works path here.
export async function signInWithGoogle(): Promise<AuthActionResult> {
  const c = getSupabaseClient();
  if (!c) return { ok: false, message: 'Supabase not configured.' };

  const { error } = await c.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, user: cachedUser!, needsEmailConfirmation: false };
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

// Update the current user's password. Requires a signed-in session
// (guarded UI-side). Supabase does not require the current password
// for this call — it trusts the session token as proof of identity.
export async function changePassword(newPassword: string): Promise<AuthActionResult> {
  const c = getSupabaseClient();
  if (!c) return { ok: false, message: 'Supabase not configured.' };
  if (isCurrentUserAnonymous()) {
    return { ok: false, message: 'Sign up first — guest accounts have no password.' };
  }
  const { data, error } = await c.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, message: error.message };
  if (!data.user) return { ok: false, message: 'updateUser returned no user.' };
  cachedUser = data.user;
  notifyAuthChange();
  return { ok: true, user: data.user };
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
