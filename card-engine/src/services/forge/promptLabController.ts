import { ARCHETYPE_NAMES, type ArchetypeName, type CardStats, type Rank } from '../../types/card';
import type { ElementBond, ElementName, HiddenFate, StoryPillarAnswers } from '../../types/bible';
import { ELEMENT_BONDS } from '../../types/bible';
import { getQuestionsForArchetype, getOptionsForQuestion, sampleOptions } from '../../data/storyPillars';
import {
  elementIsNarrativelyEligible,
  elementsAvailableToArchetype,
  buildSelection,
} from '../../data/elements';
import { generateCardTextWithRetry } from '../claudeApi';
import { generatePortraitStrict } from '../leonardoApi';
import { getSupabaseClient } from '../persistence/supabaseClient';

/**
 * Prompt Lab chain controller.
 *
 * The tier chain (form inputs + Foundation/Forged/Ascendant slots) used to live
 * in AdminPromptLab component state, so any navigation away — one click to
 * another admin page — threw away an in-flight test. This singleton owns the
 * chain instead: run logic executes here (module scope, survives SPA nav) and a
 * slim copy is persisted to localStorage so a reload restores the form and the
 * completed tiers. Portrait images are omitted from the persisted copy (they are
 * large and every successful run is already saved to Supabase / visible in the
 * Sessions grid); after a reload a restored tier keeps its text + prompts with a
 * blank portrait.
 */

const TIERS: readonly Rank[] = ['Foundation', 'Forged', 'Ascendant'];
const STORAGE_KEY = 'card-engine-promptlab-chain';

type GeneratedText = Awaited<ReturnType<typeof generateCardTextWithRetry>>;

export interface TierResult {
  runId: string;
  imageDataUrl: string;
  cardName?: string;
  nameAndTitle?: string;
  portraitPrompt: string;
  negativePrompt: string;
  lore?: string;
  hiddenFate?: HiddenFate;
  stats: CardStats;
  raw: GeneratedText;
  imageStripped?: boolean; // true when restored from localStorage sans portrait
}

export type TierSlot =
  | { phase: 'idle' }
  | { phase: 'confirming' }
  | { phase: 'running'; step: string }
  | { phase: 'error'; message: string }
  | { phase: 'done'; result: TierResult };

export interface LabChainState {
  archetype: ArchetypeName;
  answers: StoryPillarAnswers;
  element: ElementName;
  bond: ElementBond;
  intent: string;
  batchId: string | null;
  foundation: TierSlot;
  forged: TierSlot;
  ascendant: TierSlot;
}

// ---- Store ------------------------------------------------------------

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

function freshState(): LabChainState {
  const archetype = ARCHETYPE_NAMES[0];
  const answers = defaultAnswers(archetype);
  return {
    archetype,
    answers,
    element: firstEligible(archetype, answers),
    bond: ELEMENT_BONDS[0],
    intent: '',
    batchId: null,
    foundation: { phase: 'idle' },
    forged: { phase: 'idle' },
    ascendant: { phase: 'idle' },
  };
}

let state: LabChainState = hydrate();

export function getState(): LabChainState {
  return state;
}

function setState(patch: Partial<LabChainState>): void {
  state = { ...state, ...patch };
  persist();
  notify();
}

export function chainStarted(): boolean {
  return state.foundation.phase !== 'idle' || state.batchId !== null;
}

// ---- Persistence ------------------------------------------------------

// Portrait data URLs are large; strip them from the persisted copy. Everything
// else (text, prompts, full response) is small enough to keep.
function slimSlot(slot: TierSlot): TierSlot {
  if (slot.phase !== 'done') return slot;
  return {
    phase: 'done',
    result: { ...slot.result, imageDataUrl: '', imageStripped: true },
  };
}

function persist(): void {
  try {
    const slim: LabChainState = {
      ...state,
      foundation: slimSlot(state.foundation),
      forged: slimSlot(state.forged),
      ascendant: slimSlot(state.ascendant),
    };
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    // Non-fatal: in-memory state still drives the UI across SPA navigation.
  }
}

function hydrate(): LabChainState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as LabChainState;
    if (!parsed || !ARCHETYPE_NAMES.includes(parsed.archetype)) return freshState();
    // A run that was mid-flight when the tab reloaded can't be recovered.
    return {
      ...parsed,
      foundation: recoverSlot(parsed.foundation),
      forged: recoverSlot(parsed.forged),
      ascendant: recoverSlot(parsed.ascendant),
    };
  } catch {
    return freshState();
  }
}

function recoverSlot(slot: TierSlot | undefined): TierSlot {
  if (!slot) return { phase: 'idle' };
  if (slot.phase === 'running' || slot.phase === 'confirming') {
    return { phase: 'error', message: 'Interrupted by reload — re-run this tier.' };
  }
  return slot;
}

// ---- Form setters -----------------------------------------------------

export function setArchetype(next: ArchetypeName): void {
  if (chainStarted()) return; // locked once tests started
  const answers = defaultAnswers(next);
  setState({ archetype: next, answers, element: firstEligible(next, answers) });
}

export function setAnswer(questionId: string, optionId: string): void {
  const nextOption = getOptionsForQuestion(state.archetype, questionId).find((o) => o.id === optionId);
  if (!nextOption) return;
  const answers: StoryPillarAnswers = {
    answers: state.answers.answers.map((a) =>
      a.questionId === questionId ? { questionId, optionId, answer: nextOption.text } : a,
    ),
  };
  const stillEligible = elementIsNarrativelyEligible(state.archetype, state.element, answers.answers);
  setState({
    answers,
    element: stillEligible ? state.element : firstEligible(state.archetype, answers),
  });
}

export function setElement(e: ElementName): void {
  setState({ element: e });
}

export function setBond(b: ElementBond): void {
  setState({ bond: b });
}

export function setIntent(s: string): void {
  setState({ intent: s });
}

export function setTierSlot(tier: Rank, slot: TierSlot): void {
  setState({ [tierKey(tier)]: slot } as Partial<LabChainState>);
}

export function resetChain(): void {
  setState({
    batchId: null,
    foundation: { phase: 'idle' },
    forged: { phase: 'idle' },
    ascendant: { phase: 'idle' },
  });
}

function tierKey(tier: Rank): 'foundation' | 'forged' | 'ascendant' {
  return tier === 'Foundation' ? 'foundation' : tier === 'Forged' ? 'forged' : 'ascendant';
}

// ---- Tier run ---------------------------------------------------------

// Executes in module scope so it survives navigation away from the Prompt Lab.
// onPersisted lets the page refresh its Sessions grid after a successful record.
export async function runTier(
  tier: Rank,
  priorTier: TierResult | undefined,
  priorRunId: string | undefined,
  onPersisted?: () => void,
): Promise<void> {
  const { archetype, answers, element, bond, intent, batchId } = state;
  try {
    setTierSlot(tier, { phase: 'running', step: 'Generating Claude text…' });
    const stats = makeTierStats(archetype, tier);
    const elementSelection = buildSelection(archetype, element, bond);
    const startedAt = Date.now();

    const claudeResult = await generateCardTextWithRetry({
      archetype,
      stats,
      answers,
      element: elementSelection,
      existingName: priorTier?.cardName,
      existingHiddenFate: priorTier?.hiddenFate,
    });

    setTierSlot(tier, { phase: 'running', step: 'Generating Leonardo portrait…' });
    const { dataUrl } = await generatePortraitStrict(
      claudeResult.portraitPrompt,
      claudeResult.negativePrompt ?? '',
    );
    const durationMs = Date.now() - startedAt;

    setTierSlot(tier, { phase: 'running', step: 'Persisting run…' });
    const persisted = await postRecord({
      batchId,
      archetype,
      tier,
      parentRunId: priorRunId ?? null,
      inputSnapshot: {
        archetype,
        element: elementSelection,
        answers,
        stats,
        intent: intent || null,
        priorTierName: priorTier?.cardName ?? null,
      },
      claudeResponse: claudeResult as unknown as Record<string, unknown>,
      leonardoPrompt: claudeResult.portraitPrompt,
      leonardoNegativePrompt: claudeResult.negativePrompt ?? '',
      imageDataUrl: dataUrl,
      durationMs,
      ensureBatch: intent ? { intent } : undefined,
    });
    if (!state.batchId) setState({ batchId: persisted.batchId });

    setTierSlot(tier, {
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
        stats,
        raw: claudeResult,
      },
    });
    onPersisted?.();
  } catch (err) {
    setTierSlot(tier, { phase: 'error', message: err instanceof Error ? err.message : String(err) });
  }
}

// ---- Server call ------------------------------------------------------

interface PostPayload {
  batchId: string | null;
  archetype: ArchetypeName;
  tier: Rank;
  parentRunId: string | null;
  inputSnapshot: Record<string, unknown>;
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
        status: 'success',
        inputSnapshot: payload.inputSnapshot,
        claudeModel: 'claude-haiku-4-5-20251001',
        claudePrompt: '(reconstructed inline; see claude_response for output shape)',
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

// ---- Player-flow helpers ----------------------------------------------

function defaultAnswers(archetype: ArchetypeName): StoryPillarAnswers {
  const qs = getQuestionsForArchetype(archetype);
  return {
    answers: qs.map((q) => {
      const opts = sampleOptions(archetype, q.id, 1);
      const chosen = opts[0];
      return {
        questionId: q.id,
        optionId: chosen?.id ?? `${q.id}_seed`,
        answer: chosen?.text ?? '(no seed available)',
      };
    }),
  };
}

function firstEligible(archetype: ArchetypeName, answers: StoryPillarAnswers): ElementName {
  const eligible = elementsAvailableToArchetype(archetype)
    .filter((e) => elementIsNarrativelyEligible(archetype, e, answers.answers));
  if (eligible.length > 0) return eligible[0];
  return elementsAvailableToArchetype(archetype)[0];
}

function makeTierStats(archetype: ArchetypeName, tier: Rank): CardStats {
  // Explicit per-tier values chosen so getOverallRank derives to EXACTLY the
  // intended rank. The old flat additive bump overshot: a "Forged" Mid-High Atk
  // (60 + 16 = 76) landed exactly on the Mid-High Ascendant floor, so the Forged
  // run derived to Ascendant and produced a byte-identical Ascendant prompt (the
  // "Ascendant == Forged" bug). These values keep Foundation below every forged
  // floor, Forged inside the forged band with NO stat at an ascendant floor, and
  // Ascendant at/above the ascendant floors. Biases: Atk Mid-High (forged 61,
  // ascendant 76), Def + resource Mid (forged 51, ascendant 71). Atk stays
  // dominant at every tier so the border/identity is continuous.
  const byTier: Record<Rank, { atk: number; def: number; resource: number }> = {
    Foundation: { atk: 58, def: 44, resource: 48 }, // all below forged floors
    Forged: { atk: 70, def: 58, resource: 62 }, //     forged band, none at asc floor
    Ascendant: { atk: 86, def: 78, resource: 80 }, //  all at/above asc floors
  };
  const v = byTier[tier];
  const isTech = archetype === 'Mech Pilot' || archetype === 'Android';
  const resource = isTech
    ? { Tech: { value: v.resource, bias: 'Mid' as const, hardCap: 85 } }
    : { Mana: { value: v.resource, bias: 'Mid' as const, hardCap: 85 } };
  return {
    Atk: { value: v.atk, bias: 'Mid-High' as const, hardCap: 90 },
    Def: { value: v.def, bias: 'Mid' as const, hardCap: 85 },
    ...resource,
  };
}

export { TIERS };
