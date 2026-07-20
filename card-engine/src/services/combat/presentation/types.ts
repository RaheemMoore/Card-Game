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

/**
 * Timing targets. C1 shipped the Combat Wiki §Pacing numbers; P1 (2026-07-20,
 * Raheem direct ask) tightens the mid-turn beats — floats, narration, intent,
 * normal wind-up — so party-guard turns don't feel like they've stalled.
 * Heavy/ultimate/phase beats keep their dramatic hold because they earn it.
 */
export const TIMINGS = {
  narration: 120,
  intent: 550,
  windUpNormal: 250,
  windUpHeavy: 900,
  impact: 400,
  floating: 350,
  handoff: 300,
  phase: 1500,
  ultimate: 3000,
} as const;

/** Applied when prefers-reduced-motion is set. All beats collapse to this. */
export const REDUCED_MOTION_MS = 40;
