import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ARCHETYPE_NAMES, type ArchetypeName, type Card, type CardStats, type Rank } from '../types/card';
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
import { AdminPageDescription } from '../components/admin/AdminPageDescription';
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

const TIERS: readonly Rank[] = ['Foundation', 'Forged', 'Ascendant'];

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

// ---- Component --------------------------------------------------------

export function AdminPromptLab() {
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
    <div className="space-y-6">
      <AdminPageDescription
        title="Prompt Lab — Foundation → Forged → Ascendant tier tester"
        body={
          'Runs the same shared Claude + Leonardo services production forge uses. Every input, prompt, response, cost, and image is persisted so a reviewer can reproduce a test months later without console logs.\n\n' +
          '• Story pillar answers auto-sample on archetype change and are editable inline.\n' +
          '• Element dropdown is filtered to what the archetype actually allows given those answers, grouped by bucket. "Roll like a player" uses the same rollElement() the real forge does.\n' +
          '• Each tier column renders the resulting card with the production CardRenderer so what you see is what the player will see.\n' +
          '• Judgment form scores any of the three tiers on 5 axes with a required disposition. Actionable dispositions surface as a "⚑ review" pill on the session card and count into the Overview pending banner.\n' +
          '• Session cards below the tier columns replace the old batch log. Click one to open the right-side drawer with all three tiers, prompt provenance, and a "Propose change" mini-form per tier that pins the runId to the proposal for later review.'
        }
      />

      <section className="rounded-lg border border-bone/15 bg-void/40 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Archetype</span>
            <select
              disabled={chainStarted}
              value={archetype}
              onChange={(e) => onArchetypeChange(e.target.value as ArchetypeName)}
              className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm disabled:opacity-50"
            >
              {ARCHETYPE_NAMES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Intent (optional)</span>
            <input
              type="text"
              disabled={chainStarted}
              value={intent}
              onChange={(e) => lab.setIntent(e.target.value)}
              placeholder="e.g. ember-leak regression"
              className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm disabled:opacity-50"
            />
          </label>
        </div>

        {/* Story pillar answers — eager + editable */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-bone/60 mb-2">Story pillar answers</div>
          <div className="space-y-2">
            {answers.answers.map((a) => {
              const opts = getOptionsForQuestion(archetype, a.questionId);
              const q = getQuestionsForArchetype(archetype).find((qq) => qq.id === a.questionId);
              return (
                <label key={a.questionId} className="block">
                  <span className="block text-[10px] text-bone/50 mb-0.5">{q?.prompt ?? a.questionId}</span>
                  <select
                    disabled={chainStarted}
                    value={a.optionId}
                    onChange={(e) => onAnswerChange(a.questionId, e.target.value)}
                    className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-xs disabled:opacity-50"
                  >
                    {opts.map((o) => <option key={o.id} value={o.id}>{o.text}</option>)}
                  </select>
                </label>
              );
            })}
          </div>
        </div>

        {/* Element (filtered + bucketed) + bond */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">
              Element ({eligibleElements.length} eligible)
            </span>
            <div className="flex gap-2">
              <select
                disabled={chainStarted}
                value={element}
                onChange={(e) => lab.setElement(e.target.value as ElementName)}
                className="flex-1 px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm disabled:opacity-50"
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
              <button
                onClick={rollLikeAPlayer}
                disabled={chainStarted}
                className="px-3 py-1 rounded text-xs font-fantasy border border-bone/20 text-bone/80 hover:text-bone hover:border-bone/40 disabled:opacity-40"
                title="Uses the same rollElement() the real forge does"
              >
                Roll like a player
              </button>
            </div>
            <div className="text-[10px] text-bone/50 mt-1">
              Current bucket: {BUCKET_LABEL[bucketFor(archetype, element)]}
            </div>
          </div>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Bond</span>
            <select
              disabled={chainStarted}
              value={bond}
              onChange={(e) => lab.setBond(e.target.value as ElementBond)}
              className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm disabled:opacity-50"
            >
              {ELEMENT_BONDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
        </div>

        {chainStarted && (
          <div className="flex justify-end">
            <button
              onClick={resetChain}
              className="text-xs text-bone/60 hover:text-bone underline"
            >
              Reset chain
            </button>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
          <h2 className="font-fantasy text-sm uppercase tracking-wider text-bone/80">Sessions</h2>
          <label className="flex items-center gap-2 text-xs text-bone/70 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
        </div>

        {sessions === null && <div className="text-xs text-bone/60">Loading…</div>}
        {sessions && sessions.length === 0 && (
          <div className="text-xs text-bone/60 italic">No {showArchived ? '' : 'active '}test sessions yet.</div>
        )}
        {sessions && sessions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} onOpen={() => setSelectedBatchId(s.id)} />
            ))}
          </div>
        )}
      </section>

      <SessionPanel
        session={selectedSession}
        open={Boolean(selectedSession)}
        onClose={() => setSelectedBatchId(null)}
        onMarkComplete={() => selectedSession && setBatchStatus(selectedSession.id, 'complete')}
        onCancel={() => selectedSession && setBatchStatus(selectedSession.id, 'cancelled')}
      />

      {zoomCard && <CardZoom card={zoomCard} onClose={() => setZoomCard(null)} />}
    </div>
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
    <div className="rounded-lg border border-bone/15 bg-void/40 p-4 min-h-[600px] flex flex-col">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-fantasy text-sm text-bone">{tier}</h3>
        <StatusBadge slot={slot} />
      </div>

      {slot.phase === 'idle' && (
        <div className="flex-1 flex items-center justify-center">
          {available ? (
            <button
              onClick={() => setSlot({ phase: 'confirming' })}
              className="px-3 py-2 rounded font-fantasy font-bold text-sm bg-gold/80 text-void hover:bg-gold"
            >
              Run {tier}
            </button>
          ) : (
            <div className="text-xs text-bone/40 text-center">Complete the prior tier first.</div>
          )}
        </div>
      )}
      {slot.phase === 'confirming' && (
        <div className="flex-1 flex flex-col justify-center gap-2 text-center">
          <div className="text-xs text-bone/80">
            Fires 1 Claude + 1 Leonardo call ~ ${estimatedCostUsd.toFixed(3)}. Continue?
          </div>
          <div className="flex justify-center gap-2">
            <button onClick={onRun} className="px-3 py-1 rounded text-xs font-fantasy font-bold bg-gold/80 text-void">
              Confirm
            </button>
            <button onClick={() => setSlot({ phase: 'idle' })} className="px-3 py-1 rounded text-xs font-fantasy border border-bone/20 text-bone/70">
              Cancel
            </button>
          </div>
        </div>
      )}
      {slot.phase === 'running' && (
        <div className="flex-1 flex items-center justify-center text-xs text-bone/70 italic">
          {slot.step}
        </div>
      )}
      {slot.phase === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-xs">
          <span style={{ color: '#f9c9c9' }}>{slot.message}</span>
          <button onClick={() => setSlot({ phase: 'idle' })} className="px-3 py-1 rounded text-xs font-fantasy border border-bone/20 text-bone/70">
            Reset {tier}
          </button>
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
            <div className="font-fantasy font-bold text-bone">{slot.result.cardName ?? '(no name)'}</div>
            <div className="italic text-bone/70">{slot.result.nameAndTitle ?? ''}</div>
          </div>
          <details className="text-[11px]">
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-bone/60">Prompt</summary>
            <pre className="whitespace-pre-wrap bg-black/40 p-2 rounded text-bone/80 max-h-32 overflow-y-auto mt-1">
              {slot.result.portraitPrompt}
            </pre>
          </details>
          <details className="text-[11px]">
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-bone/60">Negative</summary>
            <pre className="whitespace-pre-wrap bg-black/40 p-2 rounded text-bone/80 max-h-24 overflow-y-auto mt-1">
              {slot.result.negativePrompt}
            </pre>
          </details>
          <details className="text-[11px]">
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-bone/60">Full response</summary>
            <pre className="whitespace-pre-wrap bg-black/40 p-2 rounded text-bone/70 max-h-40 overflow-y-auto mt-1 text-[10px]">
              {JSON.stringify(slot.result.raw, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ slot }: { slot: TierSlot }) {
  const cfg = {
    idle: { label: 'idle', bg: 'rgba(155,182,179,0.1)', color: '#d6f2ec' },
    confirming: { label: 'confirm?', bg: 'rgba(184,134,11,0.2)', color: '#f4d78a' },
    running: { label: 'running', bg: 'rgba(184,134,11,0.2)', color: '#f4d78a' },
    error: { label: 'error', bg: 'rgba(220,38,38,0.2)', color: '#f9c9c9' },
    done: { label: 'done', bg: 'rgba(155,182,179,0.25)', color: '#c9f9d9' },
  }[slot.phase];
  return (
    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
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
      className="text-left rounded-lg border border-bone/15 bg-void/40 p-3 hover:bg-bone/5 transition-colors"
    >
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <div className="font-fantasy text-sm font-bold text-bone truncate">{session.archetype}</div>
        <div className="flex items-center gap-1 shrink-0">
          {session.hasActionableJudgment && (
            <span
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(184,134,11,0.2)', color: '#f4d78a' }}
              title="At least one run has a judgment flagged for action"
            >
              ⚑ review
            </span>
          )}
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: statusBg(session.status), color: statusColor(session.status) }}>
            {session.status}
          </span>
        </div>
      </div>
      <div className="text-xs text-bone/70 truncate mb-2 min-h-[1em]">
        {session.intent ?? <span className="italic text-bone/40">no intent</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {TIERS.map((tier) => {
          const run = session.runs.find((r) => r.tier === tier);
          const url = run ? tierUrls[run.id] : null;
          return (
            <div key={tier} className="aspect-[3/4] rounded overflow-hidden bg-void/60 flex items-center justify-center">
              {run && url ? (
                <div
                  className="w-full h-full bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${url}")` }}
                />
              ) : run ? (
                <div className="text-[9px] text-bone/40 text-center px-1">
                  {run.status === 'image_expired' ? 'expired' : run.tier}
                </div>
              ) : (
                <div className="text-[9px] text-bone/30">—</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-bone/50">
        <span>{session.runs.length}/3 tiers</span>
        <span>{new Date(session.created_at).toLocaleDateString()}</span>
      </div>
    </button>
  );
}

function statusBg(s: SessionSummary['status']): string {
  return s === 'active' ? 'rgba(155,182,179,0.2)' : s === 'complete' ? 'rgba(20,120,60,0.2)' : 'rgba(220,38,38,0.15)';
}
function statusColor(s: SessionSummary['status']): string {
  return s === 'active' ? '#d6f2ec' : s === 'complete' ? '#c9f9d9' : '#f9c9c9';
}

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
      <button
        onClick={onCancel}
        className="px-3 py-1.5 rounded text-xs font-fantasy border border-bone/20 text-bone/70 hover:text-bone"
      >
        Cancel batch
      </button>
      <button
        onClick={onMarkComplete}
        className="px-3 py-1.5 rounded text-xs font-fantasy font-bold bg-gold/80 text-void"
      >
        Mark complete
      </button>
    </>
  ) : (
    <div className="text-xs text-bone/60 italic">Archived ({session.status})</div>
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
        <div className="text-[10px] uppercase tracking-wider text-bone/60">
          {session.runs.length}/3 tiers · created {new Date(session.created_at).toLocaleString()}
        </div>

        {TIERS.map((tier) => {
          const run = session.runs.find((r) => r.tier === tier);
          if (!run) {
            return (
              <div key={tier} className="rounded border border-dashed border-bone/20 p-4 text-center text-xs text-bone/50">
                {tier} — not run yet
              </div>
            );
          }
          const card = synthesizeCardFromRun(run, runUrls[run.id] ?? null);
          return (
            <div key={run.id} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="font-fantasy text-sm text-bone">{tier}</span>
                <StatusBadgeRaw status={run.status} />
              </div>
              {card ? (
                <div className="flex justify-center">
                  <CardRenderer size="thumbnail" card={card} />
                </div>
              ) : (
                <div className="rounded border border-bone/15 p-4 text-center text-xs text-bone/50">
                  {run.status === 'image_expired' ? 'Image expired (retention policy)' : 'Not enough data to render'}
                </div>
              )}
              <details className="text-[11px]">
                <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-bone/60">Portrait prompt</summary>
                <pre className="whitespace-pre-wrap bg-black/40 p-2 rounded text-bone/80 max-h-40 overflow-y-auto mt-1">
                  {run.claude_response?.portraitPrompt ?? '(missing)'}
                </pre>
              </details>
              <details className="text-[11px]">
                <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-bone/60">Negative</summary>
                <pre className="whitespace-pre-wrap bg-black/40 p-2 rounded text-bone/80 max-h-32 overflow-y-auto mt-1">
                  {run.claude_response?.negativePrompt ?? '(missing)'}
                </pre>
              </details>
              <ProposeFromTier archetype={session.archetype} tier={tier} runId={run.id} />
            </div>
          );
        })}
      </div>
    </AdminPreviewPanel>
  );
}

function ProposeFromTier({ archetype, tier }: { archetype: ArchetypeName; tier: Rank; runId: string }) {
  // The old inline form (prompt_change_proposals + evidence_run_ids +
  // Raheem-only global scope + state machine) was retired 2026-07-20 in
  // favor of the Archetype Workshop's layered proposal model. This link
  // deep-links into the workshop with the archetype pre-selected.
  return (
    <div className="rounded border border-bone/15 bg-void/30 mt-2">
      <Link
        to={`/admin/workshop?archetype=${encodeURIComponent(archetype)}`}
        className="block px-3 py-2 text-[10px] uppercase tracking-wider text-bone/70 hover:text-bone text-center"
      >
        File a change in Archetype Workshop → {archetype} / {tier}
      </Link>
    </div>
  );
}

function StatusBadgeRaw({ status }: { status: RunSummary['status'] }) {
  const cfg = {
    running: { label: 'running', bg: 'rgba(184,134,11,0.2)', color: '#f4d78a' },
    success: { label: 'done', bg: 'rgba(155,182,179,0.25)', color: '#c9f9d9' },
    error: { label: 'error', bg: 'rgba(220,38,38,0.2)', color: '#f9c9c9' },
    image_expired: { label: 'expired', bg: 'rgba(155,182,179,0.15)', color: '#d6f2ec' },
  }[status];
  return (
    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
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
    <section className="rounded-lg border border-bone/15 bg-void/40 p-4 space-y-3">
      <div className="flex items-baseline gap-3">
        <h2 className="font-fantasy text-sm uppercase tracking-wider text-bone/80">Judgment</h2>
        <span className="text-xs text-bone/60">Target tier:</span>
        <select
          value={selectedRunId}
          onChange={(e) => setSelectedRunId(e.target.value)}
          className="px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-xs"
        >
          {runs.map((r) => <option key={r.result.runId} value={r.result.runId}>{r.tier}</option>)}
        </select>
      </div>
      <JudgmentForm key={selectedRunId} runId={selectedRunId} onSaved={onSaved} />
    </section>
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

  if (saved) return <div className="text-xs" style={{ color: '#c9f9d9' }}>Judgment saved.</div>;

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
        <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Disposition</span>
        <select
          value={j.disposition}
          onChange={(e) => setJ({ ...j, disposition: e.target.value as Disposition })}
          className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm"
        >
          {DISPOSITIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Notes</span>
        <textarea
          value={j.notes}
          onChange={(e) => setJ({ ...j, notes: e.target.value })}
          rows={3}
          className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm"
        />
      </label>
      {error && <div className="text-xs" style={{ color: '#f9c9c9' }}>{error}</div>}
      <button
        onClick={submit}
        disabled={busy}
        className="px-4 py-2 rounded font-fantasy font-bold text-sm bg-gold/80 text-void disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Submit judgment'}
      </button>
    </div>
  );
}

function RatingField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? undefined : n)}
            className={`w-6 h-6 rounded text-[10px] font-bold border ${
              value === n ? 'bg-gold/80 text-void border-gold' : 'bg-void/60 text-bone/70 border-bone/20'
            }`}
          >
            {n}
          </button>
        ))}
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
  const shell = buildCardShell(archetype, result.stats, []);
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
  const shell = buildCardShell(archetype, stats, []);
  return {
    ...shell,
    cardName: run.claude_response?.cardName ?? '(no name)',
    nameAndTitle: run.claude_response?.nameAndTitle ?? '',
    lore: run.claude_response?.lore ?? '',
    portraitAsset: portraitUrl ?? '',
    hiddenFate: run.claude_response?.hiddenFate,
  };
}

