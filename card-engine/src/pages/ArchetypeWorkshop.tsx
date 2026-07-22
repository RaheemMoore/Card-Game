import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSupabaseClient, fetchMyRole, type SessionRole } from '../services/persistence/supabaseClient';
import {
  createArchetypeProposal,
  listArchetypeProposals,
  getArchetypeProposalPayload,
  sendProposalForApproval,
  approveProposal,
  rejectProposal,
  shipProposal,
  markProposalImplemented,
  deleteArchetypeProposal,
  getCardForAdmin,
  checkApprovalReadiness,
} from '../services/persistence/adminService';
import { readLabHandoff, clearLabHandoff, type LabHandoff } from '../services/labWorkshopHandoff';
import { runRegenVerify, runCardRegenVerify, saveVerifyVerdict, signedUrl } from '../services/regenVerify';
import type {
  ArchetypeProposal,
  ArchetypeProposalPayload,
  CardLineageRef,
  LayerSnapshot,
  ProposalFailureType,
  ProposalLayer,
  VerifyEvidence,
} from '../types/archetypeProposal';
import type { ArchetypeName, Card, Rank, StatName } from '../types/card';
import { ARCHETYPE_NAMES } from '../types/card';
import { ARCHETYPES } from '../data/archetypes';
import { ARCHETYPE_BIBLE } from '../data/archetypeBible';
import { getQuestionsForArchetype, getOptionsForQuestion } from '../data/storyPillars';
import { ELEMENT_COMPATIBILITY, elementsAvailableToArchetype } from '../data/elements';
import {
  ARCHETYPE_LAYERS,
  FAILURE_TYPES,
  LAYER_ORDER,
} from '../data/archetypeLayers';
import { getMetaPromptBlock } from '../data/metaPromptBlocks';
import { getEnvironmentPool } from '../data/archetypeEnvironments';
import {
  getPortraitHooks,
  hookMandatorySegment,
  hookNarrativeAnchor,
} from '../services/portrait/archetypeHooks';
import { STYLE_ANCHOR, BASE_NEGATIVE } from '../services/claudeApi';
import type { CharacterSheet } from '../types/characterSheet';
import {
  getDominantStat,
  getOverallRank,
  getVisualMotif,
  deriveStatRanks,
} from '../data/powerSystem';
import {
  AdminPage,
  AdminSection,
  AdminCard,
  AdminButton,
  AdminStatusBadge,
  AdminAlert,
  AdminSelect,
  AdminTextArea,
} from '../components/admin/ui';

const RANK_ORDER: Rank[] = ['Foundation', 'Forged', 'Ascendant'];
const STAT_ORDER: StatName[] = ['Atk', 'Def', 'Mana', 'Tech'];

const GITHUB_COMMIT_BASE = 'https://github.com/RaheemMoore/Card-Game/commit/';
const GITHUB_PR_BASE = 'https://github.com/RaheemMoore/Card-Game/pull/';

// Placeholder gradient for cards/tiers with no portrait yet.
const PORTRAIT_PLACEHOLDER = 'linear-gradient(135deg, var(--admin-surface-strong), var(--admin-canvas))';

// Plain-text relative age ("3d ago") — no color-only urgency.
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

export function ArchetypeWorkshop() {
  const [searchParams] = useSearchParams();
  const initialArchetype = ((): ArchetypeName => {
    const q = searchParams.get('archetype');
    if (q && (ARCHETYPE_NAMES as readonly string[]).includes(q)) {
      return q as ArchetypeName;
    }
    return 'Seraph';
  })();
  // Prompt Lab handoff (from "Send to Workshop"). Read once; if present it
  // pre-selects the archetype and becomes the critique subject.
  const [labHandoff] = useState<LabHandoff | null>(() =>
    searchParams.get('from') === 'lab' ? readLabHandoff() : null,
  );
  const [archetype, setArchetype] = useState<ArchetypeName>(labHandoff?.archetype ?? initialArchetype);
  // Which sent tier the reviewer is critiquing (drives labRunId). Defaults to
  // the primary (highest) tier the Lab batch sent over.
  const [selectedLabRunId, setSelectedLabRunId] = useState<string | null>(
    labHandoff?.primaryRunId ?? labHandoff?.runId ?? null,
  );
  const [cards, setCards] = useState<Card[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ArchetypeProposal[] | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [viewerRole, setViewerRole] = useState<SessionRole>('user');
  const [pending, setPending] = useState<ArchetypeProposal[] | null>(null);

  useEffect(() => {
    void fetchMyRole().then(setViewerRole);
  }, []);

  // Cross-archetype queue of proposals in Raheem's hands: awaiting_approval
  // (needs Approve/Send-back) + approved (needs the guarded Merge & ship).
  // Loaded for every director; only admins get the action controls.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listArchetypeProposals({ status: 'awaiting_approval', limit: 50 }),
      listArchetypeProposals({ status: 'approved', limit: 50 }),
    ])
      .then(([awaiting, approved]) => {
        if (!cancelled) {
          setPending(
            [...awaiting, ...approved].sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
            ),
          );
        }
      })
      .catch((err) => {
        if (!cancelled) console.warn('Failed to load approval queue', err);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  // Pull all cards of the selected archetype visible to this admin (RLS
  // widens SELECT for admins). Big single query — fine at studio scale.
  useEffect(() => {
    let cancelled = false;
    setCards(null);
    setLoadError(null);
    const supa = getSupabaseClient();
    if (!supa) {
      setLoadError(
        'Supabase not configured (VITE_SUPABASE_URL missing). The workshop needs a live database to load cards and store proposals.',
      );
      setCards([]);
      return;
    }
    void supa
      .from('cards')
      .select('data')
      .eq('archetype', archetype)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error.message);
          setCards([]);
          return;
        }
        setCards((data ?? []).map((row) => (row as { data: Card }).data));
      });
    return () => {
      cancelled = true;
    };
  }, [archetype]);

  useEffect(() => {
    let cancelled = false;
    listArchetypeProposals({ archetype, limit: 20 })
      .then((rows) => {
        if (!cancelled) setProposals(rows);
      })
      .catch((err) => {
        if (!cancelled) console.warn('Failed to load proposals', err);
      });
    return () => {
      cancelled = true;
    };
  }, [archetype, refreshTick]);

  const selectedCard = useMemo(() => {
    if (!cards || !selectedCardId) return null;
    return cards.find((c) => c.cardId === selectedCardId) ?? null;
  }, [cards, selectedCardId]);

  return (
    <AdminPage
      title="Archetype Workshop"
      description="File lore/art change proposals against a specific archetype and card, mapped to the layer where change actually happens (A Canon / B Rank & Stat Visuals / C Story Pillars & Elements / D Meta-Prompt & Escalation)."
      actions={
        <label className="flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
          Archetype
          <AdminSelect
            aria-label="Archetype"
            value={archetype}
            onChange={(e) => {
              setArchetype(e.target.value as ArchetypeName);
              setSelectedCardId(null);
            }}
            className="min-w-[10rem]"
          >
            {ARCHETYPE_NAMES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </AdminSelect>
        </label>
      }
    >
      {loadError && (
        <AdminAlert tone="danger" className="mb-4">
          {loadError}
        </AdminAlert>
      )}

      <PendingApprovalPanel
        pending={pending}
        viewerRole={viewerRole}
        onDecided={() => setRefreshTick((t) => t + 1)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
        {/* LEFT column: lab subject (if from Lab) / card picker + tiers + layer state */}
        <div className="space-y-4">
          {labHandoff && !selectedCardId && (
            <LabSubjectPanel
              handoff={labHandoff}
              selectedRunId={selectedLabRunId}
              onSelect={setSelectedLabRunId}
            />
          )}
          <CardPickerRail
            cards={cards}
            selectedCardId={selectedCardId}
            onSelect={setSelectedCardId}
          />
          <TierSnapshotPanel card={selectedCard} />
          <LayerStatePanels archetype={archetype} card={selectedCard} />
        </div>

        {/* RIGHT column: triage form */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <TriageForm
            archetype={archetype}
            selectedCard={selectedCard}
            labHandoff={selectedCardId ? null : labHandoff}
            selectedLabRunId={selectedCardId ? null : selectedLabRunId}
            onSubmitted={() => setRefreshTick((t) => t + 1)}
          />
        </div>
      </div>

      <div className="mt-4">
        <ProposalsList
          proposals={proposals}
          archetype={archetype}
          viewerRole={viewerRole}
          onChanged={() => setRefreshTick((t) => t + 1)}
        />
      </div>
    </AdminPage>
  );
}

// ─── Pending approval queue (Raheem's console gate) ──────────────────

function PendingApprovalPanel({
  pending,
  viewerRole,
  onDecided,
}: {
  pending: ArchetypeProposal[] | null;
  viewerRole: SessionRole;
  onDecided: () => void;
}) {
  const isAdmin = viewerRole === 'admin';
  const count = pending?.length ?? 0;

  // A non-admin director with nothing parked → hide to keep the surface
  // clean. Admins always see the gate so it's obvious what's waiting.
  if (!isAdmin && count === 0) return null;

  return (
    <AdminSection
      title="Awaiting your approval"
      subtitle={pending === null ? 'loading…' : `${count} pending`}
      className="mb-4"
    >
      <AdminCard>
        {!isAdmin && (
          <AdminAlert tone="info" className="mb-2">
            These are parked for Raheem's final call. They clear once he approves or sends them back.
          </AdminAlert>
        )}
        {count === 0 ? (
          <div className="text-sm italic" style={{ color: 'var(--admin-text-muted)' }}>
            Nothing waiting. Worked proposals show up here for the final call.
          </div>
        ) : (
          <ul className="space-y-1">
            {pending!.map((p) => (
              <PendingRow key={p.id} proposal={p} isAdmin={isAdmin} onDecided={onDecided} />
            ))}
          </ul>
        )}
      </AdminCard>
    </AdminSection>
  );
}

function PendingRow({
  proposal: p,
  isAdmin,
  onDecided,
}: {
  proposal: ArchetypeProposal;
  isAdmin: boolean;
  onDecided: () => void;
}) {
  const [payload, setPayload] = useState<ArchetypeProposalPayload | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const layer = ARCHETYPE_LAYERS[p.layer];
  const failure = FAILURE_TYPES.find((f) => f.id === p.failureType);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && payload === undefined) {
      getArchetypeProposalPayload(p.id).then(setPayload).catch(() => setPayload(null));
    }
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDecided();
    } catch (err) {
      setError((err as { message?: string })?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded" style={{ background: 'var(--admin-canvas)', border: '1px solid var(--admin-border)' }}>
      <button onClick={toggle} className="w-full text-left flex items-center gap-2 px-3 py-2">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0"
          style={{ background: layer.color, color: '#111' }}
        >
          {p.layer}
        </span>
        <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--admin-text)' }}>
          {p.archetype}
        </span>
        <span className="text-xs truncate flex-1" style={{ color: 'var(--admin-text-muted)' }}>
          {failure?.label ?? p.failureType}
        </span>
        {p.status === 'approved' ? (
          <AdminStatusBadge tone="success" className="shrink-0 uppercase tracking-widest">
            approved · ready to ship
          </AdminStatusBadge>
        ) : (
          <AdminStatusBadge tone="warning" className="shrink-0 uppercase tracking-widest">
            awaiting approval
          </AdminStatusBadge>
        )}
        <span className="text-[10px] shrink-0" style={{ color: 'var(--admin-text-muted)' }}>
          {relativeAge(p.updatedAt)}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 text-xs" style={{ color: 'var(--admin-text-muted)', borderTop: '1px solid var(--admin-border)' }}>
          {payload === undefined ? (
            <div className="pt-2">Loading…</div>
          ) : payload === null ? (
            <div className="pt-2">Payload not found.</div>
          ) : (
            <div className="pt-2 space-y-3">
              <VerifyReview evidence={payload.verify} affectsImage={payload.affectsImage} />
              <LayerChangeSummary changes={payload.layerChanges} />
              <details>
                <summary className="cursor-pointer text-[10px] uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
                  Original request
                </summary>
                <div className="space-y-2 mt-2">
                  <ProposalField label="Keep" value={payload.keep} />
                  <ProposalField label="Change" value={payload.change} />
                  <ProposalField label="Reject if" value={payload.rejectIf} />
                  {payload.notes && <ProposalField label="Notes" value={payload.notes} />}
                </div>
              </details>
            </div>
          )}
          <div className="flex items-center gap-3">
            {payload && payload.prNumber && (
              <a
                href={`${GITHUB_PR_BASE}${payload.prNumber}/files`}
                target="_blank"
                rel="noreferrer"
                className="underline"
                style={{ color: 'var(--admin-accent)' }}
              >
                View diff (PR #{payload.prNumber})
              </a>
            )}
            {p.commitSha && (
              <a
                href={`${GITHUB_COMMIT_BASE}${p.commitSha}`}
                target="_blank"
                rel="noreferrer"
                className="underline"
                style={{ color: 'var(--admin-accent)' }}
              >
                View commit {p.commitSha.slice(0, 7)}
              </a>
            )}
          </div>

          {error && <AdminAlert tone="danger">{error}</AdminAlert>}

          {isAdmin && !rejecting && p.status === 'awaiting_approval' && (
            <div className="flex gap-2 pt-1">
              <AdminButton variant="primary" size="sm" disabled={busy} onClick={() => run(() => approveProposal(p.id))}>
                {busy ? 'Working…' : 'Approve'}
              </AdminButton>
              <AdminButton variant="danger" size="sm" disabled={busy} onClick={() => setRejecting(true)}>
                Send back
              </AdminButton>
            </div>
          )}

          {isAdmin && !rejecting && p.status === 'approved' && (
            <div className="space-y-1 pt-1">
              <div className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                Approved. Eyeball the diff, then ship — this merges the PR into main and deploys.
              </div>
              <div className="flex gap-2">
                <AdminButton
                  variant="primary"
                  size="sm"
                  disabled={busy || !payload?.prNumber}
                  onClick={() => run(() => shipProposal(p.id))}
                >
                  {busy ? 'Merging…' : 'Merge & ship'}
                </AdminButton>
                <AdminButton variant="danger" size="sm" disabled={busy} onClick={() => setRejecting(true)}>
                  Send back
                </AdminButton>
              </div>
              {!payload?.prNumber && (
                <div className="text-[11px] italic" style={{ color: 'var(--admin-text-muted)' }}>
                  No linked PR — merge manually, then this row can be marked shipped.
                </div>
              )}
            </div>
          )}

          {isAdmin && rejecting && (
            <div className="space-y-2 pt-1">
              <AdminTextArea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason to send back (required)…"
              />
              <div className="flex gap-2">
                <AdminButton
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    if (!reason.trim()) { setError('A reason is required to send this back.'); return; }
                    void run(() => rejectProposal(p.id, reason.trim()));
                  }}
                >
                  Confirm send back
                </AdminButton>
                <AdminButton variant="ghost" size="sm" onClick={() => { setRejecting(false); setReason(''); setError(null); }}>
                  Cancel
                </AdminButton>
              </div>
            </div>
          )}

          {isAdmin && !rejecting && <ProposalAdminActions proposal={p} onChanged={onDecided} />}
        </div>
      )}
    </li>
  );
}

// Admin-only cleanup controls for a proposal. "Mark implemented" resolves a
// proposal whose change already landed out-of-band (no PR merge through the app)
// by moving it to the terminal `shipped` state, so it leaves every alert surface
// and lands in the Resolved strip. "Delete" hard-removes a test/junk row (two-
// step confirm). Rendered in both the pending-approval queue and the recent-
// proposals list so a stuck proposal can be cleared wherever it surfaces.
function ProposalAdminActions({
  proposal: p,
  onChanged,
}: {
  proposal: ArchetypeProposal;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTerminal = p.status === 'shipped' || p.status === 'rejected';

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError((err as { message?: string })?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pt-2 mt-2 space-y-2" style={{ borderTop: '1px solid var(--admin-border)' }}>
      <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
        Admin cleanup
      </div>
      {error && <AdminAlert tone="danger">{error}</AdminAlert>}
      {!confirmingDelete ? (
        <div className="flex flex-wrap gap-2">
          {!isTerminal && (
            <AdminButton
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => run(() => markProposalImplemented(p.id))}
              title="Resolve a proposal whose change already landed. Moves it to shipped and out of the alert lists."
            >
              {busy ? 'Working…' : 'Mark implemented'}
            </AdminButton>
          )}
          <AdminButton variant="danger" size="sm" disabled={busy} onClick={() => setConfirmingDelete(true)}>
            Delete
          </AdminButton>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
            Permanently delete this proposal? This can’t be undone.
          </div>
          <div className="flex gap-2">
            <AdminButton
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => run(() => deleteArchetypeProposal(p.id))}
            >
              {busy ? 'Deleting…' : 'Confirm delete'}
            </AdminButton>
            <AdminButton variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmingDelete(false)}>
              Cancel
            </AdminButton>
          </div>
        </div>
      )}
    </div>
  );
}

// Read-only before/after + verdict for the approval console. Resolves signed
// URLs on mount; reuses the same VerifyThumb the working-phase step uses.
function VerifyReview({ evidence, affectsImage }: { evidence?: VerifyEvidence; affectsImage?: boolean }) {
  const [urls, setUrls] = useState<{ before: string | null; after: string | null }>({ before: null, after: null });

  useEffect(() => {
    let cancelled = false;
    if (!evidence) return;
    void (async () => {
      const [before, after] = await Promise.all([
        evidence.beforeObjectPath ? signedUrl(evidence.beforeObjectPath) : Promise.resolve(null),
        evidence.afterObjectPath ? signedUrl(evidence.afterObjectPath) : Promise.resolve(null),
      ]);
      if (!cancelled) setUrls({ before, after });
    })();
    return () => { cancelled = true; };
  }, [evidence]);

  if (!evidence) {
    return (
      <div className="italic text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
        {affectsImage
          ? 'No before/after on file for this proposal.'
          : 'Lore-only change — no image comparison needed.'}
      </div>
    );
  }
  const verdictTone = evidence.verdict === 'pass' ? 'success' : evidence.verdict === 'fail' ? 'danger' : 'warning';
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
          Before / after
        </span>
        <AdminStatusBadge tone={verdictTone} className="uppercase tracking-widest">
          {evidence.verdict ?? 'unrated'}
        </AdminStatusBadge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <VerifyThumb label={evidence.source === 'card' ? 'Before (current card)' : 'Before (filed)'} url={urls.before} />
        <VerifyThumb label="After (regen)" url={urls.after} />
      </div>
    </div>
  );
}

// The per-layer change summary — the 4 primary areas of the character, each
// with what actually changed. Untouched layers are shown as "no change".
function LayerChangeSummary({ changes }: { changes?: { layer: ProposalLayer; summary: string }[] }) {
  const byLayer = new Map((changes ?? []).map((c) => [c.layer, c.summary]));
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
        What changed (by layer)
      </div>
      <ul className="space-y-1">
        {LAYER_ORDER.map((id) => {
          const copy = ARCHETYPE_LAYERS[id];
          const summary = byLayer.get(id);
          return (
            <li key={id} className="flex gap-2">
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold shrink-0 mt-0.5"
                style={{ background: copy.color, color: '#111' }}
              >
                {id}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {copy.name}
                </div>
                {summary ? (
                  <div className="text-[11px] whitespace-pre-wrap" style={{ color: 'var(--admin-text-muted)' }}>
                    {summary}
                  </div>
                ) : (
                  <div className="text-[11px] italic" style={{ color: 'var(--admin-text-muted)' }}>
                    no change
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Lab subject panel (Prompt Lab → Workshop) ───────────────────────
// Shows the actual images sent from the Prompt Lab so the reviewer critiques
// the picture, not an empty card list. Clicking a tier makes it the subject.
function LabSubjectPanel({
  handoff,
  selectedRunId,
  onSelect,
}: {
  handoff: LabHandoff;
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
}) {
  const tiers = handoff.tiers ?? [];
  const [urls, setUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        tiers.map(async (t) => [t.runId, t.objectPath ? await signedUrl(t.objectPath) : null] as const),
      );
      if (!cancelled) setUrls(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff.primaryRunId]);

  return (
    <AdminCard>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xs uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
          Prompt Lab test — {handoff.archetype}
        </h2>
        <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
          {tiers.length} {tiers.length === 1 ? 'image' : 'images'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tiers.map((t) => {
          const active = t.runId === selectedRunId;
          const url = urls[t.runId];
          return (
            <button
              key={t.runId}
              onClick={() => onSelect(t.runId)}
              className="rounded overflow-hidden text-left"
              style={{ border: `2px solid ${active ? 'var(--admin-accent)' : 'var(--admin-border)'}` }}
              title={`Critique ${t.tier}`}
            >
              <div className="aspect-[3/4] grid place-items-center" style={{ background: 'var(--admin-canvas)' }}>
                {url ? (
                  <img src={url} alt={t.tier} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] italic px-1 text-center" style={{ color: 'var(--admin-text-muted)' }}>
                    image expired
                  </span>
                )}
              </div>
              <div
                className="px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: active ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}
              >
                {t.tier}
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-[11px] mt-2" style={{ color: 'var(--admin-text-muted)' }}>
        Pick the tier to critique, then file the proposal on the right.
      </div>
    </AdminCard>
  );
}

// ─── Card picker rail ────────────────────────────────────────────────

function CardPickerRail({
  cards,
  selectedCardId,
  onSelect,
}: {
  cards: Card[] | null;
  selectedCardId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <AdminCard>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xs uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
          1. Pick a character
        </h2>
        <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
          {cards === null ? 'loading…' : `${cards.length} cards`}
        </span>
      </div>
      {cards === null && (
        <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Loading cards for this archetype…
        </div>
      )}
      {cards && cards.length === 0 && (
        <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          No cards of this archetype exist yet. Forge one from{' '}
          <Link to="/forge" className="underline" style={{ color: 'var(--admin-accent)' }}>
            /forge
          </Link>{' '}
          to have something to critique.
        </div>
      )}
      {cards && cards.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
          {cards.map((c) => {
            const active = c.cardId === selectedCardId;
            const rank = getOverallRank(c.stats);
            return (
              <button
                key={c.cardId}
                onClick={() => onSelect(c.cardId)}
                className="text-left rounded overflow-hidden transition-all"
                style={{
                  border: active
                    ? '2px solid var(--admin-accent)'
                    : '1px solid var(--admin-border)',
                  background: active ? 'var(--admin-active-wash)' : 'var(--admin-canvas)',
                }}
              >
                <div
                  className="aspect-[3/4] bg-cover bg-center"
                  style={{
                    backgroundImage: c.portraitAsset
                      ? `url(${c.portraitAsset})`
                      : PORTRAIT_PLACEHOLDER,
                  }}
                />
                <div className="px-1.5 py-1">
                  <div
                    className="text-[10px] truncate font-medium"
                    style={{ color: 'var(--admin-text)' }}
                    title={c.cardName}
                  >
                    {c.cardName}
                  </div>
                  <div className="text-[9px] uppercase" style={{ color: 'var(--admin-text-muted)' }}>
                    {rank}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </AdminCard>
  );
}

// ─── Tier snapshot loader ────────────────────────────────────────────

interface TierSnap {
  portraitUrl: string;
  nameAndTitle: string;
  lore: string;
  source: 'evolutionHistory' | 'current';
}

function extractTierSnapshots(card: Card): Partial<Record<Rank, TierSnap>> {
  const result: Partial<Record<Rank, TierSnap>> = {};
  for (const rank of RANK_ORDER) {
    for (const stat of STAT_ORDER) {
      const snap = card.evolutionHistory?.[stat]?.[rank];
      if (snap) {
        result[rank] = {
          portraitUrl: snap.portraitUrl,
          nameAndTitle: snap.nameAndTitle,
          lore: snap.lore,
          source: 'evolutionHistory',
        };
        break;
      }
    }
  }
  const currentRank = getOverallRank(card.stats);
  if (!result[currentRank]) {
    result[currentRank] = {
      portraitUrl: card.portraitAsset,
      nameAndTitle: card.nameAndTitle,
      lore: card.lore,
      source: 'current',
    };
  }
  return result;
}

function TierSnapshotPanel({ card }: { card: Card | null }) {
  if (!card) {
    return (
      <AdminCard>
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-muted)' }}>
          2. Character across tiers
        </div>
        <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Select a card above to see all of its rank snapshots.
        </div>
      </AdminCard>
    );
  }

  const tiers = extractTierSnapshots(card);
  const present = RANK_ORDER.filter((r) => tiers[r]);

  return (
    <AdminCard>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-xs uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
          2. Character across tiers
        </h2>
        <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
          {present.length} of 3 tiers
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {RANK_ORDER.map((rank) => {
          const snap = tiers[rank];
          return (
            <div
              key={rank}
              className="rounded overflow-hidden"
              style={{
                background: 'var(--admin-canvas)',
                border: '1px solid var(--admin-border)',
                opacity: snap ? 1 : 0.5,
              }}
            >
              <div
                className="aspect-[3/4] bg-cover bg-center"
                style={{
                  backgroundImage: snap?.portraitUrl
                    ? `url(${snap.portraitUrl})`
                    : PORTRAIT_PLACEHOLDER,
                }}
              />
              <div className="p-2 space-y-1">
                <div
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  {rank}
                </div>
                {snap ? (
                  <>
                    <div className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>
                      {snap.nameAndTitle}
                    </div>
                    <div className="text-[11px] leading-snug" style={{ color: 'var(--admin-text-muted)' }}>
                      {snap.lore}
                    </div>
                    {snap.source === 'current' && (
                      <div className="text-[9px] italic" style={{ color: 'var(--admin-text-muted)' }}>
                        (current rank — no evolutionHistory entry)
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[11px] italic" style={{ color: 'var(--admin-text-muted)' }}>
                    Not reached yet.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AdminCard>
  );
}

// ─── Layer state readonly panels ─────────────────────────────────────

function LayerStatePanels({
  archetype,
  card,
}: {
  archetype: ArchetypeName;
  card: Card | null;
}) {
  const bible = ARCHETYPE_BIBLE[archetype];
  const pillarQuestions = getQuestionsForArchetype(archetype);
  const elements = elementsAvailableToArchetype(archetype);
  const buckets = ELEMENT_COMPATIBILITY[archetype];

  // ── Image engine surfaces (live, deterministic) ──────────────────────
  // The image is assembled in services/portraitAssembler.ts from these
  // surfaces + the card's hiddenFate/story-motifs. We sample them here for
  // the selected card's rank (or Ascendant, the fullest form, when none is
  // picked) so the reference reflects what Leonardo actually receives.
  const previewRank = card ? getOverallRank(card.stats) : 'Ascendant';
  const hooks = getPortraitHooks(archetype);
  // Hook fns only read rank/archetype/narrativeAxisPath/isEvolution — a cast
  // preview sheet is enough to surface the deterministic mandatory/narrative
  // segments without forging a full CharacterSheet.
  const previewSheet = {
    archetype,
    rank: previewRank,
    isEvolution: false,
    narrativeAxisPath: (card as { narrativeAxis?: { path?: string } } | null)
      ?.narrativeAxis?.path,
    hiddenFate: card?.hiddenFate ?? {},
  } as unknown as CharacterSheet;
  const mandatorySegment = hookMandatorySegment(previewSheet);
  const narrativeAnchor = hookNarrativeAnchor(previewSheet);
  const hasPoseOverride = Boolean(hooks?.posePrefix);
  const environmentPool = getEnvironmentPool(archetype);
  // BASE_NEGATIVE is a comma-joined string; sample the leading terms.
  const negativeTermCount = BASE_NEGATIVE.split(',').length;
  const negativeSample = BASE_NEGATIVE.slice(0, 260);

  const dashBorder = '1px dashed var(--admin-border)';

  return (
    <AdminCard>
      <h2 className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-muted)' }}>
        Live engine surfaces for {archetype}
      </h2>
      <p className="text-[11px] mb-2" style={{ color: 'var(--admin-text-muted)' }}>
        What the deterministic Image Engine and the Lore Engine actually read
        today. Read-only reference — file changes through the form.
      </p>
      <div className="space-y-2">
        <EnginePanel
          label="Image"
          name="Image Engine"
          tagline="Deterministic portrait assembly"
          color="#7db3c9"
          accentBg="rgba(125, 179, 201, 0.10)"
          accentBorder="rgba(125, 179, 201, 0.55)"
          defaultOpen
        >
          <div className="space-y-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            <div>
              <span style={{ color: 'var(--admin-text-muted)' }}>Style lead (STYLE_ANCHOR):</span>
              <div className="mt-1 leading-snug" style={{ color: 'var(--admin-text)' }}>
                {STYLE_ANCHOR.slice(0, 320)}…
              </div>
            </div>
            <div className="pt-1" style={{ borderTop: dashBorder }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>
                Archetype hooks (sampled at {previewRank}):
              </span>
              {!hooks && (
                <div className="italic mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                  Generic — no archetype-specific hooks; uses the shared pose,
                  segments, and anchors.
                </div>
              )}
              {hasPoseOverride && (
                <div className="mt-1">
                  <span style={{ color: 'var(--admin-text-muted)' }}>Pose override:</span>{' '}
                  <span style={{ color: 'var(--admin-text)' }}>
                    active — replaces the generic pose prefix (roll/rank-driven).
                  </span>
                </div>
              )}
              {mandatorySegment && (
                <div className="mt-1">
                  <span style={{ color: 'var(--admin-text-muted)' }}>Mandatory segment:</span>{' '}
                  <span style={{ color: 'var(--admin-text)' }}>{mandatorySegment}</span>
                </div>
              )}
              {narrativeAnchor && (
                <div className="mt-1">
                  <span style={{ color: 'var(--admin-text-muted)' }}>Narrative anchor:</span>{' '}
                  <span style={{ color: 'var(--admin-text)' }}>{narrativeAnchor}</span>
                </div>
              )}
            </div>
            <div className="pt-1" style={{ borderTop: dashBorder }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>
                Environment pool ({environmentPool.length} families):
              </span>
              <ul className="list-disc pl-4 mt-1 space-y-0.5" style={{ color: 'var(--admin-text)' }}>
                {environmentPool.map((env) => (
                  <li key={env.id}>
                    {env.name}{' '}
                    <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
                      — {env.byRank[previewRank]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-1" style={{ borderTop: dashBorder }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>
                Global rules — negative floor ({negativeTermCount} terms, modesty enforced):
              </span>
              <div className="mt-1 leading-snug" style={{ color: 'var(--admin-text)' }}>
                {negativeSample}…
              </div>
            </div>
          </div>
        </EnginePanel>
        <EnginePanel
          label="Lore"
          name="Lore Engine"
          tagline="Canon, story pillars, elements"
          color="#d4a94a"
          accentBg="rgba(212, 169, 74, 0.10)"
          accentBorder="rgba(212, 169, 74, 0.55)"
          defaultOpen
        >
          <div className="space-y-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            <div>
              <span style={{ color: 'var(--admin-text-muted)' }}>Identity through:</span>{' '}
              <span style={{ color: 'var(--admin-text)' }}>{bible.identityThrough}</span>
            </div>
            <div>
              <span style={{ color: 'var(--admin-text-muted)' }}>Core fantasy:</span>{' '}
              <span style={{ color: 'var(--admin-text)' }}>{bible.coreFantasy}</span>
            </div>
            <div>
              <span style={{ color: 'var(--admin-text-muted)' }}>Selection tagline:</span>{' '}
              <span style={{ color: 'var(--admin-text)' }}>{bible.selectionScreen.tagline}</span>
            </div>
            <div className="italic" style={{ color: 'var(--admin-text-muted)' }}>
              Full canon: [Bible chapter §1–§14 for {archetype}] in data/archetypeBible/{archetype.toLowerCase().replace(' ', '')}.ts
            </div>
            <div className="pt-1" style={{ borderTop: dashBorder }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>Story Pillar questions ({pillarQuestions.length}):</span>
              <ul className="list-disc pl-4 mt-1 space-y-0.5" style={{ color: 'var(--admin-text)' }}>
                {pillarQuestions.slice(0, 6).map((q) => {
                  const opts = getOptionsForQuestion(archetype, q.id);
                  return (
                    <li key={q.id}>
                      {q.prompt}{' '}
                      <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
                        ({opts.length} seed options)
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="pt-1" style={{ borderTop: dashBorder }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>Elements available ({elements.length} of 26):</span>
              <div className="mt-1 space-y-0.5" style={{ color: 'var(--admin-text)' }}>
                <div>
                  <span style={{ color: 'var(--admin-text-muted)' }}>Naturally compatible:</span>{' '}
                  {buckets.naturally_compatible.join(', ') || '—'}
                </div>
                <div>
                  <span style={{ color: 'var(--admin-text-muted)' }}>Through reinterpretation:</span>{' '}
                  {buckets.compatible_through_reinterpretation.join(', ') || '—'}
                </div>
                <div>
                  <span style={{ color: 'var(--admin-text-muted)' }}>Rare (narrative-gated):</span>{' '}
                  {buckets.rare.join(', ') || '—'}
                </div>
                {buckets.not_available && buckets.not_available.length > 0 && (
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)' }}>Not available:</span>{' '}
                    {buckets.not_available.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </EnginePanel>
      </div>
    </AdminCard>
  );
}

function EnginePanel({
  label,
  name,
  tagline,
  color,
  accentBg,
  accentBorder,
  defaultOpen,
  children,
}: {
  label: string;
  name: string;
  tagline: string;
  color: string;
  accentBg: string;
  accentBorder: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <div
      className="rounded"
      style={{
        background: accentBg,
        border: `1px solid ${accentBorder}`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <span
          className="inline-flex items-center justify-center px-2 h-5 rounded-full text-[10px] font-bold"
          style={{ background: color, color: '#111' }}
        >
          {label}
        </span>
        <span className="font-bold text-sm" style={{ color: 'var(--admin-text)' }}>
          {name}
        </span>
        <span className="text-[10px] italic" style={{ color: 'var(--admin-text-muted)' }}>
          {tagline}
        </span>
        <span className="ml-auto text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// ─── Triage form ─────────────────────────────────────────────────────

function TriageForm({
  archetype,
  selectedCard,
  labHandoff,
  selectedLabRunId,
  onSubmitted,
}: {
  archetype: ArchetypeName;
  selectedCard: Card | null;
  labHandoff: LabHandoff | null;
  selectedLabRunId: string | null;
  onSubmitted: () => void;
}) {
  // Resolve the tier the reviewer picked in the subject panel (falls back to
  // the handoff's primary/flat fields for older stashes).
  const labTier =
    labHandoff?.tiers?.find((t) => t.runId === selectedLabRunId) ??
    (labHandoff
      ? {
          tier: labHandoff.tier,
          runId: labHandoff.runId,
          objectPath: null,
          cardName: labHandoff.cardName,
          nameAndTitle: labHandoff.nameAndTitle,
          lore: labHandoff.lore,
        }
      : null);
  const [failureType, setFailureType] = useState<ProposalFailureType>('lore_portrait_misaligned');
  const [layer, setLayer] = useState<ProposalLayer>('D');
  const [keep, setKeep] = useState('');
  const [change, setChange] = useState('');
  const [rejectIf, setRejectIf] = useState('');
  const [notes, setNotes] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-align layer to whatever the failure hint suggests, but let the
  // user override — the hint doesn't lock the picker.
  useEffect(() => {
    const hint = FAILURE_TYPES.find((f) => f.id === failureType)?.hintLayer;
    if (hint) setLayer(hint);
  }, [failureType]);

  async function submit() {
    setError(null);
    setSuccess(null);
    if (!keep.trim() || !change.trim() || !rejectIf.trim()) {
      setError('Keep, Change, and Reject-if are all required.');
      return;
    }
    setBusy(true);
    try {
      const arch = ARCHETYPES[archetype];
      const bible = ARCHETYPE_BIBLE[archetype];
      const questions = getQuestionsForArchetype(archetype);
      const buckets = ELEMENT_COMPATIBILITY[archetype];
      const metaBlock = getMetaPromptBlock(archetype);
      const snapshot: LayerSnapshot = {
        canonIdentity: `${bible.identityThrough} — ${bible.coreFantasy}`,
        canonMotifs: arch.motifs,
        canonRankProgression: arch.rankProgression,
        statVisualsForCard: selectedCard
          ? (() => {
              const dom = getDominantStat(selectedCard.stats);
              const r = dom ? deriveStatRanks(selectedCard.stats)[dom] : undefined;
              return dom && r ? getVisualMotif(dom, r) : undefined;
            })()
          : undefined,
        classSignaturePoolSample: [
          `Story Pillar questions (${questions.length}): ${questions
            .slice(0, 4)
            .map((q) => q.prompt)
            .join(' | ')}`,
          `Naturally compatible elements: ${buckets.naturally_compatible.join(', ') || '—'}`,
          `Rare elements: ${buckets.rare.join(', ') || '—'}`,
        ],
        metaPromptBlock: metaBlock ?? '(none — archetype has no escalation block)',
      };
      let cardLineage: CardLineageRef | undefined;
      // Lab handoff wins as the subject when no real player card is picked:
      // the critique is about the Prompt Lab test the director just generated.
      if (!selectedCard && labHandoff && labTier) {
        cardLineage = {
          cardId: `lab:${labTier.runId}`,
          cardName: labTier.cardName ?? `Lab test (${labTier.tier})`,
          archetype: labHandoff.archetype,
          tiers: {
            [labTier.tier]: {
              nameAndTitle: labTier.nameAndTitle ?? '',
              lore: labTier.lore ?? '',
            },
          } as CardLineageRef['tiers'],
        };
      } else if (selectedCard) {
        const tiers = extractTierSnapshots(selectedCard);
        // Store text-only tier metadata. Portrait URLs are omitted here
        // (per P1) and looked up on-demand from the cards table when a
        // reviewer expands this proposal — otherwise every proposal row
        // is 1MB+ from three base64 data URLs.
        cardLineage = {
          cardId: selectedCard.cardId,
          cardName: selectedCard.cardName,
          archetype: selectedCard.archetype,
          tiers: {
            Foundation: tiers.Foundation && {
              nameAndTitle: tiers.Foundation.nameAndTitle,
              lore: tiers.Foundation.lore,
            },
            Forged: tiers.Forged && {
              nameAndTitle: tiers.Forged.nameAndTitle,
              lore: tiers.Forged.lore,
            },
            Ascendant: tiers.Ascendant && {
              nameAndTitle: tiers.Ascendant.nameAndTitle,
              lore: tiers.Ascendant.lore,
            },
          },
        };
      }
      const payload: ArchetypeProposalPayload = {
        keep: keep.trim(),
        change: change.trim(),
        rejectIf: rejectIf.trim(),
        notes: notes.trim() || undefined,
        referenceImageUrl: referenceImageUrl.trim() || undefined,
        layerSnapshot: snapshot,
        cardLineage,
        labRunId: !selectedCard && labTier ? labTier.runId : undefined,
        affectsImage: !selectedCard && labTier ? true : undefined,
      };
      await createArchetypeProposal({
        archetype,
        layer,
        failureType,
        cardId: selectedCard?.cardId ?? null,
        payload,
      });
      // The handoff is consumed — clear it so a later plain visit to the
      // Workshop doesn't resurrect this test as the subject.
      if (labHandoff) clearLabHandoff();
      setSuccess(
        `Proposal filed. Tell Claude "look at the latest ${archetype} proposal" in your next session.`,
      );
      setKeep('');
      setChange('');
      setRejectIf('');
      setNotes('');
      setReferenceImageUrl('');
      onSubmitted();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminCard className="space-y-4">
      {labHandoff && !selectedCard && labTier && (
        <AdminAlert tone="info">
          Critiquing a Prompt Lab test — <strong>{labHandoff.archetype} · {labTier.tier}</strong>
          {labTier.cardName ? ` · ${labTier.cardName}` : ''}. This proposal references that test run so the
          fix can be regenerated against it. Pick a different tier in the subject panel, or a card above to
          critique a real card instead.
        </AdminAlert>
      )}
      <div>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-muted)' }}>
          3. What's the failure?
        </div>
        <div className="space-y-1">
          {FAILURE_TYPES.map((f) => {
            const active = failureType === f.id;
            return (
              <label
                key={f.id}
                className="flex items-start gap-2 p-2 rounded cursor-pointer"
                style={{
                  background: active ? 'var(--admin-active-wash)' : 'transparent',
                  border: `1px solid ${active ? 'var(--admin-border)' : 'transparent'}`,
                }}
              >
                <input
                  type="radio"
                  checked={active}
                  onChange={() => setFailureType(f.id)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                    {f.label}
                  </div>
                  <div className="text-[11px] leading-snug" style={{ color: 'var(--admin-text-muted)' }}>
                    {f.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-muted)' }}>
          4. Which layer to change?
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LAYER_ORDER.map((id) => {
            const copy = ARCHETYPE_LAYERS[id];
            const active = id === layer;
            return (
              <button
                key={id}
                onClick={() => setLayer(id)}
                className="text-left rounded p-2 transition-all"
                style={{
                  background: active ? copy.accentBg : 'var(--admin-canvas)',
                  border: `2px solid ${active ? copy.color : 'var(--admin-border)'}`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                    style={{ background: copy.color, color: '#111' }}
                  >
                    {id}
                  </span>
                  <span className="font-bold text-sm" style={{ color: 'var(--admin-text)' }}>
                    {copy.name}
                  </span>
                </div>
                <div className="text-[10px] italic mb-1" style={{ color: 'var(--admin-text-muted)' }}>
                  {copy.tagline}
                </div>
                <div className="text-[10px] leading-snug" style={{ color: 'var(--admin-text-muted)' }}>
                  <span style={{ color: 'var(--admin-text-muted)' }}>Controls:</span> {copy.controls}
                </div>
                {active && (
                  <div
                    className="text-[10px] leading-snug mt-1 pt-1"
                    style={{
                      color: 'var(--admin-text-muted)',
                      borderTop: `1px dashed ${copy.accentBorder}`,
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--admin-text-muted)' }}>Affects:</span> {copy.affects}
                    </div>
                    <div className="mt-1">
                      <span style={{ color: 'var(--admin-text-muted)' }}>Change when:</span> {copy.changeWhen}
                    </div>
                    <div className="mt-1 italic">{copy.example(archetype)}</div>
                    <div className="mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                      Lives in: {copy.whereItLives}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <AdminTextArea
          label="5. Keep — the one thing that must survive"
          placeholder="e.g. The lycanthrope's identity token carrying across all three tiers."
          value={keep}
          rows={2}
          onChange={(e) => setKeep(e.target.value)}
        />
        <AdminTextArea
          label="6. Change — what you want different"
          placeholder="e.g. Add a Seraph-specific Forged/Ascendant block that scales wing count and halo intensity."
          value={change}
          rows={2}
          onChange={(e) => setChange(e.target.value)}
        />
        <AdminTextArea
          label="7. Reject if — how we know we failed"
          placeholder="e.g. If the Ascendant Seraph still shows the same wing count as the Foundation."
          value={rejectIf}
          rows={2}
          onChange={(e) => setRejectIf(e.target.value)}
        />
        <AdminTextArea
          label="Notes (optional)"
          placeholder="Anything else Claude should know."
          value={notes}
          rows={2}
          onChange={(e) => setNotes(e.target.value)}
        />
        <AdminTextArea
          label="Reference image URL (optional)"
          placeholder="https://…"
          value={referenceImageUrl}
          rows={2}
          onChange={(e) => setReferenceImageUrl(e.target.value)}
        />
      </div>

      {error && <AdminAlert tone="danger">{error}</AdminAlert>}
      {success && <AdminAlert tone="success">{success}</AdminAlert>}

      <AdminButton
        variant="primary"
        onClick={submit}
        disabled={busy}
        className="w-full"
      >
        {busy ? 'Filing…' : 'File proposal'}
      </AdminButton>
    </AdminCard>
  );
}

// ─── Proposals list ──────────────────────────────────────────────────

function ProposalsList({
  proposals,
  archetype,
  viewerRole,
  onChanged,
}: {
  proposals: ArchetypeProposal[] | null;
  archetype: ArchetypeName;
  viewerRole: SessionRole;
  onChanged: () => void;
}) {
  const [searchParams] = useSearchParams();
  const deepLinkId = searchParams.get('proposal');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Payloads are omitted from the list (P1: kept the list rows cheap).
  // Fetched on-demand when a row is expanded; cached here per proposal id.
  const [payloads, setPayloads] = useState<Record<string, ArchetypeProposalPayload | null>>({});
  const [payloadErrors, setPayloadErrors] = useState<Record<string, string>>({});

  function fetchPayload(id: string) {
    if (id in payloads || id in payloadErrors) return;
    getArchetypeProposalPayload(id)
      .then((p) => setPayloads((prev) => ({ ...prev, [id]: p })))
      .catch((err) => {
        const msg = (err as { message?: string })?.message ?? String(err);
        setPayloadErrors((prev) => ({ ...prev, [id]: msg }));
      });
  }

  function togglePayload(id: string) {
    const nowOpen = expandedId !== id;
    setExpandedId(nowOpen ? id : null);
    if (nowOpen) fetchPayload(id);
  }

  // Deep-link support: /admin/workshop?...&proposal=<id> auto-expands that
  // row once the proposals for this archetype have loaded (the archetype
  // filter is already applied upstream via the ?archetype= param).
  useEffect(() => {
    if (!deepLinkId || !proposals) return;
    if (!proposals.some((p) => p.id === deepLinkId)) return;
    setExpandedId(deepLinkId);
    fetchPayload(deepLinkId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkId, proposals]);

  return (
    <AdminSection
      title={`Recent ${archetype} proposals`}
      subtitle={proposals === null ? 'loading…' : `${proposals.length} filed`}
    >
      <AdminCard>
        {proposals && proposals.length === 0 && (
          <div className="text-sm italic" style={{ color: 'var(--admin-text-muted)' }}>
            No proposals filed for {archetype} yet.
          </div>
        )}
        {proposals && proposals.length > 0 && (
          <ul className="space-y-1">
            {proposals.map((p) => {
              const isOpen = expandedId === p.id;
              const layer = ARCHETYPE_LAYERS[p.layer];
              const failure = FAILURE_TYPES.find((f) => f.id === p.failureType);
              return (
                <li
                  key={p.id}
                  className="rounded"
                  style={{
                    background: 'var(--admin-canvas)',
                    border: '1px solid var(--admin-border)',
                  }}
                >
                  <button
                    onClick={() => togglePayload(p.id)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2"
                  >
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0"
                      style={{ background: layer.color, color: '#111' }}
                    >
                      {p.layer}
                    </span>
                    <span className="text-xs truncate flex-1" style={{ color: 'var(--admin-text)' }}>
                      {failure?.label ?? p.failureType}
                    </span>
                    <OutcomeChip proposal={p} />
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--admin-text-muted)' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      className="px-3 pb-3 text-xs"
                      style={{ color: 'var(--admin-text-muted)', borderTop: '1px solid var(--admin-border)' }}
                    >
                      <LifecycleTimeline
                        proposal={p}
                        payload={payloads[p.id]}
                        payloadError={payloadErrors[p.id]}
                      />
                      <SendForApproval proposal={p} payload={payloads[p.id]} viewerRole={viewerRole} onChanged={onChanged} />
                      {viewerRole === 'admin' && <ProposalAdminActions proposal={p} onChanged={onChanged} />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>
    </AdminSection>
  );
}

// A worked proposal that isn't yet parked, shipped, or rejected can be
// handed up to Raheem. Shown to any director; approval itself stays admin-
// only (RLS enforces it), so a director sending it up gains no ship power.
function SendForApproval({
  proposal: p,
  payload,
  viewerRole,
  onChanged,
}: {
  proposal: ArchetypeProposal;
  payload: ArchetypeProposalPayload | null | undefined;
  viewerRole: SessionRole;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = viewerRole === 'admin';
  const isDirector = isAdmin || viewerRole === 'lore_director';
  const canSend = p.status === 'draft' || p.status === 'submitted' || p.status === 'awaiting_claude';

  if (p.status === 'awaiting_approval') {
    return (
      <div className="pt-2 text-[11px]" style={{ color: 'var(--admin-warning)' }}>
        Parked for Raheem's approval.
      </div>
    );
  }
  if (!isDirector || !canSend) return null;

  // The gate: directors need a passing verify + a per-layer summary. Admins can
  // park anything (parity with the RLS is_admin() bypass).
  const gate = checkApprovalReadiness(payload);
  const blocked = !isAdmin && !gate.ok;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await sendProposalForApproval(p.id, { bypassGate: isAdmin });
      onChanged();
    } catch (err) {
      setError((err as { message?: string })?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pt-2">
      <AdminButton variant="primary" size="sm" disabled={busy || blocked} onClick={send}>
        {busy ? 'Sending…' : 'Send for Raheem’s approval'}
      </AdminButton>
      {blocked && !gate.ok && (
        <div className="mt-1 text-[11px] italic" style={{ color: 'var(--admin-text-muted)' }}>
          {gate.reason}
        </div>
      )}
      {error && <AdminAlert tone="danger" className="mt-1">{error}</AdminAlert>}
    </div>
  );
}

// Collapsed-row outcome chip. Surfaces the lifecycle result inline so a
// reviewer scanning the list sees "shipped · a1b2c3d" / "rejected" /
// "awaiting Claude · 3d ago" without expanding. Tone carries the state so
// urgency never rides on color alone.
function OutcomeChip({ proposal }: { proposal: ArchetypeProposal }) {
  if (proposal.status === 'shipped') {
    return (
      <AdminStatusBadge tone="success" className="shrink-0 uppercase tracking-widest">
        {proposal.commitSha ? `shipped · ${proposal.commitSha.slice(0, 7)}` : 'shipped'}
      </AdminStatusBadge>
    );
  }
  if (proposal.status === 'rejected') {
    return (
      <AdminStatusBadge tone="danger" className="shrink-0 uppercase tracking-widest">
        rejected
      </AdminStatusBadge>
    );
  }
  if (proposal.status === 'awaiting_approval') {
    return (
      <AdminStatusBadge tone="warning" className="shrink-0 uppercase tracking-widest">
        awaiting approval · {relativeAge(proposal.updatedAt)}
      </AdminStatusBadge>
    );
  }
  if (proposal.status === 'approved') {
    return (
      <AdminStatusBadge tone="success" className="shrink-0 uppercase tracking-widest">
        approved · ready to ship
      </AdminStatusBadge>
    );
  }
  return (
    <AdminStatusBadge tone="neutral" className="shrink-0 uppercase tracking-widest">
      awaiting Claude · {relativeAge(proposal.createdAt)}
    </AdminStatusBadge>
  );
}

// Vertical lifecycle timeline for an expanded proposal. Completed steps are
// solid with their timestamp + content; steps not yet reached are dimmed so
// an open proposal visibly shows "what happens next".
function LifecycleTimeline({
  proposal,
  payload,
  payloadError,
}: {
  proposal: ArchetypeProposal;
  payload: ArchetypeProposalPayload | null | undefined;
  payloadError?: string;
}) {
  const [showText, setShowText] = useState(false);
  const decided = proposal.status === 'shipped' || proposal.status === 'rejected';
  const shipped = proposal.status === 'shipped';

  // Proposal text (Keep/Change/Reject-if + extras). Inline before a decision;
  // tucked behind a toggle once the proposal is decided so the timeline reads
  // decision-first.
  const proposalText =
    payloadError !== undefined ? (
      <div style={{ color: 'var(--admin-danger)' }}>Failed to load payload: {payloadError}</div>
    ) : payload === undefined ? (
      <div style={{ color: 'var(--admin-text-muted)' }}>Loading…</div>
    ) : payload === null ? (
      <div style={{ color: 'var(--admin-text-muted)' }}>Payload not found (proposal may be deleted).</div>
    ) : (
      <div className="space-y-2 mt-1">
        <ProposalField label="Keep" value={payload.keep} />
        <ProposalField label="Change" value={payload.change} />
        <ProposalField label="Reject if" value={payload.rejectIf} />
        {payload.notes && <ProposalField label="Notes" value={payload.notes} />}
        {payload.referenceImageUrl && (
          <div>
            <div style={{ color: 'var(--admin-text-muted)' }}>Reference:</div>
            <a
              href={payload.referenceImageUrl}
              target="_blank"
              rel="noreferrer"
              className="underline break-all"
              style={{ color: 'var(--admin-accent)' }}
            >
              {payload.referenceImageUrl}
            </a>
          </div>
        )}
        {payload.cardLineage && (
          <div>
            <div style={{ color: 'var(--admin-text-muted)' }}>Card referenced:</div>
            <div className="font-mono text-[10px]" style={{ color: 'var(--admin-text)' }}>
              {payload.cardLineage.cardName} · {payload.cardLineage.cardId.slice(0, 8)}…
            </div>
          </div>
        )}
      </div>
    );

  return (
    <ol className="mt-2 space-y-0">
      <TimelineStep
        label="Filed"
        done
        timestamp={new Date(proposal.createdAt).toLocaleString()}
        last={false}
      >
        {decided ? (
          <>
            <button
              onClick={() => setShowText((s) => !s)}
              className="text-[10px] uppercase tracking-widest underline"
              style={{ color: 'var(--admin-accent)' }}
            >
              {showText ? 'Hide proposal text' : 'Proposal text'}
            </button>
            {showText && proposalText}
          </>
        ) : (
          proposalText
        )}
      </TimelineStep>

      <TimelineStep
        label="Decided"
        done={decided}
        timestamp={proposal.decidedAt ? new Date(proposal.decidedAt).toLocaleString() : undefined}
        last={false}
      >
        {decided ? (
          <div className="mt-1">
            <span style={{ color: 'var(--admin-text-muted)' }}>
              {shipped ? 'Approved' : 'Rejected'}
              {proposal.decidedReason ? ':' : ''}
            </span>{' '}
            {proposal.decidedReason || <span className="italic">no reason recorded</span>}
          </div>
        ) : (
          <div className="italic" style={{ color: 'var(--admin-text-muted)' }}>
            Waiting on Claude's decision (keep / change / reject).
          </div>
        )}
      </TimelineStep>

      <TimelineStep
        label="Shipped"
        done={shipped && !!proposal.commitSha}
        last={false}
      >
        {shipped && proposal.commitSha ? (
          <a
            href={`${GITHUB_COMMIT_BASE}${proposal.commitSha}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] underline"
            style={{ color: 'var(--admin-accent)' }}
          >
            {proposal.commitSha.slice(0, 7)}
          </a>
        ) : proposal.status === 'rejected' ? (
          <div className="italic" style={{ color: 'var(--admin-text-muted)' }}>
            Not shipped — proposal was rejected.
          </div>
        ) : (
          <div className="italic" style={{ color: 'var(--admin-text-muted)' }}>
            Pending — no commit landed yet.
          </div>
        )}
      </TimelineStep>

      <TimelineStep label="Verified" done={!!payload?.verify} last>
        <VerifyStep proposal={proposal} payload={payload} />
      </TimelineStep>
    </ol>
  );
}

// Verified lifecycle step. For a shipped proposal that carries a Lab runId,
// offers a "Run regen verify" action: re-runs that exact Lab generation with
// the current (post-fix) pipeline and shows before/after. Spending Leonardo
// credits, so gated behind an inline confirm. Once evidence exists, shows the
// two portraits and a reviewer pass/fail verdict.
function VerifyStep({
  proposal,
  payload,
}: {
  proposal: ArchetypeProposal;
  payload: ArchetypeProposalPayload | null | undefined;
}) {
  const [evidence, setEvidence] = useState<VerifyEvidence | undefined>(payload?.verify);
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<{ before: string | null; after: string | null }>({
    before: null,
    after: null,
  });
  const [savingVerdict, setSavingVerdict] = useState(false);

  useEffect(() => {
    setEvidence(payload?.verify);
  }, [payload?.verify]);

  // Resolve signed before/after URLs when evidence is present.
  useEffect(() => {
    let cancelled = false;
    if (!evidence) {
      setUrls({ before: null, after: null });
      return;
    }
    void (async () => {
      const [before, after] = await Promise.all([
        evidence.beforeObjectPath ? signedUrl(evidence.beforeObjectPath) : Promise.resolve(null),
        evidence.afterObjectPath ? signedUrl(evidence.afterObjectPath) : Promise.resolve(null),
      ]);
      if (!cancelled) setUrls({ before, after });
    })();
    return () => {
      cancelled = true;
    };
  }, [evidence]);

  // Lab-sourced proposals reproduce the referenced Lab run; card-sourced
  // proposals compare the card's current portrait against a fresh regen.
  async function doRun() {
    setConfirming(false);
    setError(null);
    setRunning('Starting…');
    try {
      let result;
      if (payload?.labRunId) {
        result = await runRegenVerify({
          proposalId: proposal.id,
          beforeRunId: payload.labRunId,
          onStep: (s) => setRunning(s),
        });
      } else if (proposal.cardId) {
        setRunning('Loading card…');
        const card = await getCardForAdmin(proposal.cardId);
        if (!card) throw new Error('Referenced card not found — cannot verify.');
        result = await runCardRegenVerify({
          proposalId: proposal.id,
          card,
          onStep: (s) => setRunning(s),
        });
      } else {
        throw new Error('This proposal has no Lab run or card to verify against.');
      }
      setEvidence(result.evidence);
      setUrls({ before: result.beforeUrl, after: result.afterUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(null);
    }
  }

  async function setVerdict(verdict: NonNullable<VerifyEvidence['verdict']>) {
    if (!evidence) return;
    setSavingVerdict(true);
    try {
      const next = await saveVerifyVerdict(proposal.id, evidence, { verdict });
      setEvidence(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingVerdict(false);
    }
  }

  // Evidence already attached — show before/after + verdict.
  if (evidence) {
    return (
      <div className="mt-1 space-y-2">
        <div className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
          Regenerated {new Date(evidence.ranAt).toLocaleString()} · {evidence.archetype} · {evidence.tier}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <VerifyThumb label={evidence.source === 'card' ? 'Before (current card)' : 'Before (filed)'} url={urls.before} />
          <VerifyThumb label="After (regen)" url={urls.after} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
            Verdict:
          </span>
          {(['pass', 'fail', 'unsure'] as const).map((v) => {
            const active = evidence.verdict === v;
            return (
              <button
                key={v}
                disabled={savingVerdict}
                onClick={() => void setVerdict(v)}
                className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border"
                style={{
                  borderColor: active ? 'var(--admin-accent)' : 'var(--admin-border)',
                  background: active ? 'var(--admin-active-wash)' : 'transparent',
                  color: active ? 'var(--admin-text)' : 'var(--admin-text-muted)',
                }}
              >
                {v}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setConfirming(true)}
          className="text-[10px] uppercase tracking-widest underline"
          style={{ color: 'var(--admin-accent)' }}
        >
          Re-run verify
        </button>
        {confirming && <ConfirmRun onConfirm={doRun} onCancel={() => setConfirming(false)} />}
        {running && <RunningNote step={running} />}
        {error && <div style={{ color: 'var(--admin-danger)' }}>{error}</div>}
      </div>
    );
  }

  // No evidence yet. Verify can run any time during the working phase — it is
  // the precondition for sending a proposal for approval, not a post-ship step.
  if (!payload) {
    return <div style={{ color: 'var(--admin-text-muted)' }}>Loading…</div>;
  }
  const canVerify = Boolean(payload.labRunId) || Boolean(proposal.cardId);
  if (!canVerify) {
    return (
      <div className="italic" style={{ color: 'var(--admin-text-muted)' }}>
        No Lab run or card linked — regen verify needs one to produce a before/after.
      </div>
    );
  }
  return (
    <div className="mt-1 space-y-2">
      <div className="italic" style={{ color: 'var(--admin-text-muted)' }}>
        {payload.labRunId
          ? `Re-run the linked Lab generation (${payload.labRunId.slice(0, 8)}…) through the current pipeline to confirm the change moved the output.`
          : "Regenerate this card's portrait through the current pipeline and compare it against the card's existing art."}
      </div>
      {!confirming && !running && (
        <AdminButton variant="secondary" onClick={() => setConfirming(true)}>
          Run regen verify
        </AdminButton>
      )}
      {confirming && <ConfirmRun onConfirm={doRun} onCancel={() => setConfirming(false)} />}
      {running && <RunningNote step={running} />}
      {error && <div style={{ color: 'var(--admin-danger)' }}>{error}</div>}
    </div>
  );
}

function ConfirmRun({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="p-2 rounded space-y-2"
      style={{ background: 'var(--admin-active-wash)', border: '1px solid var(--admin-border)' }}
    >
      <div style={{ color: 'var(--admin-text)' }}>
        Spends one Leonardo image (a single "after" portrait at this tier — the
        "before" reuses existing art, no extra credit). Continue?
      </div>
      <div className="flex gap-2">
        <AdminButton variant="primary" onClick={onConfirm}>
          Yes, run it
        </AdminButton>
        <AdminButton variant="secondary" onClick={onCancel}>
          Cancel
        </AdminButton>
      </div>
    </div>
  );
}

function RunningNote({ step }: { step: string }) {
  return (
    <div className="flex items-center gap-2" style={{ color: 'var(--admin-text-muted)' }}>
      <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--admin-accent)' }} />
      {step}
    </div>
  );
}

function VerifyThumb({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
        {label}
      </div>
      <div
        className="w-full rounded overflow-hidden"
        style={{ aspectRatio: '3 / 4', background: PORTRAIT_PLACEHOLDER, border: '1px solid var(--admin-border)' }}
      >
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
            image expired
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineStep({
  label,
  done,
  timestamp,
  last,
  children,
}: {
  label: string;
  done: boolean;
  timestamp?: string;
  last: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3" style={{ opacity: done ? 1 : 0.5 }}>
      {/* Rail: dot + connector line */}
      <div className="flex flex-col items-center shrink-0">
        <span
          className="w-2.5 h-2.5 rounded-full mt-1"
          style={{
            background: done ? 'var(--admin-accent)' : 'transparent',
            border: `1px solid ${done ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
          }}
        />
        {!last && (
          <span className="flex-1 w-px my-1" style={{ background: 'var(--admin-border)', minHeight: 12 }} />
        )}
      </div>
      <div className="pb-3 flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[10px] uppercase tracking-widest font-bold"
            style={{ color: done ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}
          >
            {label}
          </span>
          {timestamp && (
            <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
              {timestamp}
            </span>
          )}
        </div>
        {children}
      </div>
    </li>
  );
}

function ProposalField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: 'var(--admin-text-muted)' }}>{label}:</div>
      <div style={{ color: 'var(--admin-text)' }}>{value}</div>
    </div>
  );
}
