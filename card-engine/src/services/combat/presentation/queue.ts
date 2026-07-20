import type { BattleEvent } from '../../../types/combat';
import { mapEventsToBeats } from './adapter';
import type { AnimationBeat } from './types';

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
): QueueState {
  if (rawEvents.length < state.consumedCount) {
    return createQueueState();
  }
  if (rawEvents.length === state.consumedCount) {
    return state;
  }
  const fresh = rawEvents.slice(state.consumedCount);
  const beats = mapEventsToBeats(fresh, state.consumedCount);
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
