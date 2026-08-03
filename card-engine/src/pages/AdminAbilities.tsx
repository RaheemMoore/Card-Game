import { useState, useEffect, useCallback } from 'react';
import {
  getAbilityStore,
  getAllDefinitions,
} from '../services/abilities/registry';
import {
  approveAbility,
  rejectAbility,
  mergeAbility,
  listReviewQueue,
} from '../services/abilities/moderation';
import {
  generateCanonicalArt,
  promoteCandidateArt,
  rejectCandidateArt,
} from '../services/abilities/canonicalArtPipeline';
import type { AbilityDefinition, CanonicalArtAsset } from '../types/abilities';
import { getArtCrops } from '../types/abilities';
import {
  AdminPage, AdminButton, AdminStatusBadge, AdminAlert,
  AdminEmptyState, AdminCard, AdminField, AdminSelect,
} from '../components/admin/ui';

// Operational ability workspace. The Studio Wiki owns reference browsing;
// this page keeps only actions that change moderation or art state:
//   - Review Queue: proposed / experimental definitions awaiting approve/reject/merge.
//   - Art Candidates: candidate art assets waiting for human promotion.
//
// The guard + header live on AdminShell — this file only renders its tab body.

type Tab = 'queue' | 'art';

export function AdminAbilities() {
  const [tab, setTab] = useState<Tab>('queue');
  const [queue, setQueue] = useState<AbilityDefinition[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CanonicalArtAsset[]>([]);

  const refresh = useCallback(() => {
    const store = getAbilityStore();
    setQueue(listReviewQueue(store));
    setCandidates(store.getAllArt().filter((a) => a.status === 'candidate'));
  }, []);

  useEffect(() => {
    refresh();
    const unsub = getAbilityStore().subscribe(refresh);
    return unsub;
  }, [refresh]);

  const withBusy = useCallback(
    async <T,>(key: string, fn: () => Promise<T>): Promise<T | undefined> => {
      setBusyId(key);
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

  const allDefinitions = getAllDefinitions();
  const approvedDefinitions = allDefinitions.filter((d) => d.status === 'approved');
  const candidateCount = candidates.length;

  return (
    <AdminPage
      title="Ability Review"
      description="Operational moderation only: approve, reject, or merge proposals; generate candidate art; and promote or reject art candidates. Browse the current ability roster and artwork in the Studio Wiki."
    >
      <nav className="flex gap-1 mb-4 overflow-x-auto" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        <TabButton active={tab === 'queue'} label={`Review Queue (${queue.length})`} onClick={() => setTab('queue')} />
        <TabButton active={tab === 'art'} label={`Art Candidates (${candidateCount})`} onClick={() => setTab('art')} />
      </nav>

      {flash && (
        <AdminAlert tone="danger" className="mb-3">
          <span className="flex items-center justify-between gap-2">
            <span>{flash}</span>
            <button className="underline shrink-0" onClick={() => setFlash(null)}>dismiss</button>
          </span>
        </AdminAlert>
      )}

      {tab === 'queue' && (
        <QueueTab queue={queue} approvedTargets={approvedDefinitions} busyId={busyId} withBusy={withBusy} />
      )}
      {tab === 'art' && (
        <ArtCandidatesTab candidates={candidates} definitions={allDefinitions} busyId={busyId} withBusy={withBusy} />
      )}
    </AdminPage>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 text-sm whitespace-nowrap -mb-px"
      style={{
        color: active ? 'var(--admin-text)' : 'var(--admin-text-muted)',
        borderBottom: active ? '2px solid var(--admin-accent)' : '2px solid transparent',
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

// ---- Review queue tab ---------------------------------------------------

function QueueTab({
  queue,
  approvedTargets,
  busyId,
  withBusy,
}: {
  queue: AbilityDefinition[];
  approvedTargets: AbilityDefinition[];
  busyId: string | null;
  withBusy: <T>(key: string, fn: () => Promise<T>) => Promise<T | undefined>;
}) {
  if (queue.length === 0) {
    return <AdminEmptyState title="Nothing awaiting review" description="New abilities from forge runs will appear here." />;
  }
  return (
    <div className="space-y-2">
      {queue.map((def) => (
        <QueueRow
          key={def.id}
          def={def}
          busy={busyId === def.id}
          approvedTargets={approvedTargets}
          onApprove={() => withBusy(def.id, () => approveAbility(getAbilityStore(), def.id))}
          onReject={(reason) => withBusy(def.id, () => rejectAbility(getAbilityStore(), def.id, reason))}
          onMerge={(targetId) => withBusy(def.id, () => mergeAbility(getAbilityStore(), def.id, targetId))}
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
    <AdminCard>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{def.displayName}</div>
          <div className="text-[11px] font-mono truncate" style={{ color: 'var(--admin-text-muted)' }}>{def.id}</div>
        </div>
        <AdminStatusBadge tone={def.status === 'experimental' ? 'warning' : 'accent'}>{def.status}</AdminStatusBadge>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        <AdminStatusBadge>{def.rarity}</AdminStatusBadge>
        <AdminStatusBadge>{def.role}</AdminStatusBadge>
        {def.familyIds.map((f) => <AdminStatusBadge key={f} tone="accent">{f}</AdminStatusBadge>)}
      </div>

      <p className="text-xs mb-3" style={{ color: 'var(--admin-text-muted)' }}>{def.descriptionShort}</p>

      <div className="flex flex-wrap gap-2 items-end">
        <AdminButton variant="primary" size="sm" onClick={onApprove} disabled={busy}>Approve</AdminButton>

        <div className="flex items-end gap-1">
          <div className="w-36">
            <AdminField
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="reason (optional)"
            />
          </div>
          <AdminButton variant="danger" size="sm" onClick={() => onReject(rejectReason)} disabled={busy}>Reject</AdminButton>
        </div>

        <div className="flex items-end gap-1">
          <div className="w-40">
            <AdminSelect value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}>
              <option value="">merge into…</option>
              {approvedTargets.map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
            </AdminSelect>
          </div>
          <AdminButton size="sm" onClick={() => mergeTarget && onMerge(mergeTarget)} disabled={busy || !mergeTarget}>Merge</AdminButton>
        </div>

        <AdminButton size="sm" onClick={onGenerateArt} disabled={busy} title="Fires Leonardo — result lands as a candidate for review">
          Fire Leonardo → candidate
        </AdminButton>

        {busy && <span className="text-xs italic" style={{ color: 'var(--admin-text-muted)' }}>Working…</span>}
      </div>
    </AdminCard>
  );
}

// ---- Art candidates tab -------------------------------------------------

function ArtCandidatesTab({
  candidates,
  definitions,
  busyId,
  withBusy,
}: {
  candidates: CanonicalArtAsset[];
  definitions: AbilityDefinition[];
  busyId: string | null;
  withBusy: <T>(key: string, fn: () => Promise<T>) => Promise<T | undefined>;
}) {
  const store = getAbilityStore();
  const defsById = new Map(definitions.map((d) => [d.id, d]));
  if (candidates.length === 0) {
    return (
      <AdminEmptyState
        title="No candidate art awaiting review"
        description="New Leonardo generations from the queue land here for approve or reject."
      />
    );
  }
  return (
    <div className="space-y-3">
      {candidates.map((cand) => {
        const def = defsById.get(cand.abilityId);
        const prior = store.getArtForAbility(cand.abilityId);
        const candUrl = getArtCrops(cand).detail.url;
        const priorUrl = prior ? getArtCrops(prior).detail.url : null;
        const busy = busyId === cand.id;
        return (
          <AdminCard key={cand.id}>
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{def?.displayName ?? cand.abilityId}</div>
                <div className="text-[11px] font-mono" style={{ color: 'var(--admin-text-muted)' }}>{cand.id}</div>
              </div>
              <div className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                {cand.provider} · prompt {cand.sourcePromptVersion ?? '—'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <ArtPreview label="Current approved" url={priorUrl} />
              <ArtPreview label="Candidate" url={candUrl} highlight />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <AdminButton variant="primary" size="sm" onClick={() => withBusy(cand.id, () => promoteCandidateArt(store, cand.id))} disabled={busy}>
                Approve candidate
              </AdminButton>
              <AdminButton variant="danger" size="sm" onClick={() => withBusy(cand.id, () => rejectCandidateArt(store, cand.id))} disabled={busy}>
                Reject candidate
              </AdminButton>
              {busy && <span className="text-xs italic" style={{ color: 'var(--admin-text-muted)' }}>Working…</span>}
            </div>
          </AdminCard>
        );
      })}
    </div>
  );
}

function ArtPreview({ label, url, highlight }: { label: string; url: string | null; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text-muted)' }}>{label}</div>
      {url ? (
        <div
          className="w-full aspect-square rounded bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${url}")`, border: highlight ? '1px solid var(--admin-accent)' : '1px solid var(--admin-border)' }}
        />
      ) : (
        <div className="w-full aspect-square rounded flex items-center justify-center text-xs" style={{ background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' }}>
          No image
        </div>
      )}
    </div>
  );
}
