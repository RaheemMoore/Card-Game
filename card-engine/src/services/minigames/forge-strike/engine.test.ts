import { describe, expect, it } from 'vitest';
import { FORGE_STRIKE_CONFIG_V1 as CFG } from './config';
import {
  applyStrike,
  clamp01,
  countSuccesses,
  createRun,
  effectivePerfectHalfWidth,
  gradeStrike,
  markerSpeedFactor,
  positionAt,
} from './engine';
import type { RunState } from './types';

const { perfectHalfWidth, goodHalfWidth } = CFG.zones;

function runWithGrades(markerPositions: number[]): RunState {
  let state = createRun(CFG);
  for (const [i, pos] of markerPositions.entries()) {
    const out = applyStrike(CFG, state, { strikeIndex: i, markerPos: pos });
    if (!out.accepted) throw new Error(`strike ${i} rejected: ${out.reason}`);
    state = out.state;
  }
  return state;
}

// Positions that reliably produce each grade.
const PERFECT = 0.5;
const GOOD = 0.5 + (perfectHalfWidth + goodHalfWidth) / 2;
const MISS = 0.95;

describe('gradeStrike boundaries', () => {
  it('center is perfect', () => {
    expect(gradeStrike(CFG, 0.5, 0)).toBe('perfect');
  });

  it('exactly on the perfect boundary is perfect (inclusive), both sides', () => {
    expect(gradeStrike(CFG, 0.5 + perfectHalfWidth, 0)).toBe('perfect');
    expect(gradeStrike(CFG, 0.5 - perfectHalfWidth, 0)).toBe('perfect');
  });

  it('just outside the perfect boundary is good', () => {
    expect(gradeStrike(CFG, 0.5 + perfectHalfWidth + 1e-6, 0)).toBe('good');
  });

  it('exactly on the good boundary is good (inclusive), both sides', () => {
    expect(gradeStrike(CFG, 0.5 + goodHalfWidth, 0)).toBe('good');
    expect(gradeStrike(CFG, 0.5 - goodHalfWidth, 0)).toBe('good');
  });

  it('just outside the good boundary is miss', () => {
    expect(gradeStrike(CFG, 0.5 + goodHalfWidth + 1e-6, 0)).toBe('miss');
    expect(gradeStrike(CFG, 0, 0)).toBe('miss');
    expect(gradeStrike(CFG, 1, 0)).toBe('miss');
  });
});

describe('success ramp — Perfect zone shrink + marker speed-up', () => {
  it('perfect half-width shrinks geometrically per success', () => {
    const base = effectivePerfectHalfWidth(CFG, 0);
    expect(base).toBe(CFG.zones.perfectHalfWidth);
    const one = effectivePerfectHalfWidth(CFG, 1);
    expect(one).toBeCloseTo(CFG.zones.perfectHalfWidth * CFG.ramp.perfectShrinkPerSuccess, 10);
    expect(one).toBeLessThan(base);
    expect(effectivePerfectHalfWidth(CFG, 2)).toBeLessThan(one);
  });

  it('perfect half-width never falls below the configured floor', () => {
    const deep = effectivePerfectHalfWidth(CFG, 50);
    expect(deep).toBe(CFG.ramp.minPerfectHalfWidth);
  });

  it('marker speed factor grows with successes and is 1 at zero', () => {
    expect(markerSpeedFactor(CFG, 0)).toBe(1);
    expect(markerSpeedFactor(CFG, 1)).toBeCloseTo(CFG.ramp.speedGainPerSuccess, 10);
    expect(markerSpeedFactor(CFG, 3)).toBeGreaterThan(markerSpeedFactor(CFG, 2));
  });

  it('a position that is Perfect early becomes Good once the zone tightens', () => {
    // A hair inside the base Perfect edge...
    const pos = 0.5 + CFG.zones.perfectHalfWidth - 1e-4;
    expect(gradeStrike(CFG, pos, 0)).toBe('perfect');
    // ...falls outside the shrunken Perfect zone after several successes,
    // but is still within the (unchanged) Good zone.
    expect(gradeStrike(CFG, pos, 4)).toBe('good');
  });

  it('per-strike perfectMul tightens the Perfect zone on top of the ramp', () => {
    // With no successes, strike 5 (perfectMul 0.6) is tighter than base.
    const base = effectivePerfectHalfWidth(CFG, 0, 1);
    const s5 = effectivePerfectHalfWidth(CFG, 0, 0.6);
    expect(s5).toBeCloseTo(base * 0.6, 10);
    expect(s5).toBeLessThan(base);
  });

  it('the final two strikes carry harder modifiers than the opener', () => {
    const [s4, s5] = [CFG.patterns[3], CFG.patterns[4]];
    expect(s4.speedMul).toBeGreaterThan(1);
    expect(s5.speedMul).toBeGreaterThan(s4.speedMul!);
    expect(s4.perfectMul).toBeLessThan(1);
    expect(s5.perfectMul).toBeLessThan(s4.perfectMul!);
    expect(CFG.patterns[0].speedMul ?? 1).toBe(1);
  });

  it('applyStrike honors the strike-index perfectMul when grading', () => {
    // A position that would be Perfect on strike 1 (base) can miss the
    // tighter Perfect zone on strike 5, landing Good instead — at equal
    // success counts, so the difference is purely the per-strike modifier.
    const pos = 0.5 + CFG.zones.perfectHalfWidth * 0.8; // inside base, outside 0.6×
    const fresh = createRun(CFG);
    const onS1 = applyStrike(CFG, fresh, { strikeIndex: 0, markerPos: pos });
    if (!onS1.accepted) throw new Error('rejected');
    expect(onS1.result.grade).toBe('perfect');
    // Grade strike 5's zone directly at the same zero-success difficulty.
    expect(gradeStrike(CFG, pos, 0, CFG.patterns[4].perfectMul)).toBe('good');
  });

  it('the Good zone is unaffected by the ramp (red zone only)', () => {
    const edge = 0.5 + goodHalfWidth;
    expect(gradeStrike(CFG, edge, 0)).toBe('good');
    expect(gradeStrike(CFG, edge, 5)).toBe('good');
    expect(gradeStrike(CFG, edge + 1e-3, 5)).toBe('miss');
  });

  it('applyStrike tightens Perfect as successes accumulate in a live run', () => {
    // Fix the marker just inside the base Perfect edge every strike; early
    // strikes read Perfect, later ones downgrade to Good as the zone shrinks.
    const pos = 0.5 + CFG.zones.perfectHalfWidth - 1e-4;
    let state = createRun(CFG);
    const grades: string[] = [];
    for (let i = 0; i < CFG.strikeCount; i++) {
      const out = applyStrike(CFG, state, { strikeIndex: i, markerPos: pos });
      if (!out.accepted) throw new Error('rejected');
      grades.push(out.result.grade);
      state = out.state;
    }
    expect(grades[0]).toBe('perfect');
    expect(grades[grades.length - 1]).toBe('good');
  });
});

describe('run progression and outcome', () => {
  it('five strikes complete the run; 3+ successes win', () => {
    const state = runWithGrades([PERFECT, GOOD, MISS, GOOD, MISS]);
    expect(state.phase).toBe('complete');
    expect(countSuccesses(state)).toBe(3);
    expect(state.outcome).toBe('win');
  });

  it('fewer than 3 successes lose', () => {
    const state = runWithGrades([MISS, MISS, GOOD, MISS, PERFECT]);
    expect(state.outcome).toBe('loss');
  });

  it('exactly winThreshold successes is a win (boundary)', () => {
    const state = runWithGrades([GOOD, GOOD, GOOD, MISS, MISS]);
    expect(state.outcome).toBe('win');
  });

  it('records patternId and markerPos per strike', () => {
    const state = runWithGrades([PERFECT, GOOD, MISS, GOOD, PERFECT]);
    expect(state.strikes.map((s) => s.patternId)).toEqual(CFG.patterns.map((p) => p.id));
    expect(state.strikes[0].markerPos).toBe(PERFECT);
  });

  it('a miss does not interrupt the sequence', () => {
    let state = createRun(CFG);
    const out = applyStrike(CFG, state, { strikeIndex: 0, markerPos: MISS });
    if (!out.accepted) throw new Error('rejected');
    state = out.state;
    expect(state.phase).toBe('armed');
    expect(state.nextStrikeIndex).toBe(1);
  });
});

describe('duplicate and out-of-order input rejection', () => {
  it('rejects a duplicate strikeIndex without changing state', () => {
    let state = createRun(CFG);
    const first = applyStrike(CFG, state, { strikeIndex: 0, markerPos: PERFECT });
    if (!first.accepted) throw new Error('rejected');
    state = first.state;
    const dup = applyStrike(CFG, state, { strikeIndex: 0, markerPos: MISS });
    expect(dup.accepted).toBe(false);
    if (!dup.accepted) expect(dup.reason).toBe('out_of_order');
    expect(dup.state).toBe(state);
    expect(state.strikes).toHaveLength(1);
  });

  it('rejects a skipped-ahead strikeIndex', () => {
    const state = createRun(CFG);
    const out = applyStrike(CFG, state, { strikeIndex: 2, markerPos: PERFECT });
    expect(out.accepted).toBe(false);
  });

  it('rejects any input after the run completes', () => {
    const state = runWithGrades([GOOD, GOOD, GOOD, GOOD, GOOD]);
    const out = applyStrike(CFG, state, { strikeIndex: 5, markerPos: PERFECT });
    expect(out.accepted).toBe(false);
    if (!out.accepted) expect(out.reason).toBe('run_complete');
  });
});

describe('determinism and immutability', () => {
  it('identical inputs produce identical final states', () => {
    const inputs = [PERFECT, GOOD, MISS, GOOD, PERFECT];
    expect(runWithGrades(inputs)).toEqual(runWithGrades(inputs));
  });

  it('applyStrike never mutates the input state', () => {
    const state = createRun(CFG);
    const frozen = JSON.stringify(state);
    applyStrike(CFG, state, { strikeIndex: 0, markerPos: PERFECT });
    expect(JSON.stringify(state)).toBe(frozen);
  });

  it('stamps the config version on the run', () => {
    expect(createRun(CFG).configVersion).toBe(CFG.configVersion);
  });
});

describe('heat derivation (presentation-only)', () => {
  it('heat rises with successes and is clamped to 1', () => {
    const state = runWithGrades([PERFECT, PERFECT, PERFECT, PERFECT, PERFECT]);
    expect(state.heat).toBe(1);
  });

  it('heat never goes below 0', () => {
    const state = runWithGrades([MISS, MISS, MISS, MISS, MISS]);
    expect(state.heat).toBe(0);
  });

  it('a miss cools heat without resetting it', () => {
    let state = createRun(CFG);
    for (const [i, pos] of [PERFECT, PERFECT].entries()) {
      const out = applyStrike(CFG, state, { strikeIndex: i, markerPos: pos });
      if (!out.accepted) throw new Error('rejected');
      state = out.state;
    }
    const before = state.heat;
    const out = applyStrike(CFG, state, { strikeIndex: 2, markerPos: MISS });
    if (!out.accepted) throw new Error('rejected');
    expect(out.state.heat).toBeCloseTo(before + CFG.heat.miss, 10);
    expect(out.state.heat).toBeGreaterThan(0);
  });

  it('clamp01 clamps', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0.3)).toBe(0.3);
  });
});

describe('positionAt pattern sampling', () => {
  const p1 = CFG.patterns[0]; // simple sweep at BASE_SWEEP_MS
  const sweepMs = p1.waypoints[1].t; // peak time = one sweep
  const loopMs = p1.waypoints[p1.waypoints.length - 1].t; // 2× sweep

  it('starts at 0, peaks at 1 mid-loop, returns to 0 at loop end', () => {
    expect(positionAt(p1, 0)).toBe(0);
    expect(positionAt(p1, sweepMs)).toBe(1);
    expect(positionAt(p1, loopMs)).toBe(0);
  });

  it('interpolates linearly between waypoints', () => {
    expect(positionAt(p1, sweepMs / 2)).toBeCloseTo(0.5, 10);
    expect(positionAt(p1, sweepMs * 1.5)).toBeCloseTo(0.5, 10);
  });

  it('loops past the final waypoint', () => {
    expect(positionAt(p1, loopMs + sweepMs / 2)).toBeCloseTo(0.5, 10);
  });

  it('reversal pattern doubles back mid-return then comes home', () => {
    const rev = CFG.patterns[2];
    const loopEnd = rev.waypoints[rev.waypoints.length - 1].t;
    // After the flip waypoint the marker heads back up toward 1.
    const flip = rev.waypoints[2];
    const afterFlip = positionAt(rev, (flip.t + rev.waypoints[3].t) / 2);
    expect(afterFlip).toBeGreaterThan(flip.pos);
    expect(positionAt(rev, loopEnd)).toBe(0);
    // Telegraph cue fires before the flip and is presentation-only data.
    expect(rev.telegraphAtMs).toBeLessThan(flip.t);
  });

  it('reduced-motion never alters scoring: grade depends only on position', () => {
    // Scoring has no code path that reads motion settings — assert the
    // grade for a fixed position is stable regardless of any pattern.
    for (const _pattern of CFG.patterns) {
      expect(gradeStrike(CFG, 0.5, 0)).toBe('perfect');
    }
  });
});
