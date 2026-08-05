import { describe, expect, it } from 'vitest';
import { COURTYARD_V2_BLOCKERS } from './courtyardV2Layout';
import { feetBlocked, pointInPolygon, resolveWalk, type Polygon, type WalkRect } from './walkBlocking';

const WEST = COURTYARD_V2_BLOCKERS[0].points as unknown as Polygon;
const EAST = COURTYARD_V2_BLOCKERS[1].points as unknown as Polygon;

/** The six upright rectangles this replaced, kept so the claim stays checkable. */
const OLD_WEST_SEGMENTS: WalkRect[] = [
  { x: 287, y: 221, width: 32, height: 83 },
  { x: 263, y: 304, width: 62, height: 83 },
  { x: 240, y: 387, width: 82, height: 83 },
  { x: 216, y: 470, width: 86, height: 83 },
  { x: 192, y: 554, width: 89, height: 83 },
  { x: 180, y: 637, width: 81, height: 83 },
];

// Hero feet are 34x20 (see PREVIEW hero contract); NAVIGATION_TOLERANCE is 4.
const feetAt = (x: number, y: number): WalkRect => ({ x: x - 17, y: y - 10, width: 34, height: 20 });

describe('pointInPolygon', () => {
  it('sees the inside of a leaning wall', () => {
    expect(pointInPolygon(280, 400, WEST)).toBe(true);
    expect(pointInPolygon(1280, 500, EAST)).toBe(true);
  });

  it('leaves the open courtyard walkable where a bounding box would not', () => {
    // West's bbox spans x 180-326, y 221-720. These two points sit inside that
    // box but outside the actual wall — this is the ~80px of paving the upright
    // rectangle would have stolen.
    expect(pointInPolygon(200, 260, WEST)).toBe(false);
    expect(pointInPolygon(310, 690, WEST)).toBe(false);
  });
});

describe('feet sampling', () => {
  it('blocks when only an edge midpoint is inside, not just a corner', () => {
    // A wall face crossing the middle of the feet rectangle must still block.
    expect(feetBlocked(feetAt(280, 400), [WEST])).toBe(true);
  });

  it('lets the hero stand in open courtyard beside the wall', () => {
    expect(feetBlocked(feetAt(420, 400), [WEST])).toBe(false);
  });
});

describe('the wall face has no steps in it', () => {
  /**
   * This is the whole reason the six rectangles were retired. Measure the
   * biggest sideways jump in the blocking edge from one row of pixels to the
   * next. The hero's feet are 34px wide, so a jump anywhere near that size is
   * felt as a snag while walking the wall diagonally.
   */
  const edgeJog = (rightEdgeAt: (y: number) => number, y0: number, y1: number) => {
    let worst = 0;
    for (let y = y0; y < y1; y += 1) {
      worst = Math.max(worst, Math.abs(rightEdgeAt(y + 1) - rightEdgeAt(y)));
    }
    return worst;
  };

  const polygonEdge = (y: number) => {
    // Rightmost point of the traced wall at this row.
    let best = -Infinity;
    for (let i = 0, j = WEST.length - 1; i < WEST.length; j = i++) {
      const [xi, yi] = WEST[i];
      const [xj, yj] = WEST[j];
      if (yi > y !== yj > y) best = Math.max(best, ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    }
    return best;
  };

  const stackedEdge = (y: number) => {
    let best = -Infinity;
    for (const r of OLD_WEST_SEGMENTS) {
      if (y >= r.y && y < r.y + r.height) best = Math.max(best, r.x + r.width);
    }
    return best;
  };

  it('the six-rectangle version jogged by most of a foot width', () => {
    expect(edgeJog(stackedEdge, 230, 710)).toBeGreaterThan(20);
  });

  it('the traced wall never jogs more than a pixel', () => {
    expect(edgeJog(polygonEdge, 230, 710)).toBeLessThanOrEqual(1);
  });
});

describe('sliding down the long run of the wall', () => {
  it('keeps moving instead of dead-stopping', () => {
    // Below y~400 the wall's face runs steadily left, so a hero pressed against
    // it heading south-west should track it the whole way down.
    let feet = feetAt(345, 430);
    let stalls = 0;
    for (let i = 0; i < 100; i += 1) {
      const r = resolveWalk(feet, -2, 2, [WEST]);
      if (r.x === feet.x && r.y === feet.y) stalls += 1;
      feet = { ...feet, x: r.x, y: r.y };
    }
    expect(stalls).toBe(0);
    expect(feet.y).toBeGreaterThan(600);
  });

  it('does not let the hero end up inside the wall', () => {
    let feet = feetAt(345, 430);
    for (let i = 0; i < 100; i += 1) {
      const r = resolveWalk(feet, -2, 2, [WEST]);
      feet = { ...feet, x: r.x, y: r.y };
      expect(feetBlocked(feet, [WEST])).toBe(false);
    }
  });
});

describe('resolveWalk', () => {
  it('takes the whole move in open floor', () => {
    const r = resolveWalk(feetAt(700, 640), 3, 3, [WEST, EAST]);
    expect(r).toMatchObject({ blocked: false, slid: false });
  });

  it('drops only the blocked axis rather than stopping dead', () => {
    // Push straight west into the wall while also heading south.
    const r = resolveWalk(feetAt(340, 400), -6, 3, [WEST]);
    expect(r.blocked).toBe(true);
    expect(r.slid).toBe(true);
    expect(r.y).toBeGreaterThan(390);
  });

  it('stops when both axes are blocked', () => {
    const feet = feetAt(320, 480);
    const r = resolveWalk(feet, -6, 0, [WEST]);
    if (r.blocked && !r.slid) {
      expect(r.x).toBe(feet.x);
      expect(r.y).toBe(feet.y);
    }
    expect(r.blocked).toBe(true);
  });
});
