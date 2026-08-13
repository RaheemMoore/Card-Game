import { MOTION_LEVEL_STORAGE_KEY } from '../../../services/combat/presentation/gameFeel';
import type { MotionLevel } from '../../../vfx/types';

/**
 * How much motion the player has consented to, resolved once when the scene
 * starts.
 *
 * ONE SETTING, TWO FIGHTS. The boss battle already asks this question and
 * stores the answer under `MOTION_LEVEL_STORAGE_KEY`; reading the same key here
 * means a player who turned motion down in a boss fight does not have to find
 * the switch again for the courtyard. The key is the only thing imported from
 * that system — its NUMBERS are deliberately not shared, see `combat/feel.ts`.
 *
 * Not a React hook, unlike its counterpart `useMotionLevel`: the courtyard is a
 * Phaser scene, and a scene cannot subscribe to one. Resolved on create and
 * held for the session, which is the same granularity the battle uses (it
 * resolves once per battle and threads the answer down as a prop).
 *
 * `prefers-reduced-motion` selects 'off' but does not LOCK it. A player who has
 * the OS flag on for page scrolling may still want to see a hit land, and the
 * explicit choice is theirs.
 */

const LEVELS: readonly MotionLevel[] = ['off', 'subtle', 'full'];

export function resolveMotionLevel(): MotionLevel {
  const stored = readStored();
  if (stored) return stored;
  return prefersReduced() ? 'off' : 'full';
}

function readStored(): MotionLevel | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MOTION_LEVEL_STORAGE_KEY);
    return LEVELS.includes(raw as MotionLevel) ? (raw as MotionLevel) : null;
  } catch {
    // Private browsing or storage disabled. Not knowing the preference is not
    // an error; it just means falling back to the OS.
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
