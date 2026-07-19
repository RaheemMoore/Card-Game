import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from './_lib/auth.js';

// Phase 0 diagnostic spike — probes the Anthropic Admin API against the
// project's ANTHROPIC_ADMIN_API_KEY and returns a JSON report of what
// actually works. Admin-only. Not surfaced in the UI; the report drives
// the design of the eventual Overview provider module.
//
// Documented endpoints to probe (as of 2026-07):
//   GET /v1/organizations/me
//   GET /v1/organizations/usage_report/messages?starting_at=…
//   GET /v1/organizations/cost_report?starting_at=…
//   GET /v1/organizations/api_keys
//
// None of these carry a "balance." Anthropic's org billing surfaces only
// usage + cost — the balance concept is a Console-only artifact. The
// probe confirms that empirically so we can display "Live balance
// unavailable" with correct diagnostic context per the plan §4.

export const config = { maxDuration: 30 };

const ADMIN_BASE = 'https://api.anthropic.com';
const ANTHROPIC_VERSION = '2023-06-01';

interface ProbeResult {
  endpoint: string;
  status: number;
  ok: boolean;
  durationMs: number;
  bodySample: unknown;
  headersSample: Record<string, string>;
}

async function probe(path: string, apiKey: string, params?: URLSearchParams): Promise<ProbeResult> {
  const url = params ? `${ADMIN_BASE}${path}?${params}` : `${ADMIN_BASE}${path}`;
  const started = Date.now();
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'accept': 'application/json',
      },
    });
    const text = await r.text();
    let body: unknown;
    try {
      const parsed = JSON.parse(text);
      // Truncate long arrays/strings so the diagnostic stays readable.
      body = typeof parsed === 'object' && parsed !== null
        ? JSON.parse(JSON.stringify(parsed).slice(0, 4000))
        : parsed;
    } catch {
      body = text.slice(0, 500);
    }
    return {
      endpoint: url,
      status: r.status,
      ok: r.ok,
      durationMs: Date.now() - started,
      bodySample: body,
      headersSample: {
        'content-type': r.headers.get('content-type') ?? '',
        'request-id': r.headers.get('request-id') ?? '',
      },
    };
  } catch (err) {
    return {
      endpoint: url,
      status: 0,
      ok: false,
      durationMs: Date.now() - started,
      bodySample: String(err),
      headersSample: {},
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const caller = await verifyUser(req);
  if (!caller || !caller.isAdmin) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const apiKey = process.env.ANTHROPIC_ADMIN_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_ADMIN_API_KEY not configured on server' });
    return;
  }

  // Last 24h window for the usage/cost probes.
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().replace(/\.\d+Z$/, 'Z');

  const usageParams = new URLSearchParams({
    starting_at: iso(start),
    ending_at: iso(end),
  });
  const costParams = new URLSearchParams({
    starting_at: iso(start),
    ending_at: iso(end),
  });

  const probes = await Promise.all([
    probe('/v1/organizations/me', apiKey),
    probe('/v1/organizations/usage_report/messages', apiKey, usageParams),
    probe('/v1/organizations/cost_report', apiKey, costParams),
    probe('/v1/organizations/api_keys', apiKey),
  ]);

  const workingEndpoints = probes.filter((p) => p.ok).map((p) => p.endpoint);
  const failing = probes.filter((p) => !p.ok);

  res.status(200).json({
    caller: { userId: caller.userId, email: caller.email },
    window: { start: iso(start), end: iso(end) },
    conclusion: {
      balanceEndpointFound: false,
      workingEndpoints,
      failing: failing.map((p) => ({ endpoint: p.endpoint, status: p.status })),
    },
    probes,
  });
}
