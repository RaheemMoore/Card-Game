import type { VercelRequest, VercelResponse } from '@vercel/node';
import { costsSummary } from './_lib/probes/admin-costs-summary.js';
import { leonardoBalance } from './_lib/probes/admin-leonardo-balance.js';
import { anthropicAdminUsage } from './_lib/probes/anthropic-admin-usage.js';
import { leonardoAccount } from './_lib/probes/leonardo-account.js';

/**
 * One endpoint for every read-only admin report.
 *
 * These were four separate functions — a Leonardo balance, an Anthropic usage
 * probe, a Leonardo account probe, and the cost rollup. Four servers to answer
 * four questions that are all "tell me a number about a provider".
 *
 * They were merged because Vercel's Hobby plan allows **12 Serverless Functions
 * per deployment** and every file in `api/` is one. All twelve were in use, so
 * the next endpoint anyone added would have made thirteen and the DEPLOY would
 * fail — after a completely successful build, which reads as an infrastructure
 * fault rather than a quota. That is exactly what blocked the Workshop from
 * shipping on 2026-08-10, and it was only fixable by deleting an endpoint.
 *
 * Merging these four took the count from 12 to 8.
 *
 * The probe bodies were MOVED, not rewritten — they live in `_lib/probes/`
 * (Vercel does not route directories beginning with `_`) with their logic
 * untouched. This file only decides which one runs.
 *
 * Longer term this endpoint should not ship at all. The released game needs no
 * serverless functions: it carries the curated roster and nothing that spends
 * money. Every function here serves the two operators building that roster, so
 * the admin surface belongs in its own deployment, separate from the game.
 */

export const config = { maxDuration: 30 };

type Probe = 'leonardo-balance' | 'costs' | 'anthropic-usage' | 'leonardo-account';

const PROBES: Record<Probe, (req: VercelRequest, res: VercelResponse) => Promise<void>> = {
  'leonardo-balance': leonardoBalance,
  costs: costsSummary,
  'anthropic-usage': anthropicAdminUsage,
  'leonardo-account': leonardoAccount,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const probe = String(req.query.probe ?? '');

  if (!(probe in PROBES)) {
    // Name the valid options rather than a bare 400 — the caller is one of two
    // people and the answer is a short list.
    res.status(400).json({
      error: probe ? `Unknown probe "${probe}"` : 'Missing ?probe=',
      probes: Object.keys(PROBES),
    });
    return;
  }

  // Each probe still performs its own admin check, exactly as it did when it
  // was its own route. Left in place deliberately: one shared gate here would
  // be a second place to get authorization wrong.
  await PROBES[probe as Probe](req, res);
}
