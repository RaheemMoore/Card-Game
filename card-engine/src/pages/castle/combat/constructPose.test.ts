import { describe, expect, it } from 'vitest';
import { CONSTRUCT_TUNING, telegraphIsAvoidable, type ConstructPhase } from './construct';
import { CONSTRUCT_NEUTRAL, constructPose, type ConstructPoseInput } from './constructPose';

const POS = { x: 100, y: 100 };
/** Directly to the right, so a forward lunge is a positive x. */
const TARGET = { x: 200, y: 100 };

const pose = (over: Partial<ConstructPoseInput> = {}) =>
  constructPose({
    phase: 'attack',
    elapsedMs: 0,
    pos: POS,
    committedTarget: TARGET,
    motionOff: false,
    ...over,
  });

describe('construct strike motion', () => {
  it('stands neutral in every phase that is not a strike', () => {
    // hitReact and knockbackReact already have the view's knockback lag and a
    // colour; a pose stacked on top would fight feedback that reads correctly.
    const quiet: ConstructPhase[] = [
      'disabled', 'idle', 'alert', 'face', 'approach',
      'hitReact', 'knockbackReact', 'defeated', 'reviving',
    ];
    for (const phase of quiet) {
      expect(pose({ phase }), phase).toEqual(CONSTRUCT_NEUTRAL);
    }
  });

  it('does not move without a committed target', () => {
    // There is no direction to strike in that would mean anything.
    expect(pose({ committedTarget: null })).toEqual(CONSTRUCT_NEUTRAL);
  });

  it('winds BACK through the tell, away from where it will hit', () => {
    const early = pose({ phase: 'telegraph', elapsedMs: 40 });
    const late = pose({ phase: 'telegraph', elapsedMs: CONSTRUCT_TUNING.telegraphMs });
    expect(early.offsetX).toBeLessThan(0);
    expect(late.offsetX).toBeLessThan(early.offsetX);
    // Swelling, not squashing: it is loading, not landing.
    expect(late.scaleY).toBeGreaterThan(1);
  });

  it('IS ALREADY COMMITTED FORWARD ON THE DAMAGE FRAME', () => {
    // THE load-bearing assertion. `construct.ts` resolves the strike on the
    // FIRST step of `attack`, so a body still winding up here would be a hit
    // that landed before anything appeared to swing.
    const wound = pose({ phase: 'telegraph', elapsedMs: CONSTRUCT_TUNING.telegraphMs });
    const oneFrameIn = pose({ phase: 'attack', elapsedMs: 16 });
    expect(oneFrameIn.offsetX).toBeGreaterThan(wound.offsetX);
  });

  it('reaches full extension early in the attack, then withdraws', () => {
    const peakish = pose({ phase: 'attack', elapsedMs: CONSTRUCT_TUNING.attackMs * 0.3 });
    const late = pose({ phase: 'attack', elapsedMs: CONSTRUCT_TUNING.attackMs * 0.9 });
    expect(peakish.offsetX).toBeGreaterThan(0);
    expect(late.offsetX).toBeLessThan(peakish.offsetX);
    expect(late.offsetX).toBeGreaterThanOrEqual(0);
  });

  it('squashes hardest at full extension', () => {
    const peak = pose({ phase: 'attack', elapsedMs: CONSTRUCT_TUNING.attackMs * 0.3 });
    expect(peak.scaleY).toBeLessThan(1);
    expect(peak.scaleX).toBeGreaterThan(1);
  });

  it('lunges along the line to its target, in both axes', () => {
    const up = pose({
      phase: 'attack',
      elapsedMs: CONSTRUCT_TUNING.attackMs * 0.3,
      committedTarget: { x: POS.x, y: POS.y - 100 },
    });
    expect(up.offsetY).toBeLessThan(0);
    expect(up.offsetX).toBeCloseTo(0, 5);
  });

  it('never travels as far as the strike reaches', () => {
    // The blow extends past the body, as a blow does. If the body covered the
    // whole reach it would read as a charge, and the hitbox's shape — the thing
    // a player has to learn in order to walk out of it — would be unlearnable.
    const phases: ConstructPhase[] = ['telegraph', 'attack', 'recovery'];
    for (const phase of phases) {
      for (let ms = 0; ms <= 1200; ms += 10) {
        const p = constructPose({ phase, elapsedMs: ms, pos: POS, committedTarget: TARGET, motionOff: false });
        expect(Math.hypot(p.offsetX, p.offsetY)).toBeLessThan(CONSTRUCT_TUNING.lungeReachPx);
      }
    }
  });

  it('settles back to standing by the end of recovery', () => {
    const end = pose({ phase: 'recovery', elapsedMs: CONSTRUCT_TUNING.recoveryMs });
    expect(end.offsetX).toBeCloseTo(0, 5);
    expect(end.scaleX).toBeCloseTo(1, 5);
    expect(end.scaleY).toBeCloseTo(1, 5);
  });

  it('is completely still with motion off', () => {
    expect(pose({ motionOff: true })).toEqual(CONSTRUCT_NEUTRAL);
    expect(pose({ phase: 'telegraph', elapsedMs: 300, motionOff: true })).toEqual(CONSTRUCT_NEUTRAL);
  });

  it('leaves the fairness invariant alone', () => {
    // Guards the RULE, not this file: the strike must stay walkable-out-of, and
    // nothing about drawing a lunge is allowed to buy time from the tell. If a
    // future tweak shortens `telegraphMs` to make the animation fit, this fails.
    expect(telegraphIsAvoidable(190)).toBe(true);
  });
});
