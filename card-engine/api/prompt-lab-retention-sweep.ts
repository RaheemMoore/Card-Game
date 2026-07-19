import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Daily Vercel Cron endpoint. Enforces plan §7's 30-day image
// retention rule: any prompt_test_runs row whose image_expires_at has
// passed and still holds output_object_path gets its storage objects
// deleted and status flipped to 'image_expired'. The prompt/response/
// judgment record survives — only the pixel bytes go.
//
// Auth: Vercel Cron sets `Authorization: Bearer $CRON_SECRET`. Skip
// unauthorized invocations so a stray external hit can't churn storage.

export const config = { maxDuration: 60 };

let cachedAdmin: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedAdmin = createClient(url, key, { auth: { persistSession: false } });
  return cachedAdmin;
}

interface ExpiringRow {
  id: string;
  output_object_path: string | null;
  thumb_object_path: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const header = req.headers.authorization ?? req.headers.Authorization;
    if (typeof header !== 'string' || header !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }
  const admin = getAdminClient();
  if (!admin) {
    res.status(500).json({ error: 'Supabase service role not configured' });
    return;
  }

  const nowIso = new Date().toISOString();
  // TODO: once prompt_change_proposals lands (Phase 6), skip runs whose
  // ids are referenced by an active proposal — plan §7 requires the
  // retention job to flag those conflicts rather than silently deleting.
  const { data: rows, error: selectErr } = await admin
    .from('prompt_test_runs')
    .select('id, output_object_path, thumb_object_path')
    .lte('image_expires_at', nowIso)
    .neq('status', 'image_expired')
    .not('output_object_path', 'is', null)
    .limit(500);
  if (selectErr) {
    res.status(500).json({ error: `Select failed: ${selectErr.message}` });
    return;
  }
  const expiring = (rows ?? []) as ExpiringRow[];

  const results = { swept: 0, deleteErrors: 0, updateErrors: 0, scanned: expiring.length };
  for (const row of expiring) {
    const paths = [row.output_object_path, row.thumb_object_path].filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    );
    if (paths.length > 0) {
      const { error: delErr } = await admin.storage.from('prompt-test-artifacts').remove(paths);
      if (delErr) {
        console.error('[retention-sweep] delete failed', row.id, delErr);
        results.deleteErrors += 1;
        continue;
      }
    }
    const { error: updErr } = await admin
      .from('prompt_test_runs')
      .update({
        status: 'image_expired',
        output_object_path: null,
        thumb_object_path: null,
      })
      .eq('id', row.id);
    if (updErr) {
      console.error('[retention-sweep] update failed', row.id, updErr);
      results.updateErrors += 1;
      continue;
    }
    results.swept += 1;
  }

  res.status(200).json({ checkedAt: nowIso, ...results });
}
