import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from './_lib/auth.js';
import { getAdminClientForArt, uploadAbilityArtDataUrl } from './_lib/abilityArtStorage.js';

// One-shot backfill: walks canonical_art_assets, finds rows whose
// asset_url is still a data URL, uploads the bytes to the ability-art
// bucket, and rewrites both the top-level asset_url column AND the
// three crop URLs inside the `data` jsonb (assets.combat/detail/relic).
//
// Idempotent: skips rows that already point to a real https URL.

export const config = { maxDuration: 60 };

interface Crop {
  url?: string;
  thumbnailUrl?: string;
}

interface CanonicalArtData {
  id?: string;
  abilityId?: string;
  provider?: string;
  sourcePromptVersion?: string;
  assetUrl?: string;
  thumbnailUrl?: string;
  status?: string;
  createdAt?: string;
  assets?: {
    combat?: Crop;
    detail?: Crop;
    relic?: Crop;
  };
}

interface ArtRow {
  id: string;
  ability_id: string;
  asset_url: string | null;
  data: CanonicalArtData | null;
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
    .select('id, ability_id, asset_url, data');
  if (assetId) selectQuery = selectQuery.eq('id', assetId);
  else selectQuery = selectQuery.limit(500);
  const { data: rowsData, error } = await selectQuery;
  if (error) {
    res.status(500).json({ error: `select failed: ${error.message}` });
    return;
  }
  const rows = (rowsData ?? []) as ArtRow[];

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

    // Rebuild the jsonb payload: keep everything, swap URLs that are
    // still data URLs for the new public URL.
    const newCrop: Crop = { url: uploaded.publicUrl };
    const priorAssets = row.data?.assets;
    const nextAssets = {
      combat: priorAssets?.combat?.url?.startsWith('data:') ? newCrop : priorAssets?.combat ?? newCrop,
      detail: priorAssets?.detail?.url?.startsWith('data:') ? newCrop : priorAssets?.detail ?? newCrop,
      relic:  priorAssets?.relic?.url?.startsWith('data:')  ? newCrop : priorAssets?.relic  ?? newCrop,
    };
    const nextData: CanonicalArtData = {
      ...(row.data ?? {}),
      assetUrl: uploaded.publicUrl,
      assets: nextAssets,
    };

    const { error: updErr } = await admin
      .from('canonical_art_assets')
      .update({ asset_url: uploaded.publicUrl, data: nextData })
      .eq('id', row.id);
    if (updErr) {
      console.error('[migrate-ability-art] update failed', row.id, updErr);
      results.failed += 1;
      continue;
    }
    results.migrated += 1;
  }

  res.status(200).json({ checkedAt: new Date().toISOString(), ...results });
}
