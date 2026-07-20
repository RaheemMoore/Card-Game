import type { StatName } from '../../../types/card';

/**
 * Forge Strike — pure engine types.
 *
 * The engine is clock-free and DOM-free: the controller samples the marker
 * position (normalized 0..1 rail space) at the accepted input event and
 * hands it to the engine. Grade boundaries live in normalized rail space,
 * never pixels. See Forge_Strike_Master_Plan.md §7 and §13.1.
 */

export type StrikeGrade = 'perfect' | 'good' | 'miss';

export type RunOutcome = 'win' | 'loss';

export type RunPhase = 'armed' | 'complete';

/**
 * A marker path is a looping piecewise-linear waypoint sequence over time.
 * Waypoints must start at t=0 and be strictly increasing in t; position is
 * interpolated between them and the sequence loops at the final waypoint's
 * t. A mid-loop direction reversal is expressed purely as data — no special
 * cases in the sampling code.
 */
export interface PatternWaypoint {
  /** Milliseconds from loop start. */
  t: number;
  /** Normalized rail position 0..1. */
  pos: number;
}

export interface StrikePattern {
  id: string;
  waypoints: PatternWaypoint[];
  /**
   * Presentation-only: when set, the controller shows a reversal cue this
   * many ms before the direction flip. Never read by scoring.
   */
  telegraphAtMs?: number;
}

export interface GradeZones {
  /** Half-width of the Perfect zone around rail center (0.5), inclusive. */
  perfectHalfWidth: number;
  /** Half-width of the Good zone around rail center (0.5), inclusive. */
  goodHalfWidth: number;
}

export interface HeatWeights {
  perfect: number;
  good: number;
  /** Negative — a Miss cools the forge slightly (plan §8.4). */
  miss: number;
}

export interface ForgeStrikeConfig {
  configVersion: number;
  strikeCount: number;
  /** Successful strikes (good or perfect) required to win the run. */
  winThreshold: number;
  zones: GradeZones;
  /** One pattern per scored strike, index-aligned. Length === strikeCount. */
  patterns: StrikePattern[];
  /** Pattern used for the guided, non-scored practice strike. */
  practicePattern: StrikePattern;
  heat: HeatWeights;
}

export interface StrikeResult {
  strikeIndex: number;
  patternId: string;
  /** Normalized marker position at the accepted input. */
  markerPos: number;
  grade: StrikeGrade;
}

export interface RunState {
  configVersion: number;
  phase: RunPhase;
  /** Index of the next strike awaiting input; equals strikes.length. */
  nextStrikeIndex: number;
  strikes: StrikeResult[];
  /** Presentation-only forge heat, clamped 0..1. Derived from grades. */
  heat: number;
  /** Set when phase === 'complete'. */
  outcome?: RunOutcome;
}

export interface StrikeInput {
  strikeIndex: number;
  markerPos: number;
}

export type ApplyStrikeResult =
  | { accepted: true; state: RunState; result: StrikeResult }
  | { accepted: false; state: RunState; reason: 'out_of_order' | 'run_complete' };

/** Card + stat binding for a session. The engine never reads the card. */
export interface ForgeStrikeSession {
  cardId: string;
  stat: StatName;
}
