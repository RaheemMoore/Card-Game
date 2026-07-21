import type {
  ApplyStrikeResult,
  ForgeStrikeConfig,
  RunRating,
  RunState,
  StrikeGrade,
  StrikeInput,
  StrikePattern,
  StrikeResult,
} from './types';

/**
 * Forge Strike pure engine.
 *
 * No clocks, no DOM, no randomness, no persistence, no card mutation.
 * The controller (useForgeStrike) owns rAF timing and hands the engine a
 * normalized marker position; the engine's grade is final — presentation
 * reacts to it and can never override it (plan §7.5). Duplicate and
 * out-of-order inputs are rejected here, not in the controller, so the
 * same protection holds for any future server-side re-run (§15.2).
 */

const RAIL_CENTER = 0.5;

/**
 * Zone edges are contractually inclusive; positions are derived from
 * float math (0.5 + halfWidth ≠ exactly halfWidth away), so inclusivity
 * is honored within this tolerance.
 */
const ZONE_EPSILON = 1e-9;

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * Sample a pattern's marker position at elapsed ms. Waypoints are a
 * looping piecewise-linear path; boundary t values are inclusive of the
 * segment they start.
 */
export function positionAt(pattern: StrikePattern, elapsedMs: number): number {
  const points = pattern.waypoints;
  const loopMs = points[points.length - 1].t;
  const t = ((elapsedMs % loopMs) + loopMs) % loopMs;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (t <= b.t) {
      const span = b.t - a.t;
      const frac = span === 0 ? 0 : (t - a.t) / span;
      return a.pos + (b.pos - a.pos) * frac;
    }
  }
  return points[points.length - 1].pos;
}

/**
 * Effective Perfect half-width for a strike attempted after `successCount`
 * prior successes. Shrinks geometrically per success, floored so it never
 * collapses. The Good window is unaffected (Raheem: red zone only).
 */
export function effectivePerfectHalfWidth(
  config: ForgeStrikeConfig,
  successCount: number,
  perfectMul = 1,
): number {
  const shrunk =
    config.zones.perfectHalfWidth *
    config.ramp.perfectShrinkPerSuccess ** successCount *
    perfectMul;
  return Math.max(config.ramp.minPerfectHalfWidth, shrunk);
}

/**
 * Marker time-scale multiplier for a strike attempted after `successCount`
 * prior successes. >1 compresses elapsed time, so the marker sweeps faster.
 * Presentation timing only — never affects grading.
 */
export function markerSpeedFactor(config: ForgeStrikeConfig, successCount: number): number {
  return config.ramp.speedGainPerSuccess ** successCount;
}

/**
 * Grade a strike from the normalized marker position. `successCount` is the
 * number of successful strikes already landed this run; it tightens the
 * Perfect window (see effectivePerfectHalfWidth). Zone edges are inclusive:
 * a marker exactly on the Perfect boundary is Perfect, exactly on the Good
 * boundary is Good.
 */
export function gradeStrike(
  config: ForgeStrikeConfig,
  markerPos: number,
  successCount: number,
  perfectMul = 1,
): StrikeGrade {
  const distance = Math.abs(markerPos - RAIL_CENTER);
  if (distance <= effectivePerfectHalfWidth(config, successCount, perfectMul) + ZONE_EPSILON)
    return 'perfect';
  if (distance <= config.zones.goodHalfWidth + ZONE_EPSILON) return 'good';
  return 'miss';
}

export function createRun(config: ForgeStrikeConfig): RunState {
  return {
    configVersion: config.configVersion,
    phase: 'armed',
    nextStrikeIndex: 0,
    strikes: [],
    score: 0,
    streak: 0,
    heat: 0,
  };
}

export function countSuccesses(state: RunState): number {
  return state.strikes.filter((s) => s.grade !== 'miss').length;
}

/**
 * Combo multiplier for a strike landed at `streak` (the streak length
 * INCLUDING this strike; a Miss has streak 0). Grows by combo.step per extra
 * consecutive success, capped at combo.max.
 */
export function comboMultiplier(config: ForgeStrikeConfig, streak: number): number {
  if (streak <= 0) return 0;
  return Math.min(config.combo.max, 1 + config.combo.step * (streak - 1));
}

/** Points a strike contributes = base × combo multiplier, rounded. */
export function strikePoints(config: ForgeStrikeConfig, grade: StrikeGrade, streak: number): number {
  if (grade === 'miss') return 0;
  return Math.round(config.scoring[grade] * comboMultiplier(config, streak));
}

/** Rating tier for a final run score (drives Temper Gauge fill). */
export function runRating(config: ForgeStrikeConfig, score: number): RunRating {
  if (score >= config.ratingScores.gold) return 'gold';
  if (score >= config.ratingScores.silver) return 'silver';
  if (score >= config.runGoal) return 'bronze';
  return 'fail';
}

/**
 * Resolve one strike. Rejects inputs for a completed run and inputs whose
 * strikeIndex doesn't match the armed strike (duplicate pointer events
 * re-submit the same index and are dropped). Returns a new state — the
 * input state is never mutated.
 */
export function applyStrike(
  config: ForgeStrikeConfig,
  state: RunState,
  input: StrikeInput,
): ApplyStrikeResult {
  if (state.phase === 'complete') {
    return { accepted: false, state, reason: 'run_complete' };
  }
  if (input.strikeIndex !== state.nextStrikeIndex) {
    return { accepted: false, state, reason: 'out_of_order' };
  }

  // Ramp keys off successes landed BEFORE this strike, so the difficulty a
  // player faces on strike N reflects their run so far. Per-strike perfectMul
  // (e.g. the tighter final two) stacks on top.
  const successCount = countSuccesses(state);
  const pattern = config.patterns[input.strikeIndex];
  const grade = gradeStrike(config, input.markerPos, successCount, pattern.perfectMul ?? 1);

  // Combo: a success extends the streak, a Miss breaks it. Points scale with
  // the streak-including-this-strike so a hot streak surges the score.
  const streak = grade === 'miss' ? 0 : state.streak + 1;
  const multiplier = comboMultiplier(config, streak);
  const points = strikePoints(config, grade, streak);
  const score = state.score + points;

  const result: StrikeResult = {
    strikeIndex: input.strikeIndex,
    patternId: pattern.id,
    markerPos: input.markerPos,
    grade,
    points,
    multiplier,
  };

  const strikes = [...state.strikes, result];
  const heat = clamp01(state.heat + config.heat[grade]);
  const isFinal = strikes.length >= config.strikeCount;

  const next: RunState = {
    configVersion: state.configVersion,
    phase: isFinal ? 'complete' : 'armed',
    nextStrikeIndex: strikes.length,
    strikes,
    score,
    streak,
    heat,
    outcome: isFinal ? (score >= config.runGoal ? 'win' : 'loss') : undefined,
  };

  return { accepted: true, state: next, result };
}
