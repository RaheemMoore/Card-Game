#!/usr/bin/env node
/**
 * Generate the Phaser Asset Pack that Phaser Editor reads and the game loads.
 *
 * WHY THIS FILE EXISTS. Moving world authoring off Figma and into Phaser Editor
 * needs exactly one bridge: a file the Editor can manage AND Phaser can load.
 * The Asset Pack is that file — it is a NATIVE Phaser format (`this.load.pack()`),
 * not an Editor invention, so adopting the Editor adds no adapter and no runtime
 * dependency on it. If Raheem ever stops using the Editor, this file still works.
 *
 * VERIFIED, NOT ASSUMED: Phaser's loader iterates the pack's top-level keys and
 * processes only those carrying a `files` array
 * (node_modules/phaser/src/loader/LoaderPlugin.js, `addPack`). The Editor's `meta`
 * block has no `files`, so it is skipped rather than erroring. That is what makes
 * one file serve both tools.
 *
 * WHY GENERATED RATHER THAN HAND-WRITTEN. There are 30 occluder cutouts alone, and
 * every sheet's frame size is already recorded in a JSON twin written by
 * lib/pack.py. Hand-copying those numbers into a third place is precisely the
 * drift this project keeps paying for. Read the twins; never retype them.
 *
 * The keys emitted here are the SAME keys the running scenes already use, so the
 * pack is a drop-in rather than a parallel system. assetPack.test.ts enforces that.
 *
 * Usage:
 *   node scripts/phaser-editor/build-asset-pack.mjs [--check]
 *
 *   --check   exit non-zero if the committed pack is stale, and write nothing.
 *             For CI and the pre-push hook.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(HERE, '../../public');
const CASTLE = join(PUBLIC, 'assets/castle');
const OUT = join(PUBLIC, 'asset-pack.json');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/**
 * Real pixel dimensions, straight out of the PNG's IHDR chunk (width and height are
 * big-endian uint32 at byte 16 and 20). No dependency needed.
 *
 * WHY WE DO NOT SIMPLY TRUST THE JSON TWIN. The first run of this generator emitted
 * a 31px frame width for the archivist from her twin, against a PNG that is 30px
 * wide — she had been regenerated as a single frame and lib/pack.py's twin was never
 * rewritten. A frame size that does not divide the image is the worst kind of art
 * bug: Phaser slices happily and every frame after the first is sheared, with no
 * error anywhere. The image on disk is the only thing that cannot be stale.
 */
function pngSize(path) {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * Sheet texture keys are NOT derivable from filenames — `dwarf-breathe.png` is
 * loaded as `keeper-dwarf`, and `horse-eating.png` as `prop-horse`. The mapping
 * lives in src/data/castle/keepers.ts, which this script cannot import (TypeScript,
 * and importing app code into a build script couples them the wrong way round).
 * So it is restated here, and assetPack.test.ts fails if the two ever disagree.
 */
const SHEETS = [
  { key: 'hero-chibi', dir: 'hero', manifest: 'chibi.json' },
  { key: 'hero-cardwright', dir: 'hero', manifest: 'cardwright.json' },
  { key: 'keeper-dwarf', dir: 'keepers', manifest: 'dwarf-breathe.json' },
  { key: 'keeper-archivist', dir: 'keepers', manifest: 'archivist-breathe.json' },
  { key: 'prop-horse', dir: 'keepers', manifest: 'horse-eating.json' },
];

function buildPack() {
  const occluders = readJson(join(CASTLE, 'occluders/occluders.json')).occluders;

  /**
   * The painted plate and its animated water layer. `path` is a loader prefix,
   * so entries stay short and one edit moves the whole section.
   */
  const plate = {
    path: 'assets/castle/',
    files: [
      { type: 'image', key: 'courtyard', url: 'courtyard.png' },
      { type: 'image', key: 'courtyard-water', url: 'layers/water.png' },
    ],
  };

  /**
   * Cut FROM the plate, so they align by construction. Drawn at their own
   * groundY depth — see src/data/castle/occluders.ts for why that is not the
   * bottom of the image.
   */
  const occluderSection = {
    path: 'assets/castle/occluders/',
    files: occluders.map((o) => ({
      type: 'image',
      key: `occluder-${o.id}`,
      url: `${o.id}.png`,
    })),
  };

  const characters = { files: [] };
  const problems = [];
  for (const s of SHEETS) {
    const manifestPath = join(CASTLE, s.dir, s.manifest);
    if (!existsSync(manifestPath)) continue; // art not landed yet; skip, don't fake it
    const m = readJson(manifestPath);
    if (!m.frameWidth || !m.frameHeight) continue;

    const imagePath = join(CASTLE, s.dir, m.image);
    const size = pngSize(imagePath);

    // The frame grid must tile the image exactly. If it does not, the twin is
    // stale and emitting it would bake a silent shearing bug into the Editor too.
    if (size.width % m.frameWidth !== 0 || size.height % m.frameHeight !== 0) {
      problems.push(
        `${s.key}: twin says ${m.frameWidth}x${m.frameHeight} but ${m.image} is ` +
          `${size.width}x${size.height} — the frame grid does not tile the image. ` +
          `Re-run lib/pack.py for this sheet, or correct ${s.dir}/${s.manifest}.`,
      );
      continue;
    }

    characters.files.push({
      type: 'spritesheet',
      key: s.key,
      url: `assets/castle/${s.dir}/${m.image}`,
      frameConfig: { frameWidth: m.frameWidth, frameHeight: m.frameHeight },
    });
  }

  if (problems.length) {
    console.error('Refusing to write a pack with frame sizes that contradict the art:\n');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }

  return {
    /**
     * Phaser skips this block (no `files` array). Phaser Editor reads it to
     * recognise the file as one of its own.
     */
    meta: {
      app: 'Phaser Editor 2D - Asset Pack Editor',
      contentType: 'Phaser v3 Asset Pack',
      apiVersion: 2,
      generated: 'scripts/phaser-editor/build-asset-pack.mjs — do not hand-edit',
    },
    'castle-plate': plate,
    'castle-occluders': occluderSection,
    'castle-characters': characters,
  };
}

const PACK_META = {
  app: 'Phaser Editor 2D - Asset Pack Editor',
  contentType: 'Phaser v3 Asset Pack',
  apiVersion: 2,
  generated: 'scripts/phaser-editor/build-asset-pack.mjs — do not hand-edit',
};

/**
 * One pack per AREA, rather than one pack for the whole game.
 *
 * This is Phaser Editor's own recommendation, and the reason is practical: the
 * Editor's asset browser shows you a pack at a time, so a per-area pack means
 * building the forest shows forest assets and nothing else. A single global pack
 * turns into a scroll the moment the game has more than one place in it.
 *
 * Keys are namespaced `<area>-<layer>-<stem>` because Phaser texture keys share
 * one global namespace — two areas each with a `tree-oak` would silently collide,
 * and Phaser keeps the first, so the wrong art renders with no error anywhere.
 */
function buildAreaPacks() {
  const areasDir = join(PUBLIC, 'assets/areas');
  if (!existsSync(join(areasDir, 'areas.json'))) return [];

  const registry = readJson(join(areasDir, 'areas.json'));
  const layers = registry.layers.map((l) => l.id);
  const out = [];

  for (const area of registry.areas) {
    const areaPath = join(areasDir, area.id);
    if (!existsSync(areaPath)) continue;

    const pack = { meta: { ...PACK_META, area: area.id, label: area.label } };
    let count = 0;

    for (const layer of layers) {
      const layerPath = join(areaPath, layer);
      if (!existsSync(layerPath)) continue;

      const files = readdirSync(layerPath)
        .filter((f) => f.endsWith('.png'))
        .sort();
      if (!files.length) continue;

      pack[`${area.id}-${layer}`] = {
        path: `assets/areas/${area.id}/${layer}/`,
        files: files.map((f) => ({
          type: 'image',
          key: `${area.id}-${layer}-${f.replace(/\.png$/, '')}`,
          url: f,
        })),
      };
      count += files.length;
    }

    out.push({
      path: join(areaPath, 'area.json'),
      label: `areas/${area.id}/area.json`,
      serialised: JSON.stringify(pack, null, 2) + '\n',
      count,
    });
  }
  return out;
}

const pack = buildPack();
const serialised = JSON.stringify(pack, null, 2) + '\n';
const areaPacks = buildAreaPacks();

if (process.argv.includes('--check')) {
  const stale = [];
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current !== serialised) stale.push('asset-pack.json');
  for (const a of areaPacks) {
    const now = existsSync(a.path) ? readFileSync(a.path, 'utf8') : '';
    if (now !== a.serialised) stale.push(a.label);
  }
  if (stale.length) {
    console.error('Stale, run `npm run assets:pack`:');
    for (const s of stale) console.error('  - ' + s);
    process.exit(1);
  }
  console.log(`Packs are up to date (asset-pack.json + ${areaPacks.length} area pack(s)).`);
} else {
  writeFileSync(OUT, serialised);
  const count = Object.values(pack)
    .filter((s) => Array.isArray(s?.files))
    .reduce((n, s) => n + s.files.length, 0);
  console.log(`Wrote public/asset-pack.json — ${count} castle assets across 3 sections.`);

  for (const a of areaPacks) {
    writeFileSync(a.path, a.serialised);
    console.log(`Wrote ${a.label} — ${a.count} asset(s).`);
  }
}
