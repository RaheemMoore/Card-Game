import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import pack from '../../../public/asset-pack.json';
import { OCCLUDERS, occluderKey, occluderPath } from '../../data/castle/occluders';
import { HERO_SHEET } from '../../data/castle/heroSprite';
import { KEEPERS } from '../../data/castle/keepers';
import { WATER_LAYER } from '../../data/castle/courtyardLayers';

/**
 * The Asset Pack is the ONE bridge between Phaser Editor and the running game:
 * Raheem places things in the Editor against the assets this file lists, and the
 * game loads the same file at runtime. Everything downstream — every scene he
 * composes — assumes a key in the Editor means the same texture in play.
 *
 * So the failure this suite exists to prevent is silent divergence. If a sheet is
 * regenerated at a new frame size, or an occluder is added, or a texture key is
 * renamed, the Editor would keep showing the old world and the game would show the
 * new one, and nothing would error — Phaser fails a missing texture with a green
 * box, not an exception. These assertions turn that into a red test instead.
 *
 * They compare against the RUNTIME data modules rather than against a fixture,
 * because the runtime modules are what the scenes actually load.
 */

type PackSection = { path?: string; files: Array<Record<string, unknown>> };

const sections = Object.entries(pack as Record<string, unknown>).filter(
  ([, v]) => Array.isArray((v as PackSection)?.files),
) as Array<[string, PackSection]>;

/** Resolve a pack entry the way Phaser's loader does: section `path` + entry `url`. */
const entries = new Map<string, { url: string; raw: Record<string, unknown> }>();
for (const [, section] of sections) {
  for (const file of section.files) {
    entries.set(String(file.key), {
      url: '/' + (section.path ?? '') + String(file.url),
      raw: file,
    });
  }
}

describe('asset pack ↔ runtime parity', () => {
  it('skips the meta block rather than treating it as a section', () => {
    // Phaser's addPack only processes top-level keys carrying a `files` array
    // (LoaderPlugin.js). This asserts our meta block stays inert, which is what
    // lets one file serve both the Editor and the game.
    expect('meta' in pack).toBe(true);
    expect(sections.map(([name]) => name)).not.toContain('meta');
  });

  it('lists every occluder the courtyard loads, at the same key and path', () => {
    expect(OCCLUDERS.length).toBeGreaterThan(0);
    for (const o of OCCLUDERS) {
      const entry = entries.get(occluderKey(o.id));
      expect(entry, `missing occluder '${o.id}' — re-run build-asset-pack.mjs`).toBeDefined();
      expect(entry!.url).toBe(occluderPath(o.id));
      expect(entry!.raw.type).toBe('image');
    }
  });

  it('lists the plate and water layer the scene loads', () => {
    expect(entries.get('courtyard')?.url).toBe('/assets/castle/courtyard.png');
    expect(entries.get(WATER_LAYER.key)?.url).toBe(WATER_LAYER.path);
  });

  it('carries the hero sheet at the frame size the renderer assumes', () => {
    const hero = entries.get(HERO_SHEET.key);
    expect(hero, 'hero sheet missing from the pack').toBeDefined();
    expect(hero!.url).toBe(HERO_SHEET.path);
    expect(hero!.raw.type).toBe('spritesheet');
    // A frame-size drift here is the regeneration failure this suite is for: the
    // sheet still loads, but every frame is sliced at the wrong offset.
    expect(hero!.raw.frameConfig).toEqual({
      frameWidth: HERO_SHEET.frameWidth,
      frameHeight: HERO_SHEET.frameHeight,
    });
  });

  it('carries every keeper sheet whose art has landed, at matching frame sizes', () => {
    // Keepers with no art yet are deliberately absent from the pack rather than
    // present with zero-sized frames — the same skip the scene's preload makes.
    const landed = KEEPERS.filter(
      (k) => k.sheet.frameWidth && k.sheet.frameHeight && k.sheet.frameCount,
    );
    expect(landed.length).toBeGreaterThan(0);

    for (const k of landed) {
      const entry = entries.get(k.sheet.key);
      expect(entry, `keeper '${k.id}' missing — re-run build-asset-pack.mjs`).toBeDefined();
      expect(entry!.url).toBe(k.sheet.path);
      expect(entry!.raw.frameConfig).toEqual({
        frameWidth: k.sheet.frameWidth,
        frameHeight: k.sheet.frameHeight,
      });
    }
  });

  it('points every entry at a file that exists on disk', () => {
    // A wrong path does not throw — Phaser renders a green box and the Editor shows
    // a broken thumbnail. Checking the filesystem catches a moved or renamed asset
    // at test time instead of in play.
    const missing = [...entries.entries()]
      .map(([key, e]) => ({ key, file: resolve(__dirname, '../../../public', e.url.slice(1)) }))
      .filter(({ file }) => !existsSync(file));

    expect(missing.map((m) => m.key)).toEqual([]);
  });

  it('has no duplicate texture keys across sections', () => {
    // Phaser silently keeps the first texture for a duplicated key, so a collision
    // between sections would show as the wrong art rather than as an error.
    const all = sections.flatMap(([, s]) => s.files.map((f) => String(f.key)));
    expect(all.length).toBe(new Set(all).size);
  });
});
