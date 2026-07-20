import type { BattleEvent } from '../../../types/combat';

/**
 * Presentation layer for combat. The reducer emits BattleEvent[] synchronously;
 * this layer paces those events for the human eye. It is one-way and read-only:
 * beats derive from events, never feed back into the reducer.
 */

export type BeatCue =
  | 'narration'
  | 'intent'
  | 'wind_up'
  | 'impact'
  | 'floating'
  | 'handoff'
  | 'phase'
  | 'ultimate';

export interface AnimationBeat {
  /** Stable id — assigned by adapter, monotonic per event index. */
  id: string;
  /** The reducer event this beat renders. Frozen by ability-snapshot rule. */
  event: BattleEvent;
  /** How long the beat should hold before advancing (ms). */
  durationMs: number;
  cue: BeatCue;
}

/** C1 timing targets — Combat Wiki §Pacing. Single source of truth. */
export const TIMINGS = {
  narration: 200,
  intent: 800,
  windUpNormal: 400,
  windUpHeavy: 900,
  impact: 500,
  floating: 800,
  handoff: 500,
  phase: 1500,
  ultimate: 3000,
} as const;

/** Applied when prefers-reduced-motion is set. All beats collapse to this. */
export const REDUCED_MOTION_MS = 40;
