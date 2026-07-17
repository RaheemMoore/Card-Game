import type { VercelRequest, VercelResponse } from '@vercel/node';

// Production replacement for the vite dev proxy defined in vite.config.ts.
// Rewrites /api/leonardo/* -> https://cloud.leonardo.ai/api/rest/v1/* and
// injects the server-side LEONARDO_API_KEY so the key never ships to the browser.

export const config = { maxDuration: 60 };

const LEONARDO_UPSTREAM = 'https://cloud.leonardo.ai/api/rest/v1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.LEONARDO_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'LEONARDO_API_KEY not configured on server' });
    return;
  }

  const pathParam = req.query.path;
  const pathParts = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : [];
  const url = `${LEONARDO_UPSTREAM}/${pathParts.join('/')}`;

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
