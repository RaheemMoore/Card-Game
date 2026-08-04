import type { Card } from '../../card-engine/src/types/card';

export type ReviewStatus = 'needs_review' | 'keep' | 'x_out';
export type StudioRole = 'user' | 'admin' | 'lore_director';

export interface StudioSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  email: string;
  role: StudioRole;
}

export interface LiveReviewCard {
  cardId: string;
  userId: string;
  creatorName: string;
  archetype: string;
  cardName: string;
  title: string;
  portraitUrl: string | null;
  card: Card;
  createdAt: string;
  updatedAt: string;
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  abilities?: Array<{ abilityId: string; slotType: string; localTier: string; displayName: string; description: string }>;
}

export interface StudioIdea {
  id: string;
  ownerId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
}

const SESSION_KEY = 'card-engine-studio-wiki-auth';
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const REVIEW_API_URL = (import.meta.env.VITE_CARD_REVIEW_API_URL as string | undefined) ?? '/api/card-reviews';
let session: StudioSession | null = readStoredSession();
const listeners = new Set<() => void>();

export function isStudioDataConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getStudioSession(): StudioSession | null {
  return session;
}

export function subscribeStudioSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) listener();
}

function readStoredSession(): StudioSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as StudioSession : null;
  } catch {
    return null;
  }
}

function storeSession(value: StudioSession | null): void {
  session = value;
  try {
    if (value) window.localStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch { /* The in-memory session still works when storage is unavailable. */ }
  notify();
}

function requireConfig(): { url: string; anon: string } {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Studio data is not configured for this deployment.');
  return { url: SUPABASE_URL, anon: SUPABASE_ANON_KEY };
}

async function profileRole(accessToken: string, userId: string): Promise<StudioRole> {
  const config = requireConfig();
  const response = await fetch(`${config.url}/rest/v1/profiles?select=role&user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
    headers: { apikey: config.anon, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return 'user';
  const rows = await response.json() as Array<{ role?: StudioRole }>;
  return rows[0]?.role ?? 'user';
}

function toSession(auth: AuthResponse, role: StudioRole): StudioSession {
  return {
    accessToken: auth.access_token,
    refreshToken: auth.refresh_token,
    expiresAt: Date.now() + auth.expires_in * 1000,
    userId: auth.user.id,
    email: auth.user.email ?? 'Studio collaborator',
    role,
  };
}

export async function signInToStudio(email: string, password: string): Promise<StudioSession> {
  const config = requireConfig();
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: config.anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { error_description?: string; msg?: string };
    throw new Error(detail.error_description ?? detail.msg ?? 'Could not sign in.');
  }
  const auth = await response.json() as AuthResponse;
  const next = toSession(auth, await profileRole(auth.access_token, auth.user.id));
  storeSession(next);
  return next;
}

export function signOutOfStudio(): void {
  storeSession(null);
}

async function refreshStudioSession(): Promise<StudioSession | null> {
  if (!session?.refreshToken) return null;
  const config = requireConfig();
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: config.anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
  if (!response.ok) {
    storeSession(null);
    return null;
  }
  const auth = await response.json() as AuthResponse;
  const next = toSession(auth, await profileRole(auth.access_token, auth.user.id));
  storeSession(next);
  return next;
}

export async function restoreStudioSession(): Promise<StudioSession | null> {
  if (!session) return null;
  if (session.expiresAt > Date.now() + 60_000) return session;
  return refreshStudioSession();
}

async function currentAccessToken(): Promise<string> {
  const active = await restoreStudioSession();
  if (!active) throw new Error('Sign in to use this Studio workspace.');
  return active.accessToken;
}

async function supabaseRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const config = requireConfig();
  const token = await currentAccessToken();
  const response = await fetch(`${config.url}${path}`, {
    ...init,
    headers: {
      apikey: config.anon,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (response.status !== 401) return response;
  const refreshed = await refreshStudioSession();
  if (!refreshed) return response;
  return fetch(`${config.url}${path}`, {
    ...init,
    headers: {
      apikey: config.anon,
      Authorization: `Bearer ${refreshed.accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

export async function listLiveReviewCards(input: {
  search?: string;
  archetype?: string;
  status?: ReviewStatus | 'all';
  sort?: 'newest' | 'oldest';
  limit?: number;
  offset?: number;
}): Promise<{ cards: LiveReviewCard[]; totalCount: number }> {
  const token = await currentAccessToken();
  const query = new URLSearchParams();
  if (input.search?.trim()) query.set('search', input.search.trim());
  if (input.archetype && input.archetype !== 'all') query.set('archetype', input.archetype);
  if (input.status && input.status !== 'all') query.set('status', input.status);
  query.set('sort', input.sort ?? 'newest');
  query.set('limit', String(input.limit ?? 24));
  query.set('offset', String(input.offset ?? 0));
  const response = await fetch(`${REVIEW_API_URL}?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(detail.error ?? 'Could not load the live card pool.');
  }
  const payload = await response.json() as { cards: Array<Record<string, unknown>>; totalCount: number };
  return {
    totalCount: payload.totalCount,
    cards: payload.cards.map((row) => ({
      cardId: String(row.card_id),
      userId: String(row.user_id),
      creatorName: String(row.creator_name ?? 'Team member'),
      archetype: String(row.archetype),
      cardName: String(row.card_name ?? 'Unnamed card'),
      title: String(row.name_and_title ?? row.card_name ?? 'Unnamed card'),
      portraitUrl: row.portrait_url ? String(row.portrait_url) : null,
      card: row.card_data as Card,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      reviewStatus: row.review_disposition as ReviewStatus,
      reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
      reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
      abilities: Array.isArray(row.abilities) ? row.abilities as LiveReviewCard['abilities'] : [],
    })),
  };
}

export async function recordCardReview(cardId: string, disposition: ReviewStatus): Promise<void> {
  const active = await restoreStudioSession();
  if (!active) throw new Error('Sign in to review cards.');
  const response = await supabaseRequest('/rest/v1/card_review_decisions', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ card_id: cardId, reviewer_id: active.userId, disposition }),
  });
  if (!response.ok) throw new Error((await response.text()) || 'Could not save the team verdict.');
}

interface IdeaRow { id: string; owner_id: string; body: string; created_at: string; updated_at: string }
const ideaFromRow = (row: IdeaRow): StudioIdea => ({ id: row.id, ownerId: row.owner_id, body: row.body, createdAt: row.created_at, updatedAt: row.updated_at });

export async function listStudioIdeas(): Promise<StudioIdea[]> {
  const response = await supabaseRequest('/rest/v1/studio_ideas?select=id,owner_id,body,created_at,updated_at&order=created_at.desc');
  if (!response.ok) throw new Error((await response.text()) || 'Could not open Raheem’s notebook.');
  return ((await response.json()) as IdeaRow[]).map(ideaFromRow);
}

export async function createStudioIdea(body: string): Promise<StudioIdea> {
  const active = await restoreStudioSession();
  if (!active) throw new Error('Sign in to capture an idea.');
  const response = await supabaseRequest('/rest/v1/studio_ideas', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ owner_id: active.userId, body: body.trim() }),
  });
  if (!response.ok) throw new Error((await response.text()) || 'Could not save the idea.');
  return ideaFromRow(((await response.json()) as IdeaRow[])[0]);
}

export async function updateStudioIdea(id: string, body: string): Promise<StudioIdea> {
  const response = await supabaseRequest(`/rest/v1/studio_ideas?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ body: body.trim() }),
  });
  if (!response.ok) throw new Error((await response.text()) || 'Could not update the idea.');
  return ideaFromRow(((await response.json()) as IdeaRow[])[0]);
}
