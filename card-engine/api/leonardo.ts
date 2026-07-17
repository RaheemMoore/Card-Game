import type { VercelRequest, VercelResponse } from '@vercel/node';

// Single-file proxy for Leonardo. All /api/leonardo/** paths are routed here
// via a vercel.json rewrite that captures the sub-path into ?leonardoPath=.
// The [...path].ts catch-all approach had inconsistent multi-segment routing
// in Vercel — this pattern is more reliable.

export const config = { maxDuration: 60 };

const LEONARDO_UPSTREAM = 'https://cloud.leonardo.ai/api/rest/v1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.LEONARDO_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'LEONARDO_API_KEY not configured on server' });
    return;
  }

  const rawPath = req.query.leonardoPath;
  const subPath = Array.isArray(rawPath) ? rawPath.join('/') : rawPath ?? '';
  const url = `${LEONARDO_UPSTREAM}/${subPath}`;

  const method = req.method || 'GET';
  const headers: Record<string, string> = {
    accept: 'application/json',
    authorization: `Bearer ${apiKey}`,
  };

  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    headers['content-type'] = 'application/json';
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  }

  try {
    const upstream = await fetch(url, { method, headers, body });
    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);
    res.status(upstream.status).send(text);
  } catch (err) {
    console.error('Leonardo proxy error:', err);
    res.status(502).json({ error: String(err) });
  }
}
