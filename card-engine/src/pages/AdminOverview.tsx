import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSystemStats, type SystemStats } from '../services/persistence/adminService';
import { getSupabaseClient } from '../services/persistence/supabaseClient';
import { AdminPageDescription } from '../components/admin/AdminPageDescription';
import { FAILURE_TYPES } from '../data/archetypeLayers';
import type { ProposalFailureType } from '../types/archetypeProposal';

// Tiny relative-time helper. Age is shown as plain text ("filed 3d ago")
// so urgency never rides on color alone.
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

interface InboxRow {
  kind: 'proposal' | 'judgment';
  id: string;
  summary: string;
  createdAt: string;
  href: string;
}

interface ResolvedRow {
  id: string;
  archetype: string;
  failureType: string;
  status: string;
  decidedAt: string | null;
  commitSha: string | null;
}

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

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    void (async () => {
      const [openProps, judgments, resolvedProps] = await Promise.all([
        supabase
          .from('archetype_proposals')
          .select('id, archetype, failure_type, created_at')
          .in('status', ['submitted', 'awaiting_claude']),
        supabase
          .from('prompt_test_judgments')
          .select('id, disposition, created_at')
          .in('disposition', ACTIONABLE_DISPOSITIONS),
        supabase
          .from('archetype_proposals')
          .select('id, archetype, failure_type, status, decided_at, commit_sha')
          .in('status', ['shipped', 'rejected'])
          .order('decided_at', { ascending: false })
          .limit(5),
      ]);

      const rows: InboxRow[] = [];
      for (const p of (openProps.data ?? []) as Array<{
        id: string; archetype: string; failure_type: string; created_at: string;
      }>) {
        rows.push({
          kind: 'proposal',
          id: p.id,
          summary: `${p.archetype} — ${failureLabel(p.failure_type)}`,
          createdAt: p.created_at,
          href: `/admin/workshop?archetype=${encodeURIComponent(p.archetype)}&proposal=${p.id}`,
        });
      }
      for (const j of (judgments.data ?? []) as Array<{
        id: string; disposition: string; created_at: string;
      }>) {
        rows.push({
          kind: 'judgment',
          id: j.id,
          summary: j.disposition.replace(/_/g, ' '),
          createdAt: j.created_at,
          href: '/admin/prompt-lab',
        });
      }
      // Queue semantics: oldest first.
      rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setInbox(rows);

      setResolved(
        ((resolvedProps.data ?? []) as Array<{
          id: string; archetype: string; failure_type: string; status: string;
          decided_at: string | null; commit_sha: string | null;
        }>).map((r) => ({
          id: r.id,
          archetype: r.archetype,
          failureType: r.failure_type,
          status: r.status,
          decidedAt: r.decided_at,
          commitSha: r.commit_sha,
        })),
      );
    })();
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageDescription
        title="Overview — operational at-a-glance"
        body={
          'Snapshot of what most needs attention. The Inbox at top lists everything demanding a decision — open Archetype Workshop proposals and flagged prompt judgments — oldest first (queue order), each with a deep-link straight to the work. ' +
          'The collapsed "Recently resolved" strip shows the last few proposals that were shipped or rejected, with their commit — so closures stay visible on the dashboard instead of vanishing into chat. ' +
          'Provider funds shows live token balance for Leonardo (from /me) and an "unavailable" line for Anthropic (admin API not on our plan). ' +
          'The Users/Cards/Ability review/Prompt review tiles are direct links to their respective admin pages with the live count. ' +
          'System diagnostics is collapsed by default; expand it for the low-value aggregate totals that used to live above the fold.'
        }
      />
      {error && (
        <div className="p-3 rounded text-sm" style={{ background: 'rgba(220,38,38,0.15)', color: '#f9c9c9', border: '1px solid rgba(220,38,38,0.4)' }}>
          {error}
        </div>
      )}

      {/* Inbox — the only action-demanding module, so it takes the top
          slot above Provider funds. One flat queue, oldest first. */}
      <InboxSection rows={inbox} />

      {/* Recently resolved — collapsed. Makes closures (ship/reject +
          commit) visible on the dashboard instead of only in chat. */}
      <ResolvedStrip rows={resolved} />

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

const INBOX_CAP = 5;

function InboxSection({ rows }: { rows: InboxRow[] | null }) {
  const total = rows?.length ?? 0;
  const shown = rows?.slice(0, INBOX_CAP) ?? [];
  return (
    <section>
      <SectionHeader
        title="Inbox"
        subtitle="Needs a decision — oldest first"
      />
      <div className="rounded-lg border border-bone/15 bg-void/60">
        {rows === null && (
          <div className="p-4 text-xs text-bone/50">Loading…</div>
        )}
        {rows !== null && total === 0 && (
          <div className="p-4 text-xs text-bone/50">
            Nothing awaiting review. Open proposals and flagged judgments show up here.
          </div>
        )}
        {rows !== null && total > 0 && (
          <>
            <ul className="divide-y divide-bone/10">
              {shown.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  <Link
                    to={r.href}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-void/40 transition-colors"
                  >
                    <span className="text-[9px] uppercase tracking-wider text-bone/60 w-16 shrink-0">
                      {r.kind === 'proposal' ? 'Proposal' : 'Judgment'}
                    </span>
                    <span className="text-xs text-bone flex-1 truncate">{r.summary}</span>
                    <span className="text-[10px] text-bone/50 shrink-0">
                      filed {relativeAge(r.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {total > INBOX_CAP && (
              <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-bone/50 border-t border-bone/10">
                Showing {INBOX_CAP} of {total} — {total - INBOX_CAP} more in the queue
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function ResolvedStrip({ rows }: { rows: ResolvedRow[] | null }) {
  const total = rows?.length ?? 0;
  return (
    <details className="rounded border border-bone/15 bg-void/40">
      <summary className="cursor-pointer px-4 py-3 text-xs uppercase tracking-wider text-bone/70">
        Recently resolved ({total})
      </summary>
      <div className="p-2 border-t border-bone/10">
        {total === 0 ? (
          <div className="px-2 py-2 text-xs text-bone/50">No shipped or rejected proposals yet.</div>
        ) : (
          <ul className="divide-y divide-bone/10">
            {rows!.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-2 py-2">
                <span className="text-[9px] uppercase tracking-wider w-16 shrink-0 text-bone/60">
                  {r.status}
                </span>
                <span className="text-xs text-bone flex-1 truncate">
                  {r.archetype} — {failureLabel(r.failureType)}
                </span>
                {r.commitSha && (
                  <code className="text-[10px] text-bone/60 shrink-0">{r.commitSha.slice(0, 7)}</code>
                )}
                <span className="text-[10px] text-bone/50 shrink-0">
                  {r.decidedAt ? relativeAge(r.decidedAt) : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
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
