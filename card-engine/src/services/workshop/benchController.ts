import type { ArchetypeName, CardStats } from '../../types/card';
import type {
  ElementBond,
  ElementName,
  HiddenFate,
  ImageDirective,
  StoryPillarAnswers,
} from '../../types/bible';
import { ELEMENT_BONDS } from '../../types/bible';
import { visualQuestionsFor } from '../../data/visualPillars';
import { elementsAvailableToArchetype, buildSelection } from '../../data/elements';
import { generateCardTextWithRetry } from '../claudeApi';
import { generatePortraitStrict } from '../leonardoApi';
import { getSupabaseClient } from '../persistence/supabaseClient';

/**
 * The Workshop bench — "generate a starting point".
 *
 * Raheem, 2026-08-10: *"It's very difficult to get a good prompt started to get
 * the original character… do not waste it."* The Image Engine is not being
 * retired with the player forge; it moves to the front of the Workshop as a
 * design tool for the two operators.
 *
 * Why this is its own controller rather than a mode on promptLabController:
 *
 *   - **Foundation only.** The Lab chains Foundation → Forged → Ascendant. The
 *     bench deliberately cannot: the three rank images are made outside the app
 *     from one good Foundation seed.
 *   - **Visual questions, not story pillars.** The Lab seeds `answers` from
 *     `storyPillars.ts`, whose option ids `collectImagePins` does not recognise
 *     — so the Lab's images are driven entirely by the blind identity roll. The
 *     bench answers `visualQuestionsFor`, which is what the live forge actually
 *     runs and what carries `ImageDirective` pins.
 *   - **Raw overrides.** An operator can pin a field the authored options do not
 *     offer. No player path has this.
 *   - **A re-roll must actually differ.** The Lab's `cardId` is a pure function
 *     of archetype+element+bond, and that string seeds the identity roll — so
 *     "run it again" returns the same person and charges for it. The bench
 *     carries a nonce.
 *
 * Forcing both behaviours into one controller would mean four mode flags
 * through the run path. When Prompt Lab is retired, promptLabController goes
 * with it and this is what remains.
 *
 * Runs execute at module scope so navigating away mid-generation does not kill
 * them, and the candidate list is persisted (without image bytes) so a reload
 * keeps the session's history.
 */

const STORAGE_KEY = 'card-engine-workshop-bench';
const MAX_CANDIDATES = 24;

export interface BenchCandidate {
  /** prompt_test_runs.id */
  runId: string;
  batchId: string;
  createdAt: string;
  archetype: ArchetypeName;
  element: ElementName;
  bond: ElementBond;
  /** Empty after a reload — the bytes are not persisted. See `imageStripped`. */
  imageDataUrl: string;
  imageStripped?: boolean;
  /** Everything that produced it, so "Adjust" can load it back. */
  directive: ImageDirective;
  overrides: ImageDirective;
  answers: StoryPillarAnswers;
  seedNonce: number;
  /** The assembled prompt. Only knowable AFTER the run — see the note below. */
  portraitPrompt: string;
  negativePrompt: string;
  hiddenFate?: HiddenFate;
  cardName?: string;
}

export type BenchStatus =
  | { phase: 'idle' }
  | { phase: 'running'; step: string }
  | { phase: 'error'; message: string };

export interface BenchState {
  archetype: ArchetypeName;
  element: ElementName;
  bond: ElementBond;
  answers: StoryPillarAnswers;
  overrides: ImageDirective;
  seedNonce: number;
  batchId: string | null;
  status: BenchStatus;
  candidates: BenchCandidate[];
}

// ---- Store ----------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify(): void {
  for (const fn of listeners) fn();
}

export function getState(): BenchState {
  return state;
}

function setState(patch: Partial<BenchState>): void {
  state = { ...state, ...patch };
  persist();
  notify();
}

/**
 * Every visual question answered with its first option — a valid starting
 * configuration rather than a half-empty form. The operator changes what they
 * care about and leaves the rest.
 */
function defaultAnswers(archetype: ArchetypeName, element: ElementName): StoryPillarAnswers {
  const { questions, options } = visualQuestionsFor(archetype, element);
  return {
    answers: questions.map((q) => {
      const first = options.find((o) => o.questionId === q.id);
      return {
        questionId: q.id,
        optionId: first?.id ?? `${q.id}_none`,
        answer: first?.text ?? '',
      };
    }),
  };
}

function firstElement(archetype: ArchetypeName): ElementName {
  const available = elementsAvailableToArchetype(archetype);
  return available[0];
}

function freshState(archetype: ArchetypeName = 'Lycanthrope'): BenchState {
  const element = firstElement(archetype);
  return {
    archetype,
    element,
    bond: ELEMENT_BONDS[0],
    answers: defaultAnswers(archetype, element),
    overrides: {},
    seedNonce: 1,
    batchId: null,
    status: { phase: 'idle' },
    candidates: [],
  };
}

let state: BenchState = hydrate();

// A run that resolves after the operator has moved on must not write back.
let epoch = 0;

// ---- Persistence ----------------------------------------------------------

function persist(): void {
  try {
    const slim: BenchState = {
      ...state,
      // A generation that was in flight when the tab closed cannot be resumed.
      status: state.status.phase === 'running' ? { phase: 'idle' } : state.status,
      candidates: state.candidates.map((c) => ({ ...c, imageDataUrl: '', imageStripped: true })),
    };
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    // Non-fatal — in-memory state still drives the page across navigation.
  }
}

function hydrate(): BenchState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as BenchState;
    if (!parsed?.archetype) return freshState();
    return {
      ...parsed,
      status: parsed.status?.phase === 'running' ? { phase: 'idle' } : (parsed.status ?? { phase: 'idle' }),
      candidates: parsed.candidates ?? [],
      overrides: parsed.overrides ?? {},
      seedNonce: parsed.seedNonce ?? 1,
    };
  } catch {
    return freshState();
  }
}

// ---- Setters --------------------------------------------------------------

export function setArchetype(next: ArchetypeName): void {
  const element = firstElement(next);
  setState({
    archetype: next,
    element,
    // The visual questions are generated per archetype AND element (forms are
    // element-gated), so the previous answers reference option ids that no
    // longer exist. Reset rather than carry dead references.
    answers: defaultAnswers(next, element),
  });
}

export function setElement(next: ElementName): void {
  setState({ element: next, answers: defaultAnswers(state.archetype, next) });
}

export function setBond(next: ElementBond): void {
  setState({ bond: next });
}

export function setAnswer(questionId: string, optionId: string): void {
  const { options } = visualQuestionsFor(state.archetype, state.element);
  const option = options.find((o) => o.id === optionId);
  if (!option) return;
  setState({
    answers: {
      answers: state.answers.answers.map((a) =>
        a.questionId === questionId ? { questionId, optionId, answer: option.text } : a,
      ),
    },
  });
}

/** Set or clear one raw override field. An empty value means "stop pinning". */
export function setOverride(field: keyof ImageDirective, value: string | undefined): void {
  const next: ImageDirective = { ...state.overrides };
  if (value === undefined || value === '') delete next[field];
  else (next as Record<string, unknown>)[field] = value;
  setState({ overrides: next });
}

export function clearOverrides(): void {
  setState({ overrides: {} });
}

/** Load a previous candidate's configuration back into the controls. */
export function adjustFrom(candidate: BenchCandidate): void {
  setState({
    archetype: candidate.archetype,
    element: candidate.element,
    bond: candidate.bond,
    answers: candidate.answers,
    overrides: candidate.overrides,
  });
}

export function clearCandidates(): void {
  epoch += 1;
  setState({ candidates: [], batchId: null, status: { phase: 'idle' } });
}

// ---- The run --------------------------------------------------------------

/**
 * Foundation stats, fixed. The bench is producing an IMAGE, and stats are
 * authored later in the Workshop — but `generateCardText` needs a stat block to
 * derive a rank from, and the rank drives the prompt's rank-scaled language.
 * These are the Lab's Foundation values, chosen to sit below every Forged floor
 * so `getOverallRank` derives Foundation exactly.
 */
function foundationStats(archetype: ArchetypeName): CardStats {
  const isTech = archetype === 'Mech Pilot' || archetype === 'Android';
  const resource = isTech
    ? { Tech: { value: 48, bias: 'Mid' as const, hardCap: 85 } }
    : { Mana: { value: 48, bias: 'Mid' as const, hardCap: 85 } };
  return {
    Atk: { value: 58, bias: 'Mid-High' as const, hardCap: 90 },
    Def: { value: 44, bias: 'Mid' as const, hardCap: 85 },
    ...resource,
  };
}

/**
 * Generate one Foundation candidate.
 *
 * `newSeed` is what makes a re-roll produce a different person: the nonce goes
 * into the `cardId` that seeds the deterministic identity roll. Re-running with
 * the same nonce is genuinely useful too — it re-runs the same configuration
 * after a transient failure without changing who comes out.
 */
export async function generateCandidate(opts: { newSeed: boolean } = { newSeed: true }): Promise<void> {
  if (state.status.phase === 'running') return;

  const myEpoch = epoch;
  const stale = () => myEpoch !== epoch;
  const setStatus = (status: BenchStatus) => {
    if (!stale()) setState({ status });
  };

  const seedNonce = opts.newSeed ? state.seedNonce + 1 : state.seedNonce;
  const { archetype, element, bond, answers, overrides, batchId } = state;
  setState({ seedNonce });

  try {
    setStatus({ phase: 'running', step: 'Writing the character…' });
    const stats = foundationStats(archetype);
    const elementSelection = buildSelection(archetype, element, bond);
    const startedAt = Date.now();

    const claude = await generateCardTextWithRetry({
      archetype,
      stats,
      answers,
      element: elementSelection,
      // The nonce is the whole point — see generateCandidate's doc comment.
      cardId: `bench_${archetype}_${element}_${seedNonce}`,
      imagePinOverrides: overrides,
    });

    setStatus({ phase: 'running', step: 'Painting the portrait…' });
    const { dataUrl } = await generatePortraitStrict(
      claude.portraitPrompt,
      claude.negativePrompt ?? '',
    );
    const durationMs = Date.now() - startedAt;

    setStatus({ phase: 'running', step: 'Recording the run…' });
    const persisted = await recordRun({
      batchId,
      archetype,
      inputSnapshot: {
        archetype,
        element: elementSelection,
        answers,
        overrides,
        seedNonce,
        stats,
        source: 'workshop-bench',
      },
      claudeResponse: claude as unknown as Record<string, unknown>,
      leonardoPrompt: claude.portraitPrompt,
      leonardoNegativePrompt: claude.negativePrompt ?? '',
      imageDataUrl: dataUrl,
      durationMs,
    });

    // The paid run is recorded either way. Only the in-page candidate list is
    // abandoned when the operator cleared the bench mid-flight.
    if (stale()) return;

    const candidate: BenchCandidate = {
      runId: persisted.runId,
      batchId: persisted.batchId,
      createdAt: new Date().toISOString(),
      archetype,
      element,
      bond,
      imageDataUrl: dataUrl,
      directive: (claude.hiddenFate ? pinsFrom(claude.hiddenFate) : {}) as ImageDirective,
      overrides,
      answers,
      seedNonce,
      portraitPrompt: claude.portraitPrompt,
      negativePrompt: claude.negativePrompt ?? '',
      hiddenFate: claude.hiddenFate,
      cardName: claude.cardName,
    };

    setState({
      batchId: state.batchId ?? persisted.batchId,
      status: { phase: 'idle' },
      candidates: [candidate, ...state.candidates].slice(0, MAX_CANDIDATES),
    });
  } catch (err) {
    setStatus({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
  }
}

/**
 * The subset of a returned HiddenFate that reads as "what was decided" — shown
 * on the candidate so an operator can see why it came out that way, and carried
 * onto the character as `seed.directive` so the read-the-art stage starts from
 * what we already know instead of asking a model to guess it back.
 */
function pinsFrom(fate: HiddenFate): ImageDirective {
  return {
    sex: fate.sex,
    age: fate.age,
    build: fate.bodyType,
    mark: fate.disabilityOrCondition,
    species: fate.speciesForm,
    weapon: fate.weaponId,
    companion: fate.companionId,
    environmentTag: fate.environmentId,
  };
}

// ---- Recording ------------------------------------------------------------

interface RecordPayload {
  batchId: string | null;
  archetype: ArchetypeName;
  inputSnapshot: Record<string, unknown>;
  claudeResponse: Record<string, unknown>;
  leonardoPrompt: string;
  leonardoNegativePrompt: string;
  imageDataUrl: string;
  durationMs: number;
}

/**
 * Reuses the Prompt Lab's recording endpoint and tables (`prompt_test_batches`
 * / `prompt_test_runs`). The bench is the same kind of event — a paid
 * generation with a prompt, an image, and a provenance trail — and a parallel
 * table would split that history in half for no benefit. Runs are tagged
 * `source: 'workshop-bench'` in the input snapshot.
 */
async function recordRun(payload: RecordPayload): Promise<{ batchId: string; runId: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured — the run cannot be recorded.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No Supabase session — sign in before generating.');

  const response = await fetch('/api/prompt-lab-record', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      run: {
        batchId: payload.batchId ?? undefined,
        archetype: payload.archetype,
        tier: 'Foundation',
        status: 'success',
        inputSnapshot: payload.inputSnapshot,
        claudeModel: 'claude-haiku-4-5-20251001',
        claudePrompt: '(assembled inline; see claude_response for the output shape)',
        claudeResponse: payload.claudeResponse,
        leonardoPrompt: payload.leonardoPrompt,
        leonardoNegativePrompt: payload.leonardoNegativePrompt,
        imageDataUrl: payload.imageDataUrl,
        durationMs: payload.durationMs,
      },
      ensureBatch: { intent: 'Workshop bench — Foundation starting point' },
    }),
  });
  if (!response.ok) {
    throw new Error(`Recording failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as { batchId: string; runId: string };
}
