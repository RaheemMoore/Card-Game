#!/usr/bin/env node
/**
 * Boss sprite creation via PixelLab `/create-character-pro`.
 *
 * Separate from `sprite-lab.mjs` because that script drives
 * `/create-character-v3` and `/create-character-with-4-directions` — WALKER
 * pipelines that produce rotations and walk cycles for characters the player
 * steers. A duelling boss needs none of that: one facing, no walk, and above
 * all a DESIGN REFERENCE, which those two endpoints cannot take.
 *
 * ── The contract, discovered by probing (all free) ───────────────────────
 * Invalid requests return the schema in `detail` and are never billed, so the
 * whole shape below was established without spending a generation:
 *
 *   description       str      required
 *   image_size        {width,height}  required, **max 168 x 168**
 *   reference_image   {base64}        optional — a real DESIGN reference
 *   view              'low top-down' | 'high top-down' | 'side'
 *   seed              int
 *   no_background     bool
 *   template_id       str
 *
 * Two of those matter more than the rest:
 *
 * - `reference_image` is genuinely accepted here, while `init_image`,
 *   `style_image` and `color_image` all return "extra inputs are not
 *   permitted". This is the ONLY path we have that lets approved concept art
 *   drive a sprite rather than being paraphrased into a description.
 *   NOTE it is not the same field as v3's `reference_image`, which is a
 *   south-facing sprite to rotate — see sprite-lab.mjs:289.
 *
 * - **168 x 168 is a hard ceiling.** The boss renders ~500px tall in the
 *   arena, so it is upscaled ~3x and MUST be rendered with
 *   `image-rendering: pixelated`. Silhouette therefore outranks surface
 *   detail: fire cracks and rune work do not survive at this size, mass and
 *   shoulder line do.
 *
 * `view` has no true front-on option. 'low top-down' is the closest and keeps
 * the face visible, which is what the frontal boss stage needs.
 *
 * Usage:  node create-boss-pro.mjs <config.json>
 * Config: { subject, description, referenceImage, view, size, seed }
 *
 * Re-running is SAFE: a saved job is reused rather than re-POSTed, the same
 * rule sprite-lab follows after two paid jobs were discarded by looking for
 * results in the wrong place.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://api.pixellab.ai/v2';
const ENV = path.resolve(ROOT, '../../.env.local');

function loadKey() {
  const m = fs.readFileSync(ENV, 'utf8').match(/^PIXELLAB_API_KEY=(.*)$/m);
  const k = (m ? m[1] : '').replace(/["'\r ]/g, '');
  if (!k) throw new Error('PIXELLAB_API_KEY missing from ' + ENV);
  return k;
}
const HDRS = {
  authorization: `Bearer ${loadKey()}`,
  'content-type': 'application/json',
  accept: 'application/json',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, route, body) {
  const res = await fetch(BASE + route, {
    method,
    headers: HDRS,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const txt = await res.text();
  let json;
  try {
    json = JSON.parse(txt);
  } catch {
    json = { raw: txt };
  }
  if (!res.ok) throw new Error(`${method} ${route} -> ${res.status} ${txt.slice(0, 600)}`);
  return json;
}

const cfgPath = process.argv[2];
if (!cfgPath) {
  console.error('usage: create-boss-pro.mjs <config.json>');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(path.resolve(ROOT, cfgPath), 'utf8'));
const outDir = path.join(ROOT, 'out', cfg.subject);
fs.mkdirSync(outDir, { recursive: true });
const manFile = path.join(outDir, 'manifest.json');
const man = fs.existsSync(manFile) ? JSON.parse(fs.readFileSync(manFile, 'utf8')) : {};
const save = () => fs.writeFileSync(manFile, JSON.stringify(man, null, 2));

if (!man.characterId) {
  const refPath = path.resolve(ROOT, cfg.referenceImage);
  const body = {
    description: cfg.description,
    image_size: cfg.size ?? { width: 168, height: 168 },
    view: cfg.view ?? 'low top-down',
    seed: cfg.seed,
    no_background: true,
    reference_image: { base64: fs.readFileSync(refPath).toString('base64') },
  };
  console.log(`> creating ${cfg.subject} (create-character-pro, ref ${path.basename(refPath)})…`);
  const res = await api('POST', '/create-character-pro', body);
  man.characterId = res.character_id ?? res.id;
  man.createResponse = res;
  man.request = { ...body, reference_image: `<${path.basename(refPath)}>` };
  save();
  console.log('  character_id', man.characterId);
}

// Poll the CHARACTER for completion. Note the sibling trap recorded in the
// playbook: animations do NOT move the character's status, so for animation
// work you must poll background_job_ids instead. For creation, this is right.
// `failed` is NOT terminal on this endpoint. The Still Season's creation job
// reported pending -> failed -> failed (9 polls) -> completed with all 8
// rotations present. Bailing on the first `failed` would have thrown away a
// paid job that was still working. Only give up after it stays failed.
let detail;
let failedStreak = 0;
for (let i = 0; i < 150; i++) {
  detail = await api('GET', `/characters/${man.characterId}`);
  if (detail.status === 'completed') break;
  failedStreak = detail.status === 'failed' ? failedStreak + 1 : 0;
  if (failedStreak >= 25) throw new Error('character generation FAILED (persistent)');
  process.stdout.write(detail.status === 'failed' ? '!' : '.');
  await sleep(4000);
}
console.log('');
if (detail.status !== 'completed') throw new Error('timed out waiting for character');

man.detail = detail;
// Read the size BACK off the response. PixelLab overrides the size you ask
// for — the playbook records requesting 128 and receiving 180 — and hardcoding
// the requested size is how a scale mismatch gets in through the back door.
man.actualSize = detail.size ?? detail.image_size ?? null;
save();
console.log('actual size reported by API:', JSON.stringify(man.actualSize));

// `rotation_urls` is a name->URL MAP, and it is the shape this endpoint has
// actually returned every time. The playbook recorded it as "a fourth result
// shape ... the same class of trap that twice discarded completed paid jobs",
// but the code below only ever handled the inline-base64 shapes, so the first
// two bosses had to be pulled down by hand. Handle the map first.
let n = 0;
if (detail.rotation_urls && typeof detail.rotation_urls === 'object') {
  const entries = Object.entries(detail.rotation_urls);
  console.log('rotation_urls returned:', entries.length);
  for (const [dir, url] of entries) {
    if (typeof url !== 'string') continue;
    // The raw CDN 403s against a plain urllib fetch; node's fetch is fine.
    // Retry, because a transient 503 once threw away a whole paid run.
    let buf = null;
    for (let a = 0; a < 5 && !buf; a++) {
      const r = await fetch(url);
      if (r.ok) buf = Buffer.from(await r.arrayBuffer());
      else await sleep(1500 * (a + 1));
    }
    if (!buf) {
      console.error('  ! failed to download', dir, url);
      continue;
    }
    const file = path.join(outDir, `rot-${dir}.png`);
    fs.writeFileSync(file, buf);
    console.log('  wrote', path.relative(ROOT, file));
    n++;
  }
}

const rotations = detail.rotations ?? detail.images ?? [];
if (!n) console.log('rotations returned:', Array.isArray(rotations) ? rotations.length : 'n/a');

for (const [i, rot] of (Array.isArray(rotations) ? rotations : []).entries()) {
  const b64 = rot?.image?.base64 ?? rot?.base64 ?? (typeof rot === 'string' ? rot : null);
  if (!b64) continue;
  // Always `rot-<dir>.png` — that is the name sprite-lab.mjs looks up for
  // startFromRotation. Writing bare `<dir>.png` meant the first boss's files
  // had to be renamed by hand before animations could be pinned.
  const name = rot?.direction ? `rot-${rot.direction}` : `rot-${i}`;
  const file = path.join(outDir, `${name}.png`);
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
  console.log('  wrote', path.relative(ROOT, file));
  n++;
}
if (!n) {
  // Result shapes differ per endpoint and have thrown away paid work before.
  // Dump the keys rather than silently succeeding with nothing on disk.
  console.log('NO IMAGES EXTRACTED — top-level keys:', Object.keys(detail).join(', '));
  fs.writeFileSync(path.join(outDir, 'detail-debug.json'), JSON.stringify(detail, null, 2));
  console.log('full detail written to detail-debug.json (usage already spent — do NOT re-POST, inspect this)');
}
console.log('done →', manFile);
