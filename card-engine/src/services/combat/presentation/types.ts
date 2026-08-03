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

/**
 * How much drama a beat has earned. Drives beat DURATION (via the adapter),
 * effect intensity, and which game-feel tier fires — see
 * `services/combat/presentation/gameFeel.ts`.
 *
 * 'heavy'    — an interruptible boss action (a real telegraphed charge).
 * 'ultimate' — a hero spending an ultimate-slot ability.
 */
export type BeatSeverity = 'normal' | 'heavy' | 'ultimate';

export interface AnimationBeat {
  /** Stable id — assigned by adapter, monotonic per event index. */
  id: string;
  /** The reducer event this beat renders. Frozen by ability-snapshot rule. */
  event: BattleEvent;
  /** How long the beat should hold before advancing (ms). */
  durationMs: number;
  cue: BeatCue;
  /** Set on `boss_intent_declared`, the boss's own `damage_dealt`, and an
   *  ultimate-slot `player_action_selected`. Derived once at queue time
   *  rather than from live state, which may already have moved past the
   *  declaring round. */
  severity?: BeatSeverity;
  /** True for beats flushed by `skip()`. Effect consumers MUST bail on these:
   *  a skipped 12-beat boss turn would otherwise fire a full-screen flash and
   *  an arena shake for its final damage event with no build-up at all.
   *  State-carrying visuals (floating numbers, HP bars) still render — the
   *  player skipped the drama, not the information. */
  suppressEffects?: boolean;
  /**
   * A party-volley receipt can suppress its own standalone flash without
   * cancelling the already-flying performances. Skip-all deliberately omits
   * this flag because skipping should clear every active effect immediately.
   */
  preserveActivePerformance?: boolean;
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
  impactHeavy: 650,
  floating: 350,
  handoff: 300,
  phase: 1500,
  ultimate: 3000,
} as const;

/**
 * Beat holds when motion is off (or the OS asks for reduced motion).
 *
 * Reduced motion means "no MOTION", not "no TIME" — the previous flat 40ms
 * collapsed every beat equally, which is why the reduced-motion path felt
 * like the animation had simply been skipped. Dramatic beats keep enough
 * hold to read as deliberate; their MOTION is what the components drop.
 */
export const REDUCED_MOTION_BY_CUE: Record<BeatCue, number> = {
  narration: 40,
  intent: 200,
  wind_up: 80,
  impact: 120,
  floating: 120,
  handoff: 60,
  phase: 600,
  ultimate: 1200,
};
