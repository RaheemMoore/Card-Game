import { useState, useEffect, useCallback, useMemo } from 'react';
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
  promoteCandidateArt,
  rejectCandidateArt,
} from '../services/abilities/canonicalArtPipeline';
import type { AbilityDefinition, AbilityVersion, CanonicalArtAsset } from '../types/abilities';
import { getArtCrops } from '../types/abilities';
import { AdminPreviewPanel } from '../components/admin/AdminPreviewPanel';
import {
  AdminPage, AdminMetricCard, AdminButton, AdminStatusBadge, AdminAlert,
  AdminEmptyState, AdminCard, AdminField, AdminSelect, AdminDataTable,
  type AdminColumn,
} from '../components/admin/ui';

// Ability workspace. Tabs cover the four workflows Raheem needs distinct:
//   - Review Queue: proposed / experimental definitions awaiting approve/reject/merge.
//   - Approved: visual library of every approved ability with image + name.
//   - Art Candidates: candidate art assets waiting for human promotion.
//   - All: raw table of every definition (kept from the original page).
//
// The guard + header live on AdminShell — this file only renders its tab body.

type Tab = 'queue' | 'approved' | 'art' | 'all';

export function AdminAbilities() {
  const [tab, setTab] = useState<Tab>('queue');
  const [queue, setQueue] = useState<AbilityDefinition[]>([]);
  const [analytics, setAnalytics] = useState<AbilityLibraryAnalytics | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CanonicalArtAsset[]>([]);
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const store = getAbilityStore();
    setQueue(listReviewQueue(store));
    setAnalytics(computeAnalytics(store));
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
      title="Abilities"
      description="The game's ability library: review queue (approve / reject / merge / fire Leonardo), the approved visual library, candidate art awaiting promotion, and a flat table of every definition."
    >
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          <AdminMetricCard label="Approved" value={analytics.approvedCount} />
          <AdminMetricCard label="Proposed" value={analytics.proposedCount} />
          <AdminMetricCard label="Experimental" value={analytics.experimentalCount} />
          <AdminMetricCard label="Merged" value={analytics.mergedCount} />
          <AdminMetricCard label="Discoveries" value={analytics.totalDiscoveries} />
          <AdminMetricCard label="First globally" value={analytics.firstDiscoveredGloballyCount} />
        </div>
      )}

      <nav className="flex gap-1 mb-4 overflow-x-auto" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        <TabButton active={tab === 'queue'} label={`Review Queue (${queue.length})`} onClick={() => setTab('queue')} />
        <TabButton active={tab === 'approved'} label={`Approved (${approvedDefinitions.length})`} onClick={() => setTab('approved')} />
        <TabButton active={tab === 'art'} label={`Art Candidates (${candidateCount})`} onClick={() => setTab('art')} />
        <TabButton active={tab === 'all'} label={`All (${allDefinitions.length})`} onClick={() => setTab('all')} />
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
      {tab === 'approved' && <ApprovedTab definitions={approvedDefinitions} onSelect={setSelectedAbilityId} />}
      {tab === 'art' && (
        <ArtCandidatesTab candidates={candidates} definitions={allDefinitions} busyId={busyId} withBusy={withBusy} />
      )}
      {tab === 'all' && <AllTab definitions={allDefinitions} />}

      <AbilityDetailPanel abilityId={selectedAbilityId} onClose={() => setSelectedAbilityId(null)} />
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

// ---- Approved gallery tab -----------------------------------------------

function ApprovedTab({ definitions, onSelect }: { definitions: AbilityDefinition[]; onSelect: (id: string) => void }) {
  const store = getAbilityStore();
  const rows = useMemo(() => {
    return definitions
      .slice()
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map((def) => {
        const art = store.getArtForAbility(def.id);
        const version = store.getCurrentVersion(def.id);
        return { def, art, version };
      });
  }, [definitions, store]);

  if (rows.length === 0) {
    return <AdminEmptyState title="No approved abilities yet" />;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {rows.map(({ def, art, version }) => {
        const imageUrl = art ? getArtCrops(art).detail.url : null;
        return (
          <button
            key={def.id}
            onClick={() => onSelect(def.id)}
            className="text-left rounded-[10px] transition-colors hover:border-[var(--admin-accent)] p-3"
            style={{ background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border)' }}
          >
            {imageUrl ? (
              <div className="w-full aspect-square rounded mb-2 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url("${imageUrl}")` }} />
            ) : (
              <div className="w-full aspect-square rounded mb-2 flex items-center justify-center text-xs" style={{ background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-muted)' }}>
                No art
              </div>
            )}
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{def.displayName}</div>
            <div className="text-[11px] truncate" style={{ color: 'var(--admin-text-muted)' }}>{def.slug}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              <AdminStatusBadge>{def.rarity}</AdminStatusBadge>
              <AdminStatusBadge>{def.role}</AdminStatusBadge>
            </div>
            {version && (
              <div className="text-[11px] mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                v{version.versionNumber}
                {version.publishedAt ? ` · ${new Date(version.publishedAt).toLocaleDateString()}` : ''}
              </div>
            )}
            {art && <div className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>art: {art.status}</div>}
          </button>
        );
      })}
    </div>
  );
}

// ---- Ability detail preview panel --------------------------------------

function AbilityDetailPanel({ abilityId, onClose }: { abilityId: string | null; onClose: () => void }) {
  const store = getAbilityStore();
  const def = abilityId ? store.getDefinition(abilityId) : undefined;
  const version = abilityId ? store.getCurrentVersion(abilityId) : undefined;
  const approvedArt = abilityId ? store.getArtForAbility(abilityId) : undefined;
  const artHistory = useMemo(() => {
    if (!abilityId) return [] as CanonicalArtAsset[];
    return store
      .getAllArt()
      .filter((a) => a.abilityId === abilityId)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [abilityId, store]);

  if (!abilityId || !def) {
    return (
      <AdminPreviewPanel open={Boolean(abilityId)} onClose={onClose} title="">
        <div />
      </AdminPreviewPanel>
    );
  }
  const imageUrl = approvedArt ? getArtCrops(approvedArt).detail.url : null;

  return (
    <AdminPreviewPanel
      open={Boolean(abilityId)}
      onClose={onClose}
      title={def.displayName}
      subtitle={`${def.slug} · ${def.rarity} · ${def.role}`}
    >
      <div className="space-y-4">
        {imageUrl ? (
          <div className="flex justify-center">
            <div className="w-64 aspect-square rounded bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url("${imageUrl}")`, border: '1px solid var(--admin-border)' }} />
          </div>
        ) : (
          <div className="w-full aspect-square rounded flex items-center justify-center text-xs" style={{ background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-muted)' }}>
            No approved art
          </div>
        )}

        <MetaGrid def={def} version={version} approvedArt={approvedArt} />

        {def.descriptionShort && (
          <Section title="Description">
            <p className="text-xs" style={{ color: 'var(--admin-text)' }}>{def.descriptionShort}</p>
            {def.descriptionLong && def.descriptionLong !== def.descriptionShort && (
              <p className="text-xs mt-2" style={{ color: 'var(--admin-text-muted)' }}>{def.descriptionLong}</p>
            )}
          </Section>
        )}

        {version && (
          <Section title="Mechanics (current version)">
            <VersionSummary version={version} />
          </Section>
        )}

        <Section title={`Art history (${artHistory.length})`}>
          {artHistory.length === 0 && <div className="text-xs italic" style={{ color: 'var(--admin-text-muted)' }}>None</div>}
          {artHistory.map((art) => {
            const url = getArtCrops(art).detail.url;
            return (
              <div key={art.id} className="flex items-center gap-3 rounded p-2" style={{ background: 'var(--admin-surface-subtle)', border: '1px solid var(--admin-border)' }}>
                <div className="w-12 h-12 rounded bg-cover bg-center bg-no-repeat shrink-0" style={{ backgroundImage: `url("${url}")` }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-mono truncate" style={{ color: 'var(--admin-text-muted)' }}>{art.id}</div>
                  <div className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                    {art.status} · {art.provider} · {new Date(art.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </Section>

        <AdminCard surface="subtle" padded={false}>
          <details>
            <summary className="cursor-pointer px-3 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
              Raw JSON
            </summary>
            <pre className="p-3 text-[10px] overflow-x-auto max-h-96 whitespace-pre-wrap font-mono" style={{ borderTop: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>
              {JSON.stringify({ def, version, approvedArt }, null, 2)}
            </pre>
          </details>
        </AdminCard>
      </div>
    </AdminPreviewPanel>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: 'var(--admin-text-muted)' }}>{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MetaGrid({
  def,
  version,
  approvedArt,
}: {
  def: AbilityDefinition;
  version: AbilityVersion | undefined;
  approvedArt: CanonicalArtAsset | undefined;
}) {
  const store = getAbilityStore();
  const families = def.familyIds.map((id) => store.getFamily(id)?.name ?? id).join(', ');
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
      <MetaRow label="Family" value={families} />
      <MetaRow label="Rarity" value={def.rarity} />
      <MetaRow label="Role" value={def.role} />
      <MetaRow label="Slot type" value={version?.slotType ?? '—'} />
      <MetaRow label="Resource" value={version ? `${version.resourceType} · ${version.resourceCost}` : '—'} />
      <MetaRow label="Definition" value={def.status} />
      <MetaRow label="Art status" value={approvedArt?.status ?? 'none'} />
      <MetaRow label="Version" value={version ? `v${version.versionNumber}` : '—'} />
      <MetaRow label="Published" value={version?.publishedAt ? new Date(version.publishedAt).toLocaleDateString() : '—'} />
      <MetaRow label="Power score" value={version?.powerBudgetScore != null ? String(version.powerBudgetScore) : '—'} />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div style={{ color: 'var(--admin-text-muted)' }}>{label}</div>
      <div style={{ color: 'var(--admin-text)' }}>{value}</div>
    </>
  );
}

function VersionSummary({ version }: { version: AbilityVersion }) {
  return (
    <div className="text-xs space-y-2" style={{ color: 'var(--admin-text)' }}>
      {version.cooldownRounds != null && (
        <div><span style={{ color: 'var(--admin-text-muted)' }}>Cooldown:</span> {version.cooldownRounds} rounds</div>
      )}
      {version.maxCharges != null && (
        <div><span style={{ color: 'var(--admin-text-muted)' }}>Max charges:</span> {version.maxCharges}</div>
      )}
      <div>
        <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text-muted)' }}>Effects ({version.effects.length})</div>
        <ul className="space-y-1">
          {version.effects.map((e, i) => (
            <li key={i} className="rounded p-2 text-[11px] font-mono" style={{ background: 'var(--admin-surface-subtle)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
              {JSON.stringify(e)}
            </li>
          ))}
        </ul>
      </div>
      {version.balanceNotes && (
        <div>
          <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text-muted)' }}>Balance notes</div>
          <p className="text-[11px]">{version.balanceNotes}</p>
        </div>
      )}
    </div>
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

// ---- All tab -----------------------------------------------------------

function AllTab({ definitions }: { definitions: AbilityDefinition[] }) {
  const sorted = definitions.slice().sort((a, b) => a.displayName.localeCompare(b.displayName));
  const columns: AdminColumn<AbilityDefinition>[] = [
    { key: 'name', header: 'Name', render: (d) => d.displayName },
    { key: 'slug', header: 'Slug', render: (d) => <span className="font-mono" style={{ color: 'var(--admin-text-muted)' }}>{d.slug}</span> },
    { key: 'family', header: 'Family', secondary: true, render: (d) => d.familyIds.join(', ') },
    { key: 'rarity', header: 'Rarity', render: (d) => d.rarity },
    { key: 'role', header: 'Role', secondary: true, render: (d) => d.role },
    { key: 'status', header: 'Status', render: (d) => <AdminStatusBadge tone={d.status === 'approved' ? 'success' : d.status === 'experimental' ? 'warning' : 'neutral'}>{d.status}</AdminStatusBadge> },
  ];
  return (
    <AdminDataTable
      columns={columns}
      rows={sorted}
      rowKey={(d) => d.id}
      emptyTitle="No definitions"
    />
  );
}
