import { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { fetchIsAdmin } from '../services/persistence/supabaseClient';
import {
  getAbilityStore,
  getAllDefinitions,
} from '../services/abilities/registry';
import {
  approveAbility,
  rejectAbility,
  mergeAbility,
  computeAnalytics,
  listReviewQueue,
  type AbilityLibraryAnalytics,
} from '../services/abilities/moderation';
import {
  generateCanonicalArt,
} from '../services/abilities/canonicalArtPipeline';
import type { AbilityDefinition } from '../types/abilities';

/**
 * Admin: ability library moderation. Embedded inside pages/Admin.tsx.
 *
 * Reads from the currently-installed AbilityStore, so this section
 * automatically operates against Supabase when the admin is signed in and
 * localStorage otherwise. RLS enforces admin-only writes on the Supabase
 * side; the local store lets any dev try the flow.
 */
type GuardState = 'checking' | 'allowed' | 'denied';

export function AdminAbilities() {
  const [guard, setGuard] = useState<GuardState>('checking');
  const [queue, setQueue] = useState<AbilityDefinition[]>([]);
  const [analytics, setAnalytics] = useState<AbilityLibraryAnalytics | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('dev_admin') === '1') {
      setGuard('allowed');
      return;
    }
    void fetchIsAdmin().then((ok) => setGuard(ok ? 'allowed' : 'denied'));
  }, []);

  const refresh = useCallback(() => {
    const store = getAbilityStore();
    setQueue(listReviewQueue(store));
    setAnalytics(computeAnalytics(store));
  }, []);

  useEffect(() => {
    refresh();
    const unsub = getAbilityStore().subscribe(refresh);
    return unsub;
  }, [refresh]);

  const withBusy = useCallback(
    async <T,>(abilityId: string, fn: () => Promise<T>): Promise<T | undefined> => {
      setBusyId(abilityId);
      try {
        return await fn();
      } catch (err) {
        setFlash(err instanceof Error ? err.message : String(err));
        return undefined;
      } finally {
        setBusyId(null);
        refresh();
      }
    },
    [refresh],
  );

  if (guard === 'checking') return <div className="p-8 text-center text-bone/70">Checking access…</div>;
  if (guard === 'denied') return <Navigate to="/" replace />;

  const allDefinitions = getAllDefinitions();
  const approvedDefinitions = allDefinitions.filter((d) => d.status === 'approved');

  return (
    <section className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-fantasy text-2xl font-bold text-bone">Abilities</h1>
        <Link to="/admin" className="text-xs text-bone/60 underline">← Admin home</Link>
      </div>

      {flash && (
        <div
          className="mb-3 p-2 rounded text-xs"
          style={{ background: 'rgba(220,38,38,0.15)', color: '#f9c9c9', border: '1px solid rgba(220,38,38,0.4)' }}
        >
          {flash}{' '}
          <button className="underline ml-2" onClick={() => setFlash(null)}>
            dismiss
          </button>
        </div>
      )}

      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          <MiniStat label="Approved" value={analytics.approvedCount} />
          <MiniStat label="Proposed" value={analytics.proposedCount} />
          <MiniStat label="Experimental" value={analytics.experimentalCount} />
          <MiniStat label="Merged" value={analytics.mergedCount} />
          <MiniStat label="Discoveries" value={analytics.totalDiscoveries} />
          <MiniStat label="First globally" value={analytics.firstDiscoveredGloballyCount} />
        </div>
      )}

      {analytics && analytics.perFamily.length > 0 && (
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {analytics.perFamily.map((f) => (
            <div
              key={f.familyId}
              className="rounded-md border border-bone/15 bg-void/40 p-2 text-center"
              title={`${f.approved} approved out of ${f.total} in ${f.familyName}`}
            >
              <div className="text-[10px] uppercase tracking-widest text-bone/50">
                {f.familyName}
              </div>
              <div className="text-sm text-bone tabular-nums">
                {f.approved}/{f.total}
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="font-fantasy text-sm uppercase tracking-widest text-gold/70 mb-2">
        Review queue ({queue.length})
      </h3>
      {queue.length === 0 ? (
        <p className="text-xs text-bone/60 italic">
          Nothing awaiting review. New abilities from forge runs will appear here.
        </p>
      ) : (
        <div className="space-y-2">
          {queue.map((def) => (
            <QueueRow
              key={def.id}
              def={def}
              busy={busyId === def.id}
              approvedTargets={approvedDefinitions}
              onApprove={() => withBusy(def.id, () => approveAbility(getAbilityStore(), def.id))}
              onReject={(reason) =>
                withBusy(def.id, () => rejectAbility(getAbilityStore(), def.id, reason))
              }
              onMerge={(targetId) =>
                withBusy(def.id, () => mergeAbility(getAbilityStore(), def.id, targetId))
              }
              onGenerateArt={async () => {
                await withBusy(def.id, async () => {
                  const store = getAbilityStore();
                  const version = store.getCurrentVersion(def.id);
                  const family = store.getFamily(def.familyIds[0]);
                  if (!version) throw new Error('no current version');
                  return generateCanonicalArt(store, { def, version, family });
                });
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-8 flex items-baseline justify-between">
        <h3 className="font-fantasy text-sm uppercase tracking-widest text-gold/70">
          All abilities ({allDefinitions.length})
        </h3>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-bone/70 underline"
        >
          {showAll ? 'Hide' : 'Show'}
        </button>
      </div>
      {showAll && (
        <div className="mt-2 overflow-x-auto rounded border border-bone/15">
          <table className="w-full text-xs text-bone/90">
            <thead className="bg-void/60 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-2 py-1">Name</th>
                <th className="text-left px-2 py-1">Slug</th>
                <th className="text-left px-2 py-1">Family</th>
                <th className="text-left px-2 py-1">Rarity</th>
                <th className="text-left px-2 py-1">Role</th>
                <th className="text-left px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {allDefinitions
                .slice()
                .sort((a, b) => a.displayName.localeCompare(b.displayName))
                .map((d) => (
                  <tr key={d.id} className="border-t border-bone/10">
                    <td className="px-2 py-1">{d.displayName}</td>
                    <td className="px-2 py-1 font-mono text-bone/60">{d.slug}</td>
                    <td className="px-2 py-1">{d.familyIds.join(', ')}</td>
                    <td className="px-2 py-1">{d.rarity}</td>
                    <td className="px-2 py-1">{d.role}</td>
                    <td className="px-2 py-1">{d.status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-bone/15 bg-void/40 p-2 text-center">
      <div className="text-[10px] uppercase tracking-widest text-bone/50">{label}</div>
      <div className="text-lg font-bold text-bone tabular-nums">{value}</div>
    </div>
  );
}

interface QueueRowProps {
  def: AbilityDefinition;
  busy: boolean;
  approvedTargets: AbilityDefinition[];
  onApprove: () => void;
  onReject: (reason: string) => void;
  onMerge: (targetId: string) => void;
  onGenerateArt: () => void;
}

function QueueRow({ def, busy, approvedTargets, onApprove, onReject, onMerge, onGenerateArt }: QueueRowProps) {
  const [mergeTarget, setMergeTarget] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('');

  return (
    <div className="rounded-md border border-bone/15 bg-void/40 p-3">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <div className="font-fantasy text-sm text-bone truncate">{def.displayName}</div>
          <div className="text-[10px] text-bone/50 font-mono truncate">{def.id}</div>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest"
          style={{
            background: def.status === 'experimental' ? 'rgba(220,38,38,0.15)' : 'rgba(155,182,179,0.15)',
            color: def.status === 'experimental' ? '#f9c9c9' : '#d6f2ec',
          }}
        >
          {def.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mb-2 text-[10px]">
        <span className="px-1.5 py-0.5 rounded bg-bone/10 text-bone/80">{def.rarity}</span>
        <span className="px-1.5 py-0.5 rounded bg-bone/10 text-bone/80">{def.role}</span>
        {def.familyIds.map((f) => (
          <span key={f} className="px-1.5 py-0.5 rounded bg-gold/10 text-gold/80">
            {f}
          </span>
        ))}
      </div>

      <p className="text-xs text-bone/70 mb-3">{def.descriptionShort}</p>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={onApprove}
          disabled={busy}
          className="px-3 py-1 rounded text-xs font-fantasy font-bold disabled:opacity-40"
          style={{ background: 'rgba(155,182,179,0.2)', color: '#d6f2ec', border: '1px solid rgba(155,182,179,0.4)' }}
        >
          Approve
        </button>

        <div className="flex items-center gap-1">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="reason (optional)"
            className="px-2 py-1 rounded text-xs bg-void/60 border border-bone/20 text-bone w-32"
          />
          <button
            onClick={() => onReject(rejectReason)}
            disabled={busy}
            className="px-3 py-1 rounded text-xs font-fantasy font-bold disabled:opacity-40"
            style={{ background: 'rgba(138,28,28,0.2)', color: '#f9c9c9', border: '1px solid rgba(138,28,28,0.4)' }}
          >
            Reject
          </button>
        </div>

        <div className="flex items-center gap-1">
          <select
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
            className="px-2 py-1 rounded text-xs bg-void/60 border border-bone/20 text-bone max-w-[10rem]"
          >
            <option value="">merge into…</option>
            {approvedTargets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName}
              </option>
            ))}
          </select>
          <button
            onClick={() => mergeTarget && onMerge(mergeTarget)}
            disabled={busy || !mergeTarget}
            className="px-3 py-1 rounded text-xs font-fantasy font-bold disabled:opacity-40"
            style={{ background: 'rgba(184,134,11,0.2)', color: '#f4d78a', border: '1px solid rgba(184,134,11,0.4)' }}
          >
            Merge
          </button>
        </div>

        <button
          onClick={onGenerateArt}
          disabled={busy}
          className="px-3 py-1 rounded text-xs font-fantasy font-bold disabled:opacity-40"
          style={{ background: 'rgba(76,29,149,0.2)', color: '#d8bfff', border: '1px solid rgba(76,29,149,0.4)' }}
          title="Fires Leonardo — ~$0.036 per call"
        >
          Fire Leonardo
        </button>

        {busy && <span className="text-xs text-bone/60 italic">Working…</span>}
      </div>
    </div>
  );
}
