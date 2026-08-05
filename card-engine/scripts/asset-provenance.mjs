#!/usr/bin/env node
/**
 * Extract every provider id from the generation harnesses into ONE committed file.
 *
 * WHY THIS EXISTS. `scripts/sprite-lab/out` and `scripts/bg-harness/out` are both
 * gitignored — 876 files and ~196 MB of finished art that lives on exactly one
 * machine. PixelLab and Leonardo do keep the raw generations server-side, so the
 * usual reassurance is "we can always re-download it."
 *
 * That reassurance depends on something that is ALSO only in those folders: the
 * ids. A character is re-downloadable by `characterId`, an object by `objectId`,
 * a Leonardo plate by `imageId`. Lose the folder and you lose the keys to your own
 * provider library, and then the art is genuinely gone rather than merely misplaced.
 *
 * Worse for objects specifically: `/create-1-direction-object` REJECTS `seed`
 * (PIXELLAB_PLAYBOOK.md), so object output is not reproducible. A lost object
 * generation cannot be re-rolled to match — it is a re-brief, at full price.
 *
 * This file is small, textual, and commits cleanly. It is not a backup of the art;
 * it is the index that makes the art recoverable. The art itself still wants a real
 * home (an assets repository).
 *
 * Usage:  node scripts/asset-provenance.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OUT = join(HERE, 'asset-provenance.json');

const HARNESSES = [
  { name: 'sprite-lab', dir: join(HERE, 'sprite-lab/out'), provider: 'pixellab' },
  { name: 'bg-harness', dir: join(HERE, 'bg-harness/out'), provider: 'leonardo' },
];

/**
 * Keys that are worth something after the folder is gone. Collected by walking the
 * whole manifest rather than by reading known paths, because the two harnesses nest
 * differently and a schema that changes silently is exactly how an index goes stale.
 */
const ID_KEYS = new Set([
  'characterId',
  'objectId',
  'objectIds',
  'createdObjectIds',
  'imageId',
  'styleRefUploadId',
  'animationGroupId',
  'generationId',
  'seed',
]);

function collectIds(node, path, into) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => collectIds(v, `${path}[${i}]`, into));
    return;
  }
  if (typeof node !== 'object') return;

  for (const [key, value] of Object.entries(node)) {
    const here = path ? `${path}.${key}` : key;
    if (ID_KEYS.has(key) && value !== null && value !== undefined) {
      const values = Array.isArray(value) ? value : [value];
      for (const v of values) {
        if (typeof v === 'string' || typeof v === 'number') {
          into.push({ key, value: String(v), at: here });
        }
      }
    }
    collectIds(value, here, into);
  }
}

/** Every manifest.json under a harness's out/ directory, one level per subject. */
function subjectsOf(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => {
      const p = join(dir, name);
      return statSync(p).isDirectory() && existsSync(join(p, 'manifest.json'));
    })
    .sort();
}

const report = { generated: new Date().toISOString().slice(0, 10), harnesses: {} };
let totalIds = 0;
let totalSubjects = 0;

for (const h of HARNESSES) {
  const subjects = {};
  for (const name of subjectsOf(h.dir)) {
    const manifestPath = join(h.dir, name, 'manifest.json');
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      subjects[name] = { error: `unreadable manifest: ${err.message}` };
      continue;
    }

    const found = [];
    collectIds(manifest, '', found);

    // Deduplicate on key+value; the same object id legitimately appears in both a
    // spec and a promotion record, and listing it twice adds nothing.
    const seen = new Set();
    const ids = found.filter((f) => {
      const k = `${f.key}=${f.value}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Files present now, so a later diff shows what was lost rather than only what
    // was recorded.
    const files = readdirSync(join(h.dir, name))
      .filter((f) => f.endsWith('.png'))
      .sort();

    subjects[name] = {
      manifest: relative(ROOT, manifestPath),
      totalGenerations: manifest.totalGenerations ?? null,
      pngCount: files.length,
      ids,
    };
    totalIds += ids.length;
    totalSubjects++;
  }
  report.harnesses[h.name] = { provider: h.provider, subjects };
}

report.summary = { subjects: totalSubjects, ids: totalIds };

writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
console.log(`Wrote ${relative(ROOT, OUT)}`);
console.log(`  ${totalSubjects} subjects, ${totalIds} recoverable provider ids indexed.`);
