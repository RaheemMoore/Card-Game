import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import pack from '../../../public/asset-pack.json';
import { OCCLUDERS, occluderKey, occluderPath } from '../../data/castle/occluders';
import { HERO_SHEET } from '../../data/castle/heroSprite';
import {
  CARD_SLAM_SHEET,
  CARD_SLAM_ANCHOR,
  CARD_SLAM_DURATIONS_MS,
  CARD_SLAM_TOTAL_MS,
} from '../../data/castle/cardSlamSprite';
import slamTwin from '../../../public/assets/castle/hero/card-slam/card-slam-sheet.json';
import {
  CARD_BLAST_ANCHOR,
  CARD_BLAST_SHEET,
  CARD_BLAST_SHEETS,
} from '../../data/castle/cardBlastSprite';
import blastTwin from '../../../public/assets/castle/hero/card-blast/card-blast-sheet.json';
import {
  KNOCKDOWN_SHEET,
  KNOCKDOWN_ANCHOR,
  KNOCKDOWN_DURATIONS_MS,
  KNOCKDOWN_TOTAL_MS,
} from '../../data/castle/knockdownSprite';
import knockdownTwin from '../../../public/assets/castle/hero/knockdown/knockdown-sheet.json';
import { ACTION_TIMING } from './combat/actionState';
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

  it('carries the card-slam performance at its own frame size', () => {
    // The slam is 84x84 where the walk sheet is 36x71. Registering it against the
    // hero's grid would slice a different animation out of the same pixels and
    // still render something, which is why this asserts the sizes independently.
    const slam = entries.get(CARD_SLAM_SHEET.key);
    expect(slam, 'card-slam sheet missing — re-run build-asset-pack.mjs').toBeDefined();
    expect(slam!.url).toBe(CARD_SLAM_SHEET.path);
    expect(slam!.raw.type).toBe('spritesheet');
    expect(slam!.raw.frameConfig).toEqual({
      frameWidth: CARD_SLAM_SHEET.frameWidth,
      frameHeight: CARD_SLAM_SHEET.frameHeight,
    });
  });

  it('keeps the slam timing one duration per frame, with its two holds intact', () => {
    // A uniform frameRate would drop the 280ms opening presentation and the 700ms
    // palm-down pose the summon resolves from, and the ritual stops reading.
    expect(CARD_SLAM_DURATIONS_MS).toHaveLength(CARD_SLAM_SHEET.frameCount);
    expect(CARD_SLAM_DURATIONS_MS[0]).toBe(280);
    expect(CARD_SLAM_DURATIONS_MS.at(-1)).toBe(700);
    // 280 opening + 15 x 90 transition + 700 palm-down hold.
    expect(CARD_SLAM_TOTAL_MS).toBe(2330);

    // And that the module still agrees with the sheet PixelLab actually wrote. A
    // regeneration rewrites the twin; without this the code would keep animating
    // to the old timing against new art.
    expect(slamTwin.animation.durationsMs).toEqual([...CARD_SLAM_DURATIONS_MS]);
    expect(slamTwin.anchor.x).toBe(CARD_SLAM_ANCHOR.x);
    expect(slamTwin.anchor.y).toBe(CARD_SLAM_ANCHOR.y);
    expect(slamTwin.frameCount).toBe(CARD_SLAM_SHEET.frameCount);
  });

  it('carries the left-facing card-blast proof at its measured frame size and anchor', () => {
    const blast = entries.get(CARD_BLAST_SHEET.key);
    expect(blast, 'card-blast sheet missing — re-run build-asset-pack.mjs').toBeDefined();
    expect(blast!.url).toBe(CARD_BLAST_SHEET.path);
    expect(blast!.raw.type).toBe('spritesheet');
    expect(blast!.raw.frameConfig).toEqual({
      frameWidth: CARD_BLAST_SHEET.frameWidth,
      frameHeight: CARD_BLAST_SHEET.frameHeight,
    });
    expect(blastTwin.frameCount).toBe(CARD_BLAST_SHEET.frameCount);
    expect(CARD_BLAST_ANCHOR.x).toBeCloseTo(blastTwin.anchor.x, 6);
    expect(CARD_BLAST_ANCHOR.y).toBeCloseTo(blastTwin.anchor.y, 6);
  });

  it('carries every directional card-blast strip at its independently measured size', () => {
    for (const [facing, sheet] of Object.entries(CARD_BLAST_SHEETS)) {
      const entry = entries.get(sheet.key);
      expect(entry, `${facing} card-blast sheet missing — re-run build-asset-pack.mjs`).toBeDefined();
      expect(entry!.url).toBe(sheet.path);
      expect(entry!.raw.type).toBe('spritesheet');
      expect(entry!.raw.frameConfig).toEqual({
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
  });

  it('carries the fall at its own frame size, not the walk grid', () => {
    // A sprawled body is wider than it is tall; forcing it into the walk's
    // 36x71 box would clip his own arms off and still render something.
    const fall = entries.get(KNOCKDOWN_SHEET.key);
    expect(fall, 'knockdown sheet missing — re-run build-asset-pack.mjs').toBeDefined();
    expect(fall!.url).toBe(KNOCKDOWN_SHEET.path);
    expect(fall!.raw.frameConfig).toEqual({
      frameWidth: KNOCKDOWN_SHEET.frameWidth,
      frameHeight: KNOCKDOWN_SHEET.frameHeight,
    });
  });

  it('times the fall independently from the required grounded hold', () => {
    // The art controls the trip to the floor. The state machine separately owns
    // how long he must remain there before get-up input is accepted.
    expect(KNOCKDOWN_DURATIONS_MS).toHaveLength(KNOCKDOWN_SHEET.frameCount);
    expect(KNOCKDOWN_TOTAL_MS).toBe(ACTION_TIMING.knockdownFallMs);
    expect(ACTION_TIMING.knockdownGroundedMs).toBeGreaterThan(0);
    expect(ACTION_TIMING.standUpMs).toBe(KNOCKDOWN_TOTAL_MS);
    expect(knockdownTwin.animation.durationsMs).toEqual([...KNOCKDOWN_DURATIONS_MS]);
    expect(knockdownTwin.frameCount).toBe(KNOCKDOWN_SHEET.frameCount);
  });

  it('anchors the fall where its feet actually are', () => {
    // 0.95 was copied from the card slam and lifted him ~24px off the ground at
    // the sprite swap — he left the floor on the frame he was meant to hit it.
    // The number belongs to THIS art, so the module and the twin must agree.
    expect(KNOCKDOWN_ANCHOR.y).toBeCloseTo(knockdownTwin.anchor.y, 3);
    expect(KNOCKDOWN_ANCHOR.x).toBeCloseTo(knockdownTwin.anchor.x, 3);
    // Well clear of the walk sheet's near-1.0: if these ever converge, someone
    // has copied a number again instead of measuring one.
    expect(KNOCKDOWN_ANCHOR.y).toBeLessThan(0.9);
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
