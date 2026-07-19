import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { verifyUser } from './_lib/auth.js';
import { calculateAnthropicCostUsd } from './_lib/anthropicPricing.js';

// Admin-only Costs summary. Aggregates api_usage_events into the shape
// the /admin/costs page needs. Single round-trip so the Costs page
// stays responsive on Hobby.
//
// Cost source rules (plan §4 truthfulness):
//   - Leonardo generations.submit rows carry provider cost_amount →
//     summed as cost_source='provider'.
//   - Anthropic rows have token counts only → cost is CALCULATED from
//     tokens × published Haiku rate; cost_source='calculated'.
//   - Rows without either are ignored for cost (still counted for
//     call totals).

export const config = { maxDuration: 15 };

let cachedAdmin: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedAdmin = createClient(url, key, { auth: { persistSession: false } });
  return cachedAdmin;
}

interface EventRow {
  provider: 'anthropic' | 'leonardo';
  operation: string;
  game_action: string | null;
  model: string | null;
  input_units: number | null;
  output_units: number | null;
  cost_amount: number | string | null;
  cost_source: string | null;
  status: string;
  duration_ms: number;
  started_at: string;
}

interface ProviderSpend {
  provider: 'anthropic' | 'leonardo';
  todayUsd: number;
  mtdUsd: number;
  sevenDayUsd: number;
  sevenDayAvgUsd: number;
  costSource: 'provider' | 'calculated' | 'mixed';
  callsMtd: number;
  failuresMtd: number;
}

interface ActionRollup {
  gameAction: string;
  calls: number;
  failures: number;
  totalCostUsd: number;
  avgCostUsd: number;
}

function eventCostUsd(row: EventRow): number | null {
  if (row.provider === 'leonardo') {
    if (row.cost_amount == null) return null;
    const n = typeof row.cost_amount === 'string' ? Number.parseFloat(row.cost_amount) : row.cost_amount;
    return Number.isFinite(n) ? n : null;
  }
  return calculateAnthropicCostUsd(row.model, row.input_units, row.output_units, row.started_at);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const caller = await verifyUser(req);
  if (!caller || !caller.isAdmin) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const admin = getAdminClient();
  if (!admin) {
    res.status(500).json({ error: 'Supabase service role not configured' });
    return;
  }

  // MTD window covers everything the caller cares about at once — the
  // rollup functions slice inside it for "today" and "last 7 days".
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const sevenDayStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await admin
    .from('api_usage_events')
    .select('provider, operation, game_action, model, input_units, output_units, cost_amount, cost_source, status, duration_ms, started_at')
    .gte('started_at', monthStart.toISOString())
    .order('started_at', { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const rows = (data ?? []) as EventRow[];

  // Provider spend rollup ---------------------------------------------
  const providers: Record<'anthropic' | 'leonardo', ProviderSpend> = {
    anthropic: emptyProvider('anthropic'),
    leonardo: emptyProvider('leonardo'),
  };
  for (const row of rows) {
    const p = providers[row.provider];
    p.callsMtd += 1;
    if (row.status !== 'success') p.failuresMtd += 1;
    const cost = eventCostUsd(row);
    if (cost == null) continue;
    p.mtdUsd += cost;
    const startedAt = new Date(row.started_at);
    if (startedAt >= todayStart) p.todayUsd += cost;
    if (startedAt >= sevenDayStart) p.sevenDayUsd += cost;
  }
  // Anthropic is always calculated; Leonardo is always provider. Set
  // explicitly so the UI shows the right badge with zero ambiguity.
  providers.anthropic.costSource = 'calculated';
  providers.leonardo.costSource = 'provider';
  providers.anthropic.sevenDayAvgUsd = providers.anthropic.sevenDayUsd / 7;
  providers.leonardo.sevenDayAvgUsd = providers.leonardo.sevenDayUsd / 7;

  // Per-action rollup -------------------------------------------------
  const actionMap = new Map<string, ActionRollup>();
  for (const row of rows) {
    const key = row.game_action ?? '(untagged)';
    let bucket = actionMap.get(key);
    if (!bucket) {
      bucket = { gameAction: key, calls: 0, failures: 0, totalCostUsd: 0, avgCostUsd: 0 };
      actionMap.set(key, bucket);
    }
    bucket.calls += 1;
    if (row.status !== 'success') bucket.failures += 1;
    const cost = eventCostUsd(row);
    if (cost != null) bucket.totalCostUsd += cost;
  }
  const actionRollup = [...actionMap.values()]
    .map((b) => ({ ...b, avgCostUsd: b.calls > 0 ? b.totalCostUsd / b.calls : 0 }))
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd);

  const latestEvent = rows[0]?.started_at ?? null;

  res.status(200).json({
    checkedAt: new Date().toISOString(),
    window: {
      monthStart: monthStart.toISOString(),
      todayStart: todayStart.toISOString(),
      sevenDayStart: sevenDayStart.toISOString(),
    },
    latestEvent,
    providers,
    actions: actionRollup,
  });
}

function emptyProvider(provider: 'anthropic' | 'leonardo'): ProviderSpend {
  return {
    provider,
    todayUsd: 0,
    mtdUsd: 0,
    sevenDayUsd: 0,
    sevenDayAvgUsd: 0,
    costSource: 'mixed',
    callsMtd: 0,
    failuresMtd: 0,
  };
}
