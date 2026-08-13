#!/usr/bin/env node
/**
 * What the courtyard is actually made of, in numbers.
 *
 * WHY THIS EXISTS. "The world feels thin" and "there is void out there" are the
 * two things said about CourtyardV3, and neither is measurable by looking. The
 * first turned out to be true but not where it seemed, and the second turned out
 * to be false — the map is fully tiled and the camera cannot leave it. Decoration
 * is expensive hand work in the Editor, so it should be aimed at regions that are
 * measurably bare rather than at an impression.
 *
 * It also answers the question the handoff calls combat-safe negative space:
 * whether the open ground is still big enough to fight in. Filling every gap is a
 * real risk once someone starts placing props, and the blast travels 640 units.
 *
 * Reads only the Editor's own .scene file and the generated asset packs, so it
 * re-runs after every save and never needs its own copy of anything.
 *
 * Usage:  npm run castle:composition [-- --scene CourtyardV3]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CARD_ENGINE = resolve(HERE, '../..');
const REPO = resolve(CARD_ENGINE, '..');
const PUBLIC = join(CARD_ENGINE, 'public');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const SCENE = arg('scene', 'CourtyardV3');

/** Layers that are authoring aids, not the world. */
const NOT_THE_WORLD = new Set(['L9_SHELF_offmap', 'L10_VOID_library', 'L11_MARKERS']);

/** Editor fill colours, from sceneColliders.ts. */
const BLOCK = '#ff3355';

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** PNG dimensions straight from the IHDR, same trick as build-asset-pack.mjs. */
function pngSize(path) {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** texture key -> on-disk size, from whichever pack registers it. */
function textureSizes() {
  const sizes = new Map();
  const packs = [
    join(PUBLIC, 'asset-pack.json'),
    join(PUBLIC, 'assets/kits/halo-stone-castle/kit-pack.json'),
  ];
  for (const packPath of packs) {
    if (!existsSync(packPath)) continue;
    const pack = readJson(packPath);
    for (const [section, body] of Object.entries(pack)) {
      if (section === 'meta' || !body?.files) continue;
      for (const file of body.files) {
        if (sizes.has(file.key)) continue;
        const abs = join(PUBLIC, String(file.url).replace(/^\//, ''));
        if (!existsSync(abs)) continue;
        try {
          const full = pngSize(abs);
          // A spritesheet's object is ONE frame, not the whole strip.
          const fc = file.frameConfig;
          sizes.set(file.key, fc ? { width: fc.frameWidth, height: fc.frameHeight } : full);
        } catch {
          /* not a PNG we can read; skip rather than guess a size */
        }
      }
    }
  }
  return sizes;
}

/** Every placed thing, flattened, tagged with the layer it came from. */
function collect(scene) {
  const out = [];
  const walk = (node, layer) => {
    for (const c of node.list ?? []) {
      if (c.type === 'Layer') walk(c, c.label ?? layer);
      else if (c.type === 'Image' || c.type === 'Sprite' || c.type === 'TileSprite')
        out.push({ layer, node: c });
      else if (c.list) walk(c, layer);
    }
  };
  for (const top of scene.displayList ?? []) {
    if (top.type === 'Layer') walk(top, top.label ?? '(root)');
    else if (top.type === 'Image' || top.type === 'Sprite' || top.type === 'TileSprite')
      out.push({ layer: '(root)', node: top });
  }
  return out;
}

/** Collision rectangles, in world space, honouring origin/scale. */
function blockers(scene) {
  const rects = [];
  const walk = (node) => {
    for (const c of node.list ?? []) {
      if (c.type === 'Rectangle' && c.fillColor === BLOCK) {
        const w = (c.width ?? 0) * (c.scaleX ?? 1);
        const h = (c.height ?? 0) * (c.scaleY ?? 1);
        rects.push({
          x: (c.x ?? 0) - (c.originX ?? 0) * w,
          y: (c.y ?? 0) - (c.originY ?? 0) * h,
          w,
          h,
        });
      }
      if (c.list) walk(c);
    }
  };
  for (const top of scene.displayList ?? []) walk({ list: [top] });
  return rects;
}

/**
 * The largest square of open ground, by sampling.
 *
 * A maximal-square scan over a coarse grid. Exact enough to answer "is there
 * still room to fight here", which is the only question being asked, and it
 * degrades honestly: the answer is a lower bound at the grid's resolution.
 */
function largestOpenSquare(rects, W, H, cell) {
  const cols = Math.floor(W / cell);
  const rows = Math.floor(H / cell);
  const open = (cx, cy) => {
    const x = cx * cell + cell / 2;
    const y = cy * cell + cell / 2;
    return !rects.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  };
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0));
  let best = 0;
  let at = { x: 0, y: 0 };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!open(c, r)) continue;
      dp[r][c] =
        r === 0 || c === 0
          ? 1
          : 1 + Math.min(dp[r - 1][c], dp[r][c - 1], dp[r - 1][c - 1]);
      if (dp[r][c] > best) {
        best = dp[r][c];
        at = { x: (c - best + 1) * cell, y: (r - best + 1) * cell };
      }
    }
  }
  return { side: best * cell, at };
}

const scenePath = join(REPO, `${SCENE}.scene`);
if (!existsSync(scenePath)) {
  console.error(`No scene at ${scenePath}`);
  process.exit(1);
}
const scene = readJson(scenePath);
const sizes = textureSizes();
const placed = collect(scene);

// World size from the tilemap the scene owns, falling back to the courtyard's.
const map = (scene.displayList ?? []).flatMap(function find(n) {
  return n.type === 'EditableTilemap' ? [n] : (n.list ?? []).flatMap(find);
})[0];
const W = map ? (map.width ?? 80) * (map.tileWidth ?? 32) : 2560;
const H = map ? (map.height ?? 60) * (map.tileHeight ?? 32) : 1920;

const world = placed.filter(
  ({ layer, node }) =>
    !NOT_THE_WORLD.has(layer) && (node.x ?? 0) >= 0 && (node.x ?? 0) < W && (node.y ?? 0) >= 0 && (node.y ?? 0) < H,
);

console.log(`\n${SCENE} — ${W}x${H} world, ${world.length} scenery objects on the map`);
console.log(`(${placed.length - world.length} more are off-map shelf, void library or markers)\n`);

const COLS = 4;
const ROWS = 3;
const cw = W / COLS;
const ch = H / ROWS;
const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
for (const { node } of world) {
  grid[Math.min(ROWS - 1, Math.floor((node.y ?? 0) / ch))][
    Math.min(COLS - 1, Math.floor((node.x ?? 0) / cw))
  ]++;
}

console.log('scenery density, west -> east across, north -> south down:');
for (const row of grid) console.log('   ' + row.map((n) => String(n).padStart(4)).join(''));

const cells = [];
for (let r = 0; r < ROWS; r++)
  for (let c = 0; c < COLS; c++)
    cells.push({ n: grid[r][c], c, r });
cells.sort((a, b) => a.n - b.n);
console.log('\nthinnest regions:');
for (const { n, c, r } of cells.slice(0, 3)) {
  console.log(
    `   ${String(n).padStart(3)} objects   x ${Math.round(c * cw)}-${Math.round((c + 1) * cw)}, y ${Math.round(r * ch)}-${Math.round((r + 1) * ch)}`,
  );
}

// Footprints, which is what the depth audit cares about.
let unsized = 0;
const runs = [];
for (const { layer, node } of world) {
  const key = node.texture?.key;
  const size = key ? sizes.get(key) : undefined;
  if (!size) {
    unsized++;
    continue;
  }
  const w = (node.width ?? size.width) * (node.scaleX ?? 1);
  const h = (node.height ?? size.height) * (node.scaleY ?? 1);
  runs.push({ layer, label: node.label, key, w: Math.round(w), h: Math.round(h), x: Math.round(node.x ?? 0), y: Math.round(node.y ?? 0) });
}

console.log('\nthe five deepest footprints (north-south runs sort worst):');
for (const r of runs.sort((a, b) => b.h / b.w - a.h / a.w).slice(0, 5)) {
  console.log(
    `   ${r.label.padEnd(28)} ${String(r.w).padStart(4)}x${String(r.h).padStart(4)}  ratio ${(r.h / r.w).toFixed(2)}  ${r.layer}`,
  );
}
if (unsized) console.log(`   (${unsized} objects skipped: texture not in any pack)`);

const rects = blockers(scene);
const CELL = 32;
const openSq = largestOpenSquare(rects, W, H, CELL);
console.log(`\ncombat clearance — ${rects.length} blockers`);
console.log(`   largest open square: ${openSq.side}px at (${openSq.at.x}, ${openSq.at.y})`);
console.log(`   blast range 640 : ${openSq.side >= 640 ? 'fits' : 'TIGHT — a shot crosses the whole clearing'}`);
console.log(`   scatter reach 150: ${openSq.side >= 300 ? 'fits' : 'TIGHT — cards will land against blockers'}\n`);
