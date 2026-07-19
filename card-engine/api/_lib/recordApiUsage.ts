import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Append-only telemetry writer for external provider calls. Uses the
// service_role key so it bypasses RLS and can record failures where the
// caller's uid might not be meaningful. No-ops (console.warn) when the
// service_role key isn't configured yet — endpoints still function during
// early Phase-0 rollout before the Supabase migration ships.

export interface ApiUsageEvent {
  provider: 'anthropic' | 'leonardo';
  operation: string;
  gameAction?: string | null;
  userId?: string | null;
  cardId?: string | null;
  testRunId?: string | null;
  providerRequestId?: string | null;
  providerGenerationId?: string | null;
  model?: string | null;
  inputUnits?: number | null;
  outputUnits?: number | null;
  unitType?: string | null;
  costAmount?: number | null;
  costCurrency?: string | null;
  costSource?: 'provider' | 'calculated' | null;
  status: 'success' | 'error' | 'timeout';
  errorCode?: string | null;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  metadata?: Record<string, unknown> | null;
}

let cachedWriter: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient | null {
  if (cachedWriter) return cachedWriter;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedWriter = createClient(url, key, { auth: { persistSession: false } });
  return cachedWriter;
}

export async function recordApiUsage(event: ApiUsageEvent): Promise<void> {
  const client = getServiceClient();
  if (!client) {
    console.warn('[api_usage_events] SUPABASE_SERVICE_ROLE_KEY unset — skipping insert', {
      provider: event.provider,
      operation: event.operation,
      status: event.status,
    });
    return;
  }
  const { error } = await client.from('api_usage_events').insert({
    provider: event.provider,
    operation: event.operation,
    game_action: event.gameAction ?? null,
    user_id: event.userId ?? null,
    card_id: event.cardId ?? null,
    test_run_id: event.testRunId ?? null,
    provider_request_id: event.providerRequestId ?? null,
    provider_generation_id: event.providerGenerationId ?? null,
    model: event.model ?? null,
    input_units: event.inputUnits ?? null,
    output_units: event.outputUnits ?? null,
    unit_type: event.unitType ?? null,
    cost_amount: event.costAmount ?? null,
    cost_currency: event.costCurrency ?? null,
    cost_source: event.costSource ?? null,
    status: event.status,
    error_code: event.errorCode ?? null,
    started_at: event.startedAt,
    completed_at: event.completedAt,
    duration_ms: event.durationMs,
    metadata: event.metadata ?? null,
  });
  if (error) {
    console.error('[api_usage_events] insert failed', error);
  }
}
