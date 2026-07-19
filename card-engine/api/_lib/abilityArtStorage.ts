import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-side helper for uploading ability art bytes into the public
// `ability-art` bucket. Reused by the initial data-URL backfill and by
// future Leonardo generation flows.

const BUCKET = 'ability-art';

let cachedAdmin: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedAdmin = createClient(url, key, { auth: { persistSession: false } });
  return cachedAdmin;
}

export interface UploadedAsset {
  path: string;
  publicUrl: string;
}

function decodeDataUrl(dataUrl: string): { buffer: Buffer; mime: string; ext: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return { buffer, mime, ext };
}

export async function uploadAbilityArtDataUrl(
  abilityId: string,
  assetId: string,
  dataUrl: string,
): Promise<UploadedAsset | null> {
  const admin = getAdminClient();
  if (!admin) return null;
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return null;
  const path = `${abilityId}/${assetId}.${decoded.ext}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, decoded.buffer, {
    contentType: decoded.mime,
    upsert: true,
  });
  if (error) return null;
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export function getAdminClientForArt(): SupabaseClient | null {
  return getAdminClient();
}
