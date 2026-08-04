#!/usr/bin/env node
/**
 * Forge-background generation + review harness.
 *
 * One config per archetype (configs/<archetype>.json) describes:
 *   - a locked painterly styleHeader (shared across every image)
 *   - one anchor per tonal family (e.g. light grove / dark corrupted grove)
 *   - a list of states, each tied to a family + a Style-Reference strength
 *
 * Anchors generate free (no controlnet); states Style-Reference their family
 * anchor (Phoenix preprocessor 166) at their strength so they stay consistent
 * but can still express (blooming / ignited / rotted). A state flagged
 * `isAnchor` reuses its family anchor image directly (no extra spend).
 *
 * Commands:
 *   node harness.mjs gen <archetype> [stateId]   generate all states (or one)
 *   node harness.mjs sheet <archetype>           build an HTML review gallery
 *
 * Reads LEONARDO_API_KEY from card-engine/.env.local. Every generation spends
 * real Leonardo API tokens — `gen` skips anything already in the manifest, so
 * re-running is cheap and only fills gaps.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(ROOT, '../../.env.local');
const BASE = 'https://cloud.leonardo.ai/api/rest/v1';
const PHOENIX = 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3';
// Lucid Origin holds a flat top-down "game map" read far better than Phoenix,
// which pulls hard toward perspective matte painting. The castle courtyard
// uses it; the forge scenes stay on Phoenix.
const LUCID_ORIGIN = '7b592283-e8a7-4c5a-9ba6-d18c31f258b9';
const MODELS = { phoenix: PHOENIX, 'lucid-origin': LUCID_ORIGIN };
const STYLE_REF_PREPROC = 166; // Phoenix Style Reference (per Leonardo docs)
// Defaults suit the forge scenes (3:4 portrait). A config may override both
// dimensions and negatives — the castle courtyard needs a square plate, and
// its negatives differ (it *wants* distant figures for human scale, which the
// forge negatives explicitly ban).
const W = 768, H = 1024; // 3:4 portrait
const NEG =
  'cel-shaded, flat vector art, comic outlines, cartoon, 3d render, cgi, ' +
  'photorealistic, characters, people, text, watermark, logo, ui, frame, border';

function loadKey() {
  const t = fs.readFileSync(ENV, 'utf8');
  const m = t.match(/^LEONARDO_API_KEY=(.*)$/m);
  const k = (m ? m[1] : '').replace(/["'\r ]/g, '');
  if (!k) throw new Error('LEONARDO_API_KEY is empty in ' + ENV);
  return k;
}
const KEY = loadKey();
const HDRS = { authorization: `Bearer ${KEY}`, 'content-type': 'application/json', accept: 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


/**
 * Upload a LOCAL image and use it as a style reference.
 *
 * Why this exists: asking Phoenix for "pixel art" in words does not work — with
 * Alchemy on it returns a 3D render, with it off a smooth painting. Pointing it
 * at an image that IS the register we want anchors the style structurally
 * rather than by adjective, which is the same lesson the sprite pipeline
 * learned (identity has to be structural, not re-prompted and hoped for).
 *
 * The natural reference is our own APPROVED arena: a new plate should match the
 * one already in the game, and nothing describes that better than the plate.
 *
 * Two-step S3 presigned upload, then the returned id is used with
 * `initImageType: 'UPLOADED'` (generated images use 'GENERATED' — passing the
 * wrong type silently drops the controlnet).
 */
async function uploadInitImage(absPath) {
  const ext = path.extname(absPath).slice(1).toLowerCase() || 'png';
  const r = await fetch(`${BASE}/init-image`, {
    method: 'POST', headers: HDRS, body: JSON.stringify({ extension: ext }),
  });
  const j = await r.json();
  const u = j?.uploadInitImage;
  if (!u?.id) throw new Error('init-image upload failed: ' + JSON.stringify(j).slice(0, 300));
  const fields = JSON.parse(u.fields);
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append('file', new Blob([fs.readFileSync(absPath)]), path.basename(absPath));
  const up = await fetch(u.url, { method: 'POST', body: form });
  if (!up.ok) throw new Error(`S3 upload failed ${up.status}`);
  return u.id;
}

// Leonardo truncates an over-length prompt server-side rather than rejecting it,
// which silently drops whatever sits at the END of the string — historically the
// modesty and no-shadow bans. Fail locally instead, before the call is paid for.
const PROMPT_MAX = 1500;
const NEGATIVE_MAX = 1000;

async function submit(prompt, { styleRefId, styleRefType, strength, width, height, negative, model, alchemy, tiling } = {}) {
  const neg = negative || NEG;
  if (prompt.length > PROMPT_MAX) throw new Error(`prompt is ${prompt.length} chars, max ${PROMPT_MAX}`);
  if (neg.length > NEGATIVE_MAX) throw new Error(`negative_prompt is ${neg.length} chars, max ${NEGATIVE_MAX}`);
  const body = {
    modelId: MODELS[model] || PHOENIX,
    prompt,
    negative_prompt: neg,
    width: width || W,
    height: height || H,
    num_images: 1,
    alchemy: alchemy !== false,
    public: false,
  };
  // Seamless-texture mode, for material swatches meant to be tiled in Phaser.
  // Not every model honours it; see configs/courtyard-v2-floor.json for the
  // record of what actually tiled.
  if (tiling) body.tiling = true;
  if (styleRefId)
    body.controlnets = [{ initImageId: styleRefId, initImageType: styleRefType || 'GENERATED', preprocessorId: STYLE_REF_PREPROC, strengthType: strength || 'Mid' }];
  const r = await fetch(`${BASE}/generations`, { method: 'POST', headers: HDRS, body: JSON.stringify(body) });
  const j = await r.json();
  const id = j?.sdGenerationJob?.generationId;
  if (!id) throw new Error('submit failed: ' + JSON.stringify(j));
  return id;
}
async function poll(genId) {
  for (let i = 0; i < 75; i++) {
    await sleep(4000);
    const r = await fetch(`${BASE}/generations/${genId}`, { headers: HDRS });
    const g = (await r.json())?.generations_by_pk;
    if (g?.status === 'COMPLETE') { const im = g.generated_images[0]; return { imageId: im.id, url: im.url }; }
    if (g?.status === 'FAILED') throw new Error('generation FAILED');
  }
  throw new Error('timeout polling ' + genId);
}
async function generate(prompt, opts) { return poll(await submit(prompt, opts)); }
async function download(url, dest) { const r = await fetch(url); fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer())); }

const cfg = (a) => JSON.parse(fs.readFileSync(path.join(ROOT, 'configs', `${a}.json`), 'utf8'));
const outDir = (a) => { const d = path.join(ROOT, 'out', a); fs.mkdirSync(d, { recursive: true }); return d; };
const manFile = (a) => path.join(outDir(a), 'manifest.json');
const loadMan = (a) => { try { return JSON.parse(fs.readFileSync(manFile(a), 'utf8')); } catch { return { anchors: {}, states: {} }; } };
const saveMan = (a, m) => fs.writeFileSync(manFile(a), JSON.stringify(m, null, 2));
/** Per-config image size + negatives, falling back to the forge defaults. */
const dims = (c) => ({ width: c.width, height: c.height, negative: c.negative, model: c.model, alchemy: c.alchemy, tiling: c.tiling });
const promptFor = (c, line) => [c.styleHeader, line].filter(Boolean).join(' ');

async function cmdGen(arch, only) {
  const c = cfg(arch), d = outDir(arch), m = loadMan(arch);

  // A LOCAL style reference, uploaded once and cached. Used to anchor a new
  // plate to the register of an existing approved one.
  if (c.styleRefFile && !m.styleRefUploadId) {
    const abs = path.resolve(ROOT, c.styleRefFile);
    console.log('> uploading style reference', path.basename(abs), '…');
    m.styleRefUploadId = await uploadInitImage(abs);
    saveMan(arch, m);
  }
  // A config whose states are each an independent direction has no anchor to
  // share (and with styleRef:false nothing would read one anyway), so "anchors"
  // is optional rather than required.
  for (const [fam, a] of Object.entries(c.anchors || {})) {
    if (m.anchors[fam]?.imageId) continue;
    console.log(`> anchor ${fam}…`);
    const res = await generate(promptFor(c, a.line), {
      ...dims(c),
      ...(m.styleRefUploadId
        ? { styleRefId: m.styleRefUploadId, styleRefType: 'UPLOADED', strength: c.styleRefStrength || 'Mid' }
        : {}),
    });
    const file = `anchor-${fam}.png`;
    await download(res.url, path.join(d, file));
    m.anchors[fam] = { imageId: res.imageId, file, prompt: promptFor(c, a.line) };
    saveMan(arch, m);
  }
  for (const s of c.states) {
    if (only && s.id !== only) continue;
    if (m.states[s.id]?.imageId && !only) continue;
    if (s.isAnchor) {
      const a = m.anchors[s.family];
      m.states[s.id] = { imageId: a.imageId, file: a.file, label: s.label, family: s.family, isAnchor: true, prompt: a.prompt };
      saveMan(arch, m); console.log(`= state ${s.id} (reuses ${s.family} anchor)`); continue;
    }
    console.log(`> state ${s.id} (${s.family} ref, ${s.strength})…`);
    // Some models (Lucid Origin / KINO) reject Phoenix's style-reference
    // controlnet outright, so a config may opt out with "styleRef": false and
    // pin consistency through prompt description instead.
    // An uploaded file reference wins over the family anchor: it is an explicit
    // choice of register, whereas the anchor is only "whatever we made first".
    const useRef = c.styleRef !== false;
    const refFromFile = m.styleRefUploadId
      ? { styleRefId: m.styleRefUploadId, styleRefType: 'UPLOADED', strength: s.strength || c.styleRefStrength || 'Mid' }
      : null;
    const res = await generate(promptFor(c, s.line), {
      ...dims(c),
      ...(refFromFile
        ? refFromFile
        : useRef
          ? { styleRefId: m.anchors[s.family].imageId, strength: s.strength }
          : {}),
    });
    const file = `${s.id}.png`;
    await download(res.url, path.join(d, file));
    m.states[s.id] = { imageId: res.imageId, file, label: s.label, family: s.family, strength: s.strength, prompt: promptFor(c, s.line) };
    saveMan(arch, m);
  }
  console.log('done →', manFile(arch));
}

function thumb(dir, file, id) {
  const jpg = path.join(dir, `.thumb-${id}.jpg`);
  try { execSync(`sips -Z 520 ${JSON.stringify(path.join(dir, file))} --out ${JSON.stringify(jpg)}`, { stdio: 'ignore' }); } catch {}
  const use = fs.existsSync(jpg) ? jpg : path.join(dir, file);
  const mime = fs.existsSync(jpg) ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${fs.readFileSync(use).toString('base64')}`;
}

function cmdSheet(arch) {
  const c = cfg(arch), d = outDir(arch), m = loadMan(arch);
  const labels = c.familyLabels || {};
  const accents = { light: '#d9b45b', dark: '#a678d6' };
  const fams = [];
  for (const s of c.states) if (!fams.includes(s.family)) fams.push(s.family);
  const groups = fams.map((fam) => {
    const items = c.states.filter((s) => s.family === fam).map((s) => {
      const st = m.states[s.id]; if (!st) return '';
      const src = thumb(d, st.file, s.id);
      const how = st.isAnchor ? 'anchor' : `style-ref · ${st.strength}`;
      return `<figure><span class="idx">${st.isAnchor ? 'base' : 'state'}</span><img src="${src}" alt="${st.label}"/><figcaption><span class="lbl">${st.label}</span><span class="how">${how}</span></figcaption></figure>`;
    }).join('');
    return `<section class="grp" style="--fam:${accents[fam] || '#d9b45b'}"><h3><span class="dot"></span>${labels[fam] || fam}</h3><div class="row">${items}</div></section>`;
  }).join('');
  // Thumbnails follow the config's real aspect, or a square plate would be
  // cropped to 3:4 in review — hiding the very edges we generate it to judge.
  const sheetRatio = `${c.width || 768}/${c.height || 1024}`;
  const name = `${arch[0].toUpperCase()}${arch.slice(1)}`;
  const title = `${name} forge backgrounds`;
  const html = `<title>${title}</title>
<style>
  :root{--bg:#11150e;--panel:#1a1f13;--edge:#2c3320;--ink:#ece9da;--muted:#9aa184;--gold:#d9b45b}
  .frame{background:var(--bg);color:var(--ink);padding:34px 30px 40px;border-radius:14px;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
    background-image:radial-gradient(120% 80% at 50% -10%,rgba(217,180,91,.10),transparent 60%)}
  .eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin:0 0 10px}
  .frame h2{font-family:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif;
    font-weight:600;font-size:30px;line-height:1.1;margin:0 0 10px;text-wrap:balance;letter-spacing:.01em}
  .lede{max-width:60ch;color:var(--muted);font-size:14px;line-height:1.65;margin:0 0 28px}
  .lede b{color:var(--ink);font-weight:600}
  .grp{margin-top:26px}
  .grp h3{display:flex;align-items:center;gap:9px;font-size:12px;letter-spacing:.16em;
    text-transform:uppercase;color:var(--fam);font-weight:600;margin:0 0 13px;
    padding-bottom:9px;border-bottom:1px solid var(--edge)}
  .dot{width:8px;height:8px;border-radius:50%;background:var(--fam);box-shadow:0 0 10px var(--fam)}
  .row{display:flex;gap:16px;overflow-x:auto;padding-bottom:6px}
  figure{margin:0;flex:0 0 auto;width:230px;position:relative}
  figure img{width:100%;aspect-ratio:${sheetRatio};object-fit:cover;border-radius:9px;display:block;
    border:1px solid var(--edge);box-shadow:0 6px 20px rgba(0,0,0,.4)}
  .idx{position:absolute;top:9px;left:9px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;
    background:rgba(10,12,7,.72);color:var(--fam);padding:3px 8px;border-radius:5px;backdrop-filter:blur(3px)}
  figcaption{display:flex;flex-direction:column;margin-top:10px;gap:2px}
  .lbl{font-size:14px;font-weight:600;color:var(--ink)}
  .how{font-size:11px;letter-spacing:.04em;color:var(--muted);font-variant:small-caps}
</style>
<div class="frame">
  <p class="eyebrow">Forge background review · pipeline v1</p>
  <h2>${name}: one grove, remembered and corrupted</h2>
  <p class="lede">Five painted states for the ${name} forge ritual. The player enters the <b>living grove</b>, and the element they choose forks the world — <b>Nature</b> keeps it blooming, <b>Poison</b> rots it. Each path shares one style <b>anchor</b>; sibling states are style-referenced to it so they stay one painting while the state still changes. Base = the anchor itself; state = generated against it.</p>
  ${groups}
</div>`;
  const out = path.join(d, `${arch}-sheet.html`);
  fs.writeFileSync(out, html);
  console.log(out);
}

const [cmd, arch, extra] = process.argv.slice(2);
if (cmd === 'gen' && arch) await cmdGen(arch, extra);
else if (cmd === 'sheet' && arch) cmdSheet(arch);
else console.log('usage: harness.mjs gen <archetype> [stateId] | sheet <archetype>');
