import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-side helper for putting curated card art into the public
// `curated-art` bucket. Sibling of abilityArtStorage.ts, same reasoning:
// shared game content with no per-user semantics, so a public bucket with
// gated writes beats a private one with per-view signed URLs.
//
// Deliberately NOT the `portraits` bucket — that one is private and strictly
// owner-path-scoped, with no operator policy at all.
//
// Path: {characterId}/{element|_master}/{rank}.{ext}

const BUCKET = 'curated-art';

let cachedAdmin: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedAdmin = createClient(url, key, { auth: { persistSession: false } });
  return cachedAdmin;
}

export interface UploadedCuratedArt {
  path: string;
  publicUrl: string;
  bytes: number;
}

export interface DecodedImage {
  buffer: Buffer;
  mime: string;
  ext: string;
}

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/**
 * Decode a `data:image/...;base64,...` URL. Returns null on anything that is
 * not one — including a bare base64 string, which callers must not send.
 */
export function decodeImageDataUrl(dataUrl: string): DecodedImage | null {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const ext = Object.keys(MIME_BY_EXT).find((k) => MIME_BY_EXT[k] === mime);
  if (!ext) return null;
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.byteLength === 0) return null;
  // Normalise jpg/jpeg to one stored extension.
  return { buffer, mime, ext: ext === 'jpeg' ? 'jpg' : ext };
}

/**
 * Path segments come from the client, so they are validated rather than
 * trusted. Anything with a separator, a traversal, or a character outside the
 * safe set is rejected — never sanitised into something almost-right.
 */
export function isSafePathSegment(segment: string): boolean {
  if (!segment || segment.length > 128) return false;
  if (segment.includes('..')) return false;
  return /^[A-Za-z0-9_-]+$/.test(segment);
}

export async function uploadCuratedArt(
  characterId: string,
  scope: string,
  rank: string,
  decoded: DecodedImage,
): Promise<UploadedCuratedArt | null> {
  const admin = getAdminClient();
  if (!admin) return null;

  const path = `${characterId}/${scope}/${rank}.${decoded.ext}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, decoded.buffer, {
    contentType: decoded.mime,
    upsert: true,
  });
  if (error) return null;

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl, bytes: decoded.buffer.byteLength };
}

export function getAdminClientForCuratedArt(): SupabaseClient | null {
  return getAdminClient();
}
