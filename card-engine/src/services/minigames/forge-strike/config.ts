import type { ForgeStrikeConfig, StrikePattern } from './types';

/**
 * Forge Strike v1 tuning — playtest values, NOT approved balance.
 *
 * Every number here is a Gate-1 instrument-and-adjust candidate (plan §7.3,
 * §7.4). Changing strikeCount or winThreshold is a reviewed tuning change.
 * Grade zones are normalized rail space centered on 0.5.
 *
 * Speed is no longer baked per strike-index. Per Raheem (Gate 1, 2026-07-20)
 * the marker quickens and the Perfect window tightens with every successful
 * strike (see ramp below), so patterns now carry SHAPE only at a uniform
 * base sweep. Strike 3 keeps its telegraphed direction reversal for variety.
 * No teleports, hidden switches, or unfair fake-outs (§7.4).
 */

/** Uniform base sweep — the success-ramp, not the schedule, drives speed. */
const BASE_SWEEP_MS = 1300;

function sweep(id: string, sweepMs: number): StrikePattern {
  return {
    id,
    waypoints: [
      { t: 0, pos: 0 },
      { t: sweepMs, pos: 1 },
      { t: sweepMs * 2, pos: 0 },
    ],
  };
}

/**
 * Strike 3: normal outbound sweep, then on the return leg the marker
 * reverses back toward the far end at 65% of the loop before coming home.
 * The flip is telegraphed one beat (~350ms) ahead by the controller.
 */
function reversalSweep(id: string, sweepMs: number): StrikePattern {
  const flipT = sweepMs * 1.3; // 65% through the 2×sweep loop
  return {
    id,
    waypoints: [
      { t: 0, pos: 0 },
      { t: sweepMs, pos: 1 },
      { t: flipT, pos: 0.7 },
      { t: sweepMs * 1.8, pos: 1 },
      { t: sweepMs * 2.4, pos: 0 },
    ],
    telegraphAtMs: flipT - 350,
  };
}

export const FORGE_STRIKE_CONFIG_V1: ForgeStrikeConfig = {
  configVersion: 1,
  strikeCount: 5,
  winThreshold: 3,
  zones: {
    perfectHalfWidth: 0.07,
    goodHalfWidth: 0.2,
  },
  ramp: {
    // Each landed strike makes the marker ~15% faster and the red zone
    // ~18% narrower for the next one. Instrumented playtest values.
    speedGainPerSuccess: 1.15,
    perfectShrinkPerSuccess: 0.82,
    minPerfectHalfWidth: 0.025,
  },
  patterns: [
    sweep('s1', BASE_SWEEP_MS),
    sweep('s2', BASE_SWEEP_MS),
    reversalSweep('s3_reversal', BASE_SWEEP_MS),
    // Final two bite harder regardless of streak — faster marker + tighter
    // Perfect window, stacked on top of the success ramp (Raheem 2026-07-20).
    { ...sweep('s4', BASE_SWEEP_MS), speedMul: 1.3, perfectMul: 0.8 },
    { ...sweep('s5', BASE_SWEEP_MS), speedMul: 1.6, perfectMul: 0.6 },
  ],
  practicePattern: sweep('practice', 1600),
  heat: {
    perfect: 0.25,
    good: 0.14,
    miss: -0.08,
  },
};
