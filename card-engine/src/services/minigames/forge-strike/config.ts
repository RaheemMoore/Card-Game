import type { ForgeStrikeConfig, StrikePattern } from './types';

/**
 * Forge Strike v1 tuning — playtest values, NOT approved balance.
 *
 * Every number here is a Gate-1 instrument-and-adjust candidate (plan §7.3,
 * §7.4). Changing strikeCount or winThreshold is a reviewed tuning change.
 * Grade zones are normalized rail space centered on 0.5.
 *
 * Pattern schedule (approved direction, Stage 0):
 *   1 normal → 2 slightly faster → 3 telegraphed direction reversal →
 *   4 faster but predictable → 5 fastest.
 * No teleports, hidden switches, or unfair fake-outs (§7.4).
 */

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
  patterns: [
    sweep('s1_normal', 1400),
    sweep('s2_quicker', 1200),
    reversalSweep('s3_reversal', 1300),
    sweep('s4_fast', 1000),
    sweep('s5_fastest', 820),
  ],
  practicePattern: sweep('practice', 1600),
  heat: {
    perfect: 0.25,
    good: 0.14,
    miss: -0.08,
  },
};
