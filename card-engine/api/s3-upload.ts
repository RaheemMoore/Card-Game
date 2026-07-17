import type { VercelRequest, VercelResponse } from '@vercel/node';

// Production replacement for the s3UploadProxy vite plugin in vite.config.ts.
// Takes { url, fields, base64, ext } from the client, rebuilds the multipart
// form Leonardo's presigned S3 URL expects, and forwards it.

export const config = { maxDuration: 30 };

interface S3UploadBody {
  url: string;
  fields: Record<string, string>;
  base64: string;
  ext: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('POST only');
    return;
  }

  const body =
    typeof req.body === 'string' ? (JSON.parse(req.body) as S3UploadBody) : (req.body as S3UploadBody);
  const { url, fields, base64, ext } = body;

  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  const imageBuffer = Buffer.from(base64, 'base64');
  const mime = ext === 'jpg' ? 'image/jpeg' : 'image/png';
  const blob = new Blob([imageBuffer], { type: mime });
  form.append('file', blob, `init.${ext}`);

  try {
    const upstream = await fetch(url, { method: 'POST', body: form });
    const buf = await upstream.arrayBuffer();
    res.status(upstream.status).send(Buffer.from(buf));
  } catch (err) {
    console.error('S3 upload proxy error:', err);
    res.status(502).send(String(err));
  }
}
