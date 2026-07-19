/**
 * Name repetition tracker for the character-generation pipeline.
 *
 * Bible §10 requires the generator to compare new names against recent
 * generations to prevent repetition. This service stores the last N card
 * names in localStorage so subsequent forges can pass them to Claude as a
 * "recently used — avoid" list, and can flag exact + normalized collisions.
 *
 * Not authoritative for permanent card names (those live in Supabase/
 * storage.ts). This is a fast-path in-memory cache for the immediate
 * "don't reuse the same name shape three cards in a row" case.
 */

const HISTORY_KEY = 'card-engine-recent-names';
const HISTORY_MAX = 50;

export interface RecentNameEntry {
  cardName: string;
  nameAndTitle: string;
  archetype: string;
  createdAt: string;
}

/**
 * Bible §10 normalization — lowercase, strip whitespace, punctuation,
 * apostrophes, hyphens. Used ONLY for collision detection, not display.
 */
export function normalizeForCollision(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/['‘’]/g, '')
    .replace(/[-_\s.]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Read the recent-names window from localStorage. */
export function getRecentNames(): RecentNameEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

/** Push a new entry; oldest are dropped after HISTORY_MAX. */
export function recordName(entry: Omit<RecentNameEntry, 'createdAt'>): void {
  if (typeof window === 'undefined') return;
  const existing = getRecentNames();
  const next: RecentNameEntry[] = [
    { ...entry, createdAt: new Date().toISOString() },
    ...existing.filter((e) => normalizeForCollision(e.cardName) !== normalizeForCollision(entry.cardName)),
  ].slice(0, HISTORY_MAX);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

/**
 * Bible §10 near-collision detection. Returns the matching recent entry
 * if the proposed name collides on:
 *   - exact match after normalization
 *   - identical first 3 letters shared with too many recent names
 *   - identical last 3 letters shared with too many recent names
 * Caller can decide whether to warn, log, or regenerate.
 */
export function detectCollision(
  proposedCardName: string,
  recent: RecentNameEntry[] = getRecentNames(),
): { kind: 'exact' | 'prefix' | 'suffix'; against: RecentNameEntry } | null {
  const norm = normalizeForCollision(proposedCardName);
  if (norm.length === 0) return null;

  // Exact normalized match — clear collision.
  const exact = recent.find((r) => normalizeForCollision(r.cardName) === norm);
  if (exact) return { kind: 'exact', against: exact };

  // Prefix / suffix repetition threshold — 3+ recent names sharing the
  // same 3-letter head or tail suggests a boring pattern.
  if (norm.length >= 3) {
    const head = norm.slice(0, 3);
    const tail = norm.slice(-3);
    const headMatches = recent.filter((r) => normalizeForCollision(r.cardName).startsWith(head));
    if (headMatches.length >= 3) return { kind: 'prefix', against: headMatches[0] };
    const tailMatches = recent.filter((r) => normalizeForCollision(r.cardName).endsWith(tail));
    if (tailMatches.length >= 3) return { kind: 'suffix', against: tailMatches[0] };
  }

  return null;
}

/** Compact recent-name summary for the prompt. Returns comma-separated
 *  card names. Caller can clip to a length budget. */
export function formatRecentForPrompt(recent: RecentNameEntry[] = getRecentNames(), max = 20): string {
  return recent.slice(0, max).map((r) => r.cardName).join(', ');
}

/** For tests + debug: clear the local history. */
export function clearNameHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}
