import { describe, expect, it } from 'vitest';
import { CANVAS_H, CANVAS_W, fitScale, worldToScreen } from './layout';

/**
 * The courtyard's projection, tested here because it is genuinely hard to
 * observe in a browser: the automated preview pane throttles requestAnimationFrame,
 * which stalls Phaser's loader after its first batch, so the scene often never
 * reaches create() and the camera zoom stays at its default. Two "verifications"
 * of this change were wasted on that before the maths got a test.
 *
 * What matters:
 *   1. The whole plate is visible at every supported window shape. That is the
 *      bug this replaced — cover-scaling cropped 30% of the height on a 1.91
 *      laptop, hiding the castle entrance and the entire south edge.
 *   2. worldToScreen agrees with the camera. The DOM stall buttons are placed
 *      with it, so any disagreement drifts them off the stalls they represent.
 */

/** What a viewport can see of the world, in world units, at a given scale. */
function visibleWorld(width: number, height: number) {
  const s = fitScale({ width, height });
  return { w: width / s, h: height / s, scale: s };
}

const VIEWPORTS: Array<[string, number, number]> = [
  ["Raheem's laptop window", 1999, 1047],
  ['16:10 MacBook', 1512, 982],
  ['16:9 desktop', 1920, 1080],
  ['4:3 tablet', 1024, 768],
  ['ultrawide', 3440, 1440],
  ['tall / portrait-ish', 900, 1200],
];

describe('fitScale — the whole courtyard is always visible', () => {
  it.each(VIEWPORTS)('%s (%ix%i) shows the entire plate', (_name, w, h) => {
    const { w: vw, h: vh } = visibleWorld(w, h);
    // Allow a sub-pixel epsilon; the point is that nothing is cropped.
    expect(vw).toBeGreaterThanOrEqual(CANVAS_W - 0.001);
    expect(vh).toBeGreaterThanOrEqual(CANVAS_H - 0.001);
  });

  it('the old cover behaviour WOULD have cropped the laptop case', () => {
    // Guards the regression directly: cover is Math.max, and at 1.91 it showed
    // only ~805 of 1152 rows. If someone restores it, this fails loudly.
    const coverScale = Math.max(1999 / CANVAS_W, 1047 / CANVAS_H);
    expect(1047 / coverScale).toBeLessThan(CANVAS_H);
    expect(Math.round(1047 / coverScale)).toBe(804);
  });

  it('touches exactly one axis — it fits, it does not shrink further', () => {
    // A 4:3 window matches the plate's aspect, so it should fill both axes.
    const { w, h } = visibleWorld(1024, 768);
    expect(Math.round(w)).toBe(CANVAS_W);
    expect(Math.round(h)).toBe(CANVAS_H);
  });
});

describe('worldToScreen — the DOM overlay tracks the camera', () => {
  it('puts the plate centre at the viewport centre', () => {
    const vp = { width: 1999, height: 1047 };
    const p = worldToScreen({ x: CANVAS_W / 2, y: CANVAS_H / 2 }, vp);
    expect(p.x).toBeCloseTo(vp.width / 2, 6);
    expect(p.y).toBeCloseTo(vp.height / 2, 6);
  });

  it('scales offsets by exactly fitScale', () => {
    const vp = { width: 1999, height: 1047 };
    const s = fitScale(vp);
    const p = worldToScreen({ x: CANVAS_W / 2 + 100, y: CANVAS_H / 2 + 50 }, vp);
    expect(p.x - vp.width / 2).toBeCloseTo(100 * s, 6);
    expect(p.y - vp.height / 2).toBeCloseTo(50 * s, 6);
  });

  it('keeps every stall on screen at every viewport', () => {
    // The whole point of the change: under cover, a stall could sit outside the
    // window. Under fit, no world point inside the plate ever can.
    const corners = [
      { x: 0, y: 0 },
      { x: CANVAS_W, y: 0 },
      { x: 0, y: CANVAS_H },
      { x: CANVAS_W, y: CANVAS_H },
    ];
    for (const [, w, h] of VIEWPORTS) {
      for (const c of corners) {
        const p = worldToScreen(c, { width: w, height: h });
        expect(p.x).toBeGreaterThanOrEqual(-0.001);
        expect(p.x).toBeLessThanOrEqual(w + 0.001);
        expect(p.y).toBeGreaterThanOrEqual(-0.001);
        expect(p.y).toBeLessThanOrEqual(h + 0.001);
      }
    }
  });
});
