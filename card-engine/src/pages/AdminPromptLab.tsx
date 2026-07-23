import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { ARCHETYPE_NAMES, type ArchetypeName, type Card, type CardStats, type Rank } from '../types/card';
import { stashLabHandoff } from '../services/labWorkshopHandoff';
import {
  AdminPage,
  AdminCard,
  AdminButton,
  AdminAlert,
  AdminStatusBadge,
  AdminUnsupportedDevice,
  type BadgeTone,
} from '../components/admin/ui';
import type {
  ElementBond,
  ElementCompatibility,
  ElementName,
  ElementSelection,
  HiddenFate,
} from '../types/bible';
import { ELEMENT_BONDS } from '../types/bible';
import { getQuestionsForArchetype, getOptionsForQuestion } from '../data/storyPillars';
import {
  bucketFor,
  elementIsNarrativelyEligible,
  elementsAvailableToArchetype,
} from '../data/elements';
import { rollElement } from '../services/elementRoller';
import { buildCardShell } from '../services/cardGenerator';
import { getSupabaseClient } from '../services/persistence/supabaseClient';
import { API_COST_CATALOG } from '../data/economy/apiCostCatalog';
import { CardRenderer } from '../components/CardRenderer';
import { AdminPreviewPanel } from '../components/admin/AdminPreviewPanel';
import * as lab from '../services/forge/promptLabController';
import { usePromptLabChain } from '../services/forge/usePromptLabChain';
import type { TierResult, TierSlot } from '../services/forge/promptLabController';

// Prompt Lab — realistic tier chain tester.
//
// Player-parity constraints:
//   - Story Pillar answers are eager + editable. Every archetype's real
//     wizard questions are surfaced as a compact <select> per question.
//   - The element dropdown is filtered to what elementsAvailableToArchetype
//     + elementIsNarrativelyEligible returns; grouped by bucket.
//   - "Roll like a player" fires rollElement() — the same helper the real
//     forge uses when the wizard finishes.
//   - Bond dropdown lists ELEMENT_BONDS (10 canonical strings).
//   - Compatibility comes from bucketFor(archetype, element), never hardcoded.
//
// Session review:
//   - Batches render as thumbnail-driven session cards instead of a log.
//   - Clicking a card opens the shared AdminPreviewPanel with full-tier
//     CardRenderers, prompt provenance, and continue/mark complete/cancel.
//   - "Show archived" toggles complete/cancelled visibility.
//
// Presentation:
//   - The control region (archetype / pillars / element inputs) is a sticky
//     sidebar so the tier/result canvas scrolls independently — a reviewer can
//     compare all three tiers on desktop + iPad landscape without page-level
//     horizontal scroll.
//   - Below 768px paid generation controls are not mounted at all (see the
//     AdminUnsupportedDevice guard in AdminPromptLab).

const TIERS: readonly Rank[] = ['Foundation', 'Forged', 'Ascendant'];

// Shared dense-control styling (opaque surface-strong per the design system).
const CONTROL_STYLE: React.CSSProperties = {
  background: 'var(--admin-surface-strong)',
  border: '1px solid var(--admin-border)',
  color: 'var(--admin-text)',
  borderRadius: 'var(--admin-radius-control)',
};
const CONTROL_CLASS = 'w-full px-2 py-1.5 text-sm disabled:opacity-50';
const FIELD_LABEL_CLASS = 'block text-[10px] uppercase tracking-wider mb-1';

const BUCKET_LABEL: Record<ElementCompatibility, string> = {
  naturally_compatible: 'Naturally Compatible',
  compatible_through_reinterpretation: 'Reinterpretation',
  rare: 'Rare',
  not_available: '(unavailable)',
};

const DISPOSITIONS = [
  { value: 'keep_success', label: 'Keep as successful evidence' },
  { value: 'regenerate_same_prompt', label: 'Regenerate with same prompt' },
  { value: 'archetype_prompt_change_candidate', label: 'Archetype prompt change candidate' },
  { value: 'global_prompt_change_candidate', label: 'Global prompt change candidate' },
  { value: 'model_settings_investigation', label: 'Model/settings investigation' },
  { value: 'reject_unusable', label: 'Reject as unusable' },
] as const;
type Disposition = typeof DISPOSITIONS[number]['value'];

// ---- Session grid data model ------------------------------------------

interface RunSummary {
  id: string;
  tier: Rank;
  status: 'running' | 'success' | 'error' | 'image_expired';
  output_object_path: string | null;
  input_snapshot: {
    archetype?: ArchetypeName;
    stats?: CardStats;
    element?: ElementSelection;
    priorTierName?: string | null;
  } | null;
  claude_response: {
    cardName?: string;
    nameAndTitle?: string;
    lore?: string;
    hiddenFate?: HiddenFate;
    portraitPrompt?: string;
    negativePrompt?: string;
  } | null;
  started_at: string;
  completed_at: string | null;
  parent_run_id: string | null;
}

interface SessionSummary {
  id: string;
  archetype: ArchetypeName;
  intent: string | null;
  status: 'active' | 'complete' | 'cancelled';
  created_at: string;
  runs: RunSummary[];
  hasActionableJudgment: boolean;
}

const ACTIONABLE_DISPOSITIONS = [
  'archetype_prompt_change_candidate',
  'global_prompt_change_candidate',
  'model_settings_investigation',
  'regenerate_same_prompt',
];

// ---- Responsive guard --------------------------------------------------

// Paid generation must be truly unmounted below 768px, not merely hidden.
// This hook drives that decision; the workspace (and all its generation
// hooks) only mount when true.
function useIsDesktopWidth(): boolean {
  const query = '(min-width: 768px)';
  const [ok, setOk] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setOk(e.matches);
    mq.addEventListener('change', handler);
    setOk(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return ok;
}

// ---- Top-level page (guard only) --------------------------------------

export function AdminPromptLab() {
  const isDesktop = useIsDesktopWidth();
  return (
    <AdminPage
      title="Prompt Lab"
      description={
        <>
          Foundation → Forged → Ascendant tier tester. Runs the same shared Claude + Leonardo
          services production forge uses; every input, prompt, response, cost, and image is
          persisted so a reviewer can reproduce a test months later. Story pillar answers,
          filtered element buckets, and "Roll like a player" all mirror the real forge. Each tier
          renders with the production CardRenderer, and session cards below the tier columns open a
          right-side drawer with full provenance and a "Send to Workshop" handoff per tier.
        </>
      }
    >
      {isDesktop ? <PromptLabWorkspace /> : <AdminUnsupportedDevice feature="The Prompt Lab" />}
    </AdminPage>
  );
}

// ---- Workspace (paid controls; desktop/tablet only) -------------------

function PromptLabWorkspace() {
  // The whole tier chain (form inputs + tier slots) lives in the persisted
  // promptLabController so navigating away — or reloading — no longer throws
  // away an in-flight test. This page is a view over that store.
  const chain = usePromptLabChain();
  const { archetype, answers, element, bond, intent, foundation, forged, ascendant } = chain;

  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [zoomCard, setZoomCard] = useState<Card | null>(null);

  // ---- Element eligibility (derived) -------------------------------------

  const eligibleElements = useMemo(() => {
    return elementsAvailableToArchetype(archetype)
      .filter((e) => elementIsNarrativelyEligible(archetype, e, answers.answers));
  }, [archetype, answers]);

  const eligibleByBucket = useMemo(() => {
    const buckets: Record<ElementCompatibility, ElementName[]> = {
      naturally_compatible: [],
      compatible_through_reinterpretation: [],
      rare: [],
      not_available: [],
    };
    for (const el of eligibleElements) {
      buckets[bucketFor(archetype, el)].push(el);
    }
    return buckets;
  }, [eligibleElements, archetype]);

  const onArchetypeChange = (next: ArchetypeName) => lab.setArchetype(next);
  const onAnswerChange = (questionId: string, optionId: string) => lab.setAnswer(questionId, optionId);
  const rollLikeAPlayer = () => lab.setElement(rollElement(archetype, answers));

  // ---- Session grid load ------------------------------------------------

  const refreshSessions = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const query = supabase
      .from('prompt_test_batches')
      .select(
        'id, archetype, intent, status, created_at, ' +
        'prompt_test_runs(id, tier, status, output_object_path, input_snapshot, claude_response, started_at, completed_at, parent_run_id)',
      )
      .order('created_at', { ascending: false })
      .limit(50);
    const filtered = showArchived
      ? query
      : query.eq('status', 'active');
    const { data } = await filtered;
    if (!data) return;
    const rows = data as unknown as Array<{
      id: string;
      archetype: ArchetypeName;
      intent: string | null;
      status: SessionSummary['status'];
      created_at: string;
      prompt_test_runs: RunSummary[];
    }>;

    // Second query: which batches have any run with an actionable
    // judgment disposition. Fetches only the ids we're about to render.
    const batchIds = rows.map((r) => r.id);
    const flaggedBatchIds = new Set<string>();
    if (batchIds.length > 0) {
      const { data: flags } = await supabase
        .from('prompt_test_runs')
        .select('batch_id, prompt_test_judgments!inner(disposition)')
        .in('batch_id', batchIds)
        .in('prompt_test_judgments.disposition', ACTIONABLE_DISPOSITIONS);
      for (const row of (flags ?? []) as Array<{ batch_id: string }>) {
        flaggedBatchIds.add(row.batch_id);
      }
    }

    setSessions(
      rows.map((r) => ({
        id: r.id,
        archetype: r.archetype,
        intent: r.intent,
        status: r.status,
        created_at: r.created_at,
        runs: (r.prompt_test_runs ?? []).slice().sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier)),
        hasActionableJudgment: flaggedBatchIds.has(r.id),
      })),
    );
  }, [showArchived]);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const estimated = API_COST_CATALOG.forge_card.estimatedDirectCostUsd;

  const chainStarted = lab.chainStarted();
  const resetChain = () => lab.resetChain();

  // ---- Tier run (executes in the controller so it survives navigation) ----

  const runFoundation = () => void lab.runTier('Foundation', undefined, undefined, refreshSessions);
  const runForged = () => {
    if (foundation.phase !== 'done') return;
    void lab.runTier('Forged', foundation.result, foundation.result.runId, refreshSessions);
  };
  const runAscendant = () => {
    if (forged.phase !== 'done') return;
    void lab.runTier('Ascendant', forged.result, forged.result.runId, refreshSessions);
  };

  // ---- Session panel state --------------------------------------------

  const selectedSession = useMemo(
    () => (selectedBatchId ? sessions?.find((s) => s.id === selectedBatchId) ?? null : null),
    [sessions, selectedBatchId],
  );

  const setBatchStatus = async (id: string, status: SessionSummary['status']) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.from('prompt_test_batches').update({ status }).eq('id', id);
    void refreshSessions();
    setSelectedBatchId(null);
  };

  // ---- Render ---------------------------------------------------------

  return (
    <>
      <div className="lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-4 lg:items-start">
        {/* Sticky control sidebar — inputs stay in view while the tier/result
            canvas scrolls independently. */}
        <div className="lg:sticky lg:top-4 space-y-3 mb-6 lg:mb-0">
          <AdminCard className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <label className="block">
                <span className={FIELD_LABEL_CLASS} style={{ color: 'var(--admin-text-muted)' }}>Archetype</span>
                <select
                  disabled={chainStarted}
                  value={archetype}
                  onChange={(e) => onArchetypeChange(e.target.value as ArchetypeName)}
                  className={CONTROL_CLASS}
                  style={CONTROL_STYLE}
                >
                  {ARCHETYPE_NAMES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={FIELD_LABEL_CLASS} style={{ color: 'var(--admin-text-muted)' }}>Intent (optional)</span>
                <input
                  type="text"
                  disabled={chainStarted}
                  value={intent}
                  onChange={(e) => lab.setIntent(e.target.value)}
                  placeholder="e.g. ember-leak regression"
                  className={CONTROL_CLASS}
                  style={CONTROL_STYLE}
                />
              </label>
            </div>

            {/* Story pillar answers — eager + editable */}
            <div>
              <div className={FIELD_LABEL_CLASS} style={{ color: 'var(--admin-text-muted)' }}>Story pillar answers</div>
              <div className="space-y-2">
                {answers.answers.map((a) => {
                  const opts = getOptionsForQuestion(archetype, a.questionId);
                  const q = getQuestionsForArchetype(archetype).find((qq) => qq.id === a.questionId);
                  return (
                    <label key={a.questionId} className="block">
                      <span className="block text-[10px] mb-0.5" style={{ color: 'var(--admin-text-muted)' }}>{q?.prompt ?? a.questionId}</span>
                      <select
                        disabled={chainStarted}
                        value={a.optionId}
                        onChange={(e) => onAnswerChange(a.questionId, e.target.value)}
                        className="w-full px-2 py-1.5 text-xs disabled:opacity-50"
                        style={CONTROL_STYLE}
                      >
                        {opts.map((o) => <option key={o.id} value={o.id}>{o.text}</option>)}
                      </select>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Element (filtered + bucketed) + bond */}
            <div className="space-y-3">
              <div>
                <span className={FIELD_LABEL_CLASS} style={{ color: 'var(--admin-text-muted)' }}>
                  Element ({eligibleElements.length} eligible)
                </span>
                <div className="flex gap-2">
                  <select
                    disabled={chainStarted}
                    value={element}
                    onChange={(e) => lab.setElement(e.target.value as ElementName)}
                    className="flex-1 px-2 py-1.5 text-sm disabled:opacity-50"
                    style={CONTROL_STYLE}
                  >
                    {(['naturally_compatible', 'compatible_through_reinterpretation', 'rare'] as const).map((b) =>
                      eligibleByBucket[b].length > 0 ? (
                        <optgroup key={b} label={BUCKET_LABEL[b]}>
                          {eligibleByBucket[b].map((el) => (
                            <option key={el} value={el}>{el}</option>
                          ))}
                        </optgroup>
                      ) : null,
                    )}
                  </select>
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={rollLikeAPlayer}
                    disabled={chainStarted}
                    title="Uses the same rollElement() the real forge does"
                  >
                    Roll like a player
                  </AdminButton>
                </div>
                <div className="text-[10px] mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                  Current bucket: {BUCKET_LABEL[bucketFor(archetype, element)]}
                </div>
              </div>
              <label className="block">
                <span className={FIELD_LABEL_CLASS} style={{ color: 'var(--admin-text-muted)' }}>Bond</span>
                <select
                  disabled={chainStarted}
                  value={bond}
                  onChange={(e) => lab.setBond(e.target.value as ElementBond)}
                  className={CONTROL_CLASS}
                  style={CONTROL_STYLE}
                >
                  {ELEMENT_BONDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
            </div>

            {chainStarted && (
              <div className="flex justify-end">
                <AdminButton variant="ghost" size="sm" onClick={resetChain}>
                  Reset chain
                </AdminButton>
              </div>
            )}
          </AdminCard>
        </div>

        {/* Scrolling tier/result canvas */}
        <div className="space-y-6 min-w-0">
          <div className="overflow-x-auto">
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0">
              <TierColumn
                tier="Foundation"
                archetype={archetype}
                slot={foundation}
                onRun={runFoundation}
                setSlot={(s) => lab.setTierSlot('Foundation', s)}
                onZoom={setZoomCard}
                estimatedCostUsd={estimated}
                available
              />
              <TierColumn
                tier="Forged"
                archetype={archetype}
                slot={forged}
                onRun={runForged}
                setSlot={(s) => lab.setTierSlot('Forged', s)}
                onZoom={setZoomCard}
                estimatedCostUsd={estimated}
                available={foundation.phase === 'done'}
              />
              <TierColumn
                tier="Ascendant"
                archetype={archetype}
                slot={ascendant}
                onRun={runAscendant}
                setSlot={(s) => lab.setTierSlot('Ascendant', s)}
                onZoom={setZoomCard}
                estimatedCostUsd={estimated}
                available={forged.phase === 'done'}
              />
            </section>
          </div>

          {(foundation.phase === 'done' || forged.phase === 'done' || ascendant.phase === 'done') && (
            <JudgmentTargets
              runs={[foundation, forged, ascendant]
                .map((s, i) => (s.phase === 'done' ? { tier: TIERS[i], result: s.result } : null))
                .filter((x): x is { tier: Rank; result: TierResult } => x !== null)}
              onSaved={refreshSessions}
            />
          )}

          {/* Sessions grid */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text)' }}>Sessions</h2>
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--admin-text-muted)' }}>
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
                Show archived
              </label>
            </div>

            {sessions === null && <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Loading…</div>}
            {sessions && sessions.length === 0 && (
              <div className="text-xs italic" style={{ color: 'var(--admin-text-muted)' }}>No {showArchived ? '' : 'active '}test sessions yet.</div>
            )}
            {sessions && sessions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sessions.map((s) => (
                  <SessionCard key={s.id} session={s} onOpen={() => setSelectedBatchId(s.id)} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <SessionPanel
        session={selectedSession}
        open={Boolean(selectedSession)}
        onClose={() => setSelectedBatchId(null)}
        onMarkComplete={() => selectedSession && setBatchStatus(selectedSession.id, 'complete')}
        onCancel={() => selectedSession && setBatchStatus(selectedSession.id, 'cancelled')}
      />

      {zoomCard && <CardZoom card={zoomCard} onClose={() => setZoomCard(null)} />}
    </>
  );
}

// ---- Card zoom lightbox ------------------------------------------------

function CardZoom({ card, onClose }: { card: Card; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-full overflow-y-auto flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ transform: 'scale(1.4)', transformOrigin: 'top center' }} className="my-16">
          <CardRenderer card={card} />
        </div>
        <button
          onClick={onClose}
          className="fixed top-4 right-4 px-3 py-1.5 rounded font-fantasy text-xs font-bold bg-gold/80 text-void"
        >
          Close ✕
        </button>
      </div>
    </div>
  );
}

// ---- Tier column (in-game render) -------------------------------------

function TierColumn(props: {
  tier: Rank;
  archetype: ArchetypeName;
  slot: TierSlot;
  setSlot: (s: TierSlot) => void;
  onRun: () => void;
  onZoom: (card: Card) => void;
  estimatedCostUsd: number;
  available: boolean;
}) {
  const { tier, archetype, slot, setSlot, onRun, onZoom, estimatedCostUsd, available } = props;
  return (
    <AdminCard className="min-h-[520px] flex flex-col">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{tier}</h3>
        <StatusBadge slot={slot} />
      </div>

      {slot.phase === 'idle' && (
        <div className="flex-1 flex items-center justify-center">
          {available ? (
            <AdminButton variant="primary" onClick={() => setSlot({ phase: 'confirming' })}>
              Run {tier}
            </AdminButton>
          ) : (
            <div className="text-xs text-center" style={{ color: 'var(--admin-text-muted)' }}>Complete the prior tier first.</div>
          )}
        </div>
      )}
      {slot.phase === 'confirming' && (
        <div className="flex-1 flex flex-col justify-center gap-3">
          <AdminAlert tone="warning" title="Paid generation">
            Fires 1 Claude + 1 Leonardo call ~ ${estimatedCostUsd.toFixed(3)}. Continue?
          </AdminAlert>
          <div className="flex justify-center gap-2">
            <AdminButton variant="primary" size="sm" onClick={onRun}>
              Confirm
            </AdminButton>
            <AdminButton variant="secondary" size="sm" onClick={() => setSlot({ phase: 'idle' })}>
              Cancel
            </AdminButton>
          </div>
        </div>
      )}
      {slot.phase === 'running' && (
        <div className="flex-1 flex items-center justify-center text-xs italic" style={{ color: 'var(--admin-text-muted)' }}>
          {slot.step}
        </div>
      )}
      {slot.phase === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-xs">
          <span style={{ color: 'var(--admin-danger)' }}>{slot.message}</span>
          <AdminButton variant="secondary" size="sm" onClick={() => setSlot({ phase: 'idle' })}>
            Reset {tier}
          </AdminButton>
        </div>
      )}
      {slot.phase === 'done' && (
        <div className="flex-1 space-y-2">
          <div className="flex justify-center">
            <CardRenderer
              card={synthesizeCard(archetype, slot.result)}
              onClick={() => onZoom(synthesizeCard(archetype, slot.result))}
            />
          </div>
          <div className="text-[10px] text-center text-bone/40">
            {slot.result.imageStripped ? 'Portrait not restored after reload — open Sessions for the image.' : 'Click the card to zoom.'}
          </div>
          <div className="text-xs text-center">
            <div className="font-semibold" style={{ color: 'var(--admin-text)' }}>{slot.result.cardName ?? '(no name)'}</div>
            <div className="italic" style={{ color: 'var(--admin-text-muted)' }}>{slot.result.nameAndTitle ?? ''}</div>
          </div>
          <ProvenanceDetails summary="Prompt" body={slot.result.portraitPrompt} maxH="8rem" />
          <ProvenanceDetails summary="Negative" body={slot.result.negativePrompt} maxH="6rem" />
          <ProvenanceDetails summary="Full response" body={JSON.stringify(slot.result.raw, null, 2)} maxH="10rem" mono />
        </div>
      )}
    </AdminCard>
  );
}

// Reusable collapsible provenance block (prompt / negative / raw response).
function ProvenanceDetails({ summary, body, maxH, mono }: { summary: string; body: string; maxH: string; mono?: boolean }) {
  return (
    <details className="text-[11px]">
      <summary className="cursor-pointer text-[10px] uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>{summary}</summary>
      <pre
        className={`whitespace-pre-wrap p-2 rounded overflow-y-auto mt-1 ${mono ? 'text-[10px]' : ''}`}
        style={{ background: 'var(--admin-canvas)', color: 'var(--admin-text-muted)', maxHeight: maxH }}
      >
        {body}
      </pre>
    </details>
  );
}

const SLOT_BADGE: Record<TierSlot['phase'], { label: string; tone: BadgeTone }> = {
  idle: { label: 'idle', tone: 'neutral' },
  confirming: { label: 'confirm?', tone: 'warning' },
  running: { label: 'running', tone: 'warning' },
  error: { label: 'error', tone: 'danger' },
  done: { label: 'done', tone: 'success' },
};

function StatusBadge({ slot }: { slot: TierSlot }) {
  const cfg = SLOT_BADGE[slot.phase];
  return <AdminStatusBadge tone={cfg.tone} className="uppercase tracking-wider">{cfg.label}</AdminStatusBadge>;
}

// ---- Session grid card ------------------------------------------------

function SessionCard({ session, onOpen }: { session: SessionSummary; onOpen: () => void }) {
  const [tierUrls, setTierUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const entries: Array<[string, string | null]> = [];
      for (const run of session.runs) {
        if (run.status === 'image_expired' || !run.output_object_path) {
          entries.push([run.id, null]);
          continue;
        }
        const url = await signedUrl(run.output_object_path);
        entries.push([run.id, url]);
      }
      if (cancelled) return;
      setTierUrls(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [session.runs]);

  return (
    <button
      onClick={onOpen}
      className="text-left rounded-[var(--admin-radius-control)] p-3 transition-colors"
      style={{ background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border)' }}
    >
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{session.archetype}</div>
        <div className="flex items-center gap-1 shrink-0">
          {session.hasActionableJudgment && (
            <AdminStatusBadge tone="warning" className="uppercase tracking-wider" >
              <span title="At least one run has a judgment flagged for action">⚑ review</span>
            </AdminStatusBadge>
          )}
          <AdminStatusBadge tone={SESSION_STATUS_TONE[session.status]} className="uppercase tracking-wider">
            {session.status}
          </AdminStatusBadge>
        </div>
      </div>
      <div className="text-xs truncate mb-2 min-h-[1em]" style={{ color: 'var(--admin-text-muted)' }}>
        {session.intent ?? <span className="italic">no intent</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {TIERS.map((tier) => {
          const run = session.runs.find((r) => r.tier === tier);
          const url = run ? tierUrls[run.id] : null;
          return (
            <div key={tier} className="aspect-[3/4] rounded overflow-hidden flex items-center justify-center" style={{ background: 'var(--admin-canvas)' }}>
              {run && url ? (
                <div
                  className="w-full h-full bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${url}")` }}
                />
              ) : run ? (
                <div className="text-[9px] text-center px-1" style={{ color: 'var(--admin-text-muted)' }}>
                  {run.status === 'image_expired' ? 'expired' : run.tier}
                </div>
              ) : (
                <div className="text-[9px]" style={{ color: 'var(--admin-text-muted)' }}>—</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
        <span>{session.runs.length}/3 tiers</span>
        <span>{new Date(session.created_at).toLocaleDateString()}</span>
      </div>
    </button>
  );
}

const SESSION_STATUS_TONE: Record<SessionSummary['status'], BadgeTone> = {
  active: 'neutral',
  complete: 'success',
  cancelled: 'danger',
};

// ---- Session panel ----------------------------------------------------

function SessionPanel(props: {
  session: SessionSummary | null;
  open: boolean;
  onClose: () => void;
  onMarkComplete: () => void;
  onCancel: () => void;
}) {
  const { session, open, onClose, onMarkComplete, onCancel } = props;
  const [runUrls, setRunUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void (async () => {
      const entries: Array<[string, string | null]> = [];
      for (const run of session.runs) {
        if (run.status === 'image_expired' || !run.output_object_path) {
          entries.push([run.id, null]);
          continue;
        }
        const url = await signedUrl(run.output_object_path);
        entries.push([run.id, url]);
      }
      if (!cancelled) setRunUrls(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [session]);

  if (!session) {
    return (
      <AdminPreviewPanel open={open} onClose={onClose} title="">
        <div />
      </AdminPreviewPanel>
    );
  }

  const actions = session.status === 'active' ? (
    <>
      <AdminButton variant="secondary" size="sm" onClick={onCancel}>
        Cancel batch
      </AdminButton>
      <AdminButton variant="primary" size="sm" onClick={onMarkComplete}>
        Mark complete
      </AdminButton>
    </>
  ) : (
    <div className="text-xs italic" style={{ color: 'var(--admin-text-muted)' }}>Archived ({session.status})</div>
  );

  return (
    <AdminPreviewPanel
      open={open}
      onClose={onClose}
      title={session.archetype}
      subtitle={session.intent ?? new Date(session.created_at).toLocaleString()}
      actions={actions}
    >
      <div className="space-y-4">
        <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
          {session.runs.length}/3 tiers · created {new Date(session.created_at).toLocaleString()}
        </div>

        {TIERS.map((tier) => {
          const run = session.runs.find((r) => r.tier === tier);
          if (!run) {
            return (
              <div key={tier} className="rounded p-4 text-center text-xs" style={{ border: '1px dashed var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                {tier} — not run yet
              </div>
            );
          }
          const card = synthesizeCardFromRun(run, runUrls[run.id] ?? null);
          return (
            <div key={run.id} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{tier}</span>
                <StatusBadgeRaw status={run.status} />
              </div>
              {card ? (
                <div className="flex justify-center">
                  <CardRenderer size="thumbnail" card={card} />
                </div>
              ) : (
                <div className="rounded p-4 text-center text-xs" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                  {run.status === 'image_expired' ? 'Image expired (retention policy)' : 'Not enough data to render'}
                </div>
              )}
              <ProvenanceDetails summary="Portrait prompt" body={run.claude_response?.portraitPrompt ?? '(missing)'} maxH="10rem" />
              <ProvenanceDetails summary="Negative" body={run.claude_response?.negativePrompt ?? '(missing)'} maxH="8rem" />
            </div>
          );
        })}

        <SendBatchToWorkshop session={session} />
      </div>
    </AdminPreviewPanel>
  );
}

// One button for the whole batch. Sends every completed tier's IMAGE (by
// stable object path) to the Workshop as the critique subject — no per-tier
// buttons. The Workshop shows the images and lets the reviewer pick which tier
// to critique; the chosen tier's runId rides along so regen-verify can re-run
// that exact generation with the shipped fix.
function SendBatchToWorkshop({ session }: { session: SessionSummary }) {
  const navigate = useNavigate();
  const completed = TIERS
    .map((tier) => session.runs.find((r) => r.tier === tier && r.status === 'success' && r.output_object_path))
    .filter((r): r is RunSummary => Boolean(r));

  if (completed.length === 0) {
    return (
      <div className="text-xs italic pt-1" style={{ color: 'var(--admin-text-muted)' }}>
        Run at least one tier before sending to the Workshop.
      </div>
    );
  }

  const send = () => {
    const tiers = completed.map((r) => ({
      tier: r.tier,
      runId: r.id,
      objectPath: r.output_object_path,
      cardName: r.claude_response?.cardName,
      nameAndTitle: r.claude_response?.nameAndTitle,
      lore: r.claude_response?.lore,
      portraitPrompt: r.claude_response?.portraitPrompt,
      negativePrompt: r.claude_response?.negativePrompt,
    }));
    // Primary = highest completed tier (last in TIERS order), the usual subject.
    const primary = tiers[tiers.length - 1];
    stashLabHandoff({
      source: 'prompt-lab',
      archetype: session.archetype,
      tiers,
      primaryRunId: primary.runId,
      runId: primary.runId,
      tier: primary.tier,
      cardName: primary.cardName,
      nameAndTitle: primary.nameAndTitle,
      lore: primary.lore,
      portraitPrompt: primary.portraitPrompt,
      negativePrompt: primary.negativePrompt,
    });
    navigate(`/admin/workshop?archetype=${encodeURIComponent(session.archetype)}&from=lab`);
  };

  return (
    <div className="pt-2">
      <AdminButton variant="primary" icon={<Hammer size={14} />} onClick={send} className="w-full">
        Send to Workshop ({completed.length} {completed.length === 1 ? 'image' : 'images'})
      </AdminButton>
    </div>
  );
}

const RUN_STATUS_BADGE: Record<RunSummary['status'], { label: string; tone: BadgeTone }> = {
  running: { label: 'running', tone: 'warning' },
  success: { label: 'done', tone: 'success' },
  error: { label: 'error', tone: 'danger' },
  image_expired: { label: 'expired', tone: 'neutral' },
};

function StatusBadgeRaw({ status }: { status: RunSummary['status'] }) {
  const cfg = RUN_STATUS_BADGE[status];
  return <AdminStatusBadge tone={cfg.tone} className="uppercase tracking-wider">{cfg.label}</AdminStatusBadge>;
}

// ---- Judgment (unchanged behavior) ------------------------------------

interface JudgmentInput {
  overall_rating?: number;
  archetype_fidelity?: number;
  prompt_to_image?: number;
  identity_continuity?: number;
  anatomy_artifacts?: number;
  disposition: Disposition;
  notes: string;
}

function JudgmentTargets({ runs, onSaved }: { runs: Array<{ tier: Rank; result: TierResult }>; onSaved: () => void }) {
  const [selectedRunId, setSelectedRunId] = useState<string>(runs[runs.length - 1].result.runId);
  return (
    <AdminCard className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text)' }}>Judgment</h2>
        <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Target tier:</span>
        <select
          value={selectedRunId}
          onChange={(e) => setSelectedRunId(e.target.value)}
          className="px-2 py-1 text-xs"
          style={CONTROL_STYLE}
        >
          {runs.map((r) => <option key={r.result.runId} value={r.result.runId}>{r.tier}</option>)}
        </select>
      </div>
      <JudgmentForm key={selectedRunId} runId={selectedRunId} onSaved={onSaved} />
    </AdminCard>
  );
}

function JudgmentForm({ runId, onSaved }: { runId: string; onSaved: () => void }) {
  const [j, setJ] = useState<JudgmentInput>({ disposition: 'keep_success', notes: '' });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
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
      const { error: err } = await supabase.from('prompt_test_judgments').insert({
        run_id: runId,
        reviewer_user_id: uid,
        overall_rating: j.overall_rating ?? null,
        archetype_fidelity: j.archetype_fidelity ?? null,
        prompt_to_image: j.prompt_to_image ?? null,
        identity_continuity: j.identity_continuity ?? null,
        anatomy_artifacts: j.anatomy_artifacts ?? null,
        disposition: j.disposition,
        notes: j.notes || null,
      });
      if (err) throw err;
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (saved) return <div className="text-xs" style={{ color: 'var(--admin-success)' }}>Judgment saved.</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <RatingField label="Overall"            value={j.overall_rating}       onChange={(v) => setJ({ ...j, overall_rating: v })} />
        <RatingField label="Archetype fidelity" value={j.archetype_fidelity}   onChange={(v) => setJ({ ...j, archetype_fidelity: v })} />
        <RatingField label="Prompt → image"     value={j.prompt_to_image}      onChange={(v) => setJ({ ...j, prompt_to_image: v })} />
        <RatingField label="Identity continuity" value={j.identity_continuity} onChange={(v) => setJ({ ...j, identity_continuity: v })} />
        <RatingField label="Anatomy / artifacts" value={j.anatomy_artifacts}   onChange={(v) => setJ({ ...j, anatomy_artifacts: v })} />
      </div>
      <label className="block">
        <span className={FIELD_LABEL_CLASS} style={{ color: 'var(--admin-text-muted)' }}>Disposition</span>
        <select
          value={j.disposition}
          onChange={(e) => setJ({ ...j, disposition: e.target.value as Disposition })}
          className={CONTROL_CLASS}
          style={CONTROL_STYLE}
        >
          {DISPOSITIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className={FIELD_LABEL_CLASS} style={{ color: 'var(--admin-text-muted)' }}>Notes</span>
        <textarea
          value={j.notes}
          onChange={(e) => setJ({ ...j, notes: e.target.value })}
          rows={3}
          className="w-full px-2 py-1.5 text-sm resize-y"
          style={CONTROL_STYLE}
        />
      </label>
      {error && <div className="text-xs" style={{ color: 'var(--admin-danger)' }}>{error}</div>}
      <AdminButton variant="primary" onClick={submit} disabled={busy}>
        {busy ? 'Saving…' : 'Submit judgment'}
      </AdminButton>
    </div>
  );
}

function RatingField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <label className="block">
      <span className={FIELD_LABEL_CLASS} style={{ color: 'var(--admin-text-muted)' }}>{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(active ? undefined : n)}
              className="w-6 h-6 rounded text-[10px] font-bold"
              style={{
                background: active ? 'var(--admin-accent)' : 'var(--admin-surface-strong)',
                color: active ? '#fff' : 'var(--admin-text-muted)',
                border: `1px solid ${active ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </label>
  );
}

// ---- Server calls -----------------------------------------------------

async function signedUrl(path: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  try {
    const r = await fetch(`/api/prompt-lab-signed-url?path=${encodeURIComponent(path)}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const body = (await r.json()) as { url?: string };
    return body.url ?? null;
  } catch {
    return null;
  }
}

// ---- Card synthesis ---------------------------------------------------

function synthesizeCard(archetype: ArchetypeName, result: TierResult): Card {
  const shell = buildCardShell(archetype, result.stats);
  return {
    ...shell,
    cardName: result.cardName ?? '(no name)',
    nameAndTitle: result.nameAndTitle ?? '',
    lore: result.lore ?? '',
    portraitAsset: result.imageDataUrl,
    hiddenFate: result.hiddenFate,
  };
}

function synthesizeCardFromRun(run: RunSummary, portraitUrl: string | null): Card | null {
  const archetype = run.input_snapshot?.archetype;
  const stats = run.input_snapshot?.stats;
  if (!archetype || !stats) return null;
  const shell = buildCardShell(archetype, stats);
  return {
    ...shell,
    cardName: run.claude_response?.cardName ?? '(no name)',
    nameAndTitle: run.claude_response?.nameAndTitle ?? '',
    lore: run.claude_response?.lore ?? '',
    portraitAsset: portraitUrl ?? '',
    hiddenFate: run.claude_response?.hiddenFate,
  };
}

