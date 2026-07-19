import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSystemStats, type SystemStats } from '../services/persistence/adminService';
import { getSupabaseClient } from '../services/persistence/supabaseClient';

// Overview destination — the primary operational view. Above the fold:
// provider funds, Users, Cards, pending work. Everything else is pushed
// down into an expandable secondary strip so it doesn't compete with
// the actionable modules.
//
// MTD spend / days-remaining calculations land in Phase 2 (Costs
// dashboard) — Phase 1 shows only live balance + freshness, plus a
// static note for providers without a live balance endpoint.

interface LeonardoBalance {
  checkedAt: string;
  available: boolean;
  totalTokens?: number;
  breakdown?: { subscriptionTokens: number; apiPaidTokens: number };
  renewalDate?: string | null;
  error?: string;
}

export function AdminOverview() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leonardo, setLeonardo] = useState<LeonardoBalance | null>(null);
  const [leonardoErr, setLeonardoErr] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    getSystemStats()
      .then(setStats)
      .catch((err) => setError(err?.message ?? String(err)));
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLeonardoErr('Supabase not configured');
      return;
    }
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setLeonardoErr('No session');
        return;
      }
      try {
        const r = await fetch('/api/admin-leonardo-balance', {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!r.ok) {
          setLeonardoErr(`HTTP ${r.status}`);
          return;
        }
        setLeonardo((await r.json()) as LeonardoBalance);
      } catch (err) {
        setLeonardoErr(String(err));
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded text-sm" style={{ background: 'rgba(220,38,38,0.15)', color: '#f9c9c9', border: '1px solid rgba(220,38,38,0.4)' }}>
          {error}
        </div>
      )}

      {/* Provider funds. Leonardo has a live balance; Anthropic's Admin
          API isn't available on this plan so we display "unavailable"
          per the plan's truthfulness rule. */}
      <section>
        <SectionHeader
          title="Provider funds"
          subtitle="Live balances and cost telemetry"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LeonardoCard data={leonardo} error={leonardoErr} />
          <AnthropicCard />
        </div>
      </section>

      {/* Primary game tiles — Users + Cards + pending review. */}
      <section>
        <SectionHeader title="Game" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <PrimaryTile
            label="Users"
            value={stats?.total_users}
            sub={stats ? `${stats.total_admins} admin` : undefined}
            to="/admin/users"
          />
          <PrimaryTile
            label="Cards"
            value={stats?.total_cards}
            to="/admin/cards"
          />
          <PrimaryTile
            label="Ability review"
            value={undefined}
            sub="Coming soon"
            to="/admin/abilities"
          />
          <PrimaryTile
            label="Prompt review"
            value={undefined}
            sub="Coming soon"
            to="/admin/prompt-lab"
          />
        </div>
      </section>

      {/* Secondary aggregates — collapsed by default so they don't
          compete with primary work. */}
      <details className="rounded border border-bone/15 bg-void/40">
        <summary className="cursor-pointer px-4 py-3 text-xs uppercase tracking-wider text-bone/70">
          System diagnostics ({stats?.total_txns ?? '—'} txns)
        </summary>
        <div className="p-4 border-t border-bone/10 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <SubStat label="Transactions" value={stats?.total_txns} />
          <SubStat label="Aggregate Premium" value={stats?.aggregate_premium} />
          <SubStat label="Aggregate Gameplay" value={stats?.aggregate_gameplay} />
        </div>
      </details>
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

function PrimaryTile(props: {
  label: string;
  value: number | undefined;
  sub?: string;
  to: string;
}) {
  const { label, value, sub, to } = props;
  return (
    <Link
      to={to}
      className="block rounded-lg border border-bone/15 bg-void/60 hover:bg-void/40 p-4 transition-colors"
    >
      <div className="text-[10px] uppercase tracking-wider text-bone/60">{label}</div>
      <div className="font-fantasy text-2xl font-bold text-bone">
        {value === undefined ? <span className="text-bone/40">—</span> : value.toLocaleString()}
      </div>
      {sub && <div className="text-[10px] text-bone/50">{sub}</div>}
    </Link>
  );
}

function SubStat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div>
      <div className="text-bone/60 uppercase tracking-wider">{label}</div>
      <div className="font-fantasy text-base text-bone">
        {value === undefined ? '—' : value.toLocaleString()}
      </div>
    </div>
  );
}

function LeonardoCard({ data, error }: { data: LeonardoBalance | null; error: string | null }) {
  const loading = !data && !error;
  const checked = data?.checkedAt ? new Date(data.checkedAt).toLocaleString() : null;
  const totalTokens = data?.totalTokens;
  const renewal = data?.renewalDate ? new Date(data.renewalDate).toLocaleDateString() : null;

  return (
    <div className="rounded-lg border border-bone/15 bg-void/60 p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-wider text-bone/60">Leonardo</div>
        {checked && <div className="text-[10px] text-bone/40">as of {checked}</div>}
      </div>
      {loading && <div className="font-fantasy text-base text-bone/60 mt-1">Checking…</div>}
      {error && (
        <>
          <div className="font-fantasy text-base text-bone/70 mt-1">Live balance unavailable</div>
          <div className="text-xs text-bone/50 mt-1">{error}</div>
        </>
      )}
      {data && !data.available && (
        <>
          <div className="font-fantasy text-base text-bone/70 mt-1">Live balance unavailable</div>
          {data.error && <div className="text-xs text-bone/50 mt-1">{data.error}</div>}
        </>
      )}
      {data && data.available && totalTokens !== undefined && (
        <>
          <div className="font-fantasy text-3xl font-bold text-bone mt-1">
            {totalTokens.toLocaleString()} <span className="text-sm text-bone/60 font-normal">tokens</span>
          </div>
          {data.breakdown && (
            <div className="text-xs text-bone/60 mt-1">
              {data.breakdown.subscriptionTokens.toLocaleString()} subscription ·{' '}
              {data.breakdown.apiPaidTokens.toLocaleString()} paid
            </div>
          )}
          {renewal && (
            <div className="text-xs text-bone/50 mt-1">Subscription renews {renewal}</div>
          )}
        </>
      )}
    </div>
  );
}

function AnthropicCard() {
  return (
    <div className="rounded-lg border border-bone/15 bg-void/60 p-4">
      <div className="text-[10px] uppercase tracking-wider text-bone/60">Anthropic</div>
      <div className="font-fantasy text-base text-bone/70 mt-1">Live balance unavailable</div>
      <div className="text-xs text-bone/50 mt-1">
        Admin API isn't available on this plan. Usage and per-request cost are still
        recorded via <code>api_usage_events</code> — see Costs.
      </div>
    </div>
  );
}
