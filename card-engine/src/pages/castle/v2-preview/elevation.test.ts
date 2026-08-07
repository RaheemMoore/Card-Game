import { describe, expect, it } from 'vitest';
import {
  EMPTY_ELEVATION,
  JUMP_REACH,
  levelAt,
  makeElevationMap,
  onRamp,
  resolveJump,
  resolveWalkOnLevel,
  unlandablePlates,
} from './elevation';
import type { Polygon } from './walkBlocking';

const box = (x: number, y: number, w: number, h: number): Polygon => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

/** Hero feet, as shipped. */
const feetAt = (x: number, y: number) => ({ x: x - 17, y: y - 10, width: 34, height: 20 });

/**
 * The courtyard shape in miniature: a big level-0 field with a level-1 terrace
 * laid on top of its northern half, and a ramp bridging them on the left.
 */
const COURTYARD = makeElevationMap(
  [
    { level: 0, polygon: box(0, 0, 1000, 1000) },
    { level: 1, polygon: box(0, 0, 1000, 500) },
  ],
  [box(0, 460, 120, 80)],
);

describe('levelAt — overlap precedence', () => {
  it('returns the HIGHEST plate, which is what lets plates overlap', () => {
    // Both plates cover this point; the terrace must win.
    expect(levelAt(500, 200, COURTYARD)).toBe(1);
  });

  it('returns the lower plate where the terrace does not reach', () => {
    expect(levelAt(500, 800, COURTYARD)).toBe(0);
  });

  it('returns null for void — somewhere no plate covers', () => {
    expect(levelAt(5000, 5000, COURTYARD)).toBeNull();
  });
});

describe('walking', () => {
  const walk = (fx: number, fy: number, dx: number, dy: number, level: number) =>
    resolveWalkOnLevel(feetAt(fx, fy), dx, dy, [], COURTYARD, level);

  it('moves freely within a level', () => {
    const m = walk(500, 800, 10, 0, 0);
    expect(m.level).toBe(0);
    expect(m.blocked).toBe(false);
    expect(m.x).toBe(feetAt(500, 800).x + 10);
  });

  it('BLOCKS walking up onto a higher level — the cliff needs no collider', () => {
    // Feet centre at 510; the terrace starts at 500, so a 12px step crosses it.
    const m = walk(500, 510, 0, -12, 0);
    expect(m.level).toBe(0);
    expect(m.blocked).toBe(true);
    expect(m.y).toBe(feetAt(500, 510).y);
  });

  it('ALLOWS walking down onto a lower level, and reports the drop', () => {
    const m = walk(500, 485, 0, 20, 1);
    expect(m.level).toBe(0);
    expect(m.dropped).toBe(true);
  });

  it('allows climbing when the feet are on a ramp — this is the whole stair', () => {
    const m = walk(60, 510, 0, -12, 0);
    expect(m.level).toBe(1);
    expect(m.blocked).toBe(false);
  });

  it('slides along a cliff lip instead of stopping dead', () => {
    // North is blocked by the terrace, east is open: keep the east component.
    const m = walk(500, 510, 10, -12, 0);
    expect(m.slid).toBe(true);
    expect(m.level).toBe(0);
    expect(m.x).toBe(feetAt(500, 510).x + 10);
    expect(m.y).toBe(feetAt(500, 510).y);
  });

  it('fails OPEN into void, keeping the current level', () => {
    const m = resolveWalkOnLevel(feetAt(998, 800), 20, 0, [], COURTYARD, 0);
    expect(m.blocked).toBe(false);
    expect(m.level).toBe(0);
  });

  it('behaves exactly like the flat game when no plates are authored', () => {
    const m = resolveWalkOnLevel(feetAt(500, 500), 10, 10, [], EMPTY_ELEVATION, 0);
    expect(m).toEqual({
      x: feetAt(500, 500).x + 10,
      y: feetAt(500, 500).y + 10,
      level: 0,
      blocked: false,
      slid: false,
      dropped: false,
    });
  });

  it('still respects BLOCK polygons', () => {
    const wall = [box(520, 700, 40, 200)];
    const m = resolveWalkOnLevel(feetAt(500, 800), 40, 0, wall, COURTYARD, 0);
    expect(m.blocked).toBe(true);
  });
});

describe('jumping', () => {
  const jump = (fx: number, fy: number, dx: number, dy: number, level: number, blockers: Polygon[] = []) =>
    resolveJump(feetAt(fx, fy), dx, dy, blockers, COURTYARD, level);

  it('reaches 109px, which clears the ~96px cliff band', () => {
    expect(JUMP_REACH).toBeGreaterThan(96);
    expect(Math.round(JUMP_REACH)).toBe(109);
  });

  it('lands one level up — the climb', () => {
    const r = jump(500, 560, 0, -1, 0);
    expect(r.outcome).toBe('landed');
    expect(r.level).toBe(1);
  });

  it('refuses to gain more than one level, ever', () => {
    const tall = makeElevationMap([
      { level: 0, polygon: box(0, 0, 1000, 1000) },
      { level: 3, polygon: box(0, 0, 1000, 500) },
    ]);
    const r = resolveJump(feetAt(500, 560), 0, -1, [], tall, 0);
    expect(r.outcome).toBe('too-high');
    expect(r.level).toBe(0);
  });

  it('fails into void rather than stranding the actor off the map', () => {
    const r = jump(995, 800, 1, 0, 0);
    expect(r.outcome).toBe('void');
  });

  it('cannot jump through a wall', () => {
    const r = jump(500, 800, 1, 0, 0, [box(540, 700, 200, 200)]);
    expect(r.outcome).toBe('blocked');
  });

  it('rewinds to the takeoff point on every failure mode', () => {
    const start = feetAt(500, 800);
    for (const r of [
      jump(995, 800, 1, 0, 0),
      jump(500, 800, 1, 0, 0, [box(540, 700, 200, 200)]),
    ]) {
      if (r.outcome === 'landed') continue;
      expect(r.level).toBe(0);
    }
    const blocked = jump(500, 800, 1, 0, 0, [box(540, 700, 200, 200)]);
    expect(blocked.x).toBe(start.x);
    expect(blocked.y).toBe(start.y);
  });

  it('lets you leap DOWN off a terrace — a long drop should just work', () => {
    const r = jump(500, 460, 0, 1, 1);
    expect(r.outcome).toBe('landed');
    expect(r.level).toBe(0);
  });

  it('normalises diagonals, so reach is the same in every direction', () => {
    const straight = jump(500, 800, 1, 0, 0);
    const diagonal = jump(500, 800, 1, 1, 0);
    const dx = straight.x - feetAt(500, 800).x;
    const d = Math.hypot(diagonal.x - feetAt(500, 800).x, diagonal.y - feetAt(500, 800).y);
    expect(d).toBeCloseTo(dx, 5);
  });
});

describe('onRamp', () => {
  it('is true inside the ramp and false beside it', () => {
    expect(onRamp(60, 500, COURTYARD)).toBe(true);
    expect(onRamp(500, 500, COURTYARD)).toBe(false);
  });
});

describe('unlandablePlates', () => {
  it('flags a plate too small to stand on in both axes', () => {
    const map = makeElevationMap([{ level: 1, polygon: box(0, 0, 20, 10) }]);
    expect(unlandablePlates(map, 34, 20)).toHaveLength(1);
  });

  it('does NOT flag a long thin ledge — thin in one axis is normal', () => {
    const map = makeElevationMap([{ level: 1, polygon: box(0, 0, 800, 10) }]);
    expect(unlandablePlates(map, 34, 20)).toHaveLength(0);
  });
});
