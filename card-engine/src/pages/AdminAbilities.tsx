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
    <div>
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          <MiniStat label="Approved"       value={analytics.approvedCount} />
          <MiniStat label="Proposed"       value={analytics.proposedCount} />
          <MiniStat label="Experimental"   value={analytics.experimentalCount} />
          <MiniStat label="Merged"         value={analytics.mergedCount} />
          <MiniStat label="Discoveries"    value={analytics.totalDiscoveries} />
          <MiniStat label="First globally" value={analytics.firstDiscoveredGloballyCount} />
        </div>
      )}

      <nav className="flex gap-1 border-b border-bone/15 mb-4 overflow-x-auto">
        <TabButton active={tab === 'queue'}    label={`Review Queue (${queue.length})`}    onClick={() => setTab('queue')} />
        <TabButton active={tab === 'approved'} label={`Approved (${approvedDefinitions.length})`} onClick={() => setTab('approved')} />
        <TabButton active={tab === 'art'}      label={`Art Candidates (${candidateCount})`} onClick={() => setTab('art')} />
        <TabButton active={tab === 'all'}      label={`All (${allDefinitions.length})`}     onClick={() => setTab('all')} />
      </nav>

      {flash && (
        <div
          className="mb-3 p-2 rounded text-xs flex items-center justify-between gap-2"
          style={{ background: 'rgba(220,38,38,0.15)', color: '#f9c9c9', border: '1px solid rgba(220,38,38,0.4)' }}
        >
          <span>{flash}</span>
          <button className="underline" onClick={() => setFlash(null)}>dismiss</button>
        </div>
      )}

      {tab === 'queue' && (
        <QueueTab
          queue={queue}
          approvedTargets={approvedDefinitions}
          busyId={busyId}
          withBusy={withBusy}
        />
      )}
      {tab === 'approved' && (
        <ApprovedTab
          definitions={approvedDefinitions}
          onSelect={setSelectedAbilityId}
        />
      )}
      {tab === 'art' && (
        <ArtCandidatesTab
          candidates={candidates}
          definitions={allDefinitions}
          busyId={busyId}
          withBusy={withBusy}
        />
      )}
      {tab === 'all' && <AllTab definitions={allDefinitions} />}

      <AbilityDetailPanel
        abilityId={selectedAbilityId}
        onClose={() => setSelectedAbilityId(null)}
      />
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 font-fantasy text-sm whitespace-nowrap ${
        active ? 'border-b-2 border-power font-bold text-bone' : 'text-bone/60 hover:text-bone'
      }`}
    >
      {label}
    </button>
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
    return (
      <p className="text-xs text-bone/60 italic">
        Nothing awaiting review. New abilities from forge runs will appear here.
      </p>
    );
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
          <span key={f} className="px-1.5 py-0.5 rounded bg-gold/10 text-gold/80">{f}</span>
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
              <option key={t.id} value={t.id}>{t.displayName}</option>
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
          title="Fires Leonardo — result lands as a candidate for review"
        >
          Fire Leonardo → candidate
        </button>

        {busy && <span className="text-xs text-bone/60 italic">Working…</span>}
      </div>
    </div>
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
    return <p className="text-xs text-bone/60 italic">No approved abilities yet.</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {rows.map(({ def, art, version }) => {
        const imageUrl = art ? getArtCrops(art).detail.url : null;
        return (
          <button
            key={def.id}
            onClick={() => onSelect(def.id)}
            className="text-left rounded-lg border border-bone/15 bg-void/40 hover:bg-bone/5 transition-colors p-3"
          >
            {imageUrl ? (
              <div
                className="w-full aspect-square rounded mb-2 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${imageUrl}")` }}
              />
            ) : (
              <div className="w-full aspect-square rounded mb-2 bg-void/60 flex items-center justify-center text-xs text-bone/40">
                No art
              </div>
            )}
            <div className="text-sm font-fantasy font-bold text-bone truncate">{def.displayName}</div>
            <div className="text-[10px] text-bone/50 truncate">{def.slug}</div>
            <div className="flex flex-wrap gap-1 mt-1 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-bone/10 text-bone/80">{def.rarity}</span>
              <span className="px-1.5 py-0.5 rounded bg-bone/10 text-bone/80">{def.role}</span>
              {def.familyIds.map((f) => (
                <span key={f} className="px-1.5 py-0.5 rounded bg-gold/10 text-gold/80">{f}</span>
              ))}
            </div>
            {version && (
              <div className="text-[10px] text-bone/50 mt-1">
                v{version.versionNumber}
                {version.publishedAt
                  ? ` · ${new Date(version.publishedAt).toLocaleDateString()}`
                  : ''}
              </div>
            )}
            {art && (
              <div className="text-[10px] text-bone/50">
                art: {art.status}
              </div>
            )}
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
            <div
              className="w-64 aspect-square rounded border border-bone/15 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${imageUrl}")` }}
            />
          </div>
        ) : (
          <div className="w-full aspect-square rounded bg-void/60 flex items-center justify-center text-xs text-bone/40">
            No approved art
          </div>
        )}

        <MetaGrid def={def} version={version} approvedArt={approvedArt} />

        {def.descriptionShort && (
          <Section title="Description">
            <p className="text-xs text-bone/80">{def.descriptionShort}</p>
            {def.descriptionLong && def.descriptionLong !== def.descriptionShort && (
              <p className="text-xs text-bone/70 mt-2">{def.descriptionLong}</p>
            )}
          </Section>
        )}

        {version && (
          <Section title="Mechanics (current version)">
            <VersionSummary version={version} />
          </Section>
        )}

        <Section title={`Art history (${artHistory.length})`}>
          {artHistory.length === 0 && <div className="text-xs text-bone/50 italic">None</div>}
          {artHistory.map((art) => {
            const url = getArtCrops(art).detail.url;
            return (
              <div key={art.id} className="flex items-center gap-3 rounded border border-bone/10 bg-void/40 p-2">
                <div
                  className="w-12 h-12 rounded bg-cover bg-center bg-no-repeat shrink-0"
                  style={{ backgroundImage: `url("${url}")` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-bone/60 font-mono truncate">{art.id}</div>
                  <div className="text-[10px] text-bone/50">
                    {art.status} · {art.provider} · {new Date(art.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </Section>

        <details className="rounded border border-bone/15 bg-void/40">
          <summary className="cursor-pointer px-3 py-2 text-[10px] uppercase tracking-wider text-bone/60">
            Raw JSON
          </summary>
          <pre className="p-3 border-t border-bone/10 text-[10px] text-bone/70 overflow-x-auto max-h-96 whitespace-pre-wrap">
            {JSON.stringify({ def, version, approvedArt }, null, 2)}
          </pre>
        </details>
      </div>
    </AdminPreviewPanel>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-bone/60 mb-2">{title}</div>
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
      <MetaRow label="Family"        value={families} />
      <MetaRow label="Rarity"        value={def.rarity} />
      <MetaRow label="Role"          value={def.role} />
      <MetaRow label="Slot type"     value={version?.slotType ?? '—'} />
      <MetaRow label="Resource"      value={version ? `${version.resourceType} · ${version.resourceCost}` : '—'} />
      <MetaRow label="Definition"    value={def.status} />
      <MetaRow label="Art status"    value={approvedArt?.status ?? 'none'} />
      <MetaRow label="Version"       value={version ? `v${version.versionNumber}` : '—'} />
      <MetaRow label="Published"     value={version?.publishedAt ? new Date(version.publishedAt).toLocaleDateString() : '—'} />
      <MetaRow label="Power score"   value={version?.powerBudgetScore != null ? String(version.powerBudgetScore) : '—'} />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="text-bone/60">{label}</div>
      <div className="text-bone/90 font-fantasy">{value}</div>
    </>
  );
}

function VersionSummary({ version }: { version: AbilityVersion }) {
  return (
    <div className="text-xs text-bone/80 space-y-2">
      {version.cooldownRounds != null && (
        <div><span className="text-bone/60">Cooldown:</span> {version.cooldownRounds} rounds</div>
      )}
      {version.maxCharges != null && (
        <div><span className="text-bone/60">Max charges:</span> {version.maxCharges}</div>
      )}
      <div>
        <div className="text-bone/60 text-[10px] uppercase tracking-wider mb-1">Effects ({version.effects.length})</div>
        <ul className="space-y-1">
          {version.effects.map((e, i) => (
            <li key={i} className="rounded border border-bone/10 bg-void/40 p-2 text-[11px] font-mono text-bone/80">
              {JSON.stringify(e)}
            </li>
          ))}
        </ul>
      </div>
      {version.balanceNotes && (
        <div>
          <div className="text-bone/60 text-[10px] uppercase tracking-wider mb-1">Balance notes</div>
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
      <p className="text-xs text-bone/60 italic">
        No candidate art awaiting review. New Leonardo generations from the queue
        land here for approve or reject.
      </p>
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
          <div key={cand.id} className="rounded-lg border border-bone/15 bg-void/40 p-3">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="font-fantasy text-sm font-bold text-bone">
                  {def?.displayName ?? cand.abilityId}
                </div>
                <div className="text-[10px] text-bone/50 font-mono">{cand.id}</div>
              </div>
              <div className="text-[10px] text-bone/50">
                {cand.provider} · prompt {cand.sourcePromptVersion ?? '—'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <ArtPreview label="Current approved" url={priorUrl} />
              <ArtPreview label="Candidate" url={candUrl} highlight />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => withBusy(cand.id, () => promoteCandidateArt(store, cand.id))}
                disabled={busy}
                className="px-3 py-1 rounded text-xs font-fantasy font-bold disabled:opacity-40"
                style={{ background: 'rgba(155,182,179,0.2)', color: '#d6f2ec', border: '1px solid rgba(155,182,179,0.4)' }}
              >
                Approve candidate
              </button>
              <button
                onClick={() => withBusy(cand.id, () => rejectCandidateArt(store, cand.id))}
                disabled={busy}
                className="px-3 py-1 rounded text-xs font-fantasy font-bold disabled:opacity-40"
                style={{ background: 'rgba(138,28,28,0.2)', color: '#f9c9c9', border: '1px solid rgba(138,28,28,0.4)' }}
              >
                Reject candidate
              </button>
              {busy && <span className="text-xs text-bone/60 italic">Working…</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ArtPreview({ label, url, highlight }: { label: string; url: string | null; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-bone/60 mb-1">{label}</div>
      {url ? (
        <div
          className={`w-full aspect-square rounded bg-cover bg-center bg-no-repeat border ${highlight ? 'border-gold/50' : 'border-bone/15'}`}
          style={{ backgroundImage: `url("${url}")` }}
        />
      ) : (
        <div className="w-full aspect-square rounded bg-void/60 flex items-center justify-center text-xs text-bone/40 border border-bone/15">
          No image
        </div>
      )}
    </div>
  );
}

// ---- All tab -----------------------------------------------------------

function AllTab({ definitions }: { definitions: AbilityDefinition[] }) {
  const sorted = definitions.slice().sort((a, b) => a.displayName.localeCompare(b.displayName));
  return (
    <div className="overflow-x-auto rounded border border-bone/15">
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
          {sorted.map((d) => (
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
  );
}
