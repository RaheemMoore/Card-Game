import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../services/persistence/supabaseClient';
import { API_COST_CATALOG } from '../data/economy/apiCostCatalog';
import { AdminPageDescription } from '../components/admin/AdminPageDescription';

// Costs & System. First-cut Phase 2 dashboard: provider spend (MTD +
// today + 7d avg), per-game-action rollup, and catalog-vs-observed
// comparison for the actions in API_COST_CATALOG.

interface CostsSummary {
  checkedAt: string;
  latestEvent: string | null;
  providers: {
    anthropic: ProviderSpend;
    leonardo: ProviderSpend;
  };
  actions: ActionRollup[];
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

// game_action tag on api_usage_events → the PaidActionId in the catalog.
// Only the actions we've actually instrumented map through; the rest
// still show up in the per-action table without a catalog comparison.
const ACTION_TO_CATALOG: Record<string, string> = {
  forge_card_text: 'forge_card',
  ascendant_paths: 'evolve_card_art',
};

export function AdminCosts() {
  const [summary, setSummary] = useState<CostsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (!cancelled) {
          setError('Supabase not configured');
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (!cancelled) {
          setError('No session');
          setLoading(false);
        }
        return;
      }
      try {
        const r = await fetch('/api/admin-costs-summary', {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!r.ok) {
          const text = await r.text();
          if (!cancelled) setError(`HTTP ${r.status}: ${text}`);
          return;
        }
        const body = (await r.json()) as CostsSummary;
        if (!cancelled) setSummary(body);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="text-sm text-bone/60">Loading costs…</div>;
  if (error) return (
    <div className="p-3 rounded text-sm" style={{ background: 'rgba(220,38,38,0.15)', color: '#f9c9c9', border: '1px solid rgba(220,38,38,0.4)' }}>
      {error}
    </div>
  );
  if (!summary) return null;

  return (
    <div className="space-y-6">
      <AdminPageDescription
        title="Costs — provider spend + per-action rollup"
        body={
          'Every paid provider call writes one row into api_usage_events. This page rolls that ledger up for the current month plus a 7-day rolling average.\n\n' +
          'Leonardo costs come straight from the provider response (cost_amount, badged "provider"). Anthropic has no per-call cost in its API response, so cost is calculated from tokens × published Haiku 4.5 rate (badged "calculated"). Both badges appear on the provider cards so you can trust or distrust a number by source.\n\n' +
          'The per-game-action table sorts by MTD spend. The catalog-vs-observed section compares the estimates in apiCostCatalog against what the ledger actually paid — a big red delta means the catalog is out of date.'
        }
      />
      <FreshnessLine checkedAt={summary.checkedAt} latestEvent={summary.latestEvent} />

      <section>
        <SectionHeader title="Provider spend (this month)" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProviderSpendCard spend={summary.providers.leonardo} label="Leonardo" />
          <ProviderSpendCard spend={summary.providers.anthropic} label="Anthropic (Haiku 4.5)" />
        </div>
      </section>

      <section>
        <SectionHeader title="Per game action (this month)" subtitle="Ranked by observed spend" />
        <ActionsTable actions={summary.actions} />
      </section>

      <section>
        <SectionHeader title="Catalog vs observed" subtitle="Estimated costs from apiCostCatalog compared with observed averages" />
        <CatalogCompare actions={summary.actions} />
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2">
      <h2 className="font-fantasy text-sm uppercase tracking-wider text-bone/80">{title}</h2>
      {subtitle && <div className="text-xs text-bone/50">{subtitle}</div>}
    </div>
  );
}

function FreshnessLine({ checkedAt, latestEvent }: { checkedAt: string; latestEvent: string | null }) {
  return (
    <div className="text-xs text-bone/50">
      As of {new Date(checkedAt).toLocaleString()}
      {latestEvent
        ? ` · latest event ${new Date(latestEvent).toLocaleString()}`
        : ' · no events recorded this month'}
    </div>
  );
}

function ProviderSpendCard({ spend, label }: { spend: ProviderSpend; label: string }) {
  return (
    <div className="rounded-lg border border-bone/15 bg-void/60 p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-wider text-bone/60">{label}</div>
        <CostSourceBadge source={spend.costSource} />
      </div>
      <div className="font-fantasy text-3xl font-bold text-bone mt-1">
        ${spend.mtdUsd.toFixed(2)}
      </div>
      <div className="text-xs text-bone/60 mt-1">
        Today ${spend.todayUsd.toFixed(2)} · 7d avg ${spend.sevenDayAvgUsd.toFixed(2)}/day
      </div>
      <div className="text-[10px] text-bone/50 mt-1">
        {spend.callsMtd.toLocaleString()} calls
        {spend.failuresMtd > 0 && (
          <span style={{ color: '#f9c9c9' }}> · {spend.failuresMtd} failed</span>
        )}
      </div>
    </div>
  );
}

function CostSourceBadge({ source }: { source: ProviderSpend['costSource'] }) {
  const cfg = {
    provider: { label: 'provider', color: '#c9f9d9' },
    calculated: { label: 'calculated', color: '#f4d78a' },
    mixed: { label: 'mixed', color: '#d6f2ec' },
  }[source];
  return (
    <span
      className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: 'rgba(155,182,179,0.15)', color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function ActionsTable({ actions }: { actions: ActionRollup[] }) {
  if (actions.length === 0) {
    return (
      <div className="rounded border border-bone/15 bg-void/40 p-4 text-sm text-bone/60">
        No events this month yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded border border-bone/15">
      <table className="w-full text-sm text-bone/90">
        <thead className="bg-void/60 text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-3 py-2">Game action</th>
            <th className="text-right px-3 py-2">Calls</th>
            <th className="text-right px-3 py-2">Failed</th>
            <th className="text-right px-3 py-2">Avg cost</th>
            <th className="text-right px-3 py-2">Total (MTD)</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((a) => (
            <tr key={a.gameAction} className="border-t border-bone/10">
              <td className="px-3 py-2 font-mono text-xs">{a.gameAction}</td>
              <td className="px-3 py-2 text-right">{a.calls}</td>
              <td className="px-3 py-2 text-right" style={a.failures > 0 ? { color: '#f9c9c9' } : {}}>{a.failures}</td>
              <td className="px-3 py-2 text-right">${a.avgCostUsd.toFixed(4)}</td>
              <td className="px-3 py-2 text-right">${a.totalCostUsd.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CatalogCompare({ actions }: { actions: ActionRollup[] }) {
  const byAction = new Map(actions.map((a) => [a.gameAction, a]));
  const rows = Object.values(API_COST_CATALOG).map((entry) => {
    const relatedAction = Object.entries(ACTION_TO_CATALOG).find(([, catId]) => catId === entry.actionId)?.[0];
    const observed = relatedAction ? byAction.get(relatedAction) : undefined;
    return {
      actionId: entry.actionId,
      estimated: entry.estimatedDirectCostUsd,
      observedAvg: observed?.avgCostUsd,
      observedCalls: observed?.calls ?? 0,
      confidence: entry.confidence,
    };
  });
  return (
    <div className="overflow-x-auto rounded border border-bone/15">
      <table className="w-full text-sm text-bone/90">
        <thead className="bg-void/60 text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-3 py-2">Action</th>
            <th className="text-right px-3 py-2">Catalog estimate</th>
            <th className="text-right px-3 py-2">Observed avg</th>
            <th className="text-right px-3 py-2">Δ</th>
            <th className="text-left px-3 py-2">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const delta = r.observedAvg !== undefined ? r.observedAvg - r.estimated : null;
            return (
              <tr key={r.actionId} className="border-t border-bone/10">
                <td className="px-3 py-2 font-mono text-xs">{r.actionId}</td>
                <td className="px-3 py-2 text-right">${r.estimated.toFixed(4)}</td>
                <td className="px-3 py-2 text-right">
                  {r.observedAvg !== undefined ? (
                    <>
                      ${r.observedAvg.toFixed(4)}{' '}
                      <span className="text-[10px] text-bone/40">n={r.observedCalls}</span>
                    </>
                  ) : (
                    <span className="text-bone/40">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {delta === null ? (
                    <span className="text-bone/40">—</span>
                  ) : (
                    <span style={{ color: delta >= 0 ? '#f9c9c9' : '#c9f9d9' }}>
                      {delta >= 0 ? '+' : ''}
                      ${delta.toFixed(4)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-bone/70">{r.confidence}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
