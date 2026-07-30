import type { BattleEvent } from '../../../types/combat';
import type { AbilitySlotType } from '../../../types/abilities';
import { mapEventsToBeats } from './adapter';
import type { AnimationBeat, BeatSeverity } from './types';

/** Resolves an ability definition id to its slot, so an ultimate can be
 *  recognised at queue time. Built by the view from the already-frozen
 *  `snapshot.abilities` — deliberately a lookup rather than a new field, so
 *  nothing is added to the determinism payload. */
export type AbilitySlotLookup = (definitionId: string) => AbilitySlotType | undefined;

/**
 * Tag a beat with the drama it has earned. Looks backward through the FULL
 * cumulative event log (not just the fresh batch being mapped this call)
 * since a hero's turns can span multiple syncEvents calls between the boss's
 * intent declaration and its actual resolution — a fresh-batch-only lookup
 * would miss the intent if it landed in an earlier batch.
 */
function severityFor(
  rawEvents: readonly BattleEvent[],
  absoluteIndex: number,
  event: BattleEvent,
  bossActorId: string,
  slotLookup?: AbilitySlotLookup,
): BeatSeverity | undefined {
  if (event.kind === 'boss_intent_declared') {
    return event.intent.interruptible ? 'heavy' : 'normal';
  }
  if (event.kind === 'player_action_selected') {
    if (event.action.kind !== 'ability') return undefined;
    return slotLookup?.(event.action.abilityDefinitionId) === 'ultimate'
      ? 'ultimate'
      : undefined;
  }
  if (event.kind === 'damage_dealt') {
    if (event.sourceActorId === bossActorId) {
      for (let j = absoluteIndex - 1; j >= 0; j--) {
        const e = rawEvents[j];
        if (e.kind === 'boss_intent_declared') {
          return e.intent.interruptible ? 'heavy' : 'normal';
        }
      }
      return undefined;
    }
    // Hero-sourced damage inherits the ultimate flag from the action that
    // caused it, so the payoff hit is as big as the wind-up promised. Same
    // backward-scan shape as the boss branch above; stops at the round
    // boundary so a later basic attack can't inherit a stale ultimate.
    if (!slotLookup) return undefined;
    for (let j = absoluteIndex - 1; j >= 0; j--) {
      const e = rawEvents[j];
      if (e.kind === 'round_started') return undefined;
      if (e.kind === 'player_action_selected' && e.actorId === event.sourceActorId) {
        if (e.action.kind !== 'ability') return undefined;
        return slotLookup(e.action.abilityDefinitionId) === 'ultimate' ? 'ultimate' : undefined;
      }
    }
  }
  return undefined;
}

/**
 * Pure state machine backing useCombatPresentation. Kept separate so the
 * playback logic can be tested without React. The hook owns timers and
 * state transitions; this module owns "what to draw next" decisions.
 */
export interface QueueState {
  journal: AnimationBeat[];
  pending: AnimationBeat[];
  /** Number of raw events already turned into beats. */
  consumedCount: number;
}

export function createQueueState(): QueueState {
  return { journal: [], pending: [], consumedCount: 0 };
}

/**
 * Sync the queue against the growing rawEvents stream. New tail events
 * become new beats. If rawEvents SHRINKS (new battle started), everything
 * resets — journal, pending, and consumedCount.
 */
export function syncEvents(
  state: QueueState,
  rawEvents: readonly BattleEvent[],
  bossActorId?: string,
  slotLookup?: AbilitySlotLookup,
): QueueState {
  if (rawEvents.length < state.consumedCount) {
    return createQueueState();
  }
  if (rawEvents.length === state.consumedCount) {
    return state;
  }
  const fresh = rawEvents.slice(state.consumedCount);
  // Severity is resolved BEFORE mapping, not stamped on afterward, because it
  // decides each beat's duration as well as its look.
  const beats = mapEventsToBeats(fresh, state.consumedCount, (i) =>
    bossActorId
      ? severityFor(rawEvents, state.consumedCount + i, fresh[i], bossActorId, slotLookup)
      : undefined,
  );
  return {
    journal: state.journal,
    pending: [...state.pending, ...beats],
    consumedCount: rawEvents.length,
  };
}

/**
 * Move the head of the queue into the journal — the beat's hold time has
 * elapsed. Returns the new state and the beat that was drained (null if the
 * queue was empty).
 */
export function drainNext(state: QueueState): {
  state: QueueState;
  drained: AnimationBeat | null;
} {
  if (state.pending.length === 0) {
    return { state, drained: null };
  }
  const [head, ...rest] = state.pending;
  return {
    drained: head,
    state: {
      journal: [...state.journal, head],
      pending: rest,
      consumedCount: state.consumedCount,
    },
  };
}

/**
 * The beat that should be ON SCREEN right now: the one whose hold timer is
 * running, i.e. the head of `pending`.
 *
 * This looks trivial and is not. Until 2026-07-28 the view read the JOURNAL
 * TAIL instead — the beat that had just finished. Because the hook waits
 * `pending[0].durationMs` and only THEN moves that beat into the journal, a
 * beat became "current" after its hold had already elapsed, and then stayed
 * current for however long the NEXT beat held. Every beat therefore displayed
 * for its successor's duration. The reducer emits `ultimate_charge_changed`
 * (narration, 120ms) immediately after `damage_dealt`, so in practice every
 * impact in the game rendered for 120ms against a 400ms budget.
 *
 * Falls back to the journal tail so the final beat of a battle stays on
 * screen after the queue drains rather than blanking out.
 */
export function selectCurrentBeat(state: QueueState): AnimationBeat | null {
  return state.pending[0] ?? state.journal[state.journal.length - 1] ?? null;
}

/**
 * Flush all pending beats into the journal at once.
 *
 * Flushed beats are tagged `suppressEffects` because only the LAST of them
 * ever becomes `currentBeat` — without the tag, skipping a long boss turn
 * fires a full-screen flash and an arena shake for its final damage event
 * with no build-up whatsoever. The journal still records everything, and
 * state-carrying visuals ignore the flag.
 */
export function skipAll(state: QueueState): QueueState {
  if (state.pending.length === 0) return state;
  return {
    journal: [...state.journal, ...state.pending.map((b) => ({ ...b, suppressEffects: true }))],
    pending: [],
    consumedCount: state.consumedCount,
  };
}
