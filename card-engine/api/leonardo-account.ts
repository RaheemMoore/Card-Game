import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from './_lib/auth.js';

// Phase 0 diagnostic spike — probes Leonardo's account endpoints on the
// project's LEONARDO_API_KEY to see what live balance/quota data is
// reachable. Admin-only. Not surfaced in the UI; the report drives the
// Overview provider module design.
//
// Documented endpoints:
//   GET /me — returns user_details including tokenBalance,
//             subscriptionTokens, subscriptionModelTokens.
//
// Their production API historically exposes credit balance directly on
// /me. This confirms whether it's still true on the current plan and
// documents field names for the eventual dashboard.

export const config = { maxDuration: 30 };

const LEONARDO_BASE = 'https://cloud.leonardo.ai/api/rest/v1';

interface ProbeResult {
  endpoint: string;
  method: string;
  status: number;
  ok: boolean;
  durationMs: number;
  bodySample: unknown;
}

async function probe(path: string, apiKey: string): Promise<ProbeResult> {
  const url = `${LEONARDO_BASE}${path}`;
  const started = Date.now();
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
    });
    const text = await r.text();
    let body: unknown;
    try {
      const parsed = JSON.parse(text);
      body = typeof parsed === 'object' && parsed !== null
        ? JSON.parse(JSON.stringify(parsed).slice(0, 4000))
        : parsed;
    } catch {
      body = text.slice(0, 500);
    }
    return {
      endpoint: url,
      method: 'GET',
      status: r.status,
      ok: r.ok,
      durationMs: Date.now() - started,
      bodySample: body,
    };
  } catch (err) {
    return {
      endpoint: url,
      method: 'GET',
      status: 0,
      ok: false,
      durationMs: Date.now() - started,
      bodySample: String(err),
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const caller = await verifyUser(req);
  if (!caller || !caller.isAdmin) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const apiKey = process.env.LEONARDO_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'LEONARDO_API_KEY not configured on server' });
    return;
  }

  const probes = await Promise.all([probe('/me', apiKey)]);
  const meProbe = probes[0];

  // Extract the balance-shaped fields if the response matches the
  // documented shape. Anything unrecognized surfaces raw.
  let balanceView: Record<string, unknown> | null = null;
  if (meProbe.ok && typeof meProbe.bodySample === 'object' && meProbe.bodySample !== null) {
    const body = meProbe.bodySample as { user_details?: Array<Record<string, unknown>> };
    const first = body.user_details?.[0];
    if (first) {
      balanceView = {
        tokenBalance: first.tokenBalance ?? null,
        subscriptionTokens: first.subscriptionTokens ?? null,
        subscriptionGptTokens: first.subscriptionGptTokens ?? null,
        subscriptionModelTokens: first.subscriptionModelTokens ?? null,
        apiPlanTokenRenewalDate: first.apiPlanTokenRenewalDate ?? null,
      };
    }
  }

  res.status(200).json({
    caller: { userId: caller.userId, email: caller.email },
    conclusion: {
      balanceEndpointFound: balanceView !== null,
      liveBalanceFieldsAvailable: balanceView !== null ? Object.keys(balanceView) : [],
    },
    balanceView,
    probes,
  });
}
