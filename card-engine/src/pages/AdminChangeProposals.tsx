import { useCallback, useEffect, useState } from 'react';
import { ARCHETYPE_NAMES, type ArchetypeName } from '../types/card';
import { getSupabaseClient } from '../services/persistence/supabaseClient';

// Prompt change proposals. Global scope requires Raheem's approval
// (approve_prompt_change_proposal RPC enforces is_global_approver());
// archetype scope any admin can approve. Every approve/reject writes an
// admin_audit_log row.

type Scope = 'archetype' | 'global';
type Status =
  | 'draft'
  | 'evidence_ready'
  | 'awaiting_raheem'
  | 'approved'
  | 'rejected'
  | 'implemented'
  | 'verified';

interface Proposal {
  id: string;
  scope: Scope;
  archetype: string | null;
  title: string;
  rationale: string;
  proposed_patch: string;
  evidence_run_ids: string[];
  status: Status;
  drafted_by_user_id: string;
  approved_by_user_id: string | null;
  approved_at: string | null;
  implementation_commit: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export function AdminChangeProposals() {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDraft, setShowDraft] = useState(false);
  const [isGlobalApprover, setIsGlobalApprover] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase not configured');
      return;
    }
    const [{ data: props, error: err }, { data: gaFlag }] = await Promise.all([
      supabase.from('prompt_change_proposals').select('*').order('created_at', { ascending: false }),
      supabase.rpc('is_global_approver'),
    ]);
    if (err) {
      setError(err.message);
      return;
    }
    setProposals((props ?? []) as Proposal[]);
    setIsGlobalApprover(Boolean(gaFlag));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="font-fantasy text-sm uppercase tracking-wider text-bone/80">Prompt change proposals</h2>
          <p className="text-xs text-bone/60">
            Global proposals require the designated approver. Archetype proposals any admin can approve.
          </p>
        </div>
        <button
          onClick={() => setShowDraft((v) => !v)}
          className="px-3 py-1.5 rounded text-xs font-fantasy font-bold bg-gold/80 text-void"
        >
          {showDraft ? 'Cancel draft' : 'New proposal'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded text-sm" style={{ background: 'rgba(220,38,38,0.15)', color: '#f9c9c9', border: '1px solid rgba(220,38,38,0.4)' }}>
          {error}
        </div>
      )}

      {showDraft && (
        <DraftForm
          onCreated={() => {
            setShowDraft(false);
            void refresh();
          }}
        />
      )}

      {proposals === null && <div className="text-xs text-bone/60">Loading…</div>}
      {proposals?.length === 0 && (
        <div className="text-xs text-bone/60 italic">No proposals yet.</div>
      )}
      {proposals && proposals.length > 0 && (
        <div className="space-y-3">
          {proposals.map((p) => (
            <ProposalRow key={p.id} proposal={p} isGlobalApprover={isGlobalApprover} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function DraftForm({ onCreated }: { onCreated: () => void }) {
  const [scope, setScope] = useState<Scope>('archetype');
  const [archetype, setArchetype] = useState<ArchetypeName>(ARCHETYPE_NAMES[0]);
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [patch, setPatch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error('No session');
      const { error: err } = await supabase.from('prompt_change_proposals').insert({
        scope,
        archetype: scope === 'archetype' ? archetype : null,
        title: title.trim(),
        rationale: rationale.trim(),
        proposed_patch: patch,
        drafted_by_user_id: uid,
        status: 'draft',
      });
      if (err) throw err;
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-bone/15 bg-void/40 p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Scope</span>
          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)}
            className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm">
            <option value="archetype">archetype (any admin can approve)</option>
            <option value="global">global (Raheem-only approval)</option>
          </select>
        </label>
        {scope === 'archetype' && (
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Archetype</span>
            <select value={archetype} onChange={(e) => setArchetype(e.target.value as ArchetypeName)}
              className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm">
              {ARCHETYPE_NAMES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        )}
      </div>
      <label className="block">
        <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Title</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm" />
      </label>
      <label className="block">
        <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Rationale</span>
        <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={3}
          className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm" />
      </label>
      <label className="block">
        <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Proposed patch (diff / prose)</span>
        <textarea value={patch} onChange={(e) => setPatch(e.target.value)} rows={5}
          className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-xs font-mono" />
      </label>
      {error && <div className="text-xs" style={{ color: '#f9c9c9' }}>{error}</div>}
      <button onClick={submit} disabled={busy || !title.trim() || !rationale.trim() || !patch}
        className="px-4 py-2 rounded font-fantasy font-bold text-sm bg-gold/80 text-void disabled:opacity-40">
        {busy ? 'Drafting…' : 'Save draft'}
      </button>
    </section>
  );
}

function ProposalRow({ proposal, isGlobalApprover, onChanged }: { proposal: Proposal; isGlobalApprover: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canApproveGlobal = isGlobalApprover;
  const isGlobalBlocked = proposal.scope === 'global' && !canApproveGlobal;

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');
      const { error: err } = await supabase.rpc('approve_prompt_change_proposal', {
        proposal_id: proposal.id,
        approver_notes: null,
      });
      if (err) throw err;
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: Status) => {
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');
      const { error: err } = await supabase
        .from('prompt_change_proposals')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', proposal.id);
      if (err) throw err;
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-bone/15 bg-void/40 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="font-fantasy text-sm text-bone">{proposal.title}</div>
          <div className="text-[10px] text-bone/50">
            {proposal.scope}{proposal.archetype ? ` · ${proposal.archetype}` : ''} · created {new Date(proposal.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {proposal.evidence_run_ids.length > 0 && (
            <span
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(155,182,179,0.15)', color: '#d6f2ec' }}
              title={proposal.evidence_run_ids.join(', ')}
            >
              📎 {proposal.evidence_run_ids.length} evidence
            </span>
          )}
          <StatusBadge status={proposal.status} scope={proposal.scope} />
        </div>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-bone/60">Rationale</summary>
        <div className="mt-1 text-bone/80 whitespace-pre-wrap">{proposal.rationale}</div>
      </details>
      <details className="text-xs">
        <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-bone/60">Proposed patch</summary>
        <pre className="mt-1 bg-black/40 p-2 rounded text-bone/80 whitespace-pre-wrap max-h-64 overflow-y-auto">{proposal.proposed_patch}</pre>
      </details>
      {proposal.evidence_run_ids.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-bone/60">
            Evidence ({proposal.evidence_run_ids.length})
          </summary>
          <ul className="mt-1 text-bone/70 font-mono space-y-0.5">
            {proposal.evidence_run_ids.map((id) => (
              <li key={id} className="truncate">{id}</li>
            ))}
          </ul>
          <div className="mt-1 text-[10px] text-bone/50">
            Run ids reference <code>prompt_test_runs</code>. Open <a className="underline" href="/admin/prompt-lab">/admin/prompt-lab</a> and locate the session by archetype to see the pinned card.
          </div>
        </details>
      )}

      {error && <div className="text-xs" style={{ color: '#f9c9c9' }}>{error}</div>}

      {proposal.status !== 'approved' && proposal.status !== 'implemented' && proposal.status !== 'verified' && (
        <div className="flex flex-wrap gap-2">
          {proposal.status === 'draft' && (
            <button onClick={() => setStatus('evidence_ready')} disabled={busy} className="px-3 py-1 rounded text-xs font-fantasy border border-bone/20 text-bone/80 disabled:opacity-40">
              → Evidence ready
            </button>
          )}
          {proposal.scope === 'global' && proposal.status === 'evidence_ready' && (
            <button onClick={() => setStatus('awaiting_raheem')} disabled={busy} className="px-3 py-1 rounded text-xs font-fantasy border border-bone/20 text-bone/80 disabled:opacity-40">
              → Awaiting Raheem
            </button>
          )}
          <button
            onClick={approve}
            disabled={busy || isGlobalBlocked}
            className="px-3 py-1 rounded text-xs font-fantasy font-bold disabled:opacity-40"
            style={{ background: 'rgba(155,182,179,0.2)', color: '#d6f2ec', border: '1px solid rgba(155,182,179,0.4)' }}
            title={isGlobalBlocked ? 'Global proposals require the designated approver' : undefined}
          >
            Approve
          </button>
          <button
            onClick={() => setStatus('rejected')}
            disabled={busy}
            className="px-3 py-1 rounded text-xs font-fantasy font-bold disabled:opacity-40"
            style={{ background: 'rgba(138,28,28,0.2)', color: '#f9c9c9', border: '1px solid rgba(138,28,28,0.4)' }}
          >
            Reject
          </button>
        </div>
      )}

      {proposal.status === 'approved' && (
        <div className="text-[10px] text-bone/60">
          Approved by {proposal.approved_by_user_id?.slice(0, 8)}… on {proposal.approved_at ? new Date(proposal.approved_at).toLocaleString() : ''}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, scope }: { status: Status; scope: Scope }) {
  const map: Record<Status, { color: string; bg: string }> = {
    draft:            { color: '#d6f2ec', bg: 'rgba(155,182,179,0.15)' },
    evidence_ready:   { color: '#f4d78a', bg: 'rgba(184,134,11,0.15)' },
    awaiting_raheem:  { color: '#d8bfff', bg: 'rgba(76,29,149,0.2)' },
    approved:         { color: '#c9f9d9', bg: 'rgba(20,120,60,0.2)' },
    rejected:         { color: '#f9c9c9', bg: 'rgba(220,38,38,0.15)' },
    implemented:      { color: '#c9f9d9', bg: 'rgba(20,120,60,0.2)' },
    verified:         { color: '#c9f9d9', bg: 'rgba(20,120,60,0.3)' },
  };
  const cfg = map[status];
  return (
    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color }}>
      {scope === 'global' && status !== 'approved' ? '🔒 ' : ''}{status}
    </span>
  );
}
