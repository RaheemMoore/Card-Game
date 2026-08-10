import { describeProxyFailure } from './proxyErrors';
import { getSupabaseClient } from './persistence/supabaseClient';

// Phase-0 client shim. The Anthropic Messages API is no longer callable
// from the browser — the key was baked into the client bundle. All calls
// now go through /api/anthropic-messages, which validates the caller's
// Supabase JWT and records usage into api_usage_events.

/**
 * A content block — text, or an image the model should look at.
 *
 * Deliberately loose. This is a pass-through to Anthropic's API; typing the
 * full block union here would mean maintaining a copy of their schema and
 * silently falling behind it. The endpoint forwards the body verbatim and
 * Anthropic validates.
 */
export type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'url'; url: string } }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

export interface AnthropicMessagesRequest {
  model: string;
  max_tokens: number;
  temperature?: number;
  /**
   * `content` accepts blocks as well as a plain string (2026-08-10). The proxy
   * always forwarded them; only this type said otherwise. The Workshop reads a
   * character's three rank images to describe them.
   */
  messages: Array<{ role: 'user' | 'assistant'; content: string | AnthropicContentBlock[] }>;
  /** Optional telemetry tag surfaced in the ops dashboard. */
  gameAction?: string;
  cardId?: string;
}

export interface AnthropicMessagesResponse {
  id?: string;
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

async function getAuthHeader(): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured — anthropic-messages requires a signed-in session.');
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('No Supabase session — sign in before calling the AI pipeline.');
  }
  return `Bearer ${token}`;
}

export async function callAnthropicMessages(
  body: AnthropicMessagesRequest,
): Promise<AnthropicMessagesResponse> {
  const authorization = await getAuthHeader();
  const response = await fetch('/api/anthropic-messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await describeProxyFailure(response, 'Anthropic'));
  }
  return (await response.json()) as AnthropicMessagesResponse;
}
