import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser, isPrivilegedRole } from './_lib/auth.js';
import {
  decodeImageDataUrl,
  isSafePathSegment,
  uploadCuratedArt,
} from './_lib/curatedArtStorage.js';

// The Workshop's image upload — the first place in this app where a
// human-supplied FILE reaches storage. Everything else that lands in a bucket
// is a data URL we generated ourselves, so the hardening here is copied from
// api/s3-upload.ts rather than invented:
//
//   - Supabase JWT required, and the caller must be an operator.
//   - Only a real image data URL, only png/jpg/webp.
//   - Decoded bytes capped at 5 MB.
//   - Every path segment validated, never sanitised into something
//     almost-right.
//
// Two deliberate differences from s3-upload:
//
//   - No spend gate. This costs nothing; it is authorization-gated, not
//     wallet-gated.
//   - No api_usage_events row. That table is the PAID-provider ledger — its
//     `provider` column is constrained to ('anthropic','leonardo') and it feeds
//     the Costs dashboard. Recording free storage writes there would mean
//     widening the constraint and filling the spend view with zero-cost noise.

export const config = { maxDuration: 30 };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_RANKS: readonly string[] = ['foundation', 'forged', 'ascendant'];

interface UploadBody {
  characterId: string;
  /** An element name lowercased, or `_master` for the derived-art source. */
  scope: string;
  rank: string;
  /** `data:image/png;base64,...` — a bare base64 string is rejected. */
  dataUrl: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const caller = await verifyUser(req);
  if (!caller) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  // 401 said "who are you"; this says "you are known and not an operator".
  // Authoring the permanent roster is a director/admin action.
  if (!isPrivilegedRole(caller.role)) {
    res.status(403).json({
      error: caller.roleLookupAvailable
        ? 'Operator role required'
        : 'Role lookup unavailable on this deployment',
    });
    return;
  }

  let body: UploadBody;
  try {
    body = typeof req.body === 'string' ? (JSON.parse(req.body) as UploadBody) : (req.body as UploadBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const { characterId, scope, rank, dataUrl } = body ?? ({} as UploadBody);
  if (!characterId || !scope || !rank || !dataUrl) {
    res.status(400).json({ error: 'Missing characterId/scope/rank/dataUrl' });
    return;
  }

  const normalizedRank = rank.toLowerCase();
  if (!ALLOWED_RANKS.includes(normalizedRank)) {
    res.status(400).json({ error: `rank must be one of ${ALLOWED_RANKS.join(', ')}` });
    return;
  }
  // `_master` is the one segment allowed to carry a leading underscore.
  const scopeOk = scope === '_master' || isSafePathSegment(scope);
  if (!isSafePathSegment(characterId) || !scopeOk) {
    res.status(400).json({ error: 'Invalid characterId or scope' });
    return;
  }

  const decoded = decodeImageDataUrl(dataUrl);
  if (!decoded) {
    res.status(400).json({ error: 'dataUrl must be a base64 png, jpg, or webp image' });
    return;
  }
  if (decoded.buffer.byteLength > MAX_IMAGE_BYTES) {
    res.status(413).json({ error: `Image exceeds ${MAX_IMAGE_BYTES} bytes` });
    return;
  }

  try {
    const uploaded = await uploadCuratedArt(characterId, scope, normalizedRank, decoded);
    if (!uploaded) {
      console.error('[curated-art-upload] storage upload failed', {
        characterId,
        scope,
        rank: normalizedRank,
      });
      res.status(502).json({ error: 'Storage upload failed' });
      return;
    }
    res.status(200).json(uploaded);
  } catch (err) {
    console.error('[curated-art-upload] error:', err);
    res.status(502).json({ error: String(err) });
  }
}
