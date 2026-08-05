import { describe, expect, it } from 'vitest';
import layers from '../../../public/assets/castle/layers/layers.json';
import { GLOW_SPOTS, SPARKLE_SPAWN, WATER_LAYER } from './courtyardLayers';

/**
 * `layers.json` and `courtyardLayers.ts` both describe the courtyard's water, and
 * for a while a comment claimed they had to be kept "in step". They had drifted by
 * up to 14px, which looked like a bug and was not one — they measure different
 * things. The JSON records the region slice_plate.py CUT from the plate; the TS
 * records where sparkles were tuned to look right.
 *
 * Asserting equality would have been the wrong fix: it would have moved the
 * sparkle to satisfy a number that describes something else. What actually has to
 * hold is CONTAINMENT — motes must land on painted water, not on dry stone — plus
 * the things that genuinely are shared facts about the same plate.
 */

const cut = layers.waterBox;

/** Inclusive right/bottom edges, so "inside" means inside. */
const right = (b: { x: number; width: number }) => b.x + b.width;
const bottom = (b: { y: number; height: number }) => b.y + b.height;

describe('courtyard water layers', () => {
  it('spawns every sparkle inside the water that was actually cut', () => {
    // The failure this prevents is subtle in play and obvious in a screenshot:
    // motes twinkling on the stone rim, because someone widened the tuning box
    // past the basin or re-cut the plate smaller.
    expect(SPARKLE_SPAWN.x).toBeGreaterThanOrEqual(cut.x);
    expect(SPARKLE_SPAWN.y).toBeGreaterThanOrEqual(cut.y);
    expect(right(SPARKLE_SPAWN)).toBeLessThanOrEqual(right(cut));
    expect(bottom(SPARKLE_SPAWN)).toBeLessThanOrEqual(bottom(cut));
  });

  it('keeps the spout and ripple centre over the water', () => {
    for (const [name, p] of [
      ['spout', WATER_LAYER.spout],
      ['rippleCentre', WATER_LAYER.rippleCentre],
    ] as const) {
      expect(p.x, `${name} x`).toBeGreaterThanOrEqual(cut.x);
      expect(p.x, `${name} x`).toBeLessThanOrEqual(right(cut));
      expect(p.y, `${name} y`).toBeGreaterThanOrEqual(cut.y);
      expect(p.y, `${name} y`).toBeLessThanOrEqual(bottom(cut));
    }
  });

  it('leaves a spawn region with real area after the insets', () => {
    // A guard against someone shrinking WATER_LAYER.box below the inset totals,
    // which yields a negative width and a Phaser emitter that silently emits nothing.
    expect(SPARKLE_SPAWN.width).toBeGreaterThan(0);
    expect(SPARKLE_SPAWN.height).toBeGreaterThan(0);
  });

  it('agrees with the JSON on the plate size, which IS a shared fact', () => {
    // Unlike the water boxes, this one genuinely must match: every coordinate in
    // both files is expressed against it.
    expect(layers.plateSize).toEqual({ width: 1536, height: 1152 });
  });

  it('anchors every glow inside the plate', () => {
    expect(GLOW_SPOTS.length).toBeGreaterThan(0);
    for (const g of GLOW_SPOTS) {
      expect(g.x).toBeGreaterThanOrEqual(0);
      expect(g.x).toBeLessThanOrEqual(layers.plateSize.width);
      expect(g.y).toBeGreaterThanOrEqual(0);
      expect(g.y).toBeLessThanOrEqual(layers.plateSize.height);
      // groundY is the lamp POST's base, well below the crystal, so a glow whose
      // groundY sits above its own y means the depth sort will put light in front
      // of the thing emitting it.
      expect(g.groundY).toBeGreaterThan(g.y);
    }
  });
});
