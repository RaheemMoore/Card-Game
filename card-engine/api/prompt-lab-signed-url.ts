import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { verifyUser } from './_lib/auth.js';

// Mints short-lived signed URLs for objects in the private
// prompt-test-artifacts bucket so the Prompt Lab admin UI can render
// images without exposing bucket credentials.

export const config = { maxDuration: 10 };

const SIGNED_URL_TTL_SECONDS = 60 * 30;

let cachedAdmin: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedAdmin = createClient(url, key, { auth: { persistSession: false } });
  return cachedAdmin;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const caller = await verifyUser(req);
  if (!caller || !caller.isAdmin) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const admin = getAdminClient();
  if (!admin) {
    res.status(500).json({ error: 'Supabase service role not configured' });
    return;
  }
  const path = typeof req.query.path === 'string' ? req.query.path : null;
  if (!path) {
    res.status(400).json({ error: 'path query param required' });
    return;
  }
  // Belt-and-suspenders: path must stay within the bucket namespace.
  if (path.includes('..') || path.startsWith('/')) {
    res.status(400).json({ error: 'invalid path' });
    return;
  }
  const { data, error } = await admin.storage
    .from('prompt-test-artifacts')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    res.status(500).json({ error: error?.message ?? 'signed URL failed' });
    return;
  }
  res.status(200).json({ url: data.signedUrl, ttlSeconds: SIGNED_URL_TTL_SECONDS });
}
