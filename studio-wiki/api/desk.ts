/**
 * The Studio desks — one passphrase, two people, no differentiation.
 *
 * Raheem, 2026-08-10: the Wiki no longer asks either partner to sign in with a
 * Card Engine account. It sits behind a single shared studio passphrase, and this
 * function is the ONLY door to desk data. That is deliberate: the browser never
 * holds a database credential, only a signed cookie proving it knew the passphrase.
 *
 * `studio_idea_replies` and `studio_desk_reads` have RLS on with no permissive
 * policies, so the service-role key used here is genuinely the only way in — there
 * is no second, unguarded path straight from the browser to PostgREST.
 *
 * The person label ('raheem' | 'tori') is authorship, NOT authorization. Either
 * person may edit or delete anything; the label exists so a note is still readable
 * six months later.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

type HeaderValue = string | string[] | undefined;

interface ApiRequest {
  method?: string;
  headers: Record<string, HeaderValue>;
  body?: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string | string[]): void;
  json(body: unknown): void;
  end(): void;
}

const COOKIE_NAME = 'studio_desk';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const PEOPLE = ['raheem', 'tori'] as const;
const MAX_BODY_LENGTH = 20_000;
const MAX_TAGS = 12;

type Person = (typeof PEOPLE)[number];

function env() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const passphrase = process.env.STUDIO_PASSPHRASE;
  const secret = process.env.STUDIO_COOKIE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service || !passphrase || !secret) return null;
  return { url: url.replace(/\/$/, ''), service, passphrase, secret };
}

function first(value: HeaderValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Compare without leaking length or position through timing. */
function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function signToken(secret: string, issuedAt: number): string {
  const payload = String(issuedAt);
  const mac = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

function tokenIsValid(secret: string, token: string | undefined): boolean {
  if (!token) return false;
  const split = token.lastIndexOf('.');
  if (split <= 0) return false;
  const payload = token.slice(0, split);
  if (!/^\d+$/.test(payload)) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  return sameSecret(expected, token.slice(split + 1));
}

function readCookie(req: ApiRequest, name: string): string | undefined {
  const header = first(req.headers.cookie);
  if (!header) return undefined;
  for (const pair of header.split(';')) {
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    if (pair.slice(0, eq).trim() === name) return decodeURIComponent(pair.slice(eq + 1).trim());
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
  }
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function person(value: unknown): Person | null {
  return PEOPLE.includes(value as Person) ? value as Person : null;
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_BODY_LENGTH) return null;
  return trimmed;
}

/** Ids come from us, but they are still user input on the way back in. */
function uuid(value: unknown): string | null {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

function tagList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const tags = [...new Set(value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0 && tag.length <= 40))];
  return tags.length <= MAX_TAGS ? tags : tags.slice(0, MAX_TAGS);
}

type Config = NonNullable<ReturnType<typeof env>>;

async function db(config: Config, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${config.url}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: config.service,
      Authorization: `Bearer ${config.service}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

async function loadState(config: Config) {
  const [notesResponse, repliesResponse, readsResponse] = await Promise.all([
    db(config, '/studio_ideas?select=id,desk,author,body,pinned,tags,needs_call_from,created_at,updated_at&order=created_at.desc'),
    db(config, '/studio_idea_replies?select=id,idea_id,author,body,created_at,updated_at&order=created_at.asc'),
    db(config, '/studio_desk_reads?select=person,last_seen_at'),
  ]);
  if (!notesResponse.ok) throw new Error(await notesResponse.text());
  if (!repliesResponse.ok) throw new Error(await repliesResponse.text());

  const notes = await notesResponse.json() as Array<Record<string, unknown>>;
  const replies = repliesResponse.ok ? await repliesResponse.json() as Array<Record<string, unknown>> : [];
  const reads = readsResponse.ok ? await readsResponse.json() as Array<{ person: string; last_seen_at: string }> : [];

  return {
    notes: notes.map((row) => ({
      id: String(row.id),
      desk: String(row.desk),
      author: String(row.author),
      body: String(row.body ?? ''),
      pinned: Boolean(row.pinned),
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
      needsCallFrom: row.needs_call_from ? String(row.needs_call_from) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    })),
    replies: replies.map((row) => ({
      id: String(row.id),
      noteId: String(row.idea_id),
      author: String(row.author),
      body: String(row.body ?? ''),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    })),
    lastSeen: Object.fromEntries(reads.map((row) => [row.person, row.last_seen_at])) as Record<string, string>,
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const config = env();
  if (!config) {
    res.status(500).json({ error: 'The Studio desk service is not configured for this deployment.' });
    return;
  }

  res.setHeader('Cache-Control', 'private, no-store');
  const input = asRecord(req.body);
  const action = String(input.action ?? '');

  // Unlocking is the only action reachable without the cookie.
  if (action === 'unlock') {
    const supplied = typeof input.passphrase === 'string' ? input.passphrase : '';
    if (!sameSecret(supplied, config.passphrase)) {
      res.status(401).json({ error: 'That is not the studio passphrase.' });
      return;
    }
    const token = signToken(config.secret, Date.now());
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SECONDS}`);
    res.status(200).json({ unlocked: true });
    return;
  }

  if (!tokenIsValid(config.secret, readCookie(req, COOKIE_NAME))) {
    res.status(401).json({ error: 'The studio passphrase is required.' });
    return;
  }

  if (action === 'lock') {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    res.status(200).json({ unlocked: false });
    return;
  }

  try {
    switch (action) {
      case 'state': {
        res.status(200).json(await loadState(config));
        return;
      }

      case 'create': {
        const desk = person(input.desk);
        const author = person(input.author);
        const body = text(input.body);
        if (!desk || !author || !body) {
          res.status(400).json({ error: 'A note needs a desk, an author, and something written on it.' });
          return;
        }
        const response = await db(config, '/studio_ideas', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ desk, author, body, owner_id: null }),
        });
        if (!response.ok) throw new Error(await response.text());
        break;
      }

      case 'update': {
        const id = uuid(input.id);
        if (!id) {
          res.status(400).json({ error: 'Unknown note.' });
          return;
        }
        const patch: Record<string, unknown> = {};
        if ('body' in input) {
          const body = text(input.body);
          if (!body) {
            res.status(400).json({ error: 'A note cannot be emptied. Delete it instead.' });
            return;
          }
          patch.body = body;
        }
        if ('pinned' in input) patch.pinned = Boolean(input.pinned);
        if ('tags' in input) {
          const tags = tagList(input.tags);
          if (!tags) {
            res.status(400).json({ error: 'Tags must be a list of words.' });
            return;
          }
          patch.tags = tags;
        }
        if ('needsCallFrom' in input) {
          patch.needs_call_from = input.needsCallFrom === null ? null : person(input.needsCallFrom);
        }
        if ('desk' in input) {
          const desk = person(input.desk);
          if (!desk) {
            res.status(400).json({ error: 'Unknown desk.' });
            return;
          }
          patch.desk = desk;
        }
        if (!Object.keys(patch).length) {
          res.status(400).json({ error: 'Nothing to change.' });
          return;
        }
        const response = await db(config, `/studio_ideas?id=eq.${id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(patch),
        });
        if (!response.ok) throw new Error(await response.text());
        break;
      }

      case 'remove': {
        const id = uuid(input.id);
        if (!id) {
          res.status(400).json({ error: 'Unknown note.' });
          return;
        }
        // Replies cascade with the note.
        const response = await db(config, `/studio_ideas?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
        if (!response.ok) throw new Error(await response.text());
        break;
      }

      case 'reply': {
        const noteId = uuid(input.noteId);
        const author = person(input.author);
        const body = text(input.body);
        if (!noteId || !author || !body) {
          res.status(400).json({ error: 'A reply needs a note, an author, and something written on it.' });
          return;
        }
        const response = await db(config, '/studio_idea_replies', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ idea_id: noteId, author, body }),
        });
        if (!response.ok) throw new Error(await response.text());
        break;
      }

      case 'replyUpdate': {
        const id = uuid(input.id);
        const body = text(input.body);
        if (!id || !body) {
          res.status(400).json({ error: 'A reply cannot be emptied. Delete it instead.' });
          return;
        }
        const response = await db(config, `/studio_idea_replies?id=eq.${id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ body }),
        });
        if (!response.ok) throw new Error(await response.text());
        break;
      }

      case 'replyRemove': {
        const id = uuid(input.id);
        if (!id) {
          res.status(400).json({ error: 'Unknown reply.' });
          return;
        }
        const response = await db(config, `/studio_idea_replies?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
        if (!response.ok) throw new Error(await response.text());
        break;
      }

      case 'seen': {
        const who = person(input.person);
        if (!who) {
          res.status(400).json({ error: 'Unknown person.' });
          return;
        }
        const response = await db(config, '/studio_desk_reads', {
          method: 'POST',
          headers: { Prefer: 'return=minimal,resolution=merge-duplicates' },
          body: JSON.stringify({ person: who, last_seen_at: new Date().toISOString() }),
        });
        if (!response.ok) throw new Error(await response.text());
        break;
      }

      default:
        res.status(400).json({ error: `Unknown desk action “${action}”.` });
        return;
    }
  } catch (cause) {
    res.status(502).json({ error: 'The desk could not be updated.', detail: cause instanceof Error ? cause.message : String(cause) });
    return;
  }

  // Every mutation answers with the whole desk state, so two browsers editing the
  // same notebook converge instead of drifting apart.
  try {
    res.status(200).json(await loadState(config));
  } catch (cause) {
    res.status(502).json({ error: 'Saved, but the desk could not be reloaded.', detail: cause instanceof Error ? cause.message : String(cause) });
  }
}
