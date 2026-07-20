import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BattleEvent } from '../../../types/combat';
import { createQueueState, drainNext, skipAll, syncEvents, type QueueState } from './queue';
import { REDUCED_MOTION_MS, type AnimationBeat } from './types';

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
  /** Force reduced-motion behaviour (test override). Defaults to media query. */
  reducedMotion?: boolean;
}

export function useCombatPresentation(
  rawEvents: readonly BattleEvent[],
  options: UseCombatPresentationOptions = {},
): UseCombatPresentationApi {
  const [queue, setQueue] = useState<QueueState>(() => createQueueState());
  const timerRef = useRef<number | null>(null);

  const reducedMotion = options.reducedMotion ?? detectReducedMotion();

  useEffect(() => {
    setQueue((prev) => syncEvents(prev, rawEvents));
  }, [rawEvents]);

  useEffect(() => {
    if (queue.pending.length === 0) return;
    if (timerRef.current !== null) return;

    const next = queue.pending[0];
    const holdMs = reducedMotion ? REDUCED_MOTION_MS : next.durationMs;

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
  }, [queue.pending, reducedMotion]);

  const skip = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setQueue((prev) => skipAll(prev));
  }, []);

  const currentBeat = queue.journal.length > 0 ? queue.journal[queue.journal.length - 1] : null;

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
