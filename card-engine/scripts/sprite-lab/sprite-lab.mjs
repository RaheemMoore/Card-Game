#!/usr/bin/env node
/**
 * Character sprite generation + review harness (PixelLab).
 *
 * Sibling to scripts/bg-harness. Same shape: one config per subject, a
 * manifest that records exactly what was generated, and re-runs that skip
 * completed work so iterating is cheap.
 *
 * WHY PIXELLAB AND NOT LEONARDO: general diffusion has no concept of a frame
 * sequence, and pins character identity with reference images and hope. Two
 * attempts at a front-facing hero came back as the back of the head in two
 * different art styles. PixelLab models characters as first-class objects —
 * you create the character ONCE, then derive rotations and animations FROM
 * that character. Identity is preserved structurally rather than re-rolled.
 *
 * That is the rule this script exists to enforce: never generate a direction
 * or an animation as an independent prompt.
 *
 * Commands:
 *   node sprite-lab.mjs gen <subject>      create character + animations
 *   node sprite-lab.mjs show <subject>     print the stored character detail
 *   node sprite-lab.mjs sheet <subject>    HTML contact sheet for review
 *
 * Reads PIXELLAB_API_KEY from card-engine/.env.local. Generation spends real
 * credits; `gen` skips anything already recorded in the manifest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CARD_ENGINE = path.resolve(ROOT, '../..');
const ENV = path.join(CARD_ENGINE, '.env.local');
const BASE = 'https://api.pixellab.ai/v2';

function loadKey() {
  const t = fs.readFileSync(ENV, 'utf8');
  const m = t.match(/^PIXELLAB_API_KEY=(.*)$/m);
  const k = (m ? m[1] : '').replace(/["'\r ]/g, '');
  if (!k) throw new Error('PIXELLAB_API_KEY is empty in ' + ENV);
  return k;
}
const KEY = loadKey();
const HDRS = {
  authorization: `Bearer ${KEY}`,
  'content-type': 'application/json',
  accept: 'application/json',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Filename-safe animation name. The API returns only `display_name` on an
 *  animation, so this is how a clip's frames are addressed on disk. */
const slug = (s) =>
  String(s ?? 'unnamed')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

async function api(method, route, body) {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: HDRS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    // Surface the server's own validation message — PixelLab returns the list
    // of valid enum values in `detail`, which is more useful than a status code.
    throw new Error(`${method} ${route} → ${res.status}\n${JSON.stringify(json, null, 2)}`);
  }
  return json;
}

const cfg = (s) => JSON.parse(fs.readFileSync(path.join(ROOT, 'configs', `${s}.json`), 'utf8'));
const outDir = (s) => {
  const d = path.join(ROOT, 'out', s);
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const manFile = (s) => path.join(outDir(s), 'manifest.json');
const loadMan = (s) => {
  try {
    return JSON.parse(fs.readFileSync(manFile(s), 'utf8'));
  } catch {
    return { animations: {} };
  }
};
const saveMan = (s, m) => fs.writeFileSync(manFile(s), JSON.stringify(m, null, 2));

/** Full prompt = who they are + what canon forbids. */
function describe(c) {
  return [c.identity.description, c.identity.avoid].filter(Boolean).join(' ');
}

/** Downscale the scene plate to a palette reference (see lib/palette_ref.py). */
function paletteReference(c, dir) {
  if (!c.palette?.reference) return null;
  const src = path.join(CARD_ENGINE, c.palette.reference);
  if (!fs.existsSync(src)) {
    console.warn(`! palette reference missing: ${src} — generating without it`);
    return null;
  }
  const ref = path.join(dir, 'palette-ref.png');
  execFileSync('python3', [path.join(ROOT, 'lib', 'palette_ref.py'), src, ref], {
    stdio: 'inherit',
  });
  return {
    type: 'base64',
    base64: fs.readFileSync(ref).toString('base64'),
    format: 'png',
  };
}

/**
 * Poll until the character stops being generated. PixelLab hands back a
 * character_id immediately and fills it in asynchronously, so "created" and
 * "ready" are different moments.
 */
async function waitForCharacter(id, { label = 'character', tries = 90 } = {}) {
  let last = '';
  for (let i = 0; i < tries; i++) {
    const detail = await api('GET', `/characters/${id}`);
    const status = String(detail.status ?? 'unknown').toLowerCase();
    if (status !== last) {
      console.log(`  ${label}: ${status}`);
      last = status;
    }
    if (['completed', 'complete', 'ready', 'succeeded', 'done'].includes(status)) return detail;
    if (['failed', 'error', 'cancelled'].includes(status)) {
      throw new Error(`${label} ${status}: ${JSON.stringify(detail).slice(0, 400)}`);
    }
    await sleep(5000);
  }
  throw new Error(`timeout waiting for ${label} ${id}`);
}

/**
 * Poll a set of background jobs to completion.
 *
 * Animations do NOT move the character's own status — it is already
 * "completed" from the rotation pass, so waiting on the character returns
 * instantly and silently skips the animation. Template mode fans out one job
 * per direction and those job ids are the only honest progress signal.
 */
async function waitForJobs(ids, label) {
  const pending = new Set(ids);
  const done = {};
  // pro mode runs 20–40 generations per direction sequentially, so this needs
  // room: 360 polls x 5s = 30 minutes.
  for (let i = 0; i < 360 && pending.size; i++) {
    for (const id of [...pending]) {
      const job = await api('GET', `/background-jobs/${id}`);
      const status = String(job.status ?? '').toLowerCase();
      if (['completed', 'complete', 'succeeded', 'done'].includes(status)) {
        pending.delete(id);
        done[id] = job;
      } else if (['failed', 'error', 'cancelled'].includes(status)) {
        throw new Error(`${label} job ${id} ${status}: ${JSON.stringify(job).slice(0, 300)}`);
      }
    }
    if (pending.size) {
      const pct = Math.round((ids.length - pending.size) / ids.length * 100);
      console.log(`  ${label}: ${ids.length - pending.size}/${ids.length} done (${pct}%)`);
      await sleep(5000);
    }
  }
  if (pending.size) throw new Error(`timeout: ${label} still has ${pending.size} job(s) running`);
  const gens = Object.values(done).reduce((n, j) => n + (j.usage?.generations ?? 0), 0);
  console.log(`  ${label}: ${ids.length}/${ids.length} done · ${gens} generation(s)`);
  return done;
}

/**
 * Results arrive on the finished job, not the POST response — and the shape
 * differs per endpoint:
 *   characters / objects / portraits -> last_response.images[] {base64,width,height}
 *   tiles-pro                        -> last_response.tileset_grid_png (a single
 *                                       base64 grid), alongside tileset_15 /
 *                                       tile_rules / colors metadata
 * Normalizing here keeps callers from having to know which.
 */
function imagesFromJob(job) {
  const r = job?.last_response;
  if (!r) return [];
  if (Array.isArray(r.images) && r.images.length) return r.images;
  if (r.tileset_grid_png) return [{ base64: r.tileset_grid_png, kind: 'tileset-grid' }];
  return [];
}

/**
 * A third delivery shape: `last_response.storage_urls`, a name→URL map used by
 * /create-1-direction-object (one entry per requested item). So across this API
 * results arrive as inline `images[]`, inline `tileset_grid_png`, job-level
 * `storage_urls`, or resource-level `storage_urls` fetched by id. Check all of
 * them before concluding a paid job produced nothing.
 */
function storageUrlsFromJob(job) {
  const urls = job?.last_response?.storage_urls;
  return urls && typeof urls === 'object' ? urls : null;
}

/**
 * Tiles-pro delivers pixels in one of TWO places depending on the feature:
 *   tile_feature: 'tileset'  -> last_response.tileset_grid_png, inline base64
 *   tile_feature: 'building' -> nothing inline; GET /tiles-pro/{tile_id} returns
 *                               `storage_urls` (56 named tiles for a wall kit)
 * Each of those calls costs 20 generations, so never re-POST to discover this —
 * fetch by tile_id instead.
 */
async function fetchTileStorage(tileId, prefix, dir) {
  const detail = await api('GET', `/tiles-pro/${tileId}`);
  const urls = detail.storage_urls ?? {};
  const files = [];
  for (const [name, url] of Object.entries(urls)) {
    if (!url) continue;
    const file = `${prefix}-${name}.png`;
    await download(url, path.join(dir, file));
    files.push({ file, tile: name });
  }
  return { files, rules: detail.tile_rules ?? null };
}

/** Autotile placement data — useless as pixels, essential for building a map. */
function tileMetaFromJob(job) {
  const r = job?.last_response ?? {};
  if (!r.tileset_grid_png) return null;
  return {
    tileId: r.tile_id,
    tileType: r.tile_type,
    tileRules: r.tile_rules,
    tileset15: r.tileset_15,
    colors: r.colors,
    seed: r.seed,
  };
}


/**
 * Download with retry. The asset CDN returns transient 503s — one of them threw
 * away a completed pro-mode run's entire download pass (the generations were
 * already paid for, so this is pure waste). Retry with backoff instead.
 */
async function download(url, dest, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
        return;
      }
      if (r.status < 500 && r.status !== 429) throw new Error(`download ${r.status} ${url}`);
      console.warn(`  ! ${r.status} on ${path.basename(dest)}, retry ${i}/${attempts}`);
    } catch (err) {
      if (i === attempts) throw err;
      console.warn(`  ! ${err.message}, retry ${i}/${attempts}`);
    }
    await sleep(2000 * i);
  }
  throw new Error(`download failed after ${attempts} attempts: ${url}`);
}

async function cmdGen(subject) {
  const c = cfg(subject);
  const d = outDir(subject);
  const m = loadMan(subject);

  // A character created elsewhere (e.g. by hand in the PixelLab web app) is
  // adopted by id: we skip creation entirely and only add animations to it.
  // Paste the web app's /create-character/<id> link — that id is all we need,
  // and our key can read the character straight off the API.
  if (c.characterId && !m.characterId) {
    m.characterId = c.characterId;
    m.adopted = true;
    saveMan(subject, m);
    console.log(`= adopting existing character ${c.characterId}`);
  }

  // 1. The character itself — generated once, ever.
  if (!m.characterId) {
    // Two pipelines, and they are NOT interchangeable:
    //
    //   'v3'  -> /create-character-v3, the pixen_v3 model that produced the
    //            dwarf shopkeeper. This is the CAST QUALITY BAR: ~64 colours and
    //            2.7x the edge detail of the 4-directions output. 8 rotations.
    //            No `proportions` field, so chibi is described in prose.
    //
    //   default -> /create-character-with-4-directions. Cheaper, flatter, and
    //            what made the (temporary) chibi hero.
    //
    // WARNING: v3's `reference_image` is NOT a style reference. It is a
    // south-facing sprite that the model ROTATES INTO 8 DIRECTIONS. Passing an
    // existing character to "match its style" regenerates THAT character wearing
    // the new description. Never send it for a new character.
    const v3 = c.pipeline === 'v3';
    const route = v3 ? '/create-character-v3' : '/create-character-with-4-directions';
    console.log(`> creating character (${v3 ? 'v3 / pixen, 8 rotations' : '4 directions'})…`);

    const body = v3
      ? {
          description: describe(c),
          image_size: c.style.size,
          view: c.style.view,
          template_id: c.style.templateId ?? 'mannequin',
          outline: c.style.outline,
          detail: c.style.detail,
          no_background: true,
          seed: c.seed,
        }
      : {
          description: describe(c),
          image_size: c.style.size,
          view: c.style.view,
          proportions: c.style.proportions,
          outline: c.style.outline,
          shading: c.style.shading,
          detail: c.style.detail,
          template_id: c.style.templateId,
          seed: c.seed,
        };

    if (!v3) {
      const colorImage = paletteReference(c, d);
      if (colorImage) {
        body.color_image = colorImage;
        body.force_colors = Boolean(c.palette.force);
      }
    }

    const res = await api('POST', route, body);
    m.characterId = res.character_id;
    m.createUsage = res.usage ?? null;
    m.prompt = body.description;
    m.style = c.style;
    m.seed = c.seed;
    saveMan(subject, m);
    console.log(`  character_id ${m.characterId}`);
  } else {
    console.log(`= character exists (${m.characterId})`);
  }

  const rotated = await waitForCharacter(m.characterId, { label: 'rotations' });

  // Rotations must land on disk BEFORE animations run: v3 pins each direction's
  // walk to that direction's rotation image via custom_start_frame, so the file
  // has to exist by then. (Downloading everything at the end left the pinning
  // step with nothing to read.)
  for (const [dir, url] of Object.entries(rotated.rotation_urls ?? {})) {
    if (!url) continue;
    const file = path.join(d, `rot-${dir}.png`);
    if (!fs.existsSync(file)) await download(url, file);
  }

  // 2. Animations, each derived from that same character.
  //
  // A manifest written by another script in this folder (create-boss-pro.mjs)
  // has no `animations` key at all, so adopting one of those characters and
  // then adding clips to it crashed here rather than starting an empty set.
  m.animations ??= {};
  for (const anim of c.animations ?? []) {
    // Retired clips stay in the config as a record of what was tried and why it
    // was replaced — deleting them loses the lesson, and re-adding one later
    // costs generations to rediscover the same failure.
    if (anim.skip) {
      console.log(`- animation ${anim.id} skipped${anim.supersededBy ? ` (superseded by ${anim.supersededBy})` : ''}`);
      continue;
    }
    let record = m.animations[anim.id];
    if (record?.done) {
      // Still make sure its frames are ON DISK. A clip generated by an earlier
      // run that then crashed before the bulk download has `done: true` and no
      // files, and a later clip chaining to it would fail forever.
      await pullAnimationFrames(m.characterId, d, anim.name ?? anim.id);
      console.log(`= animation ${anim.id} exists`);
      continue;
    }
    if (!record) {
      const body = {
        // `name` lets several config entries share one animation name (four
        // per-direction v3 passes all called "walk") while keeping distinct
        // manifest ids. pack.py globs frames by direction, so a single shared
        // name keeps filenames clean.
        character_id: m.characterId,
        animation_name: anim.name ?? anim.id,
        directions: anim.directions ?? c.directions,
      };

      if (anim.mode === 'pro') {
        // pro generates directions SEQUENTIALLY, using already-finished sides
        // as reference. That is the only mode whose mechanism actually
        // prevents identity drift between frames — template mode produced a
        // rogue frame whose costume differed by 43.7 palette units from the
        // rest of its own cycle. Costs 20–40 generations per direction.
        console.log(`> animation ${anim.id} (pro: ${anim.action}) — this takes a while…`);
        body.mode = 'pro';
        body.action_description = anim.action;
        if (anim.frameCount) body.frame_count = anim.frameCount;
      } else if (anim.mode === 'v3') {
        // v3 takes a free-text action and, crucially, an optional starting
        // pose. Template mode reconstructs poses from a skeleton and can lose
        // the character's facing — it returned a BACK view for the south walk
        // even though the south rotation faces the camera. Pinning
        // custom_start_frame to that direction's rotation forces the facing.
        console.log(`> animation ${anim.id} (v3: ${anim.action})…`);
        body.mode = 'v3';
        body.action_description = anim.action;
        body.frame_count = anim.frameCount ?? 6;
        if (anim.startFromRotation) {
          const rot = path.join(d, `rot-${anim.startFromRotation}.png`);
          if (!fs.existsSync(rot)) throw new Error(`missing start frame ${rot}`);
          body.custom_start_frame = {
            type: 'base64',
            base64: fs.readFileSync(rot).toString('base64'),
            format: 'png',
          };
        } else if (anim.startFromFile) {
          // CHAINING: start this clip from the last frame of another one.
          //
          // Normally every clip pins to the same rotation, which makes that one
          // image the sole identity anchor and stops the set drifting apart.
          // Chaining trades one hop of that safety for CONTINUITY, and is only
          // worth it when two clips must join seamlessly — a downward smash has
          // to begin from the raised-arms pose the wind-up ended on, or the
          // strike visibly snaps back to standing before it swings.
          //
          // One hop only. Chaining a chain compounds drift generation over
          // generation, which is how a costume changes mid-cycle.
          const src = path.join(d, anim.startFromFile);
          if (!fs.existsSync(src)) throw new Error(`missing start frame ${src}`);
          body.custom_start_frame = {
            type: 'base64',
            base64: fs.readFileSync(src).toString('base64'),
            format: 'png',
          };
        }
      } else {
        console.log(`> animation ${anim.id} (template: ${anim.template})…`);
        body.mode = 'template';
        body.template_animation_id = anim.template;
      }

      const res = await api('POST', '/characters/animations', body);
      record = { requested: anim, response: res };
      m.animations[anim.id] = record;
      saveMan(subject, m);
    } else {
      console.log(`> animation ${anim.id}: resuming existing jobs`);
    }

    const jobs = record.response?.background_job_ids ?? [];
    try {
      if (jobs.length) await waitForJobs(jobs, `animation ${anim.id}`);
    } catch (err) {
      // PixelLab jobs can stall and be auto-failed server-side ("Generation
      // timed out"). Nothing is charged, but the dead job id is recorded — so
      // without clearing it, every later run "resumes" a job that can never
      // finish and the config is permanently wedged. Drop the record so the next
      // run re-submits.
      const dead = /failed|cancelled|error/i.test(String(err.message));
      if (dead) {
        delete m.animations[anim.id];
        saveMan(subject, m);
        console.error(`! animation ${anim.id} failed server-side — record cleared, re-run to retry`);
      }
      throw err;
    }
    record.done = true;
    saveMan(subject, m);

    // Pull THIS clip's frames now rather than waiting for the bulk download at
    // the end. A later clip can chain its `startFromFile` to a frame of this
    // one, and that file has to exist by the time its request is built — the
    // rotations above already had to solve exactly this, for the same reason.
    // Downloads are idempotent, so the bulk pass simply re-fetches nothing new.
    await pullAnimationFrames(m.characterId, d, anim.name ?? anim.id);
  }

  // 3. Persist the raw character detail, then pull every image it references.
  const detail = await api('GET', `/characters/${m.characterId}`);
  fs.writeFileSync(path.join(d, 'character.json'), JSON.stringify(detail, null, 2));

  // Name files SEMANTICALLY, never by array index. The animations array is
  // reordered by the API as animations are added — an index-based name silently
  // remapped an existing file to a different animation between two runs.
  const frames = [];
  // `slug` is module-level — the incremental per-clip download has to derive
  // the SAME filename this bulk pass does, and two copies of the rule would
  // eventually disagree and download the same frames under two names.

  for (const [dir, url] of Object.entries(detail.rotation_urls ?? {})) {
    if (!url) continue;
    const file = `rot-${dir}.png`;
    await download(url, path.join(d, file));
    frames.push({ file, kind: 'rotation', direction: dir });
  }

  for (const anim of detail.animations ?? []) {
    const name = slug(anim.display_name);
    for (const dd of anim.directions ?? []) {
      for (const [i, url] of (dd.frames ?? []).entries()) {
        const file = `anim-${name}-${dd.direction}-${String(i).padStart(2, '0')}.png`;
        await download(url, path.join(d, file));
        frames.push({ file, kind: 'animation', animation: name, direction: dd.direction, frame: i });
      }
    }
  }

  console.log(`> ${frames.length} image(s) downloaded`);
  m.frames = frames;
  m.size = detail.size;
  saveMan(subject, m);

  console.log('done →', manFile(subject));
}

/**
 * Scene assets: tilesets and standalone objects.
 *
 * Two hard-won rules baked in here:
 *
 * 1. STYLE-ANCHOR TO THE HERO, NOT THE SCENE. Every call passes the character
 *    style reference (a <=256px crop of the chibi) as `style_images`. Anchoring
 *    to the painted plate instead is what dragged the hero toward dark stone and
 *    cost him face contrast — the character the player watches sets the register.
 *
 * 2. RESULTS LIVE ON THE JOB, not the POST response, at
 *    job.last_response.images[]. Same as portraits.
 */
async function cmdScene(subject) {
  const c = cfg(subject);
  const d = outDir(subject);
  const m = loadMan(subject);
  m.assets = m.assets ?? {};

  const refPath = path.join(d, c.styleReference);
  if (!fs.existsSync(refPath)) {
    throw new Error(
      `missing style reference ${refPath} — build it with lib/style_ref.py first`,
    );
  }
  // Objects take StyleReferenceImage {type, base64, format}. Tiles take a
  // different shape AND treat the style image as defining tile shape+dimensions
  // (tile_type/tile_size/tile_view are ignored when supplied) — so a character
  // crop would produce character-shaped "tiles". Tiles therefore opt out via
  // "styleAnchor": false and steer register through description + outline_mode.
  const styleImage = {
    type: 'base64',
    base64: fs.readFileSync(refPath).toString('base64'),
    format: 'png',
  };

  const run = async (kind, spec, route) => {
    const key = `${kind}:${spec.id}`;
    if (m.assets[key]?.files?.length) {
      console.log(`= ${key} exists`);
      return;
    }
    console.log(`> ${key} …`);
    const body = { ...spec.params };
    // /create-1-direction-object has no `seed` parameter and rejects it
    // outright ("Extra inputs are not permitted") — unlike every other
    // endpoint here. Object output is therefore NOT reproducible; the config
    // records the intent, not a rebuildable result.
    if (spec.seed != null && route !== '/create-1-direction-object') body.seed = spec.seed;

    // ROTATIONS: turn an object we ALREADY have into its other seven faces.
    // `/create-8-direction-object` documents `reference_image` as "generates 8
    // rotations of this exact image", which is the only way to get a genuine
    // side face — rotating a finished sprite aligns its footprint to a wall but
    // cannot invent the face it should be showing.
    //
    // `reference_image` is MUTUALLY EXCLUSIVE with `style_image`, so a spec that
    // supplies one must not also carry the hero anchor. That is a hard API rule,
    // not a preference, hence the explicit clear rather than relying on config.
    if (spec.referenceFile) {
      const rp = path.join(d, spec.referenceFile);
      if (!fs.existsSync(rp)) throw new Error(`missing reference image ${rp}`);
      body.reference_image = {
        type: 'base64',
        base64: fs.readFileSync(rp).toString('base64'),
        format: 'png',
      };
      delete body.style_image;
      delete body.style_images;
    } else if (spec.styleAnchor !== false) {
      body.style_images = [styleImage];
    }
    const res = await api('POST', route, body);

    const jobId = res.job_id ?? res.background_job_id;
    let images = res.images ?? [];
    let generations = res.usage?.generations ?? 0;
    let tileMeta = null;
    let lastJob = null;
    if (jobId) {
      const jobs = await waitForJobs([jobId], key);
      lastJob = jobs[jobId];
      images = imagesFromJob(jobs[jobId]);
      tileMeta = tileMetaFromJob(jobs[jobId]);
      generations = jobs[jobId]?.usage?.generations ?? generations;
      // Keep the whole job: these calls are expensive (a tileset cost 20
      // generations) and a shape surprise should never mean re-paying.
      fs.writeFileSync(
        path.join(d, `${kind}-${spec.id}-job.json`),
        JSON.stringify(jobs[jobId], null, 2),
      );
    }
    // Objects return a name→URL map on the job itself.
    const jobUrls = jobId ? storageUrlsFromJob(lastJob) : null;
    if (!images.length && jobUrls) {
      const files = [];
      for (const [name, url] of Object.entries(jobUrls)) {
        if (!url) continue;
        const file = `${kind}-${spec.id}-${name}.png`;
        await download(url, path.join(d, file));
        files.push({ file, item: name });
      }
      m.assets[key] = { spec, files, generations };
      saveMan(subject, m);
      console.log(`  ${files.length} object(s), ${generations} generation(s)`);
      return;
    }

    // Building kits return no inline pixels — fetch them by tile_id.
    const tileId = res.tile_id ?? tileMeta?.tileId;
    if (!images.length && tileId) {
      console.log(`  no inline images; fetching tiles by id ${tileId}`);
      const stored = await fetchTileStorage(tileId, `${kind}-${spec.id}`, d);
      m.assets[key] = {
        spec,
        files: stored.files,
        generations,
        tileMeta: { tileId, tileRules: stored.rules },
      };
      saveMan(subject, m);
      console.log(`  ${stored.files.length} tile(s), ${generations} generation(s)`);
      return;
    }

    if (!images.length) {
      throw new Error(`${key}: no images returned — raw job saved, inspect it before re-running`);
    }

    const files = [];
    for (const [i, img] of images.entries()) {
      const file = images.length > 1 ? `${kind}-${spec.id}-${i}.png` : `${kind}-${spec.id}.png`;
      fs.writeFileSync(path.join(d, file), Buffer.from(img.base64, 'base64'));
      files.push({ file, width: img.width, height: img.height, kind: img.kind });
    }
    m.assets[key] = { spec, files, generations, tileMeta };
    saveMan(subject, m);
    console.log(`  ${files.length} image(s), ${generations} generation(s)`);
  };

  for (const t of c.tiles ?? []) await run('tiles', t, '/create-tiles-pro');
  for (const o of c.objects ?? []) await run('object', o, '/create-1-direction-object');
  // NOTE the different `view` enum: 1-direction takes 'top-down'|'sidescroller',
  // 8-direction takes 'low top-down'|'high top-down'|'side'. Passing the wrong
  // one 422s. `size` is also capped at 168 here — the 8-rotation pipeline
  // rejects anything larger, where 1-direction allows 256.
  for (const o of c.rotations ?? []) await run('rot8', o, '/create-8-direction-object');

  /**
   * OBJECT ANIMATION. `/objects/{id}/animations` animates an object we already
   * have — banners ripple, crystals pulse, pages flutter. The claim that
   * PixelLab objects cannot be animated was WRONG and was corrected 2026-08-04;
   * see PIXELLAB_PLAYBOOK.md §"What PixelLab can actually do".
   *
   * Two ways to spend far more than you meant to:
   *  - `mode: 'pro'` is 20-40 generations PER DIRECTION. Always leave it on v3.
   *  - Omitting `directions` on an 8-direction object animates ALL EIGHT. The
   *    game only ever shows south / south-east / south-west, so name them.
   *    (For a 1-direction object the field must be omitted entirely — passing
   *    it is a 400.)
   */
  for (const a of c.objectAnimations ?? []) {
    const key = `anim:${a.id}`;
    if (m.assets[key]?.files?.length) {
      console.log(`= ${key} exists`);
      continue;
    }
    console.log(`> ${key} …`);
    const body = {
      mode: a.mode ?? 'v3',
      animation_description: a.description,
      ...(a.frameCount ? { frame_count: a.frameCount } : {}),
      ...(a.displayName ? { display_name: a.displayName } : {}),
      ...(a.directions ? { directions: a.directions } : {}),
      // Re-animating a direction that already has one is a 409 without this.
      ...(a.replaceExisting ? { replace_existing: true } : {}),
    };
    const res = await api('POST', `/objects/${a.objectId}/animations`, body);
    const jobIds = (res.submissions ?? [])
      .map((s) => s.job_id ?? s.background_job_id ?? s.id)
      .filter(Boolean);
    if (!jobIds.length) throw new Error(`${key}: no jobs returned — ${JSON.stringify(res).slice(0, 400)}`);

    const jobs = await waitForJobs(jobIds, key);
    const generations = Object.values(jobs).reduce((n, j) => n + (j.usage?.generations ?? 0), 0);

    // Frames live on the OBJECT once the jobs land, not on the job response.
    const detail = await api('GET', `/objects/${a.objectId}`);
    const group = (detail.animations ?? []).find(
      (g) => g.animation_group_id === res.animation_group_id,
    ) ?? (detail.animations ?? []).slice(-1)[0];
    fs.writeFileSync(
      path.join(d, `anim-${a.id}-detail.json`),
      JSON.stringify({ post: res, group }, null, 2),
    );

    // Frames hang off each DIRECTION as `storage_urls.frames`, not off the job
    // and not as `frame_urls`. Getting this wrong throws away a completed,
    // paid-for animation — the same trap the rotation/tile paths already hit.
    const files = [];
    for (const dir of group?.directions ?? []) {
      const urls = dir.storage_urls?.frames ?? dir.frame_urls ?? dir.frames ?? [];
      for (const [i, url] of urls.entries()) {
        if (!url) continue;
        const file = `anim-${a.id}-${dir.direction ?? 'single'}-${String(i).padStart(2, '0')}.png`;
        await download(typeof url === 'string' ? url : url.url, path.join(d, file));
        files.push({ file, direction: dir.direction ?? 'single', frame: i });
      }
    }
    if (!files.length) {
      throw new Error(`${key}: jobs completed but no frame urls found — inspect anim-${a.id}-detail.json`);
    }

    m.assets[key] = { spec: a, files, generations, animationGroupId: res.animation_group_id };
    saveMan(subject, m);
    console.log(`  ${files.length} frame(s), ${generations} generation(s)`);
  }

  const total = Object.values(m.assets).reduce((n, a) => n + (a.generations ?? 0), 0);
  m.totalGenerations = total;
  saveMan(subject, m);
  console.log(`done → ${manFile(subject)}  · ${total} generation(s) total`);
}

/**
 * Rebuild manifest entries and re-download assets from already-completed jobs,
 * spending nothing.
 *
 * These calls are expensive — a single tileset or wall kit costs 20 generations —
 * and the response shape differs per feature in ways that are not documented.
 * Twice now a completed, paid-for job was discarded because the code looked for
 * pixels in the wrong place. Recovery makes that a nuisance instead of a bill.
 */
async function cmdRecover(subject) {
  const d = outDir(subject);
  const m = loadMan(subject);
  m.assets = m.assets ?? {};

  const jobFiles = fs.readdirSync(d).filter((f) => f.endsWith('-job.json'));
  if (!jobFiles.length) return console.log('no saved jobs to recover from');

  for (const jf of jobFiles) {
    const match = jf.match(/^(tiles|object)-(.+)-job\.json$/);
    if (!match) continue;
    const [, kind, id] = match;
    const key = `${kind}:${id}`;
    if (m.assets[key]?.files?.length) {
      console.log(`= ${key} already recorded`);
      continue;
    }

    const job = JSON.parse(fs.readFileSync(path.join(d, jf), 'utf8'));
    const generations = job.usage?.generations ?? 0;
    const images = imagesFromJob(job);
    const tileMeta = tileMetaFromJob(job);
    const tileId = tileMeta?.tileId ?? job.last_response?.tile_id;

    if (images.length) {
      const files = [];
      for (const [i, img] of images.entries()) {
        const file = images.length > 1 ? `${kind}-${id}-${i}.png` : `${kind}-${id}.png`;
        fs.writeFileSync(path.join(d, file), Buffer.from(img.base64, 'base64'));
        files.push({ file, width: img.width, height: img.height, kind: img.kind });
      }
      m.assets[key] = { spec: { id }, files, generations, tileMeta, recovered: true };
      console.log(`+ ${key}: ${files.length} inline image(s), ${generations} generation(s) preserved`);
    } else if (storageUrlsFromJob(job)) {
      const files = [];
      for (const [name, url] of Object.entries(storageUrlsFromJob(job))) {
        if (!url) continue;
        const file = `${kind}-${id}-${name}.png`;
        await download(url, path.join(d, file));
        files.push({ file, item: name });
      }
      m.assets[key] = { spec: { id }, files, generations, recovered: true };
      console.log(`+ ${key}: ${files.length} object(s), ${generations} generation(s) preserved`);
    } else if (tileId) {
      const stored = await fetchTileStorage(tileId, `${kind}-${id}`, d);
      m.assets[key] = {
        spec: { id },
        files: stored.files,
        generations,
        tileMeta: { tileId, tileRules: stored.rules },
        recovered: true,
      };
      console.log(`+ ${key}: ${stored.files.length} stored tile(s), ${generations} generation(s) preserved`);
    } else {
      console.log(`! ${key}: nothing recoverable in ${jf}`);
      continue;
    }
    saveMan(subject, m);
  }

  const total = Object.values(m.assets).reduce((n, a) => n + (a.generations ?? 0), 0);
  m.totalGenerations = total;
  saveMan(subject, m);
  console.log(`recovered → ${manFile(subject)} · ${total} generation(s) accounted for`);
}

/**
 * Bust portrait for dialogue, derived from the character's own south sprite.
 *
 * Uses /portrait-character-pro with direction=character_to_portrait, so the
 * portrait is generated FROM the sprite rather than from a fresh prompt — the
 * shopkeeper in a chat window is then provably the same person you met in the
 * courtyard.
 *
 * Note: POST /characters/{id}/portrait is NOT a generator, despite the name —
 * it stores an image you already have.
 */
async function cmdPortrait(subject) {
  const d = outDir(subject);
  const src = path.join(d, 'rot-south.png');
  if (!fs.existsSync(src)) throw new Error(`need ${src} — run gen first`);

  console.log('> generating dialogue portrait from the south sprite…');
  const res = await api('POST', '/portrait-character-pro', {
    image: { type: 'base64', base64: fs.readFileSync(src).toString('base64'), format: 'png' },
    direction: 'character_to_portrait',
    result_size: 128,
  });

  const jobId = res.job_id ?? res.background_job_id;
  if (!jobId) throw new Error(`no job id in response: ${JSON.stringify(res).slice(0, 300)}`);

  const jobs = await waitForJobs([jobId], 'portrait');
  const images = imagesFromJob(jobs[jobId]);
  if (!images.length) {
    fs.writeFileSync(path.join(d, 'portrait-job.json'), JSON.stringify(jobs[jobId], null, 2));
    throw new Error('job completed with no images — raw job saved to portrait-job.json');
  }

  const out = path.join(d, 'portrait.png');
  fs.writeFileSync(out, Buffer.from(images[0].base64, 'base64'));
  console.log(`portrait → ${out}  ${images[0].width}x${images[0].height}`);
}

function cmdShow(subject) {
  const d = outDir(subject);
  const f = path.join(d, 'character.json');
  if (!fs.existsSync(f)) return console.log('no character.json yet — run gen first');
  const detail = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log(
    JSON.stringify(
      {
        id: detail.id,
        name: detail.name,
        status: detail.status,
        size: detail.size,
        view: detail.view,
        directions: detail.directions,
        animation_count: detail.animation_count,
        rotation_urls: detail.rotation_urls,
        animations: detail.animations,
      },
      null,
      2,
    ).slice(0, 4000),
  );
}

/**
 * Promote chosen frames of a REVIEW object into their own completed objects.
 *
 * A multi-item `/create-1-direction-object` call returns ONE object holding
 * several candidate frames, and a review object cannot be animated. Selecting a
 * frame is what turns "one of four sketches" into an asset with its own
 * object_id — which is the handle `/objects/{id}/animations` needs.
 *
 *   node sprite-lab.mjs promote <subject> <objectId> <index[,index...]> [tag]
 */
async function cmdPromote(subject, args) {
  const [objectId, indexList, tag] = args;
  if (!objectId || !indexList) {
    throw new Error('usage: promote <subject> <objectId> <indices> [tag]');
  }
  const indices = indexList.split(',').map((n) => Number(n.trim()));
  const body = { indices, ...(tag ? { common_tag: tag } : {}) };
  const res = await api('POST', `/objects/${objectId}/select-frames`, body);

  const m = loadMan(subject);
  m.promoted = m.promoted ?? {};
  m.promoted[`${objectId}:${indexList}`] = {
    indices,
    createdObjectIds: res.created_object_ids,
    usage: res.usage ?? null,
  };
  saveMan(subject, m);

  console.log(`promoted frame(s) ${indices.join(', ')} of ${objectId}`);
  for (const id of res.created_object_ids ?? []) console.log(`  object_id ${id}`);
  console.log(`  usage: ${JSON.stringify(res.usage ?? 'none reported')}`);
}

function cmdSheet(subject) {
  const c = cfg(subject);
  const d = outDir(subject);
  const m = loadMan(subject);

  // Character configs record `m.frames`; scene/object configs record `m.assets`
  // keyed `kind:id` with a `files` array. The sheet used to read `frames` only,
  // so EVERY object config rendered a blank page — the assets were on disk and
  // paid for, and the review surface silently showed nothing. Raheem caught it.
  const rows = [];
  for (const f of m.frames ?? []) {
    if (fs.existsSync(path.join(d, f.file))) rows.push({ file: f.file, cap: f.trail.join(' · ') });
  }
  for (const [key, a] of Object.entries(m.assets ?? {})) {
    for (const entry of a.files ?? []) {
      // Object assets record {file, item}; tiles record a bare filename string.
      const file = typeof entry === 'string' ? entry : entry.file;
      const item = typeof entry === 'string' ? '' : ` · ${entry.item}`;
      if (file && fs.existsSync(path.join(d, file))) rows.push({ file, cap: `${key}${item}` });
    }
  }
  // In-context composites (light/dark contrast, 9-slice at game scale) are
  // written next to the pieces by lib/ui_kit_review.py. They are the review
  // that actually decides chrome — a piece approved on a checkerboard is how
  // you ship chrome that vanishes against the plate.
  for (const file of fs.readdirSync(d)) {
    if (/^review-.*\.png$/.test(file)) rows.unshift({ file, cap: `IN CONTEXT · ${file}`, wide: true });
  }

  const figs = rows
    .map((f) => {
      const b64 = fs.readFileSync(path.join(d, f.file)).toString('base64');
      return `<figure${f.wide ? ' class="wide"' : ''}><img src="data:image/png;base64,${b64}"/><figcaption>${f.cap}</figcaption></figure>`;
    })
    .join('');
  const lede = c.identity?.description ?? c.label ?? '';
  const html = `<title>${c.label}</title>
<style>
  body{background:#14131a;color:#ece9da;font:14px/1.6 system-ui,sans-serif;margin:0;padding:28px}
  h1{font-size:26px;margin:0 0 6px}
  .lede{color:#9a94a8;max-width:70ch;margin:0 0 24px}
  .grid{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}
  figure{margin:0;width:150px}
  figure.wide{width:100%}
  figure img{width:100%;image-rendering:pixelated;background:
    repeating-conic-gradient(#2a2833 0% 25%, #1d1b26 0% 50%) 50%/16px 16px;border-radius:8px}
  figcaption{color:#8d879b;font-size:11px;margin-top:6px;word-break:break-all}
  figure.wide figcaption{color:#d6b45a;font-size:13px;letter-spacing:.06em}
  .crit{background:#1c1a24;border-left:3px solid #d6b45a;padding:14px 18px;margin:0 0 24px;border-radius:0 6px 6px 0}
  .crit h2{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#d6b45a;margin:0 0 8px;font-weight:600}
  .crit li{color:#b7b0c4;margin-bottom:5px}
</style>
<h1>${c.label}</h1>
<p class="lede">${lede}</p>
${
  c.review?.acceptance
    ? `<div class="crit"><h2>Acceptance criteria</h2><ul>${c.review.acceptance
        .map((x) => `<li>${x}</li>`)
        .join('')}</ul></div>`
    : ''
}
<div class="grid">${figs}</div>`;
  const out = path.join(d, `${subject}-sheet.html`);
  fs.writeFileSync(out, html);
  console.log(out);
}

const [cmd, subject] = process.argv.slice(2);
if (!cmd || !subject) {
  console.log('usage: sprite-lab.mjs <gen|scene|promote|recover|portrait|show|sheet> <subject> [args]');
  process.exit(1);
}
if (cmd === 'gen') await cmdGen(subject);
else if (cmd === 'promote') await cmdPromote(subject, process.argv.slice(4));
else if (cmd === 'scene') await cmdScene(subject);
else if (cmd === 'recover') await cmdRecover(subject);
else if (cmd === 'portrait') await cmdPortrait(subject);
else if (cmd === 'show') cmdShow(subject);
else if (cmd === 'sheet') cmdSheet(subject);
else {
  console.log('unknown command ' + cmd);
  process.exit(1);
}

/**
 * Download one animation's frames if they are not already on disk.
 *
 * Exists so a clip can CHAIN its start frame to a frame of an earlier clip: the
 * bulk download at the end of a run is too late for that, and the rotations
 * above already had to solve the identical ordering problem.
 *
 * Matches on `slug(display_name)` because that is the only name the API returns
 * on an animation — there is no `name` or `animation_name` field on the
 * character detail, and matching against the requested name silently found
 * nothing.
 */
async function pullAnimationFrames(characterId, dir, wantName) {
  const detail = await api('GET', `/characters/${characterId}`);
  const want = slug(wantName);
  for (const a of detail.animations ?? []) {
    if (slug(a.display_name) !== want) continue;
    for (const dd of a.directions ?? []) {
      for (const [i, url] of (dd.frames ?? []).entries()) {
        const file = `anim-${want}-${dd.direction}-${String(i).padStart(2, '0')}.png`;
        const dest = path.join(dir, file);
        if (!fs.existsSync(dest)) await download(url, dest);
      }
    }
  }
}
