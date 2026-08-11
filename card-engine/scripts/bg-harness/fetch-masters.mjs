#!/usr/bin/env node
/**
 * Pull full-quality masters back from Leonardo for images Raheem made in the web UI.
 *
 * Raheem, 2026-08-09: "before you send them to pixel lab, make sure to go to
 * Leonardo and get the actual extracts with the full quality images instead of
 * using the ones that I gave you."
 *
 * Honest caveat recorded in CLAUDE.md: for `gemini-2.5-flash-image` the CDN file
 * IS the master and it is a JPEG — there is no cleaner PNG behind it. So this
 * may return the same bytes he already has. It prints the served dimensions and
 * byte size next to the local file's so the answer is visible either way,
 * rather than claiming a win that did not happen.
 *
 *   node scripts/bg-harness/fetch-masters.mjs list [limit]
 *   node scripts/bg-harness/fetch-masters.mjs get <generationId> <outfile>
 *
 * `list` prints recent generations with id, model, size and prompt head so a
 * local download can be matched to its generation by prompt text.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(ROOT, '../../.env.local');
const BASE = 'https://cloud.leonardo.ai/api/rest/v1';

function loadKey() {
  const t = fs.readFileSync(ENV, 'utf8');
  const m = t.match(/^LEONARDO_API_KEY=(.*)$/m);
  const k = (m ? m[1] : '').replace(/["'\r ]/g, '');
  if (!k) throw new Error('LEONARDO_API_KEY is empty in ' + ENV);
  return k;
}
const HDRS = { authorization: `Bearer ${loadKey()}`, accept: 'application/json' };

async function api(p) {
  const r = await fetch(BASE + p, { headers: HDRS });
  const body = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${p}\n${body.slice(0, 400)}`);
  return JSON.parse(body);
}

async function cmdList(limit = 40) {
  const me = await api('/me');
  const userId = me?.user_details?.[0]?.user?.id;
  if (!userId) throw new Error('could not read user id from /me:\n' + JSON.stringify(me).slice(0, 300));
  const res = await api(`/generations/user/${userId}?limit=${limit}&offset=0`);
  const gens = res.generations || [];
  console.log(`${gens.length} generations\n`);
  for (const g of gens) {
    const img = (g.generated_images || [])[0];
    console.log(
      `${g.id}  ${String(g.imageWidth || '?')}x${String(g.imageHeight || '?')}  ` +
      `${(g.modelId || g.sdVersion || 'custom').slice(0, 12).padEnd(12)}  ${(g.prompt || '').slice(0, 80).replace(/\s+/g, ' ')}`
    );
    if (img?.url) console.log(`    ${img.url}`);
  }
}

async function cmdGet(id, out) {
  const res = await api(`/generations/${id}`);
  const g = res.generations_by_pk;
  if (!g) throw new Error('no such generation: ' + id);
  const imgs = g.generated_images || [];
  console.log(`prompt: ${(g.prompt || '').slice(0, 160)}`);
  console.log(`served: ${g.imageWidth}x${g.imageHeight}, ${imgs.length} image(s)`);
  for (const [i, img] of imgs.entries()) {
    const dest = imgs.length > 1 ? out.replace(/(\.\w+)?$/, `-${i}$1`) : out;
    const r = await fetch(img.url);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log(`  -> ${dest}  ${(buf.length / 1024).toFixed(0)} KB  ${img.url.split('?')[0].split('.').pop()}`);
  }
}

/**
 * Match local downloads to their generations and report whether the served file
 * is actually any better. Leonardo's CDN filename is derived from the prompt and
 * is byte-identical to what the browser saved, so basename matching works; the
 * browser's " (1)" duplicate marker means two generations produced the same
 * name, which is why ambiguity is resolved by comparing bytes.
 */
async function cmdMatch(dir, limit = 120) {
  const crypto = await import('node:crypto');
  const me = await api('/me');
  const userId = me?.user_details?.[0]?.user?.id;
  // The endpoint caps a page at 50 regardless of the limit asked for, so page
  // with offset until we have `limit` or the well runs dry.
  const raw = [];
  for (let off = 0; raw.length < limit; off += 50) {
    const page = (await api(`/generations/user/${userId}?limit=50&offset=${off}`)).generations || [];
    if (!page.length) break;
    raw.push(...page);
  }
  const gens = raw.flatMap((g) =>
    (g.generated_images || []).map((img) => ({ id: g.id, url: img.url, w: g.imageWidth, h: g.imageHeight }))
  );
  const byName = new Map();
  for (const g of gens) {
    const base = decodeURIComponent(g.url.split('/').pop().split('?')[0]);
    if (!byName.has(base)) byName.set(base, []);
    byName.get(base).push(g);
  }

  const md5 = (b) => crypto.createHash('md5').update(b).digest('hex').slice(0, 12);
  const locals = [];
  for (const sub of fs.readdirSync(dir)) {
    const p = path.join(dir, sub);
    if (!fs.statSync(p).isDirectory()) continue;
    for (const f of fs.readdirSync(p)) if (f.endsWith('.jpg')) locals.push(path.join(p, f));
  }

  console.log(`${locals.length} local files, ${gens.length} generations\n`);
  for (const lp of locals) {
    const localBuf = fs.readFileSync(lp);
    const base = path.basename(lp).replace(/ \(\d+\)(?=\.jpg$)/, '');
    const cands = byName.get(base) || [];
    let hit = null;
    for (const c of cands) {
      const buf = Buffer.from(await (await fetch(c.url)).arrayBuffer());
      if (md5(buf) === md5(localBuf)) { hit = { ...c, size: buf.length }; break; }
      if (!hit) hit = { ...c, size: buf.length, differs: true };
    }
    const name = path.basename(path.dirname(lp)) + '/' + path.basename(lp).slice(26, 50);
    if (!hit) { console.log(`  NO MATCH  ${name}`); continue; }
    const same = !hit.differs;
    console.log(
      `${same ? 'IDENTICAL' : 'DIFFERS  '}  local ${(localBuf.length / 1024).toFixed(0)}K  ` +
      `served ${(hit.size / 1024).toFixed(0)}K ${hit.w}x${hit.h}  ${hit.id}  ${name}`
    );
  }
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'list') await cmdList(a ? Number(a) : 40);
else if (cmd === 'get') await cmdGet(a, b);
else if (cmd === 'match') await cmdMatch(a, b ? Number(b) : 120);
else {
  console.log('usage: fetch-masters.mjs list [limit] | get <generationId> <outfile> | match <dir> [limit]');
  process.exit(1);
}
