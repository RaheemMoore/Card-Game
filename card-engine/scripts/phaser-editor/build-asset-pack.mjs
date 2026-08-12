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
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
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
  { key: 'hero-card-slam', dir: 'hero/card-slam', manifest: 'card-slam-sheet.json' },
  { key: 'keeper-dwarf', dir: 'keepers', manifest: 'dwarf-breathe.json' },
  { key: 'keeper-archivist', dir: 'keepers', manifest: 'archivist-breathe.json' },
  { key: 'prop-horse', dir: 'keepers', manifest: 'horse-eating.json' },

  // TEMPORARY — hero size test, 2026-08-09. Raheem: "I think our characters may
  // be a bit too big", against the reference tilemaps. These are the same sheet
  // area-averaged down by lib/resample.py to smaller NATIVE frame heights, so
  // what gets judged in CastleKitV3 is what would actually ship — pixel art must
  // never be shrunk at render time, which is the whole reason that script exists.
  // Delete these three lines and public/assets/castle/hero/sizetest/ once a size
  // is chosen.
  { key: 'hero-chibi-56', dir: 'hero/sizetest', manifest: 'chibi-56.json' },
  { key: 'hero-chibi-48', dir: 'hero/sizetest', manifest: 'chibi-48.json' },
  { key: 'hero-chibi-40', dir: 'hero/sizetest', manifest: 'chibi-40.json' },
];

function buildPack() {
  const occluders = readJson(join(CASTLE, 'occluders/occluders.json')).occluders;

  /**
   * Every `url` is written in full, from the public root.
   *
   * A section-level `path` prefix reads better and Phaser's runtime loader
   * honours it — but Phaser Editor does NOT. Its ImageAssetPackItem is literally
   * `getUrl() { return this.getData()["url"]; }`, so a prefixed entry resolves to
   * nothing and the Editor silently substitutes a 10x10 placeholder. The game
   * looked fine while the Editor showed 38 broken images. Keep the paths full.
   */
  const plate = {
    files: [
      { type: 'image', key: 'courtyard', url: 'assets/castle/courtyard.png' },
      { type: 'image', key: 'courtyard-water', url: 'assets/castle/layers/water.png' },
    ],
  };

  /**
   * Cut FROM the plate, so they align by construction. Drawn at their own
   * groundY depth — see src/data/castle/occluders.ts for why that is not the
   * bottom of the image.
   */
  const occluderSection = {
    files: occluders.map((o) => ({
      type: 'image',
      key: `occluder-${o.id}`,
      url: `assets/castle/occluders/${o.id}.png`,
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


  /**
   * ANIMATED SPRITESHEETS recovered from PixelLab, 2026-08-07.
   *
   * Each sheet has a JSON twin written beside it carrying frameWidth/frameHeight/
   * columns. These MUST be registered as `spritesheet`, not `image` — an animation
   * sheet registered flat still previews correctly in the Blocks panel, which is
   * exactly the trap: it looks right and cannot be sliced into frames. Same class of
   * bug as the `-wang-` tilesets below.
   *
   * Frame size is read from the twin AND checked against the real PNG, because a
   * grid that does not divide the image shears every frame after the first with no
   * error anywhere.
   */
  const animatedDir = join(CASTLE, 'animated');
  const animated = { files: [] };
  if (existsSync(animatedDir)) {
    for (const f of readdirSync(animatedDir).sort()) {
      if (!f.endsWith('.json')) continue;
      const meta = readJson(join(animatedDir, f));
      const png = join(animatedDir, meta.image ?? f.replace(/\.json$/, '.png'));
      if (!existsSync(png) || !meta.frameWidth || !meta.frameHeight) continue;
      const size = pngSize(png);
      if (size.width % meta.frameWidth !== 0 || size.height % meta.frameHeight !== 0) {
        console.warn(`! ${f}: frame grid does not tile the image — skipped`);
        continue;
      }
      animated.files.push({
        type: 'spritesheet',
        key: `anim-${f.replace(/\.json$/, '')}`,
        url: `assets/castle/animated/${meta.image ?? f.replace(/\.json$/, '.png')}`,
        frameConfig: { frameWidth: meta.frameWidth, frameHeight: meta.frameHeight },
      });
    }
  }

  /**
   * COMBAT EFFECTS, packed by scripts/effects/pack_effects.py.
   *
   * The elemental blasts and impacts were generated in PixelLab for the boss
   * battle and stored one PNG per frame, because the React battle layer swaps an
   * <img> src on a timer. Phaser needs a strip, so the packer writes one plus the
   * usual twin and this scans the result — the same shape as the animated block
   * above, and for the same reason: hand-listing 54 clips is how a new one gets
   * forgotten.
   *
   * Scanned rather than enumerated so new effect art appears by re-running the
   * packer, with no second place to remember.
   */
  const effectsDir = join(PUBLIC, 'assets/combat/effects/packed');
  const effects = { files: [] };
  if (existsSync(effectsDir)) {
    for (const f of readdirSync(effectsDir).sort()) {
      if (!f.endsWith('.json')) continue;
      const meta = readJson(join(effectsDir, f));
      const png = join(effectsDir, meta.image ?? f.replace(/\.json$/, '.png'));
      if (!existsSync(png) || !meta.frameWidth || !meta.frameHeight) continue;
      const size = pngSize(png);
      if (size.width % meta.frameWidth !== 0 || size.height % meta.frameHeight !== 0) {
        console.warn(`! ${f}: frame grid does not tile the image — skipped`);
        continue;
      }
      effects.files.push({
        type: 'spritesheet',
        key: f.replace(/\.json$/, ''),
        url: `assets/combat/effects/packed/${meta.image ?? f.replace(/\.json$/, '.png')}`,
        frameConfig: { frameWidth: meta.frameWidth, frameHeight: meta.frameHeight },
      });
    }
  }

  return {
    /**
     * Phaser skips this block (no `files` array). Phaser Editor reads it to
     * recognise the file as one of its own.
     */
    meta: PACK_META,
    'castle-plate': plate,
    'castle-occluders': occluderSection,
    'castle-characters': characters,
    'castle-animated': animated,
    'combat-effects': effects,
  };
}

/**
 * Phaser skips this block (no `files` array). Phaser Editor reads it to recognise
 * the file as one of its own.
 *
 * These four values are NOT descriptive — the Editor matches `contentType` and
 * `version` exactly, and silently treats the file as plain JSON when they differ.
 * A hand-written `contentType: 'Phaser v3 Asset Pack'` with `apiVersion: 2` is
 * what shipped first, and it cost an hour of hunting an "empty Blocks panel"
 * that was really an unrecognised pack. Copy these from a pack the Editor itself
 * wrote; do not paraphrase them.
 */
const PACK_META = {
  app: 'Phaser Editor 2D - Asset Pack Editor',
  contentType: 'phasereditor2d.pack.core.AssetContentType',
  url: 'https://phasereditor2d.com',
  version: 2,
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

      // Full urls, no section `path` prefix — see buildPack() for why.
      pack[`${area.id}-${layer}`] = {
        files: files.map((f) => ({
          type: 'image',
          key: `${area.id}-${layer}-${f.replace(/\.png$/, '')}`,
          url: `assets/areas/${area.id}/${layer}/${f}`,
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

/**
 * KIT PACKS ARE FOR THE EDITOR, NOT THE GAME.
 *
 * A kit lands as a folder of PNGs plus the generator's own manifest, and most of
 * it arrives un-reviewed — the Halo Stone castle kit was 2 KEEP out of 29. The
 * runtime must not load that, and `CourtyardScene.ts` never does: it loads
 * `/asset-pack.json` by name, and no kit pack is ever named there.
 *
 * But art that cannot be seen cannot be reviewed, and Phaser Editor only shows
 * what a pack declares. So kits get their own pack file, visible in the Editor's
 * asset browser and invisible to the running game. That is the whole point of the
 * split — registering a kit here is NOT a claim that it is production-ready.
 *
 * Sections are grouped by review status so the Blocks panel sorts cleared work
 * away from work that still needs Raheem's eyes.
 */
function buildKitPacks() {
  const kitsDir = join(PUBLIC, 'assets/kits');
  if (!existsSync(kitsDir)) return [];

  const out = [];
  for (const kitId of readdirSync(kitsDir).sort()) {
    const kitPath = join(kitsDir, kitId);
    if (!statSync(kitPath).isDirectory()) continue;

    const manifestPath = join(kitPath, 'castle-kit-manifest.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = readJson(manifestPath);

    const pack = { meta: { ...PACK_META, kit: kitId, editorOnly: true } };
    const bucketed = new Map();
    let count = 0;
    const missing = [];

    for (const asset of manifest.assets) {
      const rel = `assets/kits/${kitId}/${asset.path}`;
      if (!existsSync(join(PUBLIC, rel))) {
        missing.push(asset.path);
        continue;
      }
      // `castle.wall.straight.front.healthy` -> `halo-stone-castle-wall-straight-front-healthy`
      /**
       * KEYS ARE WHAT THE BLOCKS PANEL SHOWS, and it truncates to about eight
       * characters. Every key used to begin `halo-stone-castle-`, so all 218 read
       * "halo-s..." — identical labels under near-identical thumbnails, which is
       * worse than no labels at all. Raheem, 2026-08-07: "This game isn't Halo
       * Stone. Halo Stone on every image is absolutely useless, and it's just
       * wasting my space to actually understand what's happening."
       *
       * So the kit prefix is dropped and the DISTINCTIVE word comes first:
       * `wall-straight-v2`, `tree-orange`, `apprentice-cardwright-rot-south`.
       * The kit is already implied by which pack file you are looking in.
       *
       * Renaming keys rewrites every texture reference in every scene, so this is
       * a migration, not a cosmetic change — scripts/phaser-editor/rename-keys.mjs
       * remaps the scenes in lockstep and must be run whenever this changes.
       */
      const key = asset.assetId
        .replace(/^castle\./, '')
        .replace(/^(recovered|characters)\./, '')
        .replace(/\./g, '-');

      /**
       * SECTIONS ARE WHAT THE BLOCKS PANEL SHOWS AS COLLAPSIBLE GROUPS.
       *
       * They used to be the asset's review STATUS, which put 140 assets into two
       * buckets — Raheem, 2026-08-07: "it's just a giant list of images. It's not
       * divided by castle parts or forest parts or stationary items. That's quite
       * confusing to look through."
       *
       * Category is far more useful when you are hunting for a piece to place, and
       * it costs nothing: the manifest path already encodes it. Status still
       * matters for review, so it rides along as a suffix on anything not yet
       * cleared — you can still see at a glance what is unreviewed, but you find
       * a wall by looking under "walls".
       */
      const CATEGORY = [
        [/^structures\/buildings\//, 'buildings'],
        [/^structures\/walls\//, 'walls'],
        [/^structures\/towers\//, 'towers'],
        [/^structures\/gate\//, 'gates'],
        [/^ground\/tilesets\//, 'tilesets'],
        [/^ground\/overlays\//, 'ground-overlays'],
        [/^terrain\//, 'terrain'],
        [/^characters\//, 'characters'],
        [/^nature\//, 'nature'],
        [/^recovered\/castle-(griffin|apprentice|forge-dragon|keeper)/, 'characters'],
        [/^recovered\/castle-(trees|blight)/, 'nature'],
        [/^recovered\/castle-(rugs|lectern|sorting|weapon|forging|hand-cart|crate|barrel|market|reliquary|crystal|courtyard-props|tower-yard|tower-way|wall-crack)/, 'props'],
        [/^recovered\//, 'recovered-misc'],
        [/^review\//, 'review-sheets'],
      ];
      const cat = (CATEGORY.find(([re]) => re.test(asset.path)) ?? [null, 'other'])[1];
      const cleared = /^(keep)$/i.test(asset.status);
      const section = `${kitId}--${cat}${cleared ? '' : '--unreviewed'}`;

      /**
       * A `-wang-<N>` suffix means the PNG is an N-pixel TILE GRID, not one object.
       * Registered flat as an `image` it still previews fine in the Blocks panel —
       * which is exactly the trap, because it looks correct and cannot be painted
       * onto a tilemap or sliced into tiles. The frame size has to be declared.
       */
      const wang = /-wang-(\d+)\.png$/.exec(asset.path);
      const entry = wang
        ? {
            type: 'spritesheet',
            key,
            url: rel,
            frameConfig: { frameWidth: Number(wang[1]), frameHeight: Number(wang[1]) },
          }
        : { type: 'image', key, url: rel };

      if (!bucketed.has(section)) bucketed.set(section, []);
      bucketed.get(section).push(entry);
      count += 1;
    }

    for (const [section, files] of [...bucketed].sort()) pack[section] = { files };

    out.push({
      path: join(kitPath, 'kit-pack.json'),
      label: `kits/${kitId}/kit-pack.json`,
      serialised: JSON.stringify(pack, null, 2) + '\n',
      count,
      missing,
    });
  }
  return out;
}

const pack = buildPack();
const serialised = JSON.stringify(pack, null, 2) + '\n';
const areaPacks = [...buildAreaPacks(), ...buildKitPacks()];

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
