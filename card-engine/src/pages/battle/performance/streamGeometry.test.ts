import { describe, expect, it } from 'vitest';
import { resolveStreamGeometry, scrollOffset, tileCount } from './streamGeometry';

describe('resolveStreamGeometry', () => {
  it('measures a horizontal run in pixels, not percent', () => {
    // 50% of a 900px-wide stage is 450px, whatever the height is.
    const g = resolveStreamGeometry({ x: 25, y: 50 }, { x: 75, y: 50 }, { width: 900, height: 560 });
    expect(g.length).toBeCloseTo(450, 5);
    expect(g.angle).toBeCloseTo(0, 5);
    expect(g.x).toBeCloseTo(225, 5);
  });

  it('is correct on a NON-SQUARE stage — the actual bug', () => {
    // The old code did hypot on raw percentages: hypot(50, 50) = 70.7, then
    // applied that as `width: 70.7%` of the WIDTH (636px) — while the true
    // distance on a 900x560 stage is hypot(450, 280) = 530px. Nearly 20% long,
    // at a mismatched angle.
    const g = resolveStreamGeometry({ x: 25, y: 25 }, { x: 75, y: 75 }, { width: 900, height: 560 });

    const naivePercentLength = Math.hypot(50, 50);
    const naiveAsPixels = (naivePercentLength / 100) * 900;

    expect(g.length).toBeCloseTo(Math.hypot(450, 280), 5);
    expect(Math.abs(g.length - naiveAsPixels)).toBeGreaterThan(100);
  });

  it('agrees with the naive maths only when the stage is square', () => {
    const g = resolveStreamGeometry({ x: 0, y: 0 }, { x: 50, y: 50 }, { width: 600, height: 600 });
    expect(g.length).toBeCloseTo((Math.hypot(50, 50) / 100) * 600, 5);
  });

  it('gets the angle from true pixel deltas', () => {
    // Equal percentage deltas on a wide stage are NOT 45 degrees.
    const wide = resolveStreamGeometry({ x: 0, y: 0 }, { x: 50, y: 50 }, { width: 1000, height: 500 });
    expect(wide.angle).toBeCloseTo((Math.atan2(250, 500) * 180) / Math.PI, 5);
    expect(wide.angle).not.toBeCloseTo(45, 1);

    const square = resolveStreamGeometry({ x: 0, y: 0 }, { x: 50, y: 50 }, { width: 500, height: 500 });
    expect(square.angle).toBeCloseTo(45, 5);
  });

  it('handles a zero-length run without producing NaN', () => {
    const g = resolveStreamGeometry({ x: 40, y: 40 }, { x: 40, y: 40 }, { width: 900, height: 560 });
    expect(g.length).toBe(0);
    expect(Number.isNaN(g.angle)).toBe(false);
  });

  it('points backwards correctly when the target is to the left', () => {
    const g = resolveStreamGeometry({ x: 80, y: 50 }, { x: 20, y: 50 }, { width: 900, height: 560 });
    expect(Math.abs(g.angle)).toBeCloseTo(180, 5);
    expect(g.length).toBeCloseTo(540, 5);
  });
});

describe('tileCount', () => {
  it('rounds UP so the stream always reaches its target', () => {
    // A partial tile at the far end hides under the splash; a missing one
    // leaves a visible gap short of the boss.
    expect(tileCount(450, 100)).toBe(5);
    expect(tileCount(401, 100)).toBe(5);
    expect(tileCount(400, 100)).toBe(4);
  });

  it('never returns zero, even for a zero-length stream', () => {
    expect(tileCount(0, 100)).toBe(1);
  });

  it('survives a degenerate tile width', () => {
    expect(tileCount(450, 0)).toBe(1);
  });
});

describe('scrollOffset', () => {
  it('wraps within one tile so the scroll never drifts', () => {
    // The tiling covers everything beyond one tile of travel; without the
    // wrap the row would march off screen after a few seconds.
    expect(scrollOffset(1000, 200, 64)).toBeCloseTo(200 % 64, 5);
    expect(scrollOffset(100000, 200, 64)).toBeLessThan(64);
    expect(scrollOffset(100000, 200, 64)).toBeGreaterThanOrEqual(0);
  });

  it('starts at zero', () => {
    expect(scrollOffset(0, 200, 64)).toBe(0);
  });

  it('survives a degenerate tile width', () => {
    expect(scrollOffset(1000, 200, 0)).toBe(0);
  });
});
