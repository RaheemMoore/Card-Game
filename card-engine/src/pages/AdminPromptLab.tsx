import { useCallback, useEffect, useState } from 'react';
import { ARCHETYPE_NAMES, type ArchetypeName, type CardStats, type Rank } from '../types/card';
import { ELEMENT_NAMES, type ElementName, type ElementSelection, type HiddenFate, type StoryPillarAnswers } from '../types/bible';
import { getQuestionsForArchetype, sampleOptions } from '../data/storyPillars';
import { generateCardTextWithRetry } from '../services/claudeApi';

type GeneratedText = Awaited<ReturnType<typeof generateCardTextWithRetry>>;
import { generatePortraitStrict } from '../services/leonardoApi';
import { getSupabaseClient } from '../services/persistence/supabaseClient';
import { API_COST_CATALOG } from '../data/economy/apiCostCatalog';

// Phase 6a Prompt Lab. Runs a full Foundation → Forged → Ascendant
// chain against the same production services production forge uses.
// Each tier is its own prompt_test_runs row linked back via parent_run_id
// so the identity-continuity comparison stays queryable forever.

const TIERS: readonly Rank[] = ['Foundation', 'Forged', 'Ascendant'];

const DISPOSITIONS = [
  { value: 'keep_success', label: 'Keep as successful evidence' },
  { value: 'regenerate_same_prompt', label: 'Regenerate with same prompt' },
  { value: 'archetype_prompt_change_candidate', label: 'Archetype prompt change candidate' },
  { value: 'global_prompt_change_candidate', label: 'Global prompt change candidate' },
  { value: 'model_settings_investigation', label: 'Model/settings investigation' },
  { value: 'reject_unusable', label: 'Reject as unusable' },
] as const;
type Disposition = typeof DISPOSITIONS[number]['value'];

interface TierResult {
  runId: string;
  imageDataUrl: string;
  cardName?: string;
  nameAndTitle?: string;
  portraitPrompt: string;
  negativePrompt: string;
  lore?: string;
  hiddenFate?: HiddenFate;
  raw: GeneratedText;
}

type TierSlot =
  | { phase: 'idle' }
  | { phase: 'confirming' }
  | { phase: 'running'; step: string }
  | { phase: 'error'; message: string }
  | { phase: 'done'; result: TierResult };

interface BatchListEntry {
  id: string;
  archetype: string;
  intent: string | null;
  status: string;
  created_at: string;
  run_count: number;
}

export function AdminPromptLab() {
  const [archetype, setArchetype] = useState<ArchetypeName>(ARCHETYPE_NAMES[0]);
  const [element, setElement] = useState<ElementName>(ELEMENT_NAMES[0]);
  const [intent, setIntent] = useState('');
  const [batchId, setBatchId] = useState<string | null>(null);
  // Shared session inputs stay stable across tiers so identity continuity works.
  const [answers, setAnswers] = useState<StoryPillarAnswers | null>(null);
  const [elementSelection, setElementSelection] = useState<ElementSelection | null>(null);
  const [foundation, setFoundation] = useState<TierSlot>({ phase: 'idle' });
  const [forged, setForged] = useState<TierSlot>({ phase: 'idle' });
  const [ascendant, setAscendant] = useState<TierSlot>({ phase: 'idle' });
  const [batches, setBatches] = useState<BatchListEntry[] | null>(null);

  const refreshBatches = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('prompt_test_batches')
      .select('id, archetype, intent, status, created_at, prompt_test_runs(count)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (!data) return;
    const rows = (data as unknown as Array<BatchListEntry & { prompt_test_runs?: Array<{ count: number }> }>).map((r) => ({
      id: r.id,
      archetype: r.archetype,
      intent: r.intent,
      status: r.status,
      created_at: r.created_at,
      run_count: r.prompt_test_runs?.[0]?.count ?? 0,
    }));
    setBatches(rows);
  }, []);

  useEffect(() => {
    void refreshBatches();
  }, [refreshBatches]);

  const estimated = API_COST_CATALOG.forge_card.estimatedDirectCostUsd;

  const resetChain = () => {
    setBatchId(null);
    setAnswers(null);
    setElementSelection(null);
    setFoundation({ phase: 'idle' });
    setForged({ phase: 'idle' });
    setAscendant({ phase: 'idle' });
  };

  async function runTier(
    tier: Rank,
    setter: (s: TierSlot) => void,
    priorTier?: TierResult,
    priorRunId?: string,
  ) {
    try {
      setter({ phase: 'running', step: 'Generating Claude text…' });
      const _answers = answers ?? makeAnswers(archetype);
      if (!answers) setAnswers(_answers);
      const _element: ElementSelection = elementSelection ?? {
        element,
        bond: 'It is my inheritance.',
        compatibility: 'compatible_through_reinterpretation',
      };
      if (!elementSelection) setElementSelection(_element);
      const stats = makeTierStats(archetype, tier);
      const startedAt = Date.now();

      const claudeResult = await generateCardTextWithRetry({
        archetype,
        stats,
        answers: _answers,
        element: _element,
        existingName: priorTier?.cardName,
        existingHiddenFate: priorTier?.hiddenFate,
      });

      setter({ phase: 'running', step: 'Generating Leonardo portrait…' });
      const { dataUrl } = await generatePortraitStrict(
        claudeResult.portraitPrompt,
        claudeResult.negativePrompt ?? '',
      );
      const durationMs = Date.now() - startedAt;

      setter({ phase: 'running', step: 'Persisting run…' });
      const persisted = await postRecord({
        batchId,
        archetype,
        tier,
        status: 'success',
        parentRunId: priorRunId ?? null,
        inputSnapshot: {
          archetype,
          element: _element,
          answers: _answers,
          stats,
          intent: intent || null,
          priorTierName: priorTier?.cardName ?? null,
        },
        claudeModel: 'claude-haiku-4-5-20251001',
        claudePrompt: '(reconstructed inline; see claude_response for output shape)',
        claudeResponse: claudeResult as unknown as Record<string, unknown>,
        leonardoPrompt: claudeResult.portraitPrompt,
        leonardoNegativePrompt: claudeResult.negativePrompt ?? '',
        imageDataUrl: dataUrl,
        durationMs,
        ensureBatch: intent ? { intent } : undefined,
      });
      if (!batchId) setBatchId(persisted.batchId);

      setter({
        phase: 'done',
        result: {
          runId: persisted.runId,
          imageDataUrl: dataUrl,
          cardName: claudeResult.cardName,
          nameAndTitle: claudeResult.nameAndTitle,
          portraitPrompt: claudeResult.portraitPrompt,
          negativePrompt: claudeResult.negativePrompt ?? '',
          lore: claudeResult.lore,
          hiddenFate: claudeResult.hiddenFate,
          raw: claudeResult,
        },
      });
      void refreshBatches();
    } catch (err) {
      setter({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  const runFoundation = () => void runTier('Foundation', setFoundation);
  const runForged = () => {
    if (foundation.phase !== 'done') return;
    void runTier('Forged', setForged, foundation.result, foundation.result.runId);
  };
  const runAscendant = () => {
    if (forged.phase !== 'done') return;
    void runTier('Ascendant', setAscendant, forged.result, forged.result.runId);
  };

  const chainStarted = foundation.phase !== 'idle';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-fantasy text-sm uppercase tracking-wider text-bone/80 mb-2">
          Prompt Lab — tier chain
        </h2>
        <p className="text-xs text-bone/60 max-w-2xl">
          Runs Foundation → Forged → Ascendant against the same shared Claude + Leonardo
          services production forge uses. Each tier stores full provenance and is linked
          back to its parent so identity-continuity comparison stays queryable.
        </p>
      </div>

      <section className="rounded-lg border border-bone/15 bg-void/40 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Archetype</span>
            <select
              disabled={chainStarted}
              value={archetype}
              onChange={(e) => setArchetype(e.target.value as ArchetypeName)}
              className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm disabled:opacity-50"
            >
              {ARCHETYPE_NAMES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Element</span>
            <select
              disabled={chainStarted}
              value={element}
              onChange={(e) => setElement(e.target.value as ElementName)}
              className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm disabled:opacity-50"
            >
              {ELEMENT_NAMES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Intent (optional)</span>
            <input
              type="text"
              disabled={chainStarted}
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. ember-leak regression"
              className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm disabled:opacity-50"
            />
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
          slot={foundation}
          onRun={runFoundation}
          setSlot={setFoundation}
          estimatedCostUsd={estimated}
          available
        />
        <TierColumn
          tier="Forged"
          slot={forged}
          onRun={runForged}
          setSlot={setForged}
          estimatedCostUsd={estimated}
          available={foundation.phase === 'done'}
        />
        <TierColumn
          tier="Ascendant"
          slot={ascendant}
          onRun={runAscendant}
          setSlot={setAscendant}
          estimatedCostUsd={estimated}
          available={forged.phase === 'done'}
        />
      </section>

      {(foundation.phase === 'done' || forged.phase === 'done' || ascendant.phase === 'done') && (
        <JudgmentTargets
          runs={[foundation, forged, ascendant]
            .map((s, i) => (s.phase === 'done' ? { tier: TIERS[i], result: s.result } : null))
            .filter((x): x is { tier: Rank; result: TierResult } => x !== null)}
          onSaved={refreshBatches}
        />
      )}

      <section>
        <h2 className="font-fantasy text-sm uppercase tracking-wider text-bone/80 mb-2">
          Recent batches
        </h2>
        {!batches && <div className="text-xs text-bone/60">Loading…</div>}
        {batches && batches.length === 0 && <div className="text-xs text-bone/60 italic">No test batches yet.</div>}
        {batches && batches.length > 0 && (
          <div className="overflow-x-auto rounded border border-bone/15">
            <table className="w-full text-xs text-bone/90">
              <thead className="bg-void/60 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-2 py-1">Archetype</th>
                  <th className="text-left px-2 py-1">Intent</th>
                  <th className="text-right px-2 py-1">Runs</th>
                  <th className="text-left px-2 py-1">Status</th>
                  <th className="text-left px-2 py-1">Created</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t border-bone/10">
                    <td className="px-2 py-1">{b.archetype}</td>
                    <td className="px-2 py-1 text-bone/70">{b.intent ?? <span className="italic text-bone/40">—</span>}</td>
                    <td className="px-2 py-1 text-right">{b.run_count}</td>
                    <td className="px-2 py-1">{b.status}</td>
                    <td className="px-2 py-1 text-bone/60">{new Date(b.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function TierColumn(props: {
  tier: Rank;
  slot: TierSlot;
  setSlot: (s: TierSlot) => void;
  onRun: () => void;
  estimatedCostUsd: number;
  available: boolean;
}) {
  const { tier, slot, setSlot, onRun, estimatedCostUsd, available } = props;
  return (
    <div className="rounded-lg border border-bone/15 bg-void/40 p-4 min-h-[420px] flex flex-col">
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
            <div className="text-xs text-bone/40 text-center">
              Complete the prior tier first.
            </div>
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
          <img src={slot.result.imageDataUrl} alt={`${tier} portrait`} className="w-full rounded border border-bone/15" />
          <div className="text-xs">
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

// ---- Judgment ---------------------------------------------------------

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
  const [j, setJ] = useState<JudgmentInput>({
    disposition: 'keep_success',
    notes: '',
  });
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

  if (saved) {
    return <div className="text-xs" style={{ color: '#c9f9d9' }}>Judgment saved.</div>;
  }
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

// ---- Helpers ----------------------------------------------------------

interface PostPayload {
  batchId: string | null;
  archetype: ArchetypeName;
  tier: Rank;
  status: 'success';
  parentRunId: string | null;
  inputSnapshot: Record<string, unknown>;
  claudeModel: string;
  claudePrompt: string;
  claudeResponse: Record<string, unknown>;
  leonardoPrompt: string;
  leonardoNegativePrompt: string;
  imageDataUrl: string;
  durationMs: number;
  ensureBatch?: { intent?: string };
}

async function postRecord(payload: PostPayload): Promise<{ batchId: string; runId: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No Supabase session');
  const r = await fetch('/api/prompt-lab-record', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      run: {
        batchId: payload.batchId ?? undefined,
        parentRunId: payload.parentRunId ?? undefined,
        archetype: payload.archetype,
        tier: payload.tier,
        status: payload.status,
        inputSnapshot: payload.inputSnapshot,
        claudeModel: payload.claudeModel,
        claudePrompt: payload.claudePrompt,
        claudeResponse: payload.claudeResponse,
        leonardoPrompt: payload.leonardoPrompt,
        leonardoNegativePrompt: payload.leonardoNegativePrompt,
        imageDataUrl: payload.imageDataUrl,
        durationMs: payload.durationMs,
      },
      ensureBatch: payload.ensureBatch,
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Record failed (${r.status}): ${txt}`);
  }
  return (await r.json()) as { batchId: string; runId: string };
}

function makeAnswers(archetype: ArchetypeName): StoryPillarAnswers {
  const qs = getQuestionsForArchetype(archetype);
  const answers = qs.map((q) => {
    const opts = sampleOptions(archetype, q.id, 1);
    const chosen = opts[0];
    return {
      questionId: q.id,
      optionId: chosen?.id ?? `${q.id}_seed`,
      answer: chosen?.text ?? '(no seed available)',
    };
  });
  return { answers };
}

function makeTierStats(archetype: ArchetypeName, tier: Rank): CardStats {
  const bumps: Record<Rank, number> = { Foundation: 0, Forged: 16, Ascendant: 30 };
  const bump = bumps[tier];
  const isTech = archetype === 'Mech Pilot' || archetype === 'Android';
  const resource = isTech
    ? { Tech: { value: 55 + bump, bias: 'Mid' as const, hardCap: 85 } }
    : { Mana: { value: 55 + bump, bias: 'Mid' as const, hardCap: 85 } };
  return {
    Atk: { value: 60 + bump, bias: 'Mid-High' as const, hardCap: 90 },
    Def: { value: 45 + bump, bias: 'Mid' as const, hardCap: 85 },
    ...resource,
  };
}
