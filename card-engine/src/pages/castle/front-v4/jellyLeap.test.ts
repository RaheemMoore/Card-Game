import { describe, it, expect } from 'vitest';
import { CONSTRUCT_TUNING } from '../combat/construct';
import {
  LEAP_TUNING,
  apexClearsHero,
  beginLeap,
  evaluateEvade,
  leapHitsHero,
  leapIsEvadable,
  leapPos,
  stepLeap,
} from './jellyLeap';
import { ARENA, FRONT_V4_WALK_SPEED, HERO_BODY } from './layout';

const run = (s: ReturnType<typeof beginLeap>, ms: number) => {
  let leap = s;
  const step = 1000 / 60;
  for (let t = 0; t < ms; t += step) leap = stepLeap(leap, step);
  return leap;
};

describe('beginLeap commitment', () => {
  it('lands on the ground he was standing on when the tell began', () => {
    const leap = beginLeap(700, 900);
    expect(leap.startX).toBe(700);
    expect(leap.landingX).toBe(900);
  });

  it('never produces a degenerate hop', () => {
    // A captured X almost on top of the creature would otherwise make a leap of a
    // few units, which cannot be walked out of because there is nowhere to walk.
    const leap = beginLeap(700, 710);
    expect(leap.landingX - leap.startX).toBeGreaterThanOrEqual(LEAP_TUNING.minTravelPx);
  });

  it('does not let the minimum override an ordinary commit', () => {
    // The floor exists for the degenerate case only. When it rose above the range
    // the creature actually commits from, every normal leap silently overshot the
    // ground he was standing on — the tell stopped meaning "here".
    expect(LEAP_TUNING.minTravelPx).toBeLessThan(CONSTRUCT_TUNING.preferredRangePx);
    const leap = beginLeap(700, 700 + CONSTRUCT_TUNING.preferredRangePx);
    expect(leap.landingX).toBe(700 + CONSTRUCT_TUNING.preferredRangePx);
  });

  it('leaps west when he is west', () => {
    const leap = beginLeap(700, 560);
    expect(leap.landingX).toBeLessThan(leap.startX);
  });

  it('holds the landing a body-contact clear of the arena bounds', () => {
    // Not merely inside the arena: far enough in that a man pinned against the
    // wall still has floor to stand on. See LeapTuning.boundInsetPx.
    expect(beginLeap(ARENA.maxX - 20, ARENA.maxX + 400).landingX).toBe(
      ARENA.maxX - LEAP_TUNING.boundInsetPx,
    );
    expect(beginLeap(ARENA.minX + 20, ARENA.minX - 400).landingX).toBe(
      ARENA.minX + LEAP_TUNING.boundInsetPx,
    );
  });

  it('may cross to the other side of him', () => {
    // He ran toward it and past it; it lands on the ground he vacated, which is
    // now behind him. That is the intended read, not a bug to clamp away.
    const leap = beginLeap(700, 900);
    expect(leap.landingX).toBeGreaterThan(leap.startX);
  });
});

describe('the arc', () => {
  it('peaks at exactly the tuned apex, halfway', () => {
    const leap = beginLeap(700, 900);
    expect(leapPos({ ...leap, elapsedMs: leap.durationMs / 2 }).heightPx).toBeCloseTo(
      LEAP_TUNING.apexPx,
      6,
    );
  });

  it('starts and ends on the floor', () => {
    const leap = beginLeap(700, 900);
    expect(leapPos(leap).heightPx).toBeCloseTo(0, 6);
    expect(leapPos({ ...leap, elapsedMs: leap.durationMs }).heightPx).toBeCloseTo(0, 6);
  });

  it('arrives exactly at the committed landing X', () => {
    const leap = run(beginLeap(700, 900), LEAP_TUNING.durationMs + 100);
    expect(leap.done).toBe(true);
    expect(leapPos(leap).x).toBeCloseTo(900, 6);
  });

  it('does not home: later movement cannot bend it', () => {
    const leap = beginLeap(700, 900);
    const mid = run(leap, 300);
    // There is no input to this module after launch; the only way the landing
    // could change is if someone added one, and this is what would catch it.
    expect(mid.landingX).toBe(leap.landingX);
    expect(run(mid, 200).landingX).toBe(leap.landingX);
  });

  it('clears his head at the apex by the required margin', () => {
    expect(apexClearsHero()).toBe(true);
    expect(LEAP_TUNING.apexPx - HERO_BODY.heightPx).toBeGreaterThanOrEqual(LEAP_TUNING.clearancePx);
  });

  it('is not tall enough to clear a hero the height of the arc', () => {
    // Guards the guard: apexClearsHero must be capable of returning false.
    expect(apexClearsHero(LEAP_TUNING, { heightPx: LEAP_TUNING.apexPx })).toBe(false);
  });
});

describe('contact is real overlap', () => {
  const jellyX = 700;
  const heroX = jellyX + CONSTRUCT_TUNING.preferredRangePx;

  it('passes harmlessly over a hero it is directly above', () => {
    const leap = { ...beginLeap(jellyX, heroX), elapsedMs: LEAP_TUNING.durationMs / 2 };
    const { x, heightPx } = leapPos(leap);
    expect(heightPx).toBeGreaterThan(HERO_BODY.heightPx);
    // Standing exactly under it — the worst horizontal case — and still untouched,
    // because at the top of the arc it physically cannot reach the ground.
    expect(leapHitsHero(leap, { x })).toBe(false);
  });

  it('lands on a hero who never moved', () => {
    // Standing still must be punished, or the tell is decorative.
    let leap = beginLeap(jellyX, heroX);
    let hit = false;
    while (!leap.done && !hit) {
      leap = stepLeap(leap, 1000 / 60);
      hit = leapHitsHero(leap, { x: heroX });
    }
    expect(hit).toBe(true);
  });

  it('misses a hero who walked clear', () => {
    let leap = beginLeap(jellyX, heroX);
    let hit = false;
    while (!leap.done && !hit) {
      leap = stepLeap(leap, 1000 / 60);
      hit = leapHitsHero(leap, { x: heroX + 260 });
    }
    expect(hit).toBe(false);
  });
});

describe('fairness: the leap must be avoidable by ordinary walking', () => {
  // He has no dodge, roll, shield or jump. If this fails, the encounter is unfair
  // in a way no amount of player skill answers — and the natural "improvement"
  // that breaks it is shortening the tell, which is precisely why this is a test
  // and not a comment. It reads the tell length from CONSTRUCT_TUNING and the
  // walk speed from layout.ts, so a change to either fails here.
  const telegraphMs = CONSTRUCT_TUNING.telegraphMs;

  it('is avoidable from the range the creature commits at, on both sides', () => {
    for (const heroSide of [-1, 1] as const) {
      expect(
        leapIsEvadable({
          commitDistancePx: CONSTRUCT_TUNING.preferredRangePx,
          heroSide,
          jellyX: 700,
          telegraphMs,
        }),
      ).toBe(true);
    }
  });

  it('is avoidable across every distance it can commit from', () => {
    // Derived, not a magic number: closer than the two bodies' combined
    // half-widths is a state the scene cannot produce, because he is blocked out
    // of the creature. Reading it from the tuning means widening a body cannot
    // silently start testing positions that are impossible in play.
    const closest = LEAP_TUNING.bodyHalfWidthPx + HERO_BODY.halfWidthPx;
    for (let d = closest; d <= CONSTRUCT_TUNING.preferredRangePx; d += 4) {
      for (const heroSide of [-1, 1] as const) {
        const outcome = evaluateEvade({
          commitDistancePx: d,
          heroSide,
          jellyX: 700,
          telegraphMs,
        });
        expect(outcome.evadable, `distance ${d}, side ${heroSide}`).toBe(true);
      }
    }
  });

  it('is avoidable with his back to the castle wall', () => {
    // The corner case the scalar top-down check cannot see: retreat is one axis
    // and one end of it is his own front door.
    const outcome = evaluateEvade({
      commitDistancePx: CONSTRUCT_TUNING.preferredRangePx,
      heroSide: -1,
      jellyX: ARENA.minX + CONSTRUCT_TUNING.preferredRangePx,
      telegraphMs,
    });
    expect(outcome.evadable).toBe(true);
  });

  it('is avoidable pressed against the eastern bound', () => {
    const outcome = evaluateEvade({
      commitDistancePx: CONSTRUCT_TUNING.preferredRangePx,
      heroSide: 1,
      jellyX: ARENA.maxX - CONSTRUCT_TUNING.preferredRangePx,
      telegraphMs,
    });
    expect(outcome.evadable).toBe(true);
  });

  it('still punishes a hero who does not move', () => {
    // The negative control. Without it, an attack that could never hit anyone
    // would pass every assertion above.
    const outcome = evaluateEvade({
      commitDistancePx: CONSTRUCT_TUNING.preferredRangePx,
      heroSide: 1,
      jellyX: 700,
      telegraphMs,
      walkSpeed: 0,
    });
    expect(outcome.evadable).toBe(false);
  });

  it('fails loudly if the tell is shortened past the point of fairness', () => {
    // Demonstrates the guard has teeth. A 60ms tell with no reaction allowance
    // leaves him nowhere to go.
    const outcome = evaluateEvade({
      commitDistancePx: CONSTRUCT_TUNING.preferredRangePx,
      heroSide: 1,
      jellyX: 700,
      telegraphMs: 60,
      reactionMs: 0,
      tuning: { ...LEAP_TUNING, durationMs: 120, apexPx: 20 },
    });
    expect(outcome.evadable).toBe(false);
  });

  it('is measured against the same walk speed the scene gives him', () => {
    expect(FRONT_V4_WALK_SPEED).toBe(190);
  });
});
