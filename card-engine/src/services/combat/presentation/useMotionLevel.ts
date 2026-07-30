import { useCallback, useEffect, useState } from 'react';
import type { MotionLevel } from '../../../vfx/types';
import { MOTION_LEVEL_STORAGE_KEY } from './gameFeel';

const LEVELS: readonly MotionLevel[] = ['off', 'subtle', 'full'];

function readStored(): MotionLevel | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MOTION_LEVEL_STORAGE_KEY);
    return LEVELS.includes(raw as MotionLevel) ? (raw as MotionLevel) : null;
  } catch {
    return null;
  }
}

function prefersReduced(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * The player's combat motion setting, resolved ONCE per battle and threaded
 * down as a prop.
 *
 * Resolved here rather than per-component on purpose: `matchMedia` was
 * already being read independently in several components, and every new
 * effect would have added another copy. One source, one answer, no drift.
 *
 * `prefers-reduced-motion` selects 'off' by default but does not LOCK it —
 * a player who has the OS setting on for scrolling animations may still want
 * combat feedback, and the explicit choice is theirs to make. Conversely the
 * setting exists for players who are flash-sensitive but never turned the OS
 * flag on, which `prefers-reduced-motion` alone would miss entirely.
 */
export function useMotionLevel(): [MotionLevel, (next: MotionLevel) => void] {
  const [level, setLevel] = useState<MotionLevel>(
    () => readStored() ?? (prefersReduced() ? 'off' : 'full'),
  );

  // Follow the OS setting while the player has not expressed a preference.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (readStored()) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setLevel(mq.matches ? 'off' : 'full');
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const choose = useCallback((next: MotionLevel) => {
    setLevel(next);
    try {
      window.localStorage.setItem(MOTION_LEVEL_STORAGE_KEY, next);
    } catch {
      // Private browsing / storage disabled — the setting still applies for
      // this session, it just will not be remembered.
    }
  }, []);

  return [level, choose];
}
