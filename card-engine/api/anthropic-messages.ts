import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from './_lib/auth.js';
import { recordApiUsage } from './_lib/recordApiUsage.js';
import { denyIfCannotSpend } from './_lib/spendGate.js';

// Server-side Anthropic Messages proxy. The browser used to call
// api.anthropic.com directly with a VITE-bundled key (i.e. a leaked key).
// This endpoint keeps ANTHROPIC_API_KEY server-only, validates the caller's
// Supabase JWT, forwards the request, and records the call in
// api_usage_events for the operations dashboard.

export const config = { maxDuration: 60 };

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * `content` widened to accept blocks as well as a plain string (2026-08-10).
 *
 * The handler already forwarded whatever it was given — it spreads
 * `...forwardBody` into the upstream request — so image blocks worked in
 * practice and only the type said otherwise. The Workshop reads a character's
 * three rank images to write its identity sheet, and a lie in the type is the
 * kind of thing that gets "fixed" later by someone who trusts it.
 *
 * Blocks are not inspected here. This is a proxy; Anthropic validates the
 * shape, and narrowing it locally would mean re-implementing their schema and
 * falling behind it.
 */
type ContentBlock = Record<string, unknown>;

interface RequestBody {
  model: string;
  max_tokens: number;
  temperature?: number;
  messages: Array<{ role: 'user' | 'assistant'; content: string | ContentBlock[] }>;
  gameAction?: string;
  cardId?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
    return;
  }

  const caller = await verifyUser(req);
  if (!caller) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // 401 says "who are you"; this says "you are known and not allowed to spend".
  // Layered deliberately — see api/_lib/spendGate.ts.
  if (await denyIfCannotSpend(res, caller, { provider: 'anthropic', operation: 'messages' })) return;

  const body: RequestBody =
    typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as RequestBody);

  const { gameAction, cardId, ...forwardBody } = body;

  // The Lore Desk's actions (desk_*) are a two-person tool — the spend gate
  // already blocks anonymous sessions, but a crystal-holding ordinary player
  // must not be able to invoke desk AI either.
  if (gameAction?.startsWith('desk_') && !caller.isPrivileged) {
    res.status(403).json({ error: 'Desk AI actions need a lore director or admin account' });
    return;
  }

  const startedAt = new Date().toISOString();
  const startedMs = Date.now();

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(forwardBody),
    });

    const text = await upstream.text();
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startedMs;

    // Best-effort telemetry — never let a logging failure sink the response.
    let usage: { input_tokens?: number; output_tokens?: number } | undefined;
    let providerRequestId: string | null = upstream.headers.get('request-id');
    let stopReason: string | undefined;
    try {
      const parsed = JSON.parse(text) as {
        id?: string;
        usage?: { input_tokens?: number; output_tokens?: number };
        stop_reason?: string;
      };
      usage = parsed.usage;
      providerRequestId ??= parsed.id ?? null;
      stopReason = parsed.stop_reason;
    } catch {
      // non-JSON error body from upstream; leave usage undefined
    }

    // Await the insert before responding — Vercel serverless kills the
    // invocation the moment we call res.send(), which was silently
    // dropping every recordApiUsage promise mid-flight.
    await recordApiUsage({
      provider: 'anthropic',
      operation: 'messages',
      gameAction: gameAction ?? null,
      userId: caller.userId,
      cardId: cardId ?? null,
      providerRequestId,
      model: forwardBody.model,
      inputUnits: usage?.input_tokens ?? null,
      outputUnits: usage?.output_tokens ?? null,
      unitType: 'tokens',
      costSource: null,
      costAmount: null,
      costCurrency: null,
      status: upstream.ok ? 'success' : 'error',
      errorCode: upstream.ok ? null : String(upstream.status),
      startedAt,
      completedAt,
      durationMs,
      metadata: { stop_reason: stopReason ?? null },
    }).catch((err) => console.error('[anthropic-messages] recordApiUsage threw', err));

    res.status(upstream.status).setHeader('content-type', 'application/json').send(text);
  } catch (err) {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startedMs;
    await recordApiUsage({
      provider: 'anthropic',
      operation: 'messages',
      gameAction: gameAction ?? null,
      userId: caller.userId,
      cardId: cardId ?? null,
      model: forwardBody.model,
      unitType: 'tokens',
      status: 'error',
      errorCode: 'network_error',
      startedAt,
      completedAt,
      durationMs,
      metadata: { message: String(err) },
    }).catch(() => {});
    console.error('Anthropic proxy error:', err);
    res.status(502).json({ error: String(err) });
  }
}
