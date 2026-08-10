import { useMemo, useSyncExternalStore } from 'react';
import { ARCHETYPE_NAMES, type ArchetypeName } from '../../../types/card';
import type { ElementName, ImageDirective } from '../../../types/bible';
import { visualQuestionsFor } from '../../../data/visualPillars';
import { elementsAvailableToArchetype, bucketFor } from '../../../data/elements';
import {
  BODY_ALLOWLIST,
  BODY_CLASSES,
  AGE_BANDS,
  bespokeFormsFor,
  marksForArchetype,
} from '../../../services/imageEngine/identityPools';
import { COMPACT_STYLE_LEAD } from '../../../services/portraitAssembler';
import { BASE_NEGATIVE } from '../../../services/imageEngine/imageConstants';
import { API_COST_CATALOG } from '../../../data/economy/apiCostCatalog';
import * as bench from '../../../services/workshop/benchController';
import type { BenchCandidate } from '../../../services/workshop/benchController';
import { WkPanel, WkEmpty } from '../../../components/workshop/ui';

/**
 * Stage 1 — the bench. "Generate a starting point."
 *
 * The Image Engine, driven by short, direct, no-lore questions. Raheem,
 * 2026-08-10: *"very, very direct questions… element, body type, human,
 * nonhuman, like wings — very specific things that'll make us just get an image
 * going so we can get to where we want."*
 *
 * Foundation only, one image at a time. The three rank images are made outside
 * the app from whichever candidate is worth keeping.
 *
 * Two honest limits are stated on the page rather than papered over:
 *
 *   1. There is no prompt preview BEFORE generating. The portrait prompt is
 *      assembled from the hiddenFate Claude returns, so it does not exist until
 *      the paid call has already happened. What can be shown up front is the
 *      deterministic part — the pins, the style lead, the negative floor — and
 *      the full prompt appears on the candidate afterwards.
 *   2. The override dropdowns can only offer what the pools contain. Forcing
 *      something outside them needs a pool entry first.
 */

function useBench(): bench.BenchState {
  return useSyncExternalStore(bench.subscribe, bench.getState, bench.getState);
}

const COST = API_COST_CATALOG.forge_card.estimatedDirectCostUsd;

export function Bench({ onUseAsSeed }: { onUseAsSeed?: (candidate: BenchCandidate) => void }) {
  const state = useBench();
  const running = state.status.phase === 'running';

  const { questions, options } = useMemo(
    () => visualQuestionsFor(state.archetype, state.element),
    [state.archetype, state.element],
  );

  const elements = useMemo(
    () => elementsAvailableToArchetype(state.archetype),
    [state.archetype],
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 360px) minmax(0, 1fr)',
        gap: 18,
        alignItems: 'start',
      }}
      className="wk-bench-grid"
    >
      {/* ---- Controls ------------------------------------------------- */}
      <div style={{ position: 'sticky', top: 12, display: 'grid', gap: 14 }}>
        <WkPanel title="What to make">
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Archetype">
              <select
                className="wk-select"
                value={state.archetype}
                disabled={running}
                onChange={(e) => bench.setArchetype(e.target.value as ArchetypeName)}
              >
                {ARCHETYPE_NAMES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </Field>

            <Field label="Element">
              <select
                className="wk-select"
                value={state.element}
                disabled={running}
                onChange={(e) => bench.setElement(e.target.value as ElementName)}
              >
                {elements.map((el) => (
                  <option key={el} value={el}>
                    {el}{bucketFor(state.archetype, el) === 'rare' ? ' (rare)' : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </WkPanel>

        <WkPanel title="The character">
          {questions.length === 0 ? (
            <p className="wk-note">
              This archetype has no visual questions at this element — everything is rolled.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {questions.map((q) => {
                const forQuestion = options.filter((o) => o.questionId === q.id);
                const answer = state.answers.answers.find((a) => a.questionId === q.id);
                return (
                  <Field key={q.id} label={q.prompt}>
                    <select
                      className="wk-select"
                      value={answer?.optionId ?? ''}
                      disabled={running}
                      onChange={(e) => bench.setAnswer(q.id, e.target.value)}
                    >
                      {forQuestion.map((o) => (
                        <option key={o.id} value={o.id}>{o.text}</option>
                      ))}
                    </select>
                  </Field>
                );
              })}
            </div>
          )}
        </WkPanel>

        <Overrides archetype={state.archetype} overrides={state.overrides} disabled={running} />

        <EngineReference archetype={state.archetype} />

        <WkPanel>
          {state.status.phase === 'error' ? (
            <p className="wk-error" role="alert">{state.status.message}</p>
          ) : null}
          <button
            type="button"
            className="wk-primary"
            disabled={running}
            onClick={() => void bench.generateCandidate({ newSeed: true })}
          >
            {state.status.phase === 'running'
              ? state.status.step
              : `Generate a starting point · ~$${COST.toFixed(2)}`}
          </button>
          <p className="wk-note" style={{ marginTop: 8 }}>
            One Foundation image. Forged and Ascendant are made outside the app from whichever
            candidate you keep.
          </p>
        </WkPanel>
      </div>

      {/* ---- Candidates ----------------------------------------------- */}
      <div style={{ display: 'grid', gap: 14 }}>
        <WkPanel
          title={`Candidates (${state.candidates.length})`}
          action={
            state.candidates.length > 0 ? (
              <button type="button" className="wk-tab" onClick={() => bench.clearCandidates()}>
                Clear
              </button>
            ) : null
          }
        >
          {state.candidates.length === 0 ? (
            <WkEmpty title="Nothing generated yet">
              Set the character on the left and generate. Every run is recorded, so a good one is
              never lost even if you navigate away.
            </WkEmpty>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {state.candidates.map((c) => (
                <CandidateCard
                  key={c.runId}
                  candidate={c}
                  disabled={running}
                  onUseAsSeed={onUseAsSeed}
                />
              ))}
            </div>
          )}
        </WkPanel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function humanizeId(id: string): string {
  return id.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span className="wk-field-label">{label}</span>
      {children}
    </label>
  );
}

/**
 * The raw override row. Bypasses the authored options entirely.
 *
 * Every dropdown is sourced from the pool the engine actually reads, so the UI
 * cannot offer something the assembler would silently drop. What it cannot do
 * is invent: if the shape you want is not in the pool, the pool needs the
 * entry, and the note says so rather than letting a typed value vanish.
 */
function Overrides({
  archetype,
  overrides,
  disabled,
}: {
  archetype: ArchetypeName;
  overrides: ImageDirective;
  disabled: boolean;
}) {
  const bodies = BODY_ALLOWLIST[archetype] ?? [];
  const marks = marksForArchetype(archetype);
  const forms = bespokeFormsFor(archetype);
  const active = Object.keys(overrides).length;

  return (
    <details className="wk-details" open={active > 0}>
      <summary>
        Force specifics{active > 0 ? ` · ${active} pinned` : ''}
      </summary>
      <div style={{ display: 'grid', gap: 12, paddingTop: 12 }}>
        <OverrideSelect
          label="Sex" field="sex" value={overrides.sex} disabled={disabled}
          choices={[['male', 'Male'], ['female', 'Female']]}
        />
        <OverrideSelect
          label="Age" field="age" value={overrides.age} disabled={disabled}
          choices={Object.values(AGE_BANDS)
            .filter((b) => !b.restrictTo || b.restrictTo.includes(archetype))
            .map((b) => [b.id, b.label])}
        />
        <OverrideSelect
          label="Build" field="build" value={overrides.build} disabled={disabled}
          choices={bodies.map((id) => [id, BODY_CLASSES[id].label])}
        />
        <OverrideSelect
          label="Species" field="species" value={overrides.species} disabled={disabled}
          choices={[
            ['humanoid', 'Humanoid'],
            // BespokeBody carries only an id and a long Leonardo descriptor, so
            // the id is what reads as a label here.
            ...forms.map((f) => [f.id, humanizeId(f.id)] as [string, string]),
          ]}
        />
        <OverrideSelect
          label="Mark" field="mark" value={overrides.mark} disabled={disabled}
          choices={marks.map((m) => [m.id, m.description])}
        />
        <button
          type="button"
          className="wk-tab"
          disabled={disabled || active === 0}
          onClick={() => bench.clearOverrides()}
        >
          Clear all pins
        </button>
        <p className="wk-note">
          These beat the answers above. They can only offer what the engine's pools contain — a
          shape that is not listed needs a pool entry before it can be forced.
        </p>
      </div>
    </details>
  );
}

function OverrideSelect({
  label,
  field,
  value,
  choices,
  disabled,
}: {
  label: string;
  field: keyof ImageDirective;
  value: string | undefined;
  choices: [string, string][];
  disabled: boolean;
}) {
  if (choices.length === 0) return null;
  return (
    <Field label={label}>
      <select
        className="wk-select"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => bench.setOverride(field, e.target.value || undefined)}
      >
        <option value="">Roll it</option>
        {choices.map(([id, text]) => (
          <option key={id} value={id}>{text}</option>
        ))}
      </select>
    </Field>
  );
}

/**
 * What the deterministic half of the engine will contribute, shown before you
 * spend anything. This is NOT the prompt — that cannot exist yet (see the file
 * header) — and the panel says so rather than implying otherwise.
 */
function EngineReference({ archetype }: { archetype: ArchetypeName }) {
  const negativeTerms = useMemo(() => BASE_NEGATIVE.split(',').length, []);
  return (
    <details className="wk-details">
      <summary>What the engine adds</summary>
      <div style={{ display: 'grid', gap: 10, paddingTop: 12 }}>
        <div>
          <span className="wk-field-label">Style lead</span>
          <p className="wk-mono">{COMPACT_STYLE_LEAD}</p>
        </div>
        <div>
          <span className="wk-field-label">Negative floor ({negativeTerms} terms)</span>
          <p className="wk-note">
            Includes the modesty clause, enforced on every figure regardless of archetype or sex.
          </p>
        </div>
        <p className="wk-note">
          The full portrait prompt is assembled from what the model returns, so it only exists
          after a run — it is shown on each candidate below, not here. {archetype}'s hooks,
          environment pool and element palette are applied at that point too.
        </p>
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------

function CandidateCard({
  candidate,
  disabled,
  onUseAsSeed,
}: {
  candidate: BenchCandidate;
  disabled: boolean;
  onUseAsSeed?: (candidate: BenchCandidate) => void;
}) {
  const pins = Object.entries(candidate.overrides).filter(([, v]) => v);
  return (
    <div className="wk-candidate">
      <div className="wk-candidate-art">
        {candidate.imageDataUrl ? (
          <img src={candidate.imageDataUrl} alt={candidate.cardName ?? 'Generated candidate'} />
        ) : (
          <div className="wk-empty" style={{ padding: 18 }}>
            <strong>Image not kept</strong>
            The picture is not stored in the browser between reloads. The run itself is saved — open
            it from the run history to see it again.
          </div>
        )}
      </div>
      <div className="wk-candidate-body">
        <div className="wk-candidate-head">
          <strong>{candidate.cardName ?? 'Untitled'}</strong>
          <span className="wk-note">
            {candidate.archetype} · {candidate.element} · seed {candidate.seedNonce}
          </span>
        </div>

        {pins.length > 0 ? (
          <p className="wk-note">Forced: {pins.map(([k, v]) => `${k}=${String(v)}`).join(', ')}</p>
        ) : null}

        <div className="wk-candidate-actions">
          <button
            type="button"
            className="wk-primary"
            disabled={disabled}
            onClick={() => onUseAsSeed?.(candidate)}
          >
            Use as seed
          </button>
          <button
            type="button"
            className="wk-tab"
            disabled={disabled}
            onClick={() => {
              bench.adjustFrom(candidate);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Adjust
          </button>
          <button
            type="button"
            className="wk-tab"
            disabled={disabled}
            onClick={() => {
              bench.adjustFrom(candidate);
              void bench.generateCandidate({ newSeed: true });
            }}
          >
            Re-roll
          </button>
        </div>

        <details className="wk-details">
          <summary>Portrait prompt ({candidate.portraitPrompt.length} chars)</summary>
          <p className="wk-mono">{candidate.portraitPrompt}</p>
        </details>
      </div>
    </div>
  );
}
