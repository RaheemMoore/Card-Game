/**
 * The Studio desk client.
 *
 * There is no account here and no database credential in the browser. Everything
 * goes through `/api/desk`, which checks a signed HttpOnly cookie proving this
 * device knew the shared studio passphrase. See `studio-wiki/api/desk.ts`.
 *
 * `DeskPerson` is authorship, not authorization — a remembered preference so a note
 * is still readable months later. Either person may edit or delete anything.
 */

export type DeskPerson = 'raheem' | 'tori';

export const DESK_PEOPLE: DeskPerson[] = ['raheem', 'tori'];
export const DESK_NAMES: Record<DeskPerson, string> = { raheem: 'Raheem', tori: 'Tori' };

export function otherPerson(person: DeskPerson): DeskPerson {
  return person === 'raheem' ? 'tori' : 'raheem';
}

export interface DeskNote {
  id: string;
  desk: DeskPerson;
  author: DeskPerson;
  body: string;
  pinned: boolean;
  tags: string[];
  needsCallFrom: DeskPerson | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeskReply {
  id: string;
  noteId: string;
  author: DeskPerson;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeskState {
  notes: DeskNote[];
  replies: DeskReply[];
  lastSeen: Partial<Record<DeskPerson, string>>;
}

export const EMPTY_DESK_STATE: DeskState = { notes: [], replies: [], lastSeen: {} };

const DESK_API_URL = (import.meta.env.VITE_DESK_API_URL as string | undefined) ?? '/api/desk';
const PERSON_KEY = 'card-engine-studio-person';

/** Thrown when the passphrase cookie is missing or expired, so the UI can re-lock. */
export class DeskLockedError extends Error {
  constructor(message = 'The studio passphrase is required.') {
    super(message);
    this.name = 'DeskLockedError';
  }
}

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(DESK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (response.status === 401) throw new DeskLockedError(data.error);
  if (!response.ok) throw new Error(data.error ?? 'The desk is not answering.');
  return data as T;
}

export const unlockDesks = (passphrase: string) => call<{ unlocked: boolean }>({ action: 'unlock', passphrase });
export const lockDesks = () => call<{ unlocked: boolean }>({ action: 'lock' });
export const readDesks = () => call<DeskState>({ action: 'state' });

export const createNote = (input: { desk: DeskPerson; author: DeskPerson; body: string }) =>
  call<DeskState>({ action: 'create', ...input });

export const updateNote = (id: string, patch: Partial<Pick<DeskNote, 'body' | 'pinned' | 'tags' | 'desk'>> & { needsCallFrom?: DeskPerson | null }) =>
  call<DeskState>({ action: 'update', id, ...patch });

export const removeNote = (id: string) => call<DeskState>({ action: 'remove', id });
export const addReply = (input: { noteId: string; author: DeskPerson; body: string }) => call<DeskState>({ action: 'reply', ...input });
export const updateReply = (id: string, body: string) => call<DeskState>({ action: 'replyUpdate', id, body });
export const removeReply = (id: string) => call<DeskState>({ action: 'replyRemove', id });
export const markDeskSeen = (person: DeskPerson) => call<DeskState>({ action: 'seen', person });

/** Change the shared phrase from inside the studio — no console, no redeploy. */
export const rotatePassphrase = (current: string, next: string) => call<DeskState>({ action: 'rotate', current, next });

export function storedPerson(): DeskPerson | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(PERSON_KEY);
    return value === 'raheem' || value === 'tori' ? value : null;
  } catch {
    return null;
  }
}

export function rememberPerson(person: DeskPerson): void {
  try { window.localStorage.setItem(PERSON_KEY, person); } catch { /* Session-only is still usable. */ }
}

// ---------------------------------------------------------------------------
// Pure helpers — no React, no fetch, so they can be tested directly.
// ---------------------------------------------------------------------------

/** Pinned notes first, then newest. Ties break on id so the order never flickers. */
export function sortNotes(notes: DeskNote[]): DeskNote[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const byDate = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });
}

/** Every tag in `tags` must be present — selecting more tags narrows, never widens. */
export function filterNotes(notes: DeskNote[], input: { search?: string; tags?: string[]; replies?: DeskReply[] } = {}): DeskNote[] {
  const search = input.search?.trim().toLowerCase() ?? '';
  const tags = input.tags ?? [];
  const replies = input.replies ?? [];
  return notes.filter((note) => {
    if (tags.length && !tags.every((tag) => note.tags.includes(tag))) return false;
    if (!search) return true;
    if (note.body.toLowerCase().includes(search)) return true;
    if (note.tags.some((tag) => tag.includes(search))) return true;
    // A conversation is part of the note; searching should reach into it.
    return replies.some((reply) => reply.noteId === note.id && reply.body.toLowerCase().includes(search));
  });
}

/** Every distinct tag in use, alphabetical, so the filter row is stable. */
export function collectTags(notes: DeskNote[]): string[] {
  return [...new Set(notes.flatMap((note) => note.tags))].sort();
}

/**
 * How much the other person has added since `viewer` last looked.
 *
 * Only the other person's writing counts — your own notes are never "unread" — and
 * the comparison is strictly greater than `lastSeenAt`, so marking everything seen
 * cannot leave a stale badge behind on the item that set the stamp.
 */
export function unreadCount(
  notes: DeskNote[],
  replies: DeskReply[],
  lastSeenAt: string | undefined,
  viewer: DeskPerson,
): number {
  const since = lastSeenAt ? Date.parse(lastSeenAt) : 0;
  const isNew = (item: { author: DeskPerson; createdAt: string }) =>
    item.author !== viewer && Date.parse(item.createdAt) > since;
  return notes.filter(isNew).length + replies.filter(isNew).length;
}
