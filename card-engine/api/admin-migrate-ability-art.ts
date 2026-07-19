import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from './_lib/auth.js';
import { getAdminClientForArt, uploadAbilityArtDataUrl } from './_lib/abilityArtStorage.js';

// One-shot backfill: walks canonical_art_assets, finds rows whose
// asset_url is still a data URL, uploads the bytes to the ability-art
// bucket, and rewrites asset_url + the crops.combat/detail/relic URLs
// to the new public URL.
//
// Idempotent: skips rows that already point to a real https URL.

export const config = { maxDuration: 60 };

interface ArtRow {
  id: string;
  ability_id: string;
  asset_url: string | null;
  assets: {
    combat?: { url?: string; thumbnailUrl?: string };
    detail?: { url?: string; thumbnailUrl?: string };
    relic?: { url?: string; thumbnailUrl?: string };
  } | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const caller = await verifyUser(req);
  if (!caller || !caller.isAdmin) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const admin = getAdminClientForArt();
  if (!admin) {
    res.status(500).json({ error: 'Supabase service role not configured' });
    return;
  }

  // Single-row mode: ?assetId=xxx migrates just that row. Used by
  // canonicalArtPipeline right after a Leonardo generation so freshly
  // created candidates get their bytes moved into the bucket without
  // waiting for a bulk backfill.
  const assetId = typeof req.query.assetId === 'string' ? req.query.assetId : null;
  let selectQuery = admin
    .from('canonical_art_assets')
    .select('id, ability_id, asset_url, assets');
  if (assetId) selectQuery = selectQuery.eq('id', assetId);
  else selectQuery = selectQuery.limit(500);
  const { data, error } = await selectQuery;
  if (error) {
    res.status(500).json({ error: `select failed: ${error.message}` });
    return;
  }
  const rows = (data ?? []) as ArtRow[];

  const results = { scanned: rows.length, migrated: 0, skipped: 0, failed: 0 };
  for (const row of rows) {
    const url = row.asset_url ?? '';
    if (!url.startsWith('data:')) {
      results.skipped += 1;
      continue;
    }
    const uploaded = await uploadAbilityArtDataUrl(row.ability_id, row.id, url);
    if (!uploaded) {
      results.failed += 1;
      continue;
    }
    const newCrop = { url: uploaded.publicUrl };
    const nextAssets = row.assets
      ? {
          combat: row.assets.combat?.url?.startsWith('data:') ? newCrop : row.assets.combat ?? newCrop,
          detail: row.assets.detail?.url?.startsWith('data:') ? newCrop : row.assets.detail ?? newCrop,
          relic: row.assets.relic?.url?.startsWith('data:') ? newCrop : row.assets.relic ?? newCrop,
        }
      : { combat: newCrop, detail: newCrop, relic: newCrop };
    const { error: updErr } = await admin
      .from('canonical_art_assets')
      .update({ asset_url: uploaded.publicUrl, assets: nextAssets })
      .eq('id', row.id);
    if (updErr) {
      results.failed += 1;
      continue;
    }
    results.migrated += 1;
  }

  res.status(200).json({ checkedAt: new Date().toISOString(), ...results });
}
