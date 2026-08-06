#!/usr/bin/env node
/**
 * Enforce the area/layer structure under public/assets/areas.
 *
 * WHY A LINTER AND NOT A DOCUMENT. This repo already had good asset conventions
 * written down, and six competing naming schemes grew anyway — SHOUTING verdict
 * prefixes, letter candidates, number candidates, stage suffixes — because nothing
 * ever checked. The single asset convention here that has never drifted is the one
 * with a test behind it. So the structure is defined by what this script rejects,
 * and _AREAS.md merely explains it.
 *
 * Every message names the offending file AND the fix, because a linter that only
 * says "invalid" trains people to work around it.
 *
 * Usage:
 *   node scripts/phaser-editor/lint-assets.mjs        human-readable, exits 1 on error
 *   node scripts/phaser-editor/lint-assets.mjs --json  machine-readable, for the vitest wrapper
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const AREAS = join(ROOT, 'public/assets/areas');

/** A name is a run of lowercase words joined by single hyphens. Nothing else. */
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Extensions an area may contain. area.json is generated and checked separately. */
const ASSET_EXT = new Set(['png', 'json']);

/** Files that are structure, not assets. */
const IGNORED = new Set(['.gitkeep', '.DS_Store', 'area.json']);

/**
 * Words that describe a CHOICE rather than a thing. A state ("cracked") is part of
 * the game and belongs in a filename; a verdict ("candidate", "final") is part of
 * deciding, and deciding happens in the harness review sheet. Matched per
 * hyphen-segment rather than by substring, so `tree-afterglow` is not mistaken for
 * a rejected `after` variant.
 */
const VERDICT_WORDS = new Set([
  'candidate', 'candidates', 'rejected', 'superseded', 'approved', 'best', 'ready',
  'usable', 'ingame', 'wip', 'draft', 'final', 'old', 'new', 'copy', 'temp', 'tmp',
  'before', 'after', 'test', 'untitled', 'unnamed', 'unknown',
]);

/** The direction vocabulary already used by the sprite pipeline. */
const DIRECTIONS = ['north', 'south', 'east', 'west'];
/** Spellings people reach for that break sorting and lookup. */
const BAD_DIRECTIONS = new Set([
  'northeast', 'northwest', 'southeast', 'southwest', 'ne', 'nw', 'se', 'sw',
  'up', 'down', 'left', 'right', 'front', 'back',
]);

const errors = [];
const err = (file, problem, fix) => errors.push({ file, problem, fix });

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const dirsIn = (p) =>
  readdirSync(p).filter((n) => !n.startsWith('.') && statSync(join(p, n)).isDirectory());
const filesIn = (p) =>
  existsSync(p) ? readdirSync(p).filter((n) => statSync(join(p, n)).isFile()) : [];

// ── The registry ──────────────────────────────────────────────────────────────
if (!existsSync(join(AREAS, 'areas.json'))) {
  console.error('public/assets/areas/areas.json is missing — the registry defines every area.');
  process.exit(1);
}
const registry = readJson(join(AREAS, 'areas.json'));
const layers = registry.layers.map((l) => l.id);
const declared = registry.areas.map((a) => a.id);

for (const id of declared) {
  if (!NAME.test(id)) {
    err(`areas.json → "${id}"`, 'area id is not lowercase-hyphenated', `rename it to match ${NAME}`);
  }
  if (!existsSync(join(AREAS, id))) {
    err(`areas/${id}/`, 'declared in areas.json but the folder does not exist',
        `create areas/${id}/ with the layer folders: ${layers.join(', ')}`);
  }
}

// ── Each area on disk ─────────────────────────────────────────────────────────
for (const areaDir of dirsIn(AREAS)) {
  if (!declared.includes(areaDir)) {
    err(`areas/${areaDir}/`, 'folder is not declared in areas.json',
        `add {"id": "${areaDir}", ...} to areas.json, or delete the folder. An area that ` +
        'nothing declares is how the structure grows sideways.');
    continue;
  }

  const areaPath = join(AREAS, areaDir);

  // Loose files directly in the area are the first sign of a "misc" pile forming.
  for (const f of filesIn(areaPath)) {
    if (IGNORED.has(f)) continue;
    err(`areas/${areaDir}/${f}`, 'file sits directly in the area, not in a layer',
        `move it into one of: ${layers.join(', ')}`);
  }

  for (const sub of dirsIn(areaPath)) {
    if (!layers.includes(sub)) {
      err(`areas/${areaDir}/${sub}/`, 'not one of the declared layers',
          `use one of ${layers.join(', ')}, or add the layer to areas.json if it is genuinely new`);
      continue;
    }

    for (const file of filesIn(join(areaPath, sub))) {
      if (IGNORED.has(file)) continue;
      const rel = `areas/${areaDir}/${sub}/${file}`;
      const dot = file.lastIndexOf('.');
      const stem = dot === -1 ? file : file.slice(0, dot);
      const ext = dot === -1 ? '' : file.slice(dot + 1);

      if (!ASSET_EXT.has(ext)) {
        err(rel, `.${ext} is not an asset type`, `areas hold ${[...ASSET_EXT].join(' and ')} files`);
        continue;
      }
      if (!NAME.test(stem)) {
        err(rel, 'name is not lowercase-hyphenated',
            `rename to "${stem.toLowerCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-')}.${ext}" ` +
            '— lowercase, hyphens, no spaces or underscores');
        continue;
      }

      const parts = stem.split('-');
      const verdict = parts.find((p) => VERDICT_WORDS.has(p));
      if (verdict) {
        err(rel, `"${verdict}" is a verdict, not part of the thing`,
            'pick the winner, drop the word, and record the decision in the harness review ' +
            'sheet. A state like "cracked" is fine; "candidate"/"final"/"best" is not.');
      }

      const badDir = parts.find((p) => BAD_DIRECTIONS.has(p));
      if (badDir) {
        const suggestion = { northeast: 'north-east', northwest: 'north-west',
          southeast: 'south-east', southwest: 'south-west', ne: 'north-east',
          nw: 'north-west', se: 'south-east', sw: 'south-west' }[badDir];
        err(rel, `"${badDir}" is not the direction vocabulary the sprites use`,
            suggestion ? `use "${suggestion}"` : `use one of ${DIRECTIONS.join(', ')} or a compound like north-east`);
      }

      // A trailing single digit sorts 1, 10, 2 — pad it so the Editor lists frames in order.
      const last = parts[parts.length - 1];
      if (/^\d$/.test(last)) {
        err(rel, 'frame or variant number is not zero-padded',
            `rename to "${parts.slice(0, -1).join('-')}-0${last}.${ext}" — otherwise 10 sorts before 2`);
      }
    }
  }

  // ── Pack ↔ disk parity ──────────────────────────────────────────────────────
  const packPath = join(areaPath, 'area.json');
  if (!existsSync(packPath)) {
    const hasAssets = layers.some((l) => filesIn(join(areaPath, l)).some((f) => !IGNORED.has(f)));
    if (hasAssets) {
      err(`areas/${areaDir}/area.json`, 'area has assets but no pack',
          'run: npm run assets:pack');
    }
    continue;
  }

  const pack = readJson(packPath);
  const inPack = new Set();
  for (const [, section] of Object.entries(pack)) {
    if (!Array.isArray(section?.files)) continue; // skips the meta block
    for (const f of section.files) inPack.add((section.path ?? '') + f.url);
  }

  for (const layer of layers) {
    for (const file of filesIn(join(areaPath, layer))) {
      if (IGNORED.has(file)) continue;
      if (!file.endsWith('.png')) continue;
      const url = `assets/areas/${areaDir}/${layer}/${file}`;
      if (!inPack.has(url)) {
        err(`areas/${areaDir}/${layer}/${file}`, 'on disk but missing from area.json',
            'run: npm run assets:pack');
      }
      inPack.delete(url);
    }
  }
  for (const stale of inPack) {
    err(stale, 'listed in area.json but not on disk',
        'the file moved or was deleted — run: npm run assets:pack');
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ok: errors.length === 0, errors }, null, 2));
  process.exit(0); // the vitest wrapper owns the pass/fail decision
}

if (errors.length === 0) {
  console.log(`Assets OK — ${declared.length} area(s), layers: ${layers.join(', ')}`);
  process.exit(0);
}

console.error(`\n${errors.length} asset problem(s):\n`);
for (const e of errors) {
  console.error(`  ${e.file}`);
  console.error(`    ${e.problem}`);
  console.error(`    fix: ${e.fix}\n`);
}
console.error('See public/assets/areas/_AREAS.md\n');
process.exit(1);
