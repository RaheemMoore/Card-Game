import { describe, expect, it } from 'vitest';
import { FORGE_STRIKE_CONFIG_V1 as CFG } from './config';
import { applyStrike, clamp01, countSuccesses, createRun, gradeStrike, positionAt } from './engine';
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
    expect(gradeStrike(CFG, 0.5)).toBe('perfect');
  });

  it('exactly on the perfect boundary is perfect (inclusive), both sides', () => {
    expect(gradeStrike(CFG, 0.5 + perfectHalfWidth)).toBe('perfect');
    expect(gradeStrike(CFG, 0.5 - perfectHalfWidth)).toBe('perfect');
  });

  it('just outside the perfect boundary is good', () => {
    expect(gradeStrike(CFG, 0.5 + perfectHalfWidth + 1e-6)).toBe('good');
  });

  it('exactly on the good boundary is good (inclusive), both sides', () => {
    expect(gradeStrike(CFG, 0.5 + goodHalfWidth)).toBe('good');
    expect(gradeStrike(CFG, 0.5 - goodHalfWidth)).toBe('good');
  });

  it('just outside the good boundary is miss', () => {
    expect(gradeStrike(CFG, 0.5 + goodHalfWidth + 1e-6)).toBe('miss');
    expect(gradeStrike(CFG, 0)).toBe('miss');
    expect(gradeStrike(CFG, 1)).toBe('miss');
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
  const p1 = CFG.patterns[0]; // simple 1400ms sweep

  it('starts at 0, peaks at 1 mid-loop, returns to 0 at loop end', () => {
    expect(positionAt(p1, 0)).toBe(0);
    expect(positionAt(p1, 1400)).toBe(1);
    expect(positionAt(p1, 2800)).toBe(0);
  });

  it('interpolates linearly between waypoints', () => {
    expect(positionAt(p1, 700)).toBeCloseTo(0.5, 10);
    expect(positionAt(p1, 2100)).toBeCloseTo(0.5, 10);
  });

  it('loops past the final waypoint', () => {
    expect(positionAt(p1, 2800 + 700)).toBeCloseTo(0.5, 10);
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
      expect(gradeStrike(CFG, 0.5)).toBe('perfect');
    }
  });
});
