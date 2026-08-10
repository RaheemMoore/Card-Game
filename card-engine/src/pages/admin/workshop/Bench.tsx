import { useMemo, useSyncExternalStore } from 'react';
import { ARCHETYPE_NAMES, type ArchetypeName } from '../../../types/card';
import type { ElementName, ImageDirective } from '../../../types/bible';
import { visualQuestionsFor } from '../../../data/visualPillars';
import { elementsAvailableToArchetype, bucketFor } from '../../../data/elements';
import {
  BODY_ALLOWLIST, BODY_CLASSES, AGE_BANDS, bespokeFormsFor, marksForArchetype,
} from '../../../services/imageEngine/identityPools';
import { COMPACT_STYLE_LEAD } from '../../../services/portraitAssembler';
import { BASE_NEGATIVE } from '../../../services/imageEngine/imageConstants';
import { API_COST_CATALOG } from '../../../data/economy/apiCostCatalog';
import * as bench from '../../../services/workshop/benchController';
import type { BenchCandidate } from '../../../services/workshop/benchController';
import {
  AdminCard, AdminSection, AdminButton, AdminSelect, AdminAlert, AdminEmptyState,
} from '../../../components/admin/ui';

/**
 * Stage 1 — the bench. "Generate a starting point."
 *
 * The Image Engine, driven by short, direct, no-lore questions. Raheem:
 * *"very, very direct questions… element, body type, human, nonhuman, like
 * wings — very specific things that'll make us just get an image going."*
 *
 * Foundation only, one image at a time. The three rank images are made outside
 * the app from whichever candidate is worth keeping.
 *
 * Two limits are stated on the page rather than hidden:
 *   1. There is no prompt preview BEFORE generating — the portrait prompt is
 *      assembled from the hiddenFate the model returns, so it does not exist
 *      until the paid call already happened. The deterministic half is shown up
 *      front; the full prompt appears on the candidate afterwards.
 *   2. The override dropdowns can only offer what the engine's pools contain.
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
  const elements = useMemo(() => elementsAvailableToArchetype(state.archetype), [state.archetype]);

  return (
    <div className="grid gap-4 items-start lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      {/* Controls */}
      <div className="grid gap-3 lg:sticky lg:top-4">
        <AdminCard>
          <div className="grid gap-3">
            <AdminSelect
              label="Archetype"
              value={state.archetype}
              disabled={running}
              onChange={(e) => bench.setArchetype(e.target.value as ArchetypeName)}
            >
              {ARCHETYPE_NAMES.map((a) => <option key={a} value={a}>{a}</option>)}
            </AdminSelect>
            <AdminSelect
              label="Element"
              value={state.element}
              disabled={running}
              onChange={(e) => bench.setElement(e.target.value as ElementName)}
            >
              {elements.map((el) => (
                <option key={el} value={el}>
                  {el}{bucketFor(state.archetype, el) === 'rare' ? ' (rare)' : ''}
                </option>
              ))}
            </AdminSelect>
          </div>
        </AdminCard>

        <AdminCard>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--admin-text)' }}>
            The character
          </h3>
          {questions.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              This archetype has no visual questions at this element — everything is rolled.
            </p>
          ) : (
            <div className="grid gap-3">
              {questions.map((q) => {
                const answer = state.answers.answers.find((a) => a.questionId === q.id);
                return (
                  <AdminSelect
                    key={q.id}
                    label={q.prompt}
                    value={answer?.optionId ?? ''}
                    disabled={running}
                    onChange={(e) => bench.setAnswer(q.id, e.target.value)}
                  >
                    {options.filter((o) => o.questionId === q.id).map((o) => (
                      <option key={o.id} value={o.id}>{o.text}</option>
                    ))}
                  </AdminSelect>
                );
              })}
            </div>
          )}
        </AdminCard>

        <Overrides archetype={state.archetype} overrides={state.overrides} disabled={running} />
        <EngineReference archetype={state.archetype} />

        <AdminCard>
          {state.status.phase === 'error' && (
            <AdminAlert tone="danger" className="mb-3">{state.status.message}</AdminAlert>
          )}
          <AdminButton
            variant="primary"
            className="w-full"
            disabled={running}
            onClick={() => void bench.generateCandidate({ newSeed: true })}
          >
            {state.status.phase === 'running'
              ? state.status.step
              : `Generate a starting point · ~$${COST.toFixed(2)}`}
          </AdminButton>
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
            One Foundation image. Forged and Ascendant are made outside the app from whichever
            candidate you keep.
          </p>
        </AdminCard>
      </div>

      {/* Candidates */}
      <AdminSection
        title={`Candidates (${state.candidates.length})`}
        actions={state.candidates.length > 0 ? (
          <AdminButton size="sm" variant="ghost" onClick={() => bench.clearCandidates()}>Clear</AdminButton>
        ) : null}
      >
        {state.candidates.length === 0 ? (
          <AdminCard surface="subtle">
            <AdminEmptyState
              title="Nothing generated yet"
              description="Set the character on the left and generate. Every run is recorded, so a good one is never lost even if you navigate away."
            />
          </AdminCard>
        ) : (
          <div className="grid gap-3">
            {state.candidates.map((c) => (
              <CandidateCard key={c.runId} candidate={c} disabled={running} onUseAsSeed={onUseAsSeed} />
            ))}
          </div>
        )}
      </AdminSection>
    </div>
  );
}

// ---------------------------------------------------------------------------

function humanizeId(id: string): string {
  return id.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Raw overrides. Bypass the authored options entirely and beat them on merge.
 *
 * Every dropdown is sourced from the pool the engine actually reads, so the UI
 * cannot offer something the assembler would silently drop. What it cannot do
 * is invent — if the shape you want is not in the pool, the pool needs the
 * entry, and the note says so rather than letting a value vanish.
 */
function Overrides({
  archetype, overrides, disabled,
}: { archetype: ArchetypeName; overrides: ImageDirective; disabled: boolean }) {
  const bodies = BODY_ALLOWLIST[archetype] ?? [];
  const marks = marksForArchetype(archetype);
  const forms = bespokeFormsFor(archetype);
  const active = Object.keys(overrides).length;

  return (
    <AdminCard>
      <details open={active > 0}>
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text)' }}>
          Force specifics{active > 0 ? ` · ${active} pinned` : ''}
        </summary>
        <div className="grid gap-3 pt-3">
          <OverrideSelect label="Sex" field="sex" value={overrides.sex} disabled={disabled}
            choices={[['male', 'Male'], ['female', 'Female']]} />
          <OverrideSelect label="Age" field="age" value={overrides.age} disabled={disabled}
            choices={Object.values(AGE_BANDS)
              .filter((b) => !b.restrictTo || b.restrictTo.includes(archetype))
              .map((b) => [b.id, b.label])} />
          <OverrideSelect label="Build" field="build" value={overrides.build} disabled={disabled}
            choices={bodies.map((id) => [id, BODY_CLASSES[id].label])} />
          <OverrideSelect label="Species" field="species" value={overrides.species} disabled={disabled}
            choices={[['humanoid', 'Humanoid'], ...forms.map((f) => [f.id, humanizeId(f.id)] as [string, string])]} />
          <OverrideSelect label="Mark" field="mark" value={overrides.mark} disabled={disabled}
            choices={marks.map((m) => [m.id, m.description])} />
          <AdminButton size="sm" variant="ghost" disabled={disabled || active === 0} onClick={() => bench.clearOverrides()}>
            Clear all pins
          </AdminButton>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
            These beat the answers above. They can only offer what the engine's pools contain — a
            shape that is not listed needs a pool entry before it can be forced.
          </p>
        </div>
      </details>
    </AdminCard>
  );
}

function OverrideSelect({
  label, field, value, choices, disabled,
}: {
  label: string;
  field: keyof ImageDirective;
  value: string | undefined;
  choices: [string, string][];
  disabled: boolean;
}) {
  if (choices.length === 0) return null;
  return (
    <AdminSelect
      label={label}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => bench.setOverride(field, e.target.value || undefined)}
    >
      <option value="">Roll it</option>
      {choices.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
    </AdminSelect>
  );
}

/** The deterministic half, shown before anything is spent. NOT the prompt. */
function EngineReference({ archetype }: { archetype: ArchetypeName }) {
  const negativeTerms = useMemo(() => BASE_NEGATIVE.split(',').length, []);
  return (
    <AdminCard>
      <details>
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text)' }}>
          What the engine adds
        </summary>
        <div className="grid gap-3 pt-3">
          <div>
            <span className="block mb-1 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Style lead</span>
            <p className="text-[11px] font-mono leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
              {COMPACT_STYLE_LEAD}
            </p>
          </div>
          <div>
            <span className="block mb-1 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
              Negative floor ({negativeTerms} terms)
            </span>
            <p className="text-[11px] leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
              Includes the modesty clause, enforced on every figure regardless of archetype or sex.
            </p>
          </div>
          <p className="text-[11px] leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
            The full portrait prompt is assembled from what the model returns, so it only exists
            after a run — it appears on each candidate below, not here. {archetype}'s hooks,
            environment pool and element palette are applied at that point too.
          </p>
        </div>
      </details>
    </AdminCard>
  );
}

function CandidateCard({
  candidate, disabled, onUseAsSeed,
}: {
  candidate: BenchCandidate;
  disabled: boolean;
  onUseAsSeed?: (candidate: BenchCandidate) => void;
}) {
  const pins = Object.entries(candidate.overrides).filter(([, v]) => v);
  return (
    <AdminCard>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div>
          {candidate.imageDataUrl ? (
            <img
              src={candidate.imageDataUrl}
              alt={candidate.cardName ?? 'Generated candidate'}
              className="w-full block"
              style={{ borderRadius: 'var(--admin-radius-control)', border: '1px solid var(--admin-border)' }}
            />
          ) : (
            <AdminEmptyState
              title="Image not kept"
              description="The picture is not stored in the browser between reloads. The run itself is saved."
            />
          )}
        </div>
        <div className="grid gap-2.5 content-start min-w-0">
          <div>
            <strong className="text-sm" style={{ color: 'var(--admin-text)' }}>
              {candidate.cardName ?? 'Untitled'}
            </strong>
            <p className="text-[11px] m-0" style={{ color: 'var(--admin-text-muted)' }}>
              {candidate.archetype} · {candidate.element} · seed {candidate.seedNonce}
            </p>
          </div>
          {pins.length > 0 && (
            <p className="text-[11px] m-0" style={{ color: 'var(--admin-text-muted)' }}>
              Forced: {pins.map(([k, v]) => `${k}=${String(v)}`).join(', ')}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <AdminButton size="sm" variant="primary" disabled={disabled} onClick={() => onUseAsSeed?.(candidate)}>
              Use as seed
            </AdminButton>
            <AdminButton size="sm" disabled={disabled} onClick={() => {
              bench.adjustFrom(candidate);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}>
              Adjust
            </AdminButton>
            <AdminButton size="sm" disabled={disabled} onClick={() => {
              bench.adjustFrom(candidate);
              void bench.generateCandidate({ newSeed: true });
            }}>
              Re-roll
            </AdminButton>
          </div>
          <details>
            <summary className="cursor-pointer text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Portrait prompt ({candidate.portraitPrompt.length} chars)
            </summary>
            <p
              className="mt-2 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words m-0 overflow-y-auto"
              style={{ color: 'var(--admin-text-muted)', maxHeight: '16rem' }}
            >
              {candidate.portraitPrompt}
            </p>
          </details>
        </div>
      </div>
    </AdminCard>
  );
}
