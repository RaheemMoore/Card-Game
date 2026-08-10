import type { Rank } from '../../types/card';
import type { ElementName } from '../../types/bible';
import type { CuratedRankArt } from '../../types/curatedCard';
import { getSupabaseClient } from '../persistence/supabaseClient';

/**
 * Client half of the curated-art upload.
 *
 * The bytes go through /api/curated-art-upload rather than straight to Supabase
 * storage from the browser, for the same reason every paid provider call is
 * proxied: the write is service-role, and the validation (size cap, extension
 * allowlist, path-segment checks) has to live somewhere the browser cannot
 * skip.
 */

/** Matches the endpoint's cap. Checked here too so a 6 MB file fails instantly. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export interface UploadedArt {
  path: string;
  publicUrl: string;
  bytes: number;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Local validation. Returns a human sentence, or null when the file is fine.
 * Deliberately checks the same rules the server does — the server is the
 * authority, but a 5 MB round trip to be told "too big" is a bad way to learn.
 */
export function validateImageFile(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name} is ${file.type || 'an unknown type'}. PNG, JPEG, or WebP only.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `${file.name} is ${mb} MB. The limit is 5 MB.`;
  }
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
}

async function authHeader(): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured — art cannot be uploaded.');
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No session — sign in before uploading art.');
  return `Bearer ${token}`;
}

/**
 * `scope` is the element the art belongs to, or `_master` for the set that
 * derived variants reuse.
 */
export async function uploadRankArt(input: {
  characterId: string;
  scope: ElementName | '_master';
  rank: Rank;
  dataUrl: string;
}): Promise<UploadedArt> {
  const authorization = await authHeader();
  const response = await fetch('/api/curated-art-upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization },
    body: JSON.stringify({
      characterId: input.characterId,
      scope: input.scope === '_master' ? '_master' : input.scope.toLowerCase(),
      rank: input.rank.toLowerCase(),
      dataUrl: input.dataUrl,
    }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Upload failed (${response.status})`);
  }
  return (await response.json()) as UploadedArt;
}

/** Upload a file and return the rank-art record to store on the character. */
export async function uploadRankArtFile(input: {
  characterId: string;
  scope: ElementName | '_master';
  rank: Rank;
  file: File;
}): Promise<CuratedRankArt> {
  const problem = validateImageFile(input.file);
  if (problem) throw new Error(problem);
  const dataUrl = await readFileAsDataUrl(input.file);
  const uploaded = await uploadRankArt({ ...input, dataUrl });
  return {
    rank: input.rank,
    portraitUrl: uploaded.publicUrl,
    storagePath: uploaded.path,
    // Text is Tori's, filled at her desk. Empty here rather than a placeholder
    // that could be mistaken for authored copy.
    cardName: '',
    nameAndTitle: '',
    lore: '',
  };
}
