import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users as UsersIcon, Layers, ChevronRight } from 'lucide-react';
import { getSystemStats, type SystemStats } from '../services/persistence/adminService';
import { getSupabaseClient } from '../services/persistence/supabaseClient';
import { FAILURE_TYPES } from '../data/archetypeLayers';
import type { ProposalFailureType } from '../types/archetypeProposal';
import {
  AdminPage, AdminSection, AdminCard, AdminMetricCard,
  AdminStatusBadge, AdminEmptyState, AdminSkeleton,
} from '../components/admin/ui';

// Tiny relative-time helper. Age is plain text ("filed 3d ago") so urgency
// never rides on color alone.
function relativeAge(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function failureLabel(ft: string): string {
  return FAILURE_TYPES.find((f) => f.id === (ft as ProposalFailureType))?.label ?? ft;
}

interface LeonardoBalance {
  checkedAt: string;
  available: boolean;
  totalTokens?: number;
  breakdown?: { subscriptionTokens: number; apiPaidTokens: number };
  renewalDate?: string | null;
  error?: string;
}
interface InboxRow { kind: 'proposal' | 'judgment'; id: string; summary: string; createdAt: string; href: string }
interface ResolvedRow { id: string; archetype: string; failureType: string; status: string; decidedAt: string | null; commitSha: string | null }

const ACTIONABLE_DISPOSITIONS = [
  'archetype_prompt_change_candidate',
  'global_prompt_change_candidate',
  'model_settings_investigation',
  'regenerate_same_prompt',
];

export function AdminOverview() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leonardo, setLeonardo] = useState<LeonardoBalance | null>(null);
  const [leonardoErr, setLeonardoErr] = useState<string | null>(null);
  const [inbox, setInbox] = useState<InboxRow[] | null>(null);
  const [resolved, setResolved] = useState<ResolvedRow[] | null>(null);

  useEffect(() => {
    setError(null);
    getSystemStats().then(setStats).catch((err) => setError(err?.message ?? String(err)));
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) { setLeonardoErr('Supabase not configured'); return; }
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setLeonardoErr('No session'); return; }
      try {
        const r = await fetch('/api/admin-leonardo-balance', { headers: { authorization: `Bearer ${token}` } });
        if (!r.ok) { setLeonardoErr(`HTTP ${r.status}`); return; }
        setLeonardo((await r.json()) as LeonardoBalance);
      } catch (err) { setLeonardoErr(String(err)); }
    })();
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    void (async () => {
      const [openProps, judgments, resolvedProps] = await Promise.all([
        supabase.from('archetype_proposals').select('id, archetype, failure_type, created_at').in('status', ['submitted', 'awaiting_claude']),
        supabase.from('prompt_test_judgments').select('id, disposition, created_at').in('disposition', ACTIONABLE_DISPOSITIONS),
        supabase.from('archetype_proposals').select('id, archetype, failure_type, status, decided_at, commit_sha').in('status', ['shipped', 'rejected']).order('decided_at', { ascending: false }).limit(5),
      ]);
      const rows: InboxRow[] = [];
      for (const p of (openProps.data ?? []) as Array<{ id: string; archetype: string; failure_type: string; created_at: string }>) {
        rows.push({ kind: 'proposal', id: p.id, summary: `${p.archetype} — ${failureLabel(p.failure_type)}`, createdAt: p.created_at, href: `/admin/workshop?archetype=${encodeURIComponent(p.archetype)}&proposal=${p.id}` });
      }
      for (const j of (judgments.data ?? []) as Array<{ id: string; disposition: string; created_at: string }>) {
        rows.push({ kind: 'judgment', id: j.id, summary: j.disposition.replace(/_/g, ' '), createdAt: j.created_at, href: '/admin/prompt-lab' });
      }
      rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setInbox(rows);
      setResolved(((resolvedProps.data ?? []) as Array<{ id: string; archetype: string; failure_type: string; status: string; decided_at: string | null; commit_sha: string | null }>).map((r) => ({
        id: r.id, archetype: r.archetype, failureType: r.failure_type, status: r.status, decidedAt: r.decided_at, commitSha: r.commit_sha,
      })));
    })();
  }, []);

  return (
    <AdminPage
      title="Overview"
      description="What most needs attention: the review queue, provider funds, and live totals. Diagnostics stay collapsed below."
    >
      {error && (
        <div role="alert" className="mb-4 p-3 text-sm" style={{ background: 'rgba(240,97,109,0.12)', border: '1px solid rgba(240,97,109,0.4)', color: 'var(--admin-danger)', borderRadius: 'var(--admin-radius-control)' }}>
          {error}
        </div>
      )}

      {/* Inbox — top slot; the only action-demanding module. */}
      <AdminSection title="Inbox" subtitle="Needs a decision — oldest first">
        <InboxList rows={inbox} />
      </AdminSection>

      {/* Recently resolved — collapsed; keeps closures visible on the dash. */}
      <AdminSection>
        <ResolvedStrip rows={resolved} />
      </AdminSection>

      {/* Provider funds. */}
      <AdminSection title="Provider funds" subtitle="Live balances and cost telemetry">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LeonardoCard data={leonardo} error={leonardoErr} />
          <AnthropicCard />
        </div>
      </AdminSection>

      {/* Real metrics only — no "coming soon" tiles alongside live data. */}
      <AdminSection title="Game">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AdminMetricCard label="Users" value={stats?.total_users ?? '—'} sub={stats ? `${stats.total_admins} admin` : undefined} icon={<UsersIcon size={16} />} href="/admin/users" state={stats ? 'live' : 'estimated'} />
          <AdminMetricCard label="Cards" value={stats?.total_cards ?? '—'} icon={<Layers size={16} />} href="/admin/cards" state={stats ? 'live' : 'estimated'} />
        </div>
      </AdminSection>

      {/* Secondary aggregates — collapsed. */}
      <details style={{ background: 'var(--admin-surface-subtle)', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius-control)' }}>
        <summary className="cursor-pointer px-4 py-3 text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
          System diagnostics ({stats?.total_txns ?? '—'} txns)
        </summary>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs" style={{ borderTop: '1px solid var(--admin-border)' }}>
          <SubStat label="Transactions" value={stats?.total_txns} />
          <SubStat label="Aggregate Premium" value={stats?.aggregate_premium} />
          <SubStat label="Aggregate Gameplay" value={stats?.aggregate_gameplay} />
        </div>
      </details>
    </AdminPage>
  );
}

const INBOX_CAP = 5;

function InboxList({ rows }: { rows: InboxRow[] | null }) {
  if (rows === null) {
    return <AdminCard><AdminSkeleton lines={4} /></AdminCard>;
  }
  if (rows.length === 0) {
    return <AdminEmptyState title="Inbox zero" description="Open proposals and flagged judgments will appear here, oldest first." />;
  }
  const shown = rows.slice(0, INBOX_CAP);
  return (
    <AdminCard padded={false}>
      <ul>
        {shown.map((r, i) => (
          <li key={`${r.kind}-${r.id}`} style={{ borderTop: i === 0 ? undefined : '1px solid var(--admin-border)' }}>
            <Link to={r.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
              <AdminStatusBadge tone={r.kind === 'proposal' ? 'accent' : 'attention'}>
                {r.kind === 'proposal' ? 'Proposal' : 'Judgment'}
              </AdminStatusBadge>
              <span className="text-sm flex-1 truncate" style={{ color: 'var(--admin-text)' }}>{r.summary}</span>
              <span className="text-xs shrink-0" style={{ color: 'var(--admin-text-muted)' }}>filed {relativeAge(r.createdAt)}</span>
              <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--admin-text-muted)' }} />
            </Link>
          </li>
        ))}
      </ul>
      {rows.length > INBOX_CAP && (
        <div className="px-4 py-2 text-[11px] uppercase tracking-wide" style={{ borderTop: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>
          Showing {INBOX_CAP} of {rows.length} — {rows.length - INBOX_CAP} more in the queue
        </div>
      )}
    </AdminCard>
  );
}

function ResolvedStrip({ rows }: { rows: ResolvedRow[] | null }) {
  const total = rows?.length ?? 0;
  return (
    <details style={{ background: 'var(--admin-surface-subtle)', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius-control)' }}>
      <summary className="cursor-pointer px-4 py-3 text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
        Recently resolved ({total})
      </summary>
      <div className="p-2" style={{ borderTop: '1px solid var(--admin-border)' }}>
        {total === 0 ? (
          <div className="px-2 py-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>No shipped or rejected proposals yet.</div>
        ) : (
          <ul>
            {rows!.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 px-2 py-2" style={{ borderTop: i === 0 ? undefined : '1px solid var(--admin-border)' }}>
                <AdminStatusBadge tone={r.status === 'shipped' ? 'success' : 'neutral'}>{r.status}</AdminStatusBadge>
                <span className="text-xs flex-1 truncate" style={{ color: 'var(--admin-text)' }}>{r.archetype} — {failureLabel(r.failureType)}</span>
                {r.commitSha && <code className="text-[11px] shrink-0" style={{ color: 'var(--admin-text-muted)' }}>{r.commitSha.slice(0, 7)}</code>}
                <span className="text-[11px] shrink-0" style={{ color: 'var(--admin-text-muted)' }}>{r.decidedAt ? relativeAge(r.decidedAt) : '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function SubStat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div>
      <div className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</div>
      <div className="text-base font-semibold" style={{ color: 'var(--admin-text)', fontVariantNumeric: 'tabular-nums' }}>
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
  const unavailable = Boolean(error) || (data != null && !data.available);

  return (
    <AdminCard>
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Leonardo</div>
        {checked && <div className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>as of {checked}</div>}
      </div>
      {loading && <div className="mt-1"><AdminSkeleton className="h-8 w-32" /></div>}
      {unavailable && (
        <>
          <div className="text-base mt-1" style={{ color: 'var(--admin-text-muted)' }}>Live balance unavailable</div>
          {(error || data?.error) && <div className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>{error ?? data?.error}</div>}
        </>
      )}
      {data && data.available && totalTokens !== undefined && (
        <>
          <div className="text-3xl font-bold mt-1" style={{ color: 'var(--admin-text)', fontVariantNumeric: 'tabular-nums' }}>
            {totalTokens.toLocaleString()} <span className="text-sm font-normal" style={{ color: 'var(--admin-text-muted)' }}>tokens</span>
          </div>
          {data.breakdown && (
            <div className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              {data.breakdown.subscriptionTokens.toLocaleString()} subscription · {data.breakdown.apiPaidTokens.toLocaleString()} paid
            </div>
          )}
          {renewal && <div className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>Subscription renews {renewal}</div>}
        </>
      )}
    </AdminCard>
  );
}

function AnthropicCard() {
  return (
    <AdminCard>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Anthropic</div>
      <div className="text-base mt-1" style={{ color: 'var(--admin-text-muted)' }}>Live balance unavailable</div>
      <div className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
        Admin API isn't available on this plan. Usage and per-request cost are still recorded via <code>api_usage_events</code> — see Costs.
      </div>
    </AdminCard>
  );
}
