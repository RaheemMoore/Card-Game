import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from './_lib/auth.js';
import { recordApiUsage } from './_lib/recordApiUsage.js';

// Authenticated Leonardo proxy. /api/leonardo/** is routed here via a
// vercel.json rewrite that stashes the sub-path in ?leonardoPath=.
//
// Phase 0 hardening (2026-07-19):
// - Supabase JWT required (Authorization: Bearer <supabase-token>).
// - Method + sub-path allowlist — only the endpoints the client actually
//   uses. Prevents random passthrough to any Leonardo route.
// - Persist Leonardo's official `cost` object on successful generation
//   submits into api_usage_events for the ops dashboard.
// - The client's Authorization header is used for AUTH ONLY; the upstream
//   request injects the server-side LEONARDO_API_KEY.
//
// Rate limiting is deferred: in-memory limits don't survive serverless
// cold starts and a DB-backed limit would cost extra GB-hours on Hobby.
// Auth + allowlist are the load-bearing checks until Phase 1.

export const config = { maxDuration: 60 };

const LEONARDO_UPSTREAM = 'https://cloud.leonardo.ai/api/rest/v1';

interface AllowRule {
  method: 'GET' | 'POST';
  test: (subPath: string) => boolean;
  operation: string;
}

const ALLOW_RULES: readonly AllowRule[] = [
  { method: 'POST', test: (p) => p === 'generations',                         operation: 'generations.submit' },
  { method: 'GET',  test: (p) => /^generations\/[A-Za-z0-9_-]+$/.test(p),    operation: 'generations.poll'   },
  { method: 'POST', test: (p) => p === 'init-image',                          operation: 'init-image'         },
  { method: 'GET',  test: (p) => p === 'me',                                  operation: 'account.me'         },
];

function matchRule(method: string, subPath: string): AllowRule | null {
  const m = method as 'GET' | 'POST';
  return ALLOW_RULES.find((r) => r.method === m && r.test(subPath)) ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.LEONARDO_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'LEONARDO_API_KEY not configured on server' });
    return;
  }

  const caller = await verifyUser(req);
  if (!caller) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const rawPath = req.query.leonardoPath;
  const subPath = Array.isArray(rawPath) ? rawPath.join('/') : rawPath ?? '';
  const method = (req.method ?? 'GET').toUpperCase();
  const rule = matchRule(method, subPath);
  if (!rule) {
    res.status(403).json({ error: 'Path not allowlisted', method, subPath });
    return;
  }

  const url = `${LEONARDO_UPSTREAM}/${subPath}`;
  const headers: Record<string, string> = {
    accept: 'application/json',
    authorization: `Bearer ${apiKey}`,
  };
  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    headers['content-type'] = 'application/json';
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  }

  const startedAt = new Date().toISOString();
  const startedMs = Date.now();

  try {
    const upstream = await fetch(url, { method, headers, body });
    const text = await upstream.text();
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startedMs;

    // Cost + generation ID only exist on the submit call. Parse best-effort;
    // never let a logging failure sink the response.
    let providerGenerationId: string | null = null;
    let costAmount: number | null = null;
    let costCurrency: string | null = null;
    if (upstream.ok && rule.operation === 'generations.submit') {
      try {
        const parsed = JSON.parse(text) as {
          sdGenerationJob?: {
            generationId?: string;
            cost?: { amount?: string | number; currency?: string };
          };
        };
        const job = parsed.sdGenerationJob;
        providerGenerationId = job?.generationId ?? null;
        const rawAmount = job?.cost?.amount;
        if (typeof rawAmount === 'number') costAmount = rawAmount;
        else if (typeof rawAmount === 'string') {
          const n = Number.parseFloat(rawAmount);
          if (Number.isFinite(n)) costAmount = n;
        }
        costCurrency = job?.cost?.currency ?? null;
      } catch {
        // Non-JSON body — skip cost extraction.
      }
    }

    await recordApiUsage({
      provider: 'leonardo',
      operation: rule.operation,
      userId: caller.userId,
      providerGenerationId,
      costAmount,
      costCurrency,
      costSource: costAmount == null ? null : 'provider',
      status: upstream.ok ? 'success' : 'error',
      errorCode: upstream.ok ? null : String(upstream.status),
      startedAt,
      completedAt,
      durationMs,
      metadata: { subPath },
    }).catch((err) => console.error('[leonardo] recordApiUsage threw', err));

    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);
    res.status(upstream.status).send(text);
  } catch (err) {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startedMs;
    await recordApiUsage({
      provider: 'leonardo',
      operation: rule.operation,
      userId: caller.userId,
      status: 'error',
      errorCode: 'network_error',
      startedAt,
      completedAt,
      durationMs,
      metadata: { subPath, message: String(err) },
    }).catch(() => {});
    console.error('Leonardo proxy error:', err);
    res.status(502).json({ error: String(err) });
  }
}
