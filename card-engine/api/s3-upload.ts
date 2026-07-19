import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from './_lib/auth.js';
import { recordApiUsage } from './_lib/recordApiUsage.js';

// Server-side init-image upload relay. Leonardo's /init-image endpoint
// returns a presigned S3 URL + form fields; the browser can't POST that
// multipart form directly (CORS + FormData quirks), so we forward it.
//
// Phase 0 hardening (2026-07-19):
// - Supabase JWT required.
// - `url` must be an AWS S3 presigned URL — no arbitrary outbound forwarding.
// - Decoded image capped at 5 MB and restricted to PNG/JPEG.
// - Every attempt logged to api_usage_events.

export const config = { maxDuration: 30 };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTS: readonly string[] = ['png', 'jpg', 'jpeg'];

interface S3UploadBody {
  url: string;
  fields: Record<string, string>;
  base64: string;
  ext: string;
}

function isAllowedS3Host(target: string): boolean {
  try {
    const u = new URL(target);
    if (u.protocol !== 'https:') return false;
    // Leonardo presigns to *.amazonaws.com — pattern:
    // https://<bucket>.s3.<region>.amazonaws.com/...
    // Match on hostname suffix rather than a fixed bucket so the region
    // can shift without a code push.
    return u.hostname.endsWith('.amazonaws.com');
  } catch {
    return false;
  }
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

  let body: S3UploadBody;
  try {
    body = typeof req.body === 'string' ? (JSON.parse(req.body) as S3UploadBody) : (req.body as S3UploadBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const { url, fields, base64, ext } = body ?? ({} as S3UploadBody);
  if (!url || !fields || !base64 || !ext) {
    res.status(400).json({ error: 'Missing url/fields/base64/ext' });
    return;
  }
  if (!isAllowedS3Host(url)) {
    res.status(403).json({ error: 'Destination host not allowlisted' });
    return;
  }
  const normalizedExt = ext.toLowerCase();
  if (!ALLOWED_EXTS.includes(normalizedExt)) {
    res.status(400).json({ error: `ext must be one of ${ALLOWED_EXTS.join(', ')}` });
    return;
  }

  const imageBuffer = Buffer.from(base64, 'base64');
  if (imageBuffer.byteLength === 0) {
    res.status(400).json({ error: 'Decoded image is empty' });
    return;
  }
  if (imageBuffer.byteLength > MAX_IMAGE_BYTES) {
    res.status(413).json({ error: `Image exceeds ${MAX_IMAGE_BYTES} bytes` });
    return;
  }

  const startedAt = new Date().toISOString();
  const startedMs = Date.now();

  try {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }
    const mime = normalizedExt === 'jpg' || normalizedExt === 'jpeg' ? 'image/jpeg' : 'image/png';
    const blob = new Blob([imageBuffer], { type: mime });
    form.append('file', blob, `init.${normalizedExt}`);

    const upstream = await fetch(url, { method: 'POST', body: form });
    const buf = await upstream.arrayBuffer();
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startedMs;

    await recordApiUsage({
      provider: 'leonardo',
      operation: 'init-image.upload',
      userId: caller.userId,
      status: upstream.ok ? 'success' : 'error',
      errorCode: upstream.ok ? null : String(upstream.status),
      startedAt,
      completedAt,
      durationMs,
      metadata: { sizeBytes: imageBuffer.byteLength, ext: normalizedExt },
    }).catch((err) => console.error('[s3-upload] recordApiUsage threw', err));

    res.status(upstream.status).send(Buffer.from(buf));
  } catch (err) {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startedMs;
    await recordApiUsage({
      provider: 'leonardo',
      operation: 'init-image.upload',
      userId: caller.userId,
      status: 'error',
      errorCode: 'network_error',
      startedAt,
      completedAt,
      durationMs,
      metadata: { message: String(err) },
    }).catch(() => {});
    console.error('S3 upload proxy error:', err);
    res.status(502).send(String(err));
  }
}
