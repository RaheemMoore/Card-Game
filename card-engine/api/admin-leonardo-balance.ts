import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from './_lib/auth.js';

// Admin-only Leonardo balance endpoint.
//
// Live balance = subscriptionTokens + apiPaidTokens per Leonardo's /me
// response shape. Both fields renew (subscription monthly, paid tokens
// on purchase); tokenRenewalDate marks the next subscription reset.
//
// Cheap enough to call on every Overview load (~90ms upstream, one
// outbound HTTP). No caching layer yet — revisit if Hobby GB-hours
// pressure shows up.

export const config = { maxDuration: 15 };

const LEONARDO_URL = 'https://cloud.leonardo.ai/api/rest/v1/me';

interface LeonardoUserDetails {
  paidTokens?: number;
  subscriptionTokens?: number;
  subscriptionGptTokens?: number;
  subscriptionModelTokens?: number;
  apiConcurrencySlots?: number;
  apiPaidTokens?: number;
  apiSubscriptionTokens?: number | null;
  tokenRenewalDate?: string | null;
  apiPlanTokenRenewalDate?: string | null;
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

  const checkedAt = new Date().toISOString();
  try {
    const r = await fetch(LEONARDO_URL, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
    });
    if (!r.ok) {
      res.status(200).json({
        checkedAt,
        available: false,
        error: `Leonardo /me returned ${r.status}`,
      });
      return;
    }
    const data = (await r.json()) as { user_details?: LeonardoUserDetails[] };
    const details = data.user_details?.[0];
    if (!details) {
      res.status(200).json({
        checkedAt,
        available: false,
        error: 'Leonardo /me returned no user_details',
      });
      return;
    }

    const subscriptionTokens = details.subscriptionTokens ?? 0;
    const apiPaidTokens = details.apiPaidTokens ?? 0;
    const totalTokens = subscriptionTokens + apiPaidTokens;

    res.status(200).json({
      checkedAt,
      available: true,
      source: 'provider',
      unit: 'tokens',
      totalTokens,
      breakdown: {
        subscriptionTokens,
        apiPaidTokens,
        subscriptionGptTokens: details.subscriptionGptTokens ?? 0,
        subscriptionModelTokens: details.subscriptionModelTokens ?? 0,
      },
      renewalDate: details.tokenRenewalDate ?? null,
      apiPlanRenewalDate: details.apiPlanTokenRenewalDate ?? null,
      concurrencySlots: details.apiConcurrencySlots ?? null,
    });
  } catch (err) {
    res.status(200).json({
      checkedAt,
      available: false,
      error: String(err),
    });
  }
}
