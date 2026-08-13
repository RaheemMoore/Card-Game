import { describe, expect, it, beforeEach } from 'vitest';
import {
  DEFAULT_BLAST,
  cardOrigin,
  CARD_HEIGHT_PX,
  resetProjectileIds,
  spawnProjectile,
  stepProjectile,
  SUBSTEP_PX,
  scaleBlast,
  type BlastTarget,
} from './blast';
import type { Polygon } from '../v2-preview/walkBlocking';

const box = (x: number, y: number, w: number, h: number): Polygon => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

const target = (x: number, y: number, radiusPx = 20): BlastTarget => ({
  pos: { x, y },
  radiusPx,
  alive: true,
});

beforeEach(resetProjectileIds);

describe('spawnProjectile', () => {
  it('normalises the direction it is handed', () => {
    const p = spawnProjectile({ x: 0, y: 0 }, { x: 0, y: 7 });
    expect(Math.hypot(p.dir.x, p.dir.y)).toBeCloseTo(1);
  });

  it('survives a zero direction rather than producing NaN', () => {
    // A shot fired at the exact frame aim is degenerate should go somewhere
    // harmless, not poison every downstream position with NaN.
    const p = spawnProjectile({ x: 0, y: 0 }, { x: 0, y: 0 });
    expect(Number.isNaN(p.dir.x)).toBe(false);
    expect(Number.isNaN(p.dir.y)).toBe(false);
  });
});

describe('stepProjectile', () => {
  it('flies along its direction', () => {
    let p = spawnProjectile({ x: 0, y: 0 }, { x: 1, y: 0 });
    p = stepProjectile(p, 100, [], []);
    expect(p.pos.x).toBeCloseTo(DEFAULT_BLAST.speed * 0.1);
    expect(p.pos.y).toBeCloseTo(0);
    expect(p.outcome).toBe('flying');
  });

  it('cannot be steered after release', () => {
    // Handoff §7.3: the aim is committed at windup. Nothing in the step signature
    // can change a live projectile's heading, and this asserts that stays true.
    let p = spawnProjectile({ x: 0, y: 0 }, { x: 1, y: 0 });
    const dir = { ...p.dir };
    p = stepProjectile(p, 100, [], []);
    expect(p.dir).toEqual(dir);
  });

  it('stops at a blocker', () => {
    let p = spawnProjectile({ x: 0, y: 0 }, { x: 1, y: 0 });
    p = stepProjectile(p, 100, [box(20, -50, 40, 100)], []);
    expect(p.outcome).toBe('hitBlocker');
    expect(p.pos.x).toBeLessThan(70);
  });

  it('does not tunnel through a wall on a very long frame', () => {
    // The bug this exists for: at 520 units/s a 300ms stall moves 156 units, so a
    // single end-of-frame position test walks straight past a wall and reports
    // nothing. Substepping is what makes the test continuous.
    let p = spawnProjectile({ x: 0, y: 0 }, { x: 1, y: 0 });
    p = stepProjectile(p, 300, [box(60, -50, SUBSTEP_PX * 3, 100)], []);
    expect(p.outcome).toBe('hitBlocker');
  });

  it('admits the resolution it actually has', () => {
    // Point sampling cannot catch a blocker thinner than one substep. Asserting
    // the limit keeps it a documented boundary rather than a surprise later.
    let p = spawnProjectile({ x: 0, y: 0 }, { x: 1, y: 0 });
    p = stepProjectile(p, 300, [box(61, -50, SUBSTEP_PX / 2, 100)], []);
    expect(p.outcome).not.toBe('hitBlocker');
  });

  it('hits a target and says which one', () => {
    let p = spawnProjectile({ x: 0, y: 0 }, { x: 1, y: 0 });
    p = stepProjectile(p, 200, [], [target(500, 500), target(100, 0)]);
    expect(p.outcome).toBe('hitTarget');
    expect(p.hitTargetIndex).toBe(1);
  });

  it('hits a target standing against a wall instead of being shielded by it', () => {
    // Targets are tested before blockers for exactly this: a dummy backed onto a
    // wall would otherwise be unkillable, which reads as the shot being broken.
    let p = spawnProjectile({ x: 0, y: 0 }, { x: 1, y: 0 });
    p = stepProjectile(p, 200, [box(100, -50, 40, 100)], [target(100, 0, 12)]);
    expect(p.outcome).toBe('hitTarget');
  });

  it('passes through a dead target', () => {
    let p = spawnProjectile({ x: 0, y: 0 }, { x: 1, y: 0 });
    p = stepProjectile(p, 100, [], [{ ...target(100, 0), alive: false }]);
    expect(p.outcome).toBe('flying');
  });

  it('expires at the end of its range rather than flying forever', () => {
    let p = spawnProjectile({ x: 0, y: 0 }, { x: 1, y: 0 });
    for (let i = 0; i < 200 && p.outcome === 'flying'; i++) p = stepProjectile(p, 16, [], []);
    expect(p.outcome).toBe('expired');
    expect(p.travelledPx).toBeGreaterThanOrEqual(DEFAULT_BLAST.rangePx);
  });

  it('is inert once it has resolved', () => {
    let p = spawnProjectile({ x: 0, y: 0 }, { x: 1, y: 0 });
    p = stepProjectile(p, 100, [box(20, -50, 40, 100)], []);
    const settled = { ...p.pos };
    p = stepProjectile(p, 100, [], []);
    expect(p.pos).toEqual(settled);
  });
});

describe('scaleBlast', () => {
  it('makes a full charge bigger, faster and harder than a tap', () => {
    // All three move together on purpose. A shot that only did more damage would
    // look identical to a tap, and the player has no number on screen to read.
    const tap = scaleBlast(DEFAULT_BLAST, 0);
    const full = scaleBlast(DEFAULT_BLAST, 1);
    expect(full.damage).toBeGreaterThan(tap.damage);
    expect(full.radiusPx).toBeGreaterThan(tap.radiusPx);
    expect(full.speed).toBeGreaterThan(tap.speed);
  });

  it('leaves range alone, so charging is a choice and not an obligation', () => {
    // If a charged shot outranged an uncharged one, charging would be the only
    // correct play at distance and the decision would evaporate.
    expect(scaleBlast(DEFAULT_BLAST, 0).rangePx).toBe(DEFAULT_BLAST.rangePx);
    expect(scaleBlast(DEFAULT_BLAST, 1).rangePx).toBe(DEFAULT_BLAST.rangePx);
  });

  it('never produces a shot that cannot hurt or cannot move', () => {
    const tap = scaleBlast(DEFAULT_BLAST, 0);
    expect(tap.damage).toBeGreaterThan(0);
    expect(tap.speed).toBeGreaterThan(0);
    expect(tap.radiusPx).toBeGreaterThan(0);
  });

  it('clamps a charge outside 0..1 rather than trusting it', () => {
    expect(scaleBlast(DEFAULT_BLAST, 5)).toEqual(scaleBlast(DEFAULT_BLAST, 1));
    expect(scaleBlast(DEFAULT_BLAST, -3)).toEqual(scaleBlast(DEFAULT_BLAST, 0));
  });

  it('keeps the card identity fields untouched', () => {
    // Charge changes force, never what element the card is.
    expect(scaleBlast(DEFAULT_BLAST, 1).visualKey).toBe(DEFAULT_BLAST.visualKey);
  });
});

describe('cardOrigin', () => {
  it('leads the aim so a shot never begins inside his own body', () => {
    const left = cardOrigin({ x: 100, y: 200 }, { x: -1, y: 0 });
    const right = cardOrigin({ x: 100, y: 200 }, { x: 1, y: 0 });
    expect(left.x).toBeLessThan(100);
    expect(right.x).toBeGreaterThan(100);
  });

  it('stays on the ground plane, because depth sorts on ground contact', () => {
    // §7.6: a blast whose depth came from its drawn height would sort as though
    // it stood further north than it does, and draw through the front of walls it
    // should pass behind. Height is a drawing offset, never a position.
    const o = cardOrigin({ x: 100, y: 200 }, { x: 0, y: -1 });
    expect(o.y).toBeCloseTo(200 - 14);
    expect(o.y).toBeGreaterThan(200 - CARD_HEIGHT_PX);
  });
});
