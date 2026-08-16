import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  DEFAULT_SCATTER_CONSTRAINTS,
  sideViewScatter,
  type ScatterConstraints,
} from './sideViewScatter';
import { ARENA, CASTLE_NO_DROP, JELLY_BODY, PICKUP_RADIUS_PX } from './layout';
import { HAND_SIZE } from '../combat/hand';

afterEach(() => vi.restoreAllMocks());

const inside = (x: number, z: { minX: number; maxX: number }) => x >= z.minX && x <= z.maxX;

describe('sideViewScatter with the shipped layout', () => {
  it('never degrades anywhere he can be standing', () => {
    // The sweep is the point: a scatter that only works mid-arena would fail
    // exactly when he is knocked back against a wall, which is when it happens.
    for (let heroX = ARENA.minX; heroX <= ARENA.maxX; heroX += 10) {
      const result = sideViewScatter(heroX, HAND_SIZE, DEFAULT_SCATTER_CONSTRAINTS, heroX);
      expect(result.degraded, `heroX ${heroX}: ${result.degradedReason}`).toBe(false);
    }
  });

  it('places every card on reachable ground', () => {
    for (let heroX = ARENA.minX; heroX <= ARENA.maxX; heroX += 10) {
      const { xs } = sideViewScatter(heroX, HAND_SIZE, DEFAULT_SCATTER_CONSTRAINTS, heroX);
      expect(xs).toHaveLength(HAND_SIZE);
      for (const x of xs) {
        expect(x, `heroX ${heroX}`).toBeGreaterThanOrEqual(ARENA.minX);
        expect(x, `heroX ${heroX}`).toBeLessThanOrEqual(ARENA.maxX);
        // Behind the castle wall is unrecoverable ground.
        expect(inside(x, CASTLE_NO_DROP), `heroX ${heroX}, card ${x}`).toBe(false);
      }
    }
  });

  it('keeps cards far enough apart to read as separate places to walk to', () => {
    for (let heroX = ARENA.minX; heroX <= ARENA.maxX; heroX += 10) {
      const { xs } = sideViewScatter(heroX, HAND_SIZE, DEFAULT_SCATTER_CONSTRAINTS, heroX);
      const sorted = [...xs].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(
          DEFAULT_SCATTER_CONSTRAINTS.minSeparationPx,
        );
      }
    }
  });

  it('costs him a walk: nothing lands inside automatic pickup reach', () => {
    // If a card landed on his feet he would recover it by standing up, and losing
    // the hand would stop meaning anything.
    for (let heroX = ARENA.minX; heroX <= ARENA.maxX; heroX += 10) {
      const { xs } = sideViewScatter(heroX, HAND_SIZE, DEFAULT_SCATTER_CONSTRAINTS, heroX);
      for (const x of xs) {
        expect(Math.abs(x - heroX), `heroX ${heroX}, card ${x}`).toBeGreaterThan(PICKUP_RADIUS_PX);
      }
    }
  });

  it('splits the hand around him rather than piling it on one side', () => {
    const heroX = 640;
    const { xs } = sideViewScatter(heroX, HAND_SIZE, DEFAULT_SCATTER_CONSTRAINTS, 7);
    expect(xs.some((x) => x < heroX)).toBe(true);
    expect(xs.some((x) => x > heroX)).toBe(true);
  });

  it('avoids the creature that just floored him', () => {
    const jellyX = 900;
    const constraints: ScatterConstraints = {
      ...DEFAULT_SCATTER_CONSTRAINTS,
      exclusions: [
        CASTLE_NO_DROP,
        { minX: jellyX - JELLY_BODY.halfWidthPx, maxX: jellyX + JELLY_BODY.halfWidthPx },
      ],
    };
    const { xs, degraded } = sideViewScatter(860, HAND_SIZE, constraints, 3);
    expect(degraded).toBe(false);
    for (const x of xs) {
      expect(inside(x, { minX: jellyX - JELLY_BODY.halfWidthPx, maxX: jellyX + JELLY_BODY.halfWidthPx })).toBe(false);
    }
  });

  it('is deterministic for a seed and varies between them', () => {
    const a = sideViewScatter(640, HAND_SIZE, DEFAULT_SCATTER_CONSTRAINTS, 11);
    const b = sideViewScatter(640, HAND_SIZE, DEFAULT_SCATTER_CONSTRAINTS, 11);
    const c = sideViewScatter(640, HAND_SIZE, DEFAULT_SCATTER_CONSTRAINTS, 12);
    expect(a.xs).toEqual(b.xs);
    expect(c.xs).not.toEqual(a.xs);
  });
});

describe('failing loud', () => {
  it('reports and logs when the ground cannot hold the hand', () => {
    // The behaviour that separates this from combat/scatter.ts, which would
    // silently return the origin four times and let the fight look fine.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cramped: ScatterConstraints = {
      bounds: { minX: 500, maxX: 560 },
      exclusions: [],
      minSeparationPx: 64,
      minSpreadPx: 110,
      maxSpreadPx: 320,
    };
    const result = sideViewScatter(530, HAND_SIZE, cramped, 1);
    expect(result.degraded).toBe(true);
    expect(result.degradedReason).toBeTruthy();
    expect(error).toHaveBeenCalled();
  });

  it('reports when there is no legal ground at all', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = sideViewScatter(
      530,
      HAND_SIZE,
      { bounds: { minX: 500, maxX: 560 }, exclusions: [{ minX: 0, maxX: 2000 }], minSeparationPx: 64, minSpreadPx: 110, maxSpreadPx: 320 },
      1,
    );
    expect(result.degraded).toBe(true);
    expect(error).toHaveBeenCalled();
  });

  it('returns nothing for an empty hand without complaining', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = sideViewScatter(640, 0);
    expect(result.xs).toEqual([]);
    expect(result.degraded).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });
});
