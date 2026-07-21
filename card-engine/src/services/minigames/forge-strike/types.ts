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
  /**
   * Per-strike marker time-scale multiplier (>1 = faster), stacked ON TOP of
   * the success ramp. Used to make specific strikes (e.g. the final two)
   * harder regardless of streak. Defaults to 1.
   */
  speedMul?: number;
  /**
   * Per-strike Perfect half-width multiplier (<1 = tighter), stacked on top
   * of the success ramp, floored by ramp.minPerfectHalfWidth. Defaults to 1.
   */
  perfectMul?: number;
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

/**
 * Skill-escalation ramp (Gate-1 direction, Raheem 2026-07-20): every
 * successful strike so far tightens the Perfect window and quickens the
 * marker for the NEXT strike. This supersedes the plan §7.4 fixed
 * per-strike speed schedule — patterns now carry shape only, and the ramp
 * owns speed. A player who keeps missing stays at base difficulty (the
 * ramp keys off successes, not strike index).
 */
export interface DifficultyRamp {
  /** Marker time-scale multiplier per prior success (>1 = faster). */
  speedGainPerSuccess: number;
  /** Perfect half-width multiplier per prior success (<1 = shrinks). */
  perfectShrinkPerSuccess: number;
  /** Floor so the Perfect window never collapses to nothing. */
  minPerfectHalfWidth: number;
}

/**
 * Forge Score model (Raheem v2, 2026-07-20): each strike adds points scaled
 * by a combo multiplier that grows on consecutive successes and resets on a
 * Miss. The run is "successful" when the total reaches runGoal, and earns a
 * rating tier that decides how much the persistent Temper Gauge fills.
 */
export interface ScoringWeights {
  perfect: number;
  good: number;
  miss: number;
}

export interface ComboConfig {
  /** Multiplier added per extra strike in the streak (streak 1 = ×1). */
  step: number;
  /** Hard ceiling on the multiplier. */
  max: number;
}

export type RunRating = 'fail' | 'bronze' | 'silver' | 'gold';

export interface ForgeStrikeConfig {
  configVersion: number;
  strikeCount: number;
  zones: GradeZones;
  ramp: DifficultyRamp;
  scoring: ScoringWeights;
  combo: ComboConfig;
  /** Score needed for a successful run (also the Bronze threshold). */
  runGoal: number;
  /** Score thresholds for the higher rating tiers. */
  ratingScores: { silver: number; gold: number };
  /** Fraction of the Temper Gauge a run pours in, per rating tier. */
  temperFill: { bronze: number; silver: number; gold: number };
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
  /** Points this strike contributed (base × combo multiplier). */
  points: number;
  /** Combo multiplier in effect for this strike. */
  multiplier: number;
}

export interface RunState {
  configVersion: number;
  phase: RunPhase;
  /** Index of the next strike awaiting input; equals strikes.length. */
  nextStrikeIndex: number;
  strikes: StrikeResult[];
  /** Running Forge Score for the run. */
  score: number;
  /** Current combo streak of consecutive successes (0 after a Miss). */
  streak: number;
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
