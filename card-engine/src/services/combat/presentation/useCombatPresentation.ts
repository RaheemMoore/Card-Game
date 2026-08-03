import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BattleEvent } from '../../../types/combat';
import type { MotionLevel } from '../../../vfx/types';
import {
  createQueueState,
  drainNext,
  selectCurrentBeat,
  skipAll,
  syncEvents,
  type AbilitySlotLookup,
  type PerformanceDurationLookup,
  type QueueState,
} from './queue';
import { REDUCED_MOTION_BY_CUE, type AnimationBeat } from './types';

/**
 * Drives paced playback of reducer events for the view. Given the growing
 * `rawEvents` stream from useBattle, appends new events to a queue and
 * drains beats on a timer. Never writes back to the reducer.
 *
 * Playback logic is in ./queue.ts (pure) — this file only owns React state
 * and the setTimeout that fires drainNext.
 */
export interface UseCombatPresentationApi {
  journal: readonly AnimationBeat[];
  currentBeat: AnimationBeat | null;
  isPlaying: boolean;
  pendingCount: number;
  skip(): void;
}

export interface UseCombatPresentationOptions {
  /** Resolved once by the view (CombatViewport) and threaded down. */
  motionLevel?: MotionLevel;
  /** Resolves an ability id to its slot so ultimates get their own pacing. */
  slotLookup?: AbilitySlotLookup;
  /** Holds a hero opener until its complete approved performance has played. */
  performanceDurationLookup?: PerformanceDurationLookup;
}

export function useCombatPresentation(
  rawEvents: readonly BattleEvent[],
  options: UseCombatPresentationOptions = {},
  bossActorId?: string,
): UseCombatPresentationApi {
  const [queue, setQueue] = useState<QueueState>(() => createQueueState());
  const timerRef = useRef<number | null>(null);

  const { slotLookup, performanceDurationLookup } = options;
  const motionLevel = options.motionLevel ?? (detectReducedMotion() ? 'off' : 'full');

  useEffect(() => {
    setQueue((prev) =>
      syncEvents(prev, rawEvents, bossActorId, slotLookup, performanceDurationLookup),
    );
  }, [rawEvents, bossActorId, slotLookup, performanceDurationLookup]);

  useEffect(() => {
    if (queue.pending.length === 0) return;
    if (timerRef.current !== null) return;

    const next = queue.pending[0];
    const holdMs = motionLevel === 'off' ? REDUCED_MOTION_BY_CUE[next.cue] : next.durationMs;

    const id = setTimeout(() => {
      timerRef.current = null;
      setQueue((prev) => drainNext(prev).state);
    }, holdMs) as unknown as number;
    timerRef.current = id;

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [queue.pending, motionLevel]);

  const skip = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setQueue((prev) => skipAll(prev));
  }, []);

  const currentBeat = selectCurrentBeat(queue);

  return useMemo(
    () => ({
      journal: queue.journal,
      currentBeat,
      isPlaying: queue.pending.length > 0,
      pendingCount: queue.pending.length,
      skip,
    }),
    [queue.journal, currentBeat, queue.pending.length, skip],
  );
}

function detectReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
