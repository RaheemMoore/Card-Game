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
 *   node harness.mjs validate <config> [stateId]  validate without network/spend
 *   node harness.mjs plan <config> [stateId]      print the paid-call plan
 *   node harness.mjs gen <config> [stateId] --approve-paid [--max-paid-calls=N]
 *   node harness.mjs sheet <config>               build an HTML review gallery
 *
 * Reads LEONARDO_API_KEY from card-engine/.env.local. Every generation spends
 * real Leonardo API tokens — `gen` skips anything already in the manifest, so
 * re-running is cheap and only fills gaps.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, execSync } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(ROOT, '../../.env.local');
const BASE_V1 = 'https://cloud.leonardo.ai/api/rest/v1';
const BASE_V2 = 'https://cloud.leonardo.ai/api/rest/v2';
const PHOENIX = 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3';
// Lucid Origin holds a flat top-down "game map" read far better than Phoenix,
// which pulls hard toward perspective matte painting. The castle courtyard
// uses it; the forge scenes stay on Phoenix.
const LUCID_ORIGIN = '7b592283-e8a7-4c5a-9ba6-d18c31f258b9';
const MODELS_V1 = { phoenix: PHOENIX, 'lucid-origin': LUCID_ORIGIN };
const MODELS_V2 = { phoenix: 'phoenix-v1.0', 'lucid-origin': 'lucid-origin' };
const NONE_STYLE_ID = '556c1ee5-ec38-42e8-955a-1e82dad0ffa1';
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
let cachedKey;
function headers() {
  cachedKey ||= loadKey();
  return { authorization: `Bearer ${cachedKey}`, 'content-type': 'application/json', accept: 'application/json' };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readJson(r, label) {
  const text = await r.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; }
  catch { throw new Error(`${label} returned non-JSON HTTP ${r.status}: ${text.slice(0, 300)}`); }
  if (!r.ok) throw new Error(`${label} failed HTTP ${r.status}: ${JSON.stringify(json).slice(0, 700)}`);
  return json;
}


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
  const r = await fetch(`${BASE_V1}/init-image`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ extension: ext }),
  });
  const j = await readJson(r, 'init-image upload');
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
const LEGACY_PROMPT_MAX = 1500;
const MODERN_PROMPT_MAX = 2000;
const NEGATIVE_MAX = 1000;

function apiVersion(value) {
  return String(value || 'v1').toLowerCase() === 'v2' ? 'v2' : 'v1';
}

function findGenerationId(value) {
  if (!value || typeof value !== 'object') return null;
  for (const [key, child] of Object.entries(value)) {
    if (/generation.?id/i.test(key) && typeof child === 'string') return child;
  }
  for (const child of Object.values(value)) {
    const found = findGenerationId(child);
    if (found) return found;
  }
  return null;
}

function findCost(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.cost && typeof value.cost === 'object') return value.cost;
  if (value.apiCreditCost !== undefined) return { amount: value.apiCreditCost, unit: 'api-credits' };
  for (const child of Object.values(value)) {
    const found = findCost(child);
    if (found) return found;
  }
  return null;
}

async function submit(prompt, {
  version, styleRefId, styleRefType, strength, width, height, negative, model,
  alchemy, tiling, initImageId, initStrength, mode, contrast, promptEnhance,
  styleId, seed,
} = {}) {
  const neg = negative || NEG;
  const useVersion = apiVersion(version);
  const promptMax = useVersion === 'v2' ? MODERN_PROMPT_MAX : LEGACY_PROMPT_MAX;
  if (prompt.length > promptMax) throw new Error(`prompt is ${prompt.length} chars, max ${promptMax}`);
  if (neg.length > NEGATIVE_MAX) throw new Error(`negative_prompt is ${neg.length} chars, max ${NEGATIVE_MAX}`);
  let body;
  let endpoint;
  if (useVersion === 'v2') {
    const parameters = {
      mode: String(mode || 'FAST').toUpperCase(),
      contrast: String(contrast || 'MEDIUM').toUpperCase(),
      width: width || W,
      height: height || H,
      prompt,
      negative_prompt: neg,
      prompt_enhance: String(promptEnhance || 'OFF').toUpperCase(),
      quantity: 1,
      style_ids: [styleId || NONE_STYLE_ID],
    };
    if (Number.isInteger(seed)) parameters.seed = seed;
    if (tiling) parameters.tiling = true;
    if (styleRefId) {
      parameters.guidances = {
        style: [{
          image: { id: styleRefId, type: styleRefType || 'GENERATED' },
          strength: String(strength || 'MID').toUpperCase(),
        }],
      };
    }
    if (initImageId) {
      parameters.guidances ||= {};
      parameters.guidances.image_to_image = [{
        image: { id: initImageId, type: 'UPLOADED' },
        strength: initStrength >= 0.72 ? 'HIGH' : initStrength >= 0.42 ? 'MID' : 'LOW',
      }];
    }
    body = { model: MODELS_V2[model] || MODELS_V2.phoenix, parameters, public: false };
    endpoint = `${BASE_V2}/generations`;
  } else {
    body = {
      modelId: MODELS_V1[model] || PHOENIX,
      prompt,
      negative_prompt: neg,
      width: width || W,
      height: height || H,
      num_images: 1,
      alchemy: alchemy !== false,
      contrast: typeof contrast === 'number' ? contrast : 3.5,
      enhancePrompt: false,
      presetStyle: 'NONE',
      styleUUID: styleId || NONE_STYLE_ID,
      public: false,
    };
    if (Number.isInteger(seed)) body.seed = seed;
    if (tiling) body.tiling = true;
    if (initImageId) {
      body.init_image_id = initImageId;
      body.init_strength = Math.min(initStrength ?? 0.6, 0.9);
    }
    if (styleRefId) {
      body.controlnets = [{
        initImageId: styleRefId,
        initImageType: styleRefType || 'GENERATED',
        preprocessorId: STYLE_REF_PREPROC,
        strengthType: strength || 'Mid',
      }];
    }
    endpoint = `${BASE_V1}/generations`;
  }
  // Seamless-texture mode, for material swatches meant to be tiled in Phaser.
  // Not every model honours it; see configs/courtyard-v2-floor.json for the
  // record of what actually tiled.
  const r = await fetch(endpoint, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  const j = await readJson(r, 'generation submission');
  const id = findGenerationId(j);
  if (!id) throw new Error('submit failed: ' + JSON.stringify(j));
  return { generationId: id, cost: findCost(j), request: body };
}
async function poll(genId) {
  for (let i = 0; i < 75; i++) {
    await sleep(4000);
    const r = await fetch(`${BASE_V1}/generations/${genId}`, { headers: headers() });
    const response = await readJson(r, 'generation poll');
    const g = response?.generations_by_pk;
    if (g?.status === 'COMPLETE') {
      const im = g.generated_images?.[0];
      if (!im?.id || !im?.url) throw new Error(`generation ${genId} completed without an image`);
      return { imageId: im.id, url: im.url, cost: findCost(response), generation: g };
    }
    if (g?.status === 'FAILED') throw new Error('generation FAILED');
  }
  throw new Error('timeout polling ' + genId);
}
async function download(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download failed HTTP ${r.status}`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
}

const cfg = (a) => JSON.parse(fs.readFileSync(path.join(ROOT, 'configs', `${a}.json`), 'utf8'));
const outDir = (a) => { const d = path.join(ROOT, 'out', a); fs.mkdirSync(d, { recursive: true }); return d; };
const manFile = (a) => path.join(outDir(a), 'manifest.json');
const loadMan = (a) => {
  try {
    const current = JSON.parse(fs.readFileSync(manFile(a), 'utf8'));
    return { schemaVersion: 2, provider: 'leonardo', anchors: {}, states: {}, ...current };
  } catch {
    return { schemaVersion: 2, provider: 'leonardo', anchors: {}, states: {} };
  }
};
const saveMan = (a, m) => fs.writeFileSync(manFile(a), JSON.stringify(m, null, 2));
/** Per-config image size + negatives, falling back to the forge defaults. */
const dims = (c) => ({
  version: c.apiVersion,
  width: c.width,
  height: c.height,
  negative: c.negative,
  model: c.model,
  alchemy: c.alchemy,
  tiling: c.tiling,
  mode: c.mode,
  contrast: c.contrast,
  promptEnhance: c.promptEnhance,
  styleId: c.styleId,
  seed: c.seed,
});
/** Image-to-image opts for a state, when the config carries an init image. */
const initOpts = (c, m, s) =>
  m.initImageUploadId ? { initImageId: m.initImageUploadId, initStrength: s.initStrength ?? c.initStrength } : {};
const promptFor = (c, line) => [c.styleHeader, line].filter(Boolean).join(' ');

function isComplete(record) {
  return Boolean(record?.imageId && (!record.status || record.status === 'complete'));
}

function selectedStates(c, only) {
  return (c.states || []).filter((state) => !only || state.id === only);
}

function requiredFamilies(c, only) {
  return new Set(selectedStates(c, only).map((state) => state.family).filter(Boolean));
}

function plannedCalls(c, m, only) {
  let total = 0;
  const families = requiredFamilies(c, only);
  for (const [family] of Object.entries(c.anchors || {})) {
    if (families.has(family) && !isComplete(m.anchors[family]) && !m.anchors[family]?.generationId) total += 1;
  }
  for (const state of selectedStates(c, only)) {
    if (!state.isAnchor && !isComplete(m.states[state.id]) && !m.states[state.id]?.generationId) total += 1;
  }
  return total;
}

function paidCallCap(c, requestedCap) {
  return Number.isInteger(c.paidCallCap) ? Math.min(requestedCap, c.paidCallCap) : requestedCap;
}

function validationReport(arch, c, only) {
  const errors = [];
  const warnings = [];
  const version = apiVersion(c.apiVersion);
  const promptMax = version === 'v2' ? MODERN_PROMPT_MAX : LEGACY_PROMPT_MAX;
  const maxDimension = version === 'v2' ? 2048 : 1536;
  if (!Array.isArray(c.states) || c.states.length === 0) errors.push('states must be a non-empty array');
  if (!MODELS_V1[c.model || 'phoenix']) errors.push(`unsupported model: ${c.model}`);
  for (const [name, value] of [['width', c.width || W], ['height', c.height || H]]) {
    if (!Number.isInteger(value) || value < 32 || value > maxDimension || value % 8 !== 0) {
      errors.push(`${name} must be a multiple of 8 between 32 and ${maxDimension}; got ${value}`);
    }
  }
  if (version === 'v2' && !['FAST', 'QUALITY', 'ULTRA'].includes(String(c.mode || 'FAST').toUpperCase())) {
    errors.push(`mode must be FAST, QUALITY, or ULTRA; got ${c.mode}`);
  }
  if (version === 'v2' && !['LOW', 'MEDIUM', 'HIGH'].includes(String(c.contrast || 'MEDIUM').toUpperCase())) {
    errors.push(`contrast must be LOW, MEDIUM, or HIGH; got ${c.contrast}`);
  }
  if (c.paidCallCap !== undefined && (!Number.isInteger(c.paidCallCap) || c.paidCallCap < 1)) {
    errors.push(`paidCallCap must be a positive integer; got ${c.paidCallCap}`);
  }
  const states = selectedStates(c, only);
  if (only && states.length === 0) errors.push(`unknown state: ${only}`);
  const anchors = c.anchors || {};
  for (const state of states) {
    if (!state.id) errors.push('every state needs an id');
    if (!state.family) errors.push(`state ${state.id || '<unknown>'} needs a family`);
    if (state.isAnchor && !anchors[state.family]) errors.push(`anchor state ${state.id} has no anchors.${state.family}`);
    if (c.styleRef !== false && !c.styleRefFile && !state.isAnchor && !anchors[state.family]) {
      errors.push(`state ${state.id} needs anchors.${state.family} for style reference`);
    }
  }
  const prompts = [
    ...Object.entries(anchors)
      .filter(([family]) => requiredFamilies(c, only).has(family))
      .map(([family, anchor]) => [`anchor:${family}`, promptFor(c, anchor.line)]),
    ...states.filter((state) => !state.isAnchor).map((state) => [`state:${state.id}`, promptFor(c, state.line)]),
  ];
  for (const [label, prompt] of prompts) {
    if (!prompt.trim()) errors.push(`${label} prompt is empty`);
    if (prompt.length > promptMax) errors.push(`${label} prompt is ${prompt.length} chars; max ${promptMax}`);
  }
  const negatives = [c.negative, ...states.map((state) => state.negative)].filter(Boolean);
  for (const negative of negatives) if (negative.length > NEGATIVE_MAX) errors.push(`negative prompt is ${negative.length} chars; max ${NEGATIVE_MAX}`);

  const positive = prompts.map(([, prompt]) => prompt.toLowerCase()).join(' ');
  const negativeTerms = String(c.negative || '').split(',').map((term) => term.trim().toLowerCase()).filter((term) => term.length >= 4);
  for (const term of negativeTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(positive)) warnings.push(`possible prompt contradiction: positive and negative both contain "${term}"`);
  }
  if (version === 'v2' && String(c.promptEnhance || 'OFF').toUpperCase() !== 'OFF') warnings.push('promptEnhance is not OFF; Leonardo may rewrite the art contract');
  if (!c.styleId) warnings.push(`styleId omitted; harness will force the None style (${NONE_STYLE_ID})`);
  if (!c.review?.checklist?.length) warnings.push('no visual review checklist is defined');
  return { arch, version, promptMax, errors, warnings, prompts };
}

function cmdValidate(arch, only) {
  const c = cfg(arch);
  const report = validationReport(arch, c, only);
  console.log(`VALIDATE ${arch}${only ? `/${only}` : ''} api=${report.version}`);
  for (const [label, prompt] of report.prompts) console.log(`  ${label}: ${prompt.length}/${report.promptMax} chars`);
  for (const warning of report.warnings) console.log(`  WARN: ${warning}`);
  for (const error of report.errors) console.error(`  ERROR: ${error}`);
  if (report.errors.length) process.exitCode = 2;
  else console.log('  PASS');
  return report;
}

function cmdPlan(arch, only, maxPaidCalls) {
  const c = cfg(arch);
  const m = loadMan(arch);
  const effectivePaidCallCap = paidCallCap(c, maxPaidCalls);
  const report = validationReport(arch, c, only);
  if (report.errors.length) {
    for (const error of report.errors) console.error(`ERROR: ${error}`);
    process.exitCode = 2;
    return;
  }
  const calls = plannedCalls(c, m, only);
  console.log(JSON.stringify({
    provider: 'Leonardo',
    operation: 'text-to-image',
    config: arch,
    state: only || 'all missing states',
    apiVersion: report.version,
    model: report.version === 'v2' ? MODELS_V2[c.model || 'phoenix'] : MODELS_V1[c.model || 'phoenix'],
    mode: c.mode || (report.version === 'v2' ? 'FAST' : c.alchemy === false ? 'Fast / Alchemy off' : 'Quality / Alchemy on'),
    dimensions: `${c.width || W}x${c.height || H}`,
    style: c.styleId || NONE_STYLE_ID,
    promptEnhance: c.promptEnhance || 'OFF',
    plannedPaidCalls: calls,
    hardCap: effectivePaidCallCap,
    configPaidCallCap: c.paidCallCap ?? null,
    imagesPerPaidCall: 1,
    retryPolicy: 'never resubmit a recorded generationId; resume polling first',
    expectedCost: 'account-specific Leonardo PAYG amount; actual response cost is recorded',
    output: path.relative(process.cwd(), outDir(arch)),
  }, null, 2));
}

function cmdVerdict(arch, stateId, verdict, note) {
  const allowed = new Set(['PASS', 'FAIL', 'HUMAN_REVIEW']);
  if (!stateId || !allowed.has(verdict)) throw new Error('verdict requires <stateId> PASS|FAIL|HUMAN_REVIEW [note]');
  const m = loadMan(arch);
  const record = m.states[stateId];
  if (!isComplete(record)) throw new Error(`no completed state ${stateId} exists in ${arch}`);
  const humanReview = { verdict, note: note || '', reviewedAt: new Date().toISOString() };
  m.states[stateId] = { ...record, humanReview };
  if (record.isAnchor && record.family && m.anchors[record.family]?.generationId === record.generationId) {
    m.anchors[record.family] = { ...m.anchors[record.family], humanReview };
  }
  saveMan(arch, m);
  console.log(`${arch}/${stateId}: ${verdict}${note ? ` — ${note}` : ''}`);
}

/* Retained in git history; the recovery-safe implementation below replaces it.
async function legacyCmdGen(arch, only) {
  const c = cfg(arch), d = outDir(arch), m = loadMan(arch);

  // A LOCAL style reference, uploaded once and cached. Used to anchor a new
  // plate to the register of an existing approved one.
  if (c.styleRefFile && !m.styleRefUploadId) {
    const abs = path.resolve(ROOT, c.styleRefFile);
    console.log('> uploading style reference', path.basename(abs), '…');
    m.styleRefUploadId = await uploadInitImage(abs);
    saveMan(arch, m);
  }
  // An init image is the plate we are repainting INTO, uploaded once and cached.
  if (c.initImageFile && !m.initImageUploadId) {
    const abs = path.resolve(ROOT, c.initImageFile);
    console.log('> uploading init image', path.basename(abs), '…');
    m.initImageUploadId = await uploadInitImage(abs);
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
      // A state may carry its own negative: when one state is banning what the
      // others are keeping (paving, say), a shared negative cannot express it.
      ...(s.negative ? { negative: s.negative } : {}),
      ...initOpts(c, m, s),
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

*/
function reviewArtifacts(c, d, file, label) {
  if (!c.review?.pixelize?.enabled) return {};
  const raw = path.join(d, file);
  const stem = path.basename(file, path.extname(file));
  const pixelFile = `${stem}-pixel.png`;
  const reviewFile = `${stem}-review.png`;
  const pixel = path.join(d, pixelFile);
  const review = path.join(d, reviewFile);
  const px = c.review.pixelize;
  execFileSync('python', [
    path.join(ROOT, 'lib', 'pixelize.py'), raw, pixel,
    '--scale', String(px.scale ?? 4),
    '--colors', String(px.colors ?? 64),
    '--saturation', String(px.saturation ?? 1),
  ], { stdio: 'inherit' });
  const overlay = c.review.overlay || {};
  execFileSync('python', [
    path.join(ROOT, 'lib', 'build_review_sheet.py'),
    raw, pixel, review,
    '--title', label,
    '--ground-y', String(overlay.groundY ?? -1),
    '--castle-end-x', String(overlay.castleEndX ?? -1),
    '--combat-start-x', String(overlay.combatStartX ?? -1),
    '--checklist-json', JSON.stringify(c.review.checklist || []),
  ], { stdio: 'inherit' });
  return { pixelFile, reviewFile };
}

async function finishRecord({ arch, c, d, m, current, setRecord, prompt, opts, file, label, claimPaidCall }) {
  let record = current || {};
  if (!record.generationId) {
    claimPaidCall(label);
    const submission = await submit(prompt, opts);
    record = {
      ...record,
      status: 'pending',
      provider: 'Leonardo',
      apiVersion: apiVersion(c.apiVersion),
      model: c.model || 'phoenix',
      generationId: submission.generationId,
      cost: submission.cost,
      request: submission.request,
      prompt,
      negativePrompt: opts.negative || c.negative || NEG,
      submittedAt: new Date().toISOString(),
    };
    setRecord(record);
    saveMan(arch, m);
    console.log(`  saved pending generation ${record.generationId} before polling`);
  } else {
    console.log(`  resuming recorded generation ${record.generationId}; no new paid submission`);
  }
  const result = await poll(record.generationId);
  await download(result.url, path.join(d, file));
  record = {
    ...record,
    status: 'complete',
    imageId: result.imageId,
    file,
    cost: result.cost || record.cost || null,
    providerSeed: result.generation?.seed ?? record.providerSeed ?? null,
    completedAt: new Date().toISOString(),
    ...reviewArtifacts(c, d, file, label),
  };
  setRecord(record);
  saveMan(arch, m);
  return record;
}

async function cmdGen(arch, only, { approvedPaid = false, maxPaidCalls = 1 } = {}) {
  const c = cfg(arch), d = outDir(arch), m = loadMan(arch);
  const effectivePaidCallCap = paidCallCap(c, maxPaidCalls);
  const report = validationReport(arch, c, only);
  if (report.errors.length) throw new Error(`config validation failed:\n${report.errors.map((error) => `- ${error}`).join('\n')}`);
  for (const warning of report.warnings) console.log(`WARN: ${warning}`);
  let paidCalls = 0;
  const claimPaidCall = (label) => {
    if (!approvedPaid) throw new Error(`paid generation blocked for ${label}; rerun with --approve-paid after reviewing the plan`);
    if (paidCalls >= effectivePaidCallCap) throw new Error(`paid-call cap ${effectivePaidCallCap} reached before ${label}; inspect the completed gate image before continuing`);
    paidCalls += 1;
    console.log(`PAID CALL ${paidCalls}/${effectivePaidCallCap}: ${label} (one image)`);
  };
  m.lastRun = {
    startedAt: new Date().toISOString(),
    approvedPaid,
    requestedMaxPaidCalls: maxPaidCalls,
    maxPaidCalls: effectivePaidCallCap,
    imagesPerPaidCall: 1,
    selectedState: only || null,
  };
  saveMan(arch, m);

  if (c.styleRefFile && !m.styleRefUploadId) {
    const abs = path.resolve(ROOT, c.styleRefFile);
    console.log('> uploading style reference', path.basename(abs));
    m.styleRefUploadId = await uploadInitImage(abs);
    saveMan(arch, m);
  }
  if (c.initImageFile && !m.initImageUploadId) {
    const abs = path.resolve(ROOT, c.initImageFile);
    console.log('> uploading init image', path.basename(abs));
    m.initImageUploadId = await uploadInitImage(abs);
    saveMan(arch, m);
  }

  const families = requiredFamilies(c, only);
  for (const [family, anchor] of Object.entries(c.anchors || {})) {
    if (!families.has(family) || isComplete(m.anchors[family])) continue;
    console.log(`> anchor ${family}`);
    await finishRecord({
      arch, c, d, m,
      current: m.anchors[family],
      setRecord: (record) => { m.anchors[family] = record; },
      prompt: promptFor(c, anchor.line),
      file: `anchor-${family}.png`,
      label: anchor.label || `${arch} — ${family} anchor`,
      claimPaidCall,
      opts: {
        ...dims(c),
        ...(m.styleRefUploadId
          ? { styleRefId: m.styleRefUploadId, styleRefType: 'UPLOADED', strength: c.styleRefStrength || 'Mid' }
          : {}),
      },
    });
  }

  for (const state of selectedStates(c, only)) {
    if (isComplete(m.states[state.id])) continue;
    if (state.isAnchor) {
      const anchor = m.anchors[state.family];
      if (!isComplete(anchor)) throw new Error(`anchor ${state.family} did not complete for state ${state.id}`);
      m.states[state.id] = { ...anchor, label: state.label, family: state.family, isAnchor: true };
      saveMan(arch, m);
      console.log(`= state ${state.id} reuses ${state.family} anchor`);
      continue;
    }
    console.log(`> state ${state.id} (${state.family} ref, ${state.strength || 'Mid'})`);
    const useRef = c.styleRef !== false;
    const refFromFile = m.styleRefUploadId
      ? { styleRefId: m.styleRefUploadId, styleRefType: 'UPLOADED', strength: state.strength || c.styleRefStrength || 'Mid' }
      : null;
    await finishRecord({
      arch, c, d, m,
      current: m.states[state.id],
      setRecord: (record) => { m.states[state.id] = { ...record, label: state.label, family: state.family, strength: state.strength }; },
      prompt: promptFor(c, state.line),
      file: `${state.id}.png`,
      label: state.label,
      claimPaidCall,
      opts: {
        ...dims(c),
        ...(state.negative ? { negative: state.negative } : {}),
        ...initOpts(c, m, state),
        ...(refFromFile
          ? refFromFile
          : useRef
            ? { styleRefId: m.anchors[state.family].imageId, strength: state.strength }
            : {}),
      },
    });
  }
  m.lastRun.completedAt = new Date().toISOString();
  m.lastRun.paidCalls = paidCalls;
  saveMan(arch, m);
  console.log(`done (${paidCalls} new paid call${paidCalls === 1 ? '' : 's'}) ->`, manFile(arch));
}

function thumb(dir, file, id) {
  const jpg = path.join(dir, `.thumb-${id}.jpg`);
  try { execSync(`sips -Z 520 ${JSON.stringify(path.join(dir, file))} --out ${JSON.stringify(jpg)}`, { stdio: 'ignore' }); } catch {}
  const use = fs.existsSync(jpg) ? jpg : path.join(dir, file);
  const mime = fs.existsSync(jpg) ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${fs.readFileSync(use).toString('base64')}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function cmdSheet(arch) {
  const c = cfg(arch), d = outDir(arch), m = loadMan(arch);
  const labels = c.familyLabels || {};
  const accents = { light: '#d9b45b', dark: '#a678d6' };
  const fams = [];
  for (const s of c.states) if (!fams.includes(s.family)) fams.push(s.family);
  const groups = fams.map((fam) => {
    const items = c.states.filter((s) => s.family === fam).map((s) => {
      const st = m.states[s.id]; if (!isComplete(st)) return '';
      const src = thumb(d, st.file, s.id);
      const pixel = st.pixelFile ? thumb(d, st.pixelFile, `${s.id}-pixel`) : null;
      const how = st.isAnchor ? 'anchor' : `state · ${st.strength || 'no reference'}`;
      const verdict = st.humanReview ? ` · ${st.humanReview.verdict}: ${escapeHtml(st.humanReview.note)}` : '';
      const cost = st.cost ? ` · cost ${escapeHtml(JSON.stringify(st.cost))}` : '';
      return `<figure><span class="idx">${st.isAnchor ? 'base' : 'state'}</span><img src="${src}" alt="${escapeHtml(st.label)} raw"/>${pixel ? `<img class="pixel" src="${pixel}" alt="${escapeHtml(st.label)} pixel preview"/>` : ''}<figcaption><span class="lbl">${escapeHtml(st.label)}</span><span class="how">${how}${cost}${verdict}</span><span class="how">generation ${escapeHtml(st.generationId)}</span></figcaption></figure>`;
    }).join('');
    return `<section class="grp" style="--fam:${accents[fam] || '#d9b45b'}"><h3><span class="dot"></span>${labels[fam] || fam}</h3><div class="row">${items}</div></section>`;
  }).join('');
  // Thumbnails follow the config's real aspect, or a square plate would be
  // cropped to 3:4 in review — hiding the very edges we generate it to judge.
  const sheetRatio = `${c.width || 768}/${c.height || 1024}`;
  const name = `${arch[0].toUpperCase()}${arch.slice(1)}`;
  const title = c.review?.title || `${name} background review`;
  const lede = c.review?.lede || 'Raw provider output and deterministic game-pixel preview. Judge composition first; colour and pixel-grid adjustments are free post-processing.';
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
  figure{margin:0;flex:0 0 auto;width:420px;position:relative}
  figure img{width:100%;aspect-ratio:${sheetRatio};object-fit:cover;border-radius:9px;display:block;
    border:1px solid var(--edge);box-shadow:0 6px 20px rgba(0,0,0,.4)}
  figure img.pixel{margin-top:10px;image-rendering:pixelated}
  .idx{position:absolute;top:9px;left:9px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;
    background:rgba(10,12,7,.72);color:var(--fam);padding:3px 8px;border-radius:5px;backdrop-filter:blur(3px)}
  figcaption{display:flex;flex-direction:column;margin-top:10px;gap:2px}
  .lbl{font-size:14px;font-weight:600;color:var(--ink)}
  .how{font-size:11px;letter-spacing:.04em;color:var(--muted);font-variant:small-caps}
</style>
<div class="frame">
  <p class="eyebrow">Leonardo environment review · pipeline v2</p>
  <h2>${escapeHtml(title)}</h2>
  <p class="lede">${escapeHtml(lede)}</p>
  ${groups}
</div>`;
  const out = path.join(d, `${arch}-sheet.html`);
  fs.writeFileSync(out, html);
  console.log(out);
}

const args = process.argv.slice(2);
const [cmd, arch] = args;
const positionals = args.slice(2).filter((arg) => !arg.startsWith('--'));
const extra = positionals[0];
const approvedPaid = args.includes('--approve-paid');
const capArg = args.find((arg) => arg.startsWith('--max-paid-calls='));
const maxPaidCalls = capArg ? Number(capArg.split('=')[1]) : 1;
if (!Number.isInteger(maxPaidCalls) || maxPaidCalls < 0) throw new Error('--max-paid-calls must be a non-negative integer');

if (cmd === 'validate' && arch) cmdValidate(arch, extra);
else if (cmd === 'plan' && arch) cmdPlan(arch, extra, maxPaidCalls);
else if (cmd === 'gen' && arch) await cmdGen(arch, extra, { approvedPaid, maxPaidCalls });
else if (cmd === 'sheet' && arch) cmdSheet(arch);
else if (cmd === 'verdict' && arch) cmdVerdict(arch, args[2], String(args[3] || '').toUpperCase(), args.slice(4).join(' '));
else console.log('usage: harness.mjs validate|plan|gen|sheet|verdict <config> [stateId] [--approve-paid] [--max-paid-calls=N]');
