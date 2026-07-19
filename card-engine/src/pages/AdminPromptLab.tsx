import { useCallback, useEffect, useState } from 'react';
import { ARCHETYPE_NAMES, type ArchetypeName, type CardStats } from '../types/card';
import { ELEMENT_NAMES, type ElementName, type ElementSelection, type StoryPillarAnswers } from '../types/bible';
import { getQuestionsForArchetype, sampleOptions } from '../data/storyPillars';
import { generateCardTextWithRetry } from '../services/claudeApi';
import { generatePortraitStrict } from '../services/leonardoApi';
import { getSupabaseClient } from '../services/persistence/supabaseClient';
import { API_COST_CATALOG } from '../data/economy/apiCostCatalog';

// Phase-5 Prompt Lab MVP. Reuses the same generateCardTextWithRetry +
// generatePortraitStrict services production forge uses — do NOT copy
// prompt logic here (plan §7). Client fires the pipeline, packages the
// exact provenance, and POSTs to /api/prompt-lab-record which uploads
// the image and persists a prompt_test_runs row.

const DISPOSITIONS = [
  { value: 'keep_success', label: 'Keep as successful evidence' },
  { value: 'regenerate_same_prompt', label: 'Regenerate with same prompt' },
  { value: 'archetype_prompt_change_candidate', label: 'Archetype prompt change candidate' },
  { value: 'global_prompt_change_candidate', label: 'Global prompt change candidate' },
  { value: 'model_settings_investigation', label: 'Model/settings investigation' },
  { value: 'reject_unusable', label: 'Reject as unusable' },
] as const;
type Disposition = typeof DISPOSITIONS[number]['value'];

type RunState =
  | { phase: 'idle' }
  | { phase: 'confirming' }
  | { phase: 'running'; step: string }
  | { phase: 'error'; message: string }
  | { phase: 'done'; runId: string; batchId: string; imageDataUrl: string; result: CompletedRun };

interface CompletedRun {
  claudePrompt: string;
  claudeResponse: unknown;
  portraitPrompt: string;
  negativePrompt: string;
  cardName?: string;
  nameAndTitle?: string;
  lore?: string;
}

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
  const [run, setRun] = useState<RunState>({ phase: 'idle' });
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

  // Cost preview — Foundation forge = 1 Claude call + 1 Leonardo call.
  const estimated = API_COST_CATALOG.forge_card.estimatedDirectCostUsd;

  async function runFoundation() {
    try {
      setRun({ phase: 'running', step: 'Generating Claude text…' });
      const answers = makeAnswers(archetype);
      const elementSelection: ElementSelection = {
        element,
        bond: 'It is my inheritance.',
        compatibility: 'compatible_through_reinterpretation',
      };
      const stats = makeFoundationStats(archetype);
      const startedAt = Date.now();

      const claudeResult = await generateCardTextWithRetry({
        archetype,
        stats,
        answers,
        element: elementSelection,
      });

      setRun({ phase: 'running', step: 'Generating Leonardo portrait…' });
      const { dataUrl } = await generatePortraitStrict(
        claudeResult.portraitPrompt,
        claudeResult.negativePrompt ?? '',
      );

      const durationMs = Date.now() - startedAt;

      setRun({ phase: 'running', step: 'Persisting run…' });
      const persisted = await postRecord({
        archetype,
        tier: 'Foundation',
        status: 'success',
        inputSnapshot: {
          archetype,
          element: elementSelection,
          answers,
          stats,
          intent: intent || null,
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

      setRun({
        phase: 'done',
        runId: persisted.runId,
        batchId: persisted.batchId,
        imageDataUrl: dataUrl,
        result: {
          claudePrompt: '(see claude_response)',
          claudeResponse: claudeResult,
          portraitPrompt: claudeResult.portraitPrompt,
          negativePrompt: claudeResult.negativePrompt ?? '',
          cardName: claudeResult.cardName,
          nameAndTitle: claudeResult.nameAndTitle,
          lore: claudeResult.lore,
        },
      });
      void refreshBatches();
    } catch (err) {
      setRun({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-fantasy text-sm uppercase tracking-wider text-bone/80 mb-2">
          Prompt Lab — Foundation MVP
        </h2>
        <p className="text-xs text-bone/60 max-w-2xl">
          Runs the same shared Claude + Leonardo production services production forge uses.
          Every input, prompt, response, cost, and image is persisted to <code>prompt_test_runs</code>.
          Full tier chains and comparison canvas land in Phase 6.
        </p>
      </div>

      <section className="rounded-lg border border-bone/15 bg-void/40 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Archetype</span>
            <select
              value={archetype}
              onChange={(e) => setArchetype(e.target.value as ArchetypeName)}
              className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm"
            >
              {ARCHETYPE_NAMES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Element</span>
            <select
              value={element}
              onChange={(e) => setElement(e.target.value as ElementName)}
              className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm"
            >
              {ELEMENT_NAMES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-bone/60 mb-1">Test intent (optional)</span>
            <input
              type="text"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. ember-leak regression"
              className="w-full px-2 py-1 rounded border bg-void/60 border-bone/20 text-bone text-sm"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          {run.phase === 'idle' && (
            <button
              onClick={() => setRun({ phase: 'confirming' })}
              className="px-4 py-2 rounded font-fantasy font-bold text-sm bg-gold/80 text-void hover:bg-gold"
            >
              Run Foundation test
            </button>
          )}
          {run.phase === 'confirming' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-bone/80">
                Fires 1 Claude call + 1 Leonardo call ~ ${estimated.toFixed(3)}. Continue?
              </span>
              <button onClick={runFoundation} className="px-3 py-1 rounded text-xs font-fantasy font-bold bg-gold/80 text-void">
                Confirm
              </button>
              <button onClick={() => setRun({ phase: 'idle' })} className="px-3 py-1 rounded text-xs font-fantasy border border-bone/20 text-bone/70">
                Cancel
              </button>
            </div>
          )}
          {run.phase === 'running' && (
            <span className="text-xs text-bone/80 italic">{run.step}</span>
          )}
          {run.phase === 'error' && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#f9c9c9' }}>Error: {run.message}</span>
              <button onClick={() => setRun({ phase: 'idle' })} className="px-3 py-1 rounded text-xs font-fantasy border border-bone/20 text-bone/70">
                Reset
              </button>
            </div>
          )}
        </div>
      </section>

      {run.phase === 'done' && (
        <ResultCard runState={run} onReset={() => setRun({ phase: 'idle' })} onSaved={refreshBatches} />
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

function ResultCard({
  runState,
  onReset,
  onSaved,
}: {
  runState: Extract<RunState, { phase: 'done' }>;
  onReset: () => void;
  onSaved: () => void;
}) {
  const { runId, imageDataUrl, result } = runState;
  return (
    <section className="rounded-lg border border-bone/15 bg-void/40 p-4 space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-fantasy text-sm uppercase tracking-wider text-bone/80">Result</h2>
        <button onClick={onReset} className="text-xs text-bone/60 hover:text-bone underline">Run another</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <img src={imageDataUrl} alt="Foundation portrait" className="w-full rounded border border-bone/15" />
          <div className="mt-2 text-xs text-bone/60">
            <div className="font-fantasy font-bold text-bone">{result.cardName ?? '(no name)'}</div>
            <div className="italic">{result.nameAndTitle ?? ''}</div>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <ProvenanceBlock label="Leonardo prompt" value={result.portraitPrompt} />
          <ProvenanceBlock label="Negative prompt" value={result.negativePrompt} />
          <ProvenanceBlock label="Lore" value={result.lore ?? ''} />
          <details className="rounded border border-bone/15 bg-void/60">
            <summary className="cursor-pointer px-2 py-1 text-[10px] uppercase tracking-wider text-bone/60">
              Full Claude response
            </summary>
            <pre className="p-2 text-[10px] overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(result.claudeResponse, null, 2)}
            </pre>
          </details>
        </div>
      </div>

      <JudgmentForm runId={runId} onSaved={onSaved} />
    </section>
  );
}

function ProvenanceBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-bone/60 mb-1">{label}</div>
      <pre className="whitespace-pre-wrap bg-black/40 p-2 rounded text-bone/80 max-h-48 overflow-y-auto">{value}</pre>
    </div>
  );
}

// ---- Judgment form ----------------------------------------------------

interface JudgmentInput {
  overall_rating?: number;
  archetype_fidelity?: number;
  prompt_to_image?: number;
  anatomy_artifacts?: number;
  disposition: Disposition;
  notes: string;
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
    <div className="border-t border-bone/10 pt-4 space-y-3">
      <h3 className="font-fantasy text-sm uppercase tracking-wider text-bone/80">Judgment</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <RatingField label="Overall"           value={j.overall_rating}       onChange={(v) => setJ({ ...j, overall_rating: v })} />
        <RatingField label="Archetype fidelity" value={j.archetype_fidelity}   onChange={(v) => setJ({ ...j, archetype_fidelity: v })} />
        <RatingField label="Prompt → image"    value={j.prompt_to_image}      onChange={(v) => setJ({ ...j, prompt_to_image: v })} />
        <RatingField label="Anatomy / artifacts" value={j.anatomy_artifacts}  onChange={(v) => setJ({ ...j, anatomy_artifacts: v })} />
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
            className={`w-7 h-7 rounded text-xs font-bold border ${
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
  archetype: ArchetypeName;
  tier: 'Foundation';
  status: 'success' | 'error';
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
    body: JSON.stringify({ run: payload, ensureBatch: payload.ensureBatch }),
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

function makeFoundationStats(archetype: ArchetypeName): CardStats {
  const isTech = archetype === 'Mech Pilot' || archetype === 'Android';
  const resource = isTech
    ? { Tech: { value: 55, bias: 'Mid' as const, hardCap: 85 } }
    : { Mana: { value: 55, bias: 'Mid' as const, hardCap: 85 } };
  return {
    Atk: { value: 60, bias: 'Mid-High' as const, hardCap: 90 },
    Def: { value: 45, bias: 'Mid' as const, hardCap: 85 },
    ...resource,
  };
}
