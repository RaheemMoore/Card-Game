import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from './_lib/auth.js';
import { recordApiUsage } from './_lib/recordApiUsage.js';

// Server-side Anthropic Messages proxy. The browser used to call
// api.anthropic.com directly with a VITE-bundled key (i.e. a leaked key).
// This endpoint keeps ANTHROPIC_API_KEY server-only, validates the caller's
// Supabase JWT, forwards the request, and records the call in
// api_usage_events for the operations dashboard.

export const config = { maxDuration: 60 };

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

interface RequestBody {
  model: string;
  max_tokens: number;
  temperature?: number;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
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

  const body: RequestBody =
    typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as RequestBody);

  const { gameAction, cardId, ...forwardBody } = body;

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
