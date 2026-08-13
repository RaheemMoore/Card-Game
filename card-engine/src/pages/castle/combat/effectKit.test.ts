import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { allEffectTextureKeys, effectKitFor } from './effectKit';
import pack from '../../../../public/asset-pack.json';
import { MATERIAL_KITS } from '../../../data/combat/performance/materialKits';
import { ELEMENT_NAMES } from '../../../types/bible';

/**
 * The overworld draws its blasts with art that was generated for the boss battle.
 * These assert the join: that every element resolves to something firable, that
 * the keys named here are keys the pack actually registers, and that an element
 * nobody drew still gets a shot rather than a crash.
 */

const packedKeys = new Set(
  Object.values(pack as Record<string, { files?: { key: string }[] }>)
    .flatMap((section) => section?.files ?? [])
    .map((f) => f.key),
);

describe('effect kits', () => {
  it('gives every element in the Bible something to fire', () => {
    // A card that cannot be shot because nobody drew its element yet is a far
    // worse bug than one that looks approximate.
    for (const element of ELEMENT_NAMES) {
      const kit = effectKitFor(element);
      expect(kit.palette, `palette for ${element}`).toHaveLength(3);
      // Either its own art, a family stand-in, or the caller's placeholder — but
      // resolution must never throw.
      expect(() => effectKitFor(element)).not.toThrow();
    }
  });

  it('uses each element own art where it exists', () => {
    const fire = effectKitFor('Fire');
    expect(fire.exact).toBe(true);
    expect(fire.stream?.key).toBe('fx-lash-fire-stream');
    expect(fire.impact?.key).toBe('fx-lash-fire-impact');
  });

  it('dresses a stand-in in the element own colours, not the donor colours', () => {
    // Holy has no effect art. Borrowing Light's radiant shape is honest; wearing
    // Light's palette would make Holy read as a different element entirely.
    const holy = effectKitFor('Holy');
    expect(holy.exact).toBe(false);
    expect(holy.stream).not.toBeNull();
    expect(holy.palette).toEqual(MATERIAL_KITS.Holy.palette);
    expect(holy.palette).not.toEqual(MATERIAL_KITS.Light.palette);
  });

  it('picks a stand-in by family rather than by hue', () => {
    // A Holy blast wearing Fire's shape would be a lie about what the element is.
    expect(effectKitFor('Holy').stream?.key).toBe('fx-lash-light-stream');
  });

  it('survives a card with no element at all', () => {
    const none = effectKitFor(undefined);
    expect(none.stream).toBeNull();
    expect(none.palette).toHaveLength(3);
  });

  it('marks the still-only clips as one frame, not nine', () => {
    // Three elements were only ever given a shard, and four only a still impact.
    // Animating a one-frame sheet across nine frames draws eight empty frames.
    expect(effectKitFor('Sanguine').stream?.frameCount).toBe(1);
    expect(effectKitFor('Blood').impact?.frameCount).toBe(1);
    expect(effectKitFor('Fire').stream?.frameCount).toBe(9);
  });

  it('names only textures the asset pack actually registers', () => {
    // The failure this prevents: Phaser answers a missing texture with a green
    // box and reports nothing, so a typo here would ship as art.
    const missing = allEffectTextureKeys().filter((key) => !packedKeys.has(key));
    expect(missing).toEqual([]);
  });

  it('points every registered effect sheet at a file on disk', () => {
    const fx = (pack as Record<string, { files?: { key: string; url: string }[] }>)['combat-effects'];
    expect(fx?.files?.length).toBeGreaterThan(0);
    const absent = (fx!.files ?? []).filter(
      (f) => !existsSync(resolve(__dirname, '../../../../public', f.url)),
    );
    expect(absent.map((f) => f.key)).toEqual([]);
  });
});
