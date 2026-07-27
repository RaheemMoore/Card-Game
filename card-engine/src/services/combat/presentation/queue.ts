import type { BattleEvent } from '../../../types/combat';
import { mapEventsToBeats } from './adapter';
import type { AnimationBeat } from './types';

/**
 * Tag a boss-relevant beat with 'heavy'/'normal' severity, driving the boss
 * charge-up visual + bigger AttackVFX sizing. Looks backward through the
 * FULL cumulative event log (not just the fresh batch being mapped this
 * call) since a hero's turns can span multiple syncEvents calls between the
 * boss's intent declaration and its actual resolution — a fresh-batch-only
 * lookup would miss the intent if it landed in an earlier batch.
 */
function severityFor(
  rawEvents: readonly BattleEvent[],
  absoluteIndex: number,
  event: BattleEvent,
  bossActorId: string,
): 'heavy' | 'normal' | undefined {
  if (event.kind === 'boss_intent_declared') {
    return event.intent.interruptible ? 'heavy' : 'normal';
  }
  if (event.kind === 'damage_dealt' && event.sourceActorId === bossActorId) {
    for (let j = absoluteIndex - 1; j >= 0; j--) {
      const e = rawEvents[j];
      if (e.kind === 'boss_intent_declared') {
        return e.intent.interruptible ? 'heavy' : 'normal';
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
): QueueState {
  if (rawEvents.length < state.consumedCount) {
    return createQueueState();
  }
  if (rawEvents.length === state.consumedCount) {
    return state;
  }
  const fresh = rawEvents.slice(state.consumedCount);
  const rawBeats = mapEventsToBeats(fresh, state.consumedCount);
  const beats = bossActorId
    ? rawBeats.map((beat, i) => {
        const severity = severityFor(rawEvents, state.consumedCount + i, beat.event, bossActorId);
        return severity ? { ...beat, severity } : beat;
      })
    : rawBeats;
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

/** Flush all pending beats into the journal at once. */
export function skipAll(state: QueueState): QueueState {
  if (state.pending.length === 0) return state;
  return {
    journal: [...state.journal, ...state.pending],
    pending: [],
    consumedCount: state.consumedCount,
  };
}
