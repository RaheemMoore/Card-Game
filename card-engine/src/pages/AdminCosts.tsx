import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../services/persistence/supabaseClient';
import { API_COST_CATALOG } from '../data/economy/apiCostCatalog';
import {
  AdminPage, AdminSection, AdminCard, AdminStatusBadge, AdminAlert,
  AdminSkeleton, AdminDataTable, type AdminColumn,
} from '../components/admin/ui';

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

  return (
    <AdminPage
      title="Costs"
      description="Every paid provider call writes one api_usage_events row; this page rolls that ledger up for the current month plus a 7-day rolling average. Leonardo costs come from the provider response; Anthropic is calculated from tokens × published Haiku 4.5 rate. The catalog-vs-observed section flags a stale apiCostCatalog."
    >
      {error && <AdminAlert tone="danger">{error}</AdminAlert>}

      {loading && !summary && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminCard><AdminSkeleton lines={3} /></AdminCard>
            <AdminCard><AdminSkeleton lines={3} /></AdminCard>
          </div>
        </div>
      )}

      {summary && (
        <div className="space-y-6">
          <FreshnessLine checkedAt={summary.checkedAt} latestEvent={summary.latestEvent} />

          <AdminSection title="Provider spend" subtitle="This month">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ProviderSpendCard spend={summary.providers.leonardo} label="Leonardo" />
              <ProviderSpendCard spend={summary.providers.anthropic} label="Anthropic (Haiku 4.5)" />
            </div>
          </AdminSection>

          <AdminSection title="Per game action" subtitle="Ranked by observed spend (this month)">
            <ActionsTable actions={summary.actions} />
          </AdminSection>

          <AdminSection title="Catalog vs observed" subtitle="apiCostCatalog estimates compared with observed averages">
            <CatalogCompare actions={summary.actions} />
          </AdminSection>
        </div>
      )}
    </AdminPage>
  );
}

function FreshnessLine({ checkedAt, latestEvent }: { checkedAt: string; latestEvent: string | null }) {
  return (
    <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
      As of {new Date(checkedAt).toLocaleString()}
      {latestEvent
        ? ` · latest event ${new Date(latestEvent).toLocaleString()}`
        : ' · no events recorded this month'}
    </div>
  );
}

function ProviderSpendCard({ spend, label }: { spend: ProviderSpend; label: string }) {
  // No calls at all this month = no telemetry to trust; show "no data" rather
  // than a confident $0.00 that could read as "we spent nothing" vs "we don't know".
  const hasData = spend.callsMtd > 0;
  return (
    <AdminCard>
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</div>
        <CostSourceBadge source={spend.costSource} />
      </div>
      {hasData ? (
        <>
          <div className="text-3xl font-bold mt-1" style={{ color: 'var(--admin-text)', fontVariantNumeric: 'tabular-nums' }}>
            ${spend.mtdUsd.toFixed(2)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            Today ${spend.todayUsd.toFixed(2)} · 7d avg ${spend.sevenDayAvgUsd.toFixed(2)}/day
          </div>
          <div className="text-[11px] mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            {spend.callsMtd.toLocaleString()} calls
            {spend.failuresMtd > 0 && <span style={{ color: 'var(--admin-danger)' }}> · {spend.failuresMtd} failed</span>}
          </div>
        </>
      ) : (
        <>
          <div className="text-base mt-1" style={{ color: 'var(--admin-text-muted)' }}>No calls this month</div>
          <div className="text-[11px] mt-1" style={{ color: 'var(--admin-text-muted)' }}>No spend telemetry to report yet.</div>
        </>
      )}
    </AdminCard>
  );
}

function CostSourceBadge({ source }: { source: ProviderSpend['costSource'] }) {
  const tone = source === 'provider' ? 'success' : source === 'calculated' ? 'warning' : 'accent';
  return <AdminStatusBadge tone={tone}>{source}</AdminStatusBadge>;
}

function ActionsTable({ actions }: { actions: ActionRollup[] }) {
  const columns: AdminColumn<ActionRollup>[] = [
    { key: 'action', header: 'Game action', render: (a) => <span className="font-mono text-xs">{a.gameAction}</span> },
    { key: 'calls', header: 'Calls', align: 'right', render: (a) => a.calls },
    { key: 'failed', header: 'Failed', align: 'right', render: (a) => <span style={a.failures > 0 ? { color: 'var(--admin-danger)' } : undefined}>{a.failures}</span> },
    { key: 'avg', header: 'Avg cost', align: 'right', render: (a) => `$${a.avgCostUsd.toFixed(4)}` },
    { key: 'total', header: 'Total (MTD)', align: 'right', render: (a) => `$${a.totalCostUsd.toFixed(2)}` },
  ];
  return (
    <AdminDataTable
      columns={columns}
      rows={actions}
      rowKey={(a) => a.gameAction}
      emptyTitle="No events this month yet"
    />
  );
}

interface CatalogRow {
  actionId: string;
  estimated: number;
  observedAvg: number | undefined;
  observedCalls: number;
  confidence: string;
}

function CatalogCompare({ actions }: { actions: ActionRollup[] }) {
  const byAction = new Map(actions.map((a) => [a.gameAction, a]));
  const rows: CatalogRow[] = Object.values(API_COST_CATALOG).map((entry) => {
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

  const columns: AdminColumn<CatalogRow>[] = [
    { key: 'action', header: 'Action', render: (r) => <span className="font-mono text-xs">{r.actionId}</span> },
    { key: 'estimate', header: 'Catalog estimate', align: 'right', render: (r) => `$${r.estimated.toFixed(4)}` },
    {
      key: 'observed',
      header: 'Observed avg',
      align: 'right',
      render: (r) =>
        r.observedAvg !== undefined ? (
          <>
            ${r.observedAvg.toFixed(4)} <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>n={r.observedCalls}</span>
          </>
        ) : (
          // Never render unavailable telemetry as 0 — no observed data = em dash.
          <span style={{ color: 'var(--admin-text-muted)' }}>—</span>
        ),
    },
    {
      key: 'delta',
      header: 'Δ',
      align: 'right',
      render: (r) => {
        const delta = r.observedAvg !== undefined ? r.observedAvg - r.estimated : null;
        if (delta === null) return <span style={{ color: 'var(--admin-text-muted)' }}>—</span>;
        return <span style={{ color: delta >= 0 ? 'var(--admin-danger)' : 'var(--admin-success)' }}>{delta >= 0 ? '+' : ''}${delta.toFixed(4)}</span>;
      },
    },
    { key: 'confidence', header: 'Confidence', secondary: true, render: (r) => <span style={{ color: 'var(--admin-text-muted)' }}>{r.confidence}</span> },
  ];

  return (
    <AdminDataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.actionId}
      emptyTitle="No catalog entries"
    />
  );
}
