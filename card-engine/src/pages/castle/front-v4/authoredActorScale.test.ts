import { describe, expect, it } from 'vitest';
import { CONSTRUCT_TUNING } from '../combat/construct';
import { evaluateEvade, leapTuningFor } from './jellyLeap';
import { ARENA, HERO_BODY, JELLY_BODY, SPRITE_SCALE, bodyAtScale } from './layout';

/**
 * THE PROOF, RE-RUN AT SIZES RAHEEM CHOOSES IN PHASER EDITOR.
 *
 * The leap's fairness is the one design guarantee this scene actually holds
 * itself to: the Card-wright has no jump, no dodge, no roll and no shield, so
 * every attack has to be escapable by WALKING, and `evaluateEvade` proves it by
 * simulating the exchange at 60Hz rather than asserting it in a comment.
 *
 * That proof was stated against bodies measured at `SPRITE_SCALE`. Actor size is
 * now authored — he halved the hero and took the creature to 0.65 on 2026-08-16 —
 * so the proof has to travel with it, or the guarantee quietly becomes a claim
 * about a hero who no longer exists.
 *
 * These are not tuning knobs being protected. A scale that makes the attack
 * unavoidable is INFORMATION about that scale, and this failing is the intended
 * way to find out — not a reason to clamp what he is allowed to drag.
 */
const telegraphMs = CONSTRUCT_TUNING.telegraphMs;

/** Every corner of the encounter, at one pair of actor scales. */
function proveEvadableAt(heroScale: number, jellyScale: number) {
  const heroBody = bodyAtScale(HERO_BODY, heroScale);
  const tuning = leapTuningFor(bodyAtScale(JELLY_BODY, jellyScale), heroBody);
  const closest = tuning.bodyHalfWidthPx + heroBody.halfWidthPx;

  const failures: string[] = [];
  const check = (label: string, jellyX: number, heroSide: -1 | 1, distance: number) => {
    const outcome = evaluateEvade({
      commitDistancePx: distance,
      heroSide,
      jellyX,
      telegraphMs,
      tuning,
      heroBody,
    });
    if (!outcome.evadable) failures.push(label);
  };

  // Open ground, from body contact out to the range the creature commits from.
  for (let d = closest; d <= CONSTRUCT_TUNING.preferredRangePx; d += 4) {
    for (const side of [-1, 1] as const) {
      check(`open d=${d.toFixed(1)} side=${side}`, 700, side, d);
    }
  }
  // Cornered at each end of the level, which is where a scalar check goes wrong:
  // retreat is one axis here, and one end of it is his own front door.
  check('cornered west', ARENA.minX + CONSTRUCT_TUNING.preferredRangePx, -1, CONSTRUCT_TUNING.preferredRangePx);
  check('cornered east', ARENA.maxX - CONSTRUCT_TUNING.preferredRangePx, 1, CONSTRUCT_TUNING.preferredRangePx);

  return failures;
}

describe('bodyAtScale', () => {
  it('is the identity at the scale the bodies were measured at', () => {
    expect(bodyAtScale(HERO_BODY, SPRITE_SCALE)).toEqual(HERO_BODY);
    expect(bodyAtScale(JELLY_BODY, SPRITE_SCALE)).toEqual(JELLY_BODY);
  });

  it('scales every dimension by the same ratio', () => {
    const half = bodyAtScale(HERO_BODY, SPRITE_SCALE / 2);
    expect(half.halfWidthPx).toBe(HERO_BODY.halfWidthPx / 2);
    expect(half.heightPx).toBe(HERO_BODY.heightPx / 2);
  });
});

describe('leapTuningFor', () => {
  /**
   * The arc is stated against his walking speed and the creature's commit range,
   * neither of which cares how big anything is drawn. Scaling the apex or the
   * duration with the art would silently re-tune the whole encounter every time
   * he nudged a slider.
   */
  it('moves the bodies and leaves the arc alone', () => {
    const small = leapTuningFor(bodyAtScale(JELLY_BODY, 0.65), bodyAtScale(HERO_BODY, 1));
    expect(small.bodyHalfWidthPx).toBeLessThan(JELLY_BODY.halfWidthPx);
    expect(small.apexPx).toBe(260);
    expect(small.durationMs).toBe(780);
    expect(small.minTravelPx).toBe(90);
    expect(small.clearancePx).toBe(24);
  });
});

describe('the leap stays escapable by walking', () => {
  it('at the scale the bodies were measured at', () => {
    expect(proveEvadableAt(SPRITE_SCALE, SPRITE_SCALE)).toEqual([]);
  });

  /** The sizes standing in `CastleFrontWorld.scene` as of 2026-08-16. */
  it('at the authored sizes — hero 1, creature 0.65', () => {
    expect(proveEvadableAt(1, 0.65)).toEqual([]);
  });

  /**
   * Smaller actors are the easy direction — less body to clear, less to run
   * around — so the interesting question is the other one. A creature drawn
   * larger than the hero reaches further and corners him sooner, and if a size
   * he might reasonably try breaks the guarantee, better to learn it here than
   * from him losing a fight he could not have won.
   */
  it('at a creature drawn twice the hero', () => {
    expect(proveEvadableAt(1, 2)).toEqual([]);
  });
});
