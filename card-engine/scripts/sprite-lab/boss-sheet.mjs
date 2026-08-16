#!/usr/bin/env node
/**
 * Build a PLAYABLE review sheet for a packed boss.
 *
 * Why this exists rather than `sprite-lab.mjs sheet`: that command is the
 * walker-pipeline reviewer. It reads `manifest.frames[].trail`, which a boss
 * manifest does not have (it crashes on it), and it only ever shows stills.
 *
 * Stills cannot answer the question a boss review has to answer. Every defect
 * that has ever shipped in this repo — the shrinking hero, the backwards
 * facing, the costume change mid-walk, the archivist's teleporting ledger, the
 * Still Season's vanishing core glow — was found by WATCHING MOTION, and three
 * separate automated attempts to measure animation in a driven browser
 * reported "frozen" when the animation was fine. So the deliverable is a page
 * that plays the clips at their real fps and lets a human look.
 *
 * It plays the PACKED strips, not the raw frames, so what you review is what
 * the game will actually mount: same shared frame box, same ground line, same
 * clipping. Reviewing raw frames would pass a sheet the packer had broken.
 *
 * Assets are inlined as base64 so the file can be opened or sent anywhere.
 *
 * Usage: boss-sheet.mjs <packed_dir> [--out sheet.html] [--frame <w>] [--clip name:fps:loop ...]
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const packedDir = args[0];
if (!packedDir) {
  console.error('usage: boss-sheet.mjs <packed_dir> [--out file.html] [--clip name:fps:loop ...]');
  process.exit(1);
}

const outFlag = args.indexOf('--out');
const outFile = outFlag > -1 ? args[outFlag + 1] : path.join(packedDir, 'clips-sheet.html');

// Defaults mirror the shipped Debt-Bearer cadence. Override per clip on the CLI.
const DEFAULTS = {
  idle: { fps: 3, loop: true },
  windup: { fps: 8, loop: true },
  attack: { fps: 11, loop: false },
  smash: { fps: 11, loop: false },
  defeat: { fps: 6, loop: false },
  hit: { fps: 12, loop: false },
};
for (let i = 0; i < args.length; i++) {
  if (args[i] !== '--clip') continue;
  const [name, fps, loop] = args[i + 1].split(':');
  DEFAULTS[name] = { fps: Number(fps), loop: loop !== 'false' };
}

const strips = fs
  .readdirSync(packedDir)
  .filter((f) => f.startsWith('sprite-') && f.endsWith('.png'))
  .sort();

if (!strips.length) {
  console.error(`no sprite-*.png in ${packedDir}`);
  process.exit(1);
}

// Frame geometry is derived from the PNG header rather than trusted from a
// side-car, because the packer's whole contract is that every clip shares one
// box — reading it back per strip is what proves that actually happened.
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

const clips = strips.map((file) => {
  const full = path.join(packedDir, file);
  const { width, height } = pngSize(full);
  const name = file.replace(/^sprite-|\.png$/g, '');
  const cfg = DEFAULTS[name] ?? { fps: 8, loop: true };
  return {
    name,
    file,
    frameCount: Math.round(width / height === 0 ? 1 : width / (width / Math.max(1, Math.round(width / height)))),
    sheetW: width,
    h: height,
    b64: fs.readFileSync(full).toString('base64'),
    ...cfg,
  };
});

// Frame width = the shared box width, which every clip must agree on. Take it
// from the narrowest strip's implied cell and verify the rest divide evenly —
// a mismatch here is the "boss changes size mid-fight" bug, caught before it
// reaches the manifest rather than after it reaches the player.
// Deriving the cell width from the strip's aspect ratio assumes a roughly
// SQUARE cell. That holds for the bosses this was written for and breaks for
// anything markedly wider or shorter than it is tall -- the Ember Jelly packs
// to a 63x54 box, where the guess lands on 51.5 and every clip reports a false
// geometry mismatch. `--frame <w>` lets the caller state the box the packer
// already printed ("SHARED frame box: WxH"), which is knowledge, not a guess.
// Without the flag the original heuristic still runs, so bosses are unchanged.
const frameFlag = args.indexOf('--frame');
const frameOverride = frameFlag > -1 ? Number(String(args[frameFlag + 1]).split('x')[0]) : null;
const frameW = frameOverride || Math.min(...clips.map((c) => c.sheetW / Math.round(c.sheetW / c.h)));
let geometryOk = true;
for (const c of clips) {
  c.frames = Math.round(c.sheetW / frameW);
  if (Math.abs(c.frames * frameW - c.sheetW) > 0.5) geometryOk = false;
}

const cards = clips
  .map(
    (c) => `
  <figure>
    <div class="stage">
      <div class="sprite" style="
        width:${frameW}px; height:${c.h}px;
        background-image:url(data:image/png;base64,${c.b64});
        animation: play-${c.name} ${(c.frames / c.fps).toFixed(3)}s steps(${c.frames}) ${c.loop ? 'infinite' : 'infinite'};
      "></div>
    </div>
    <figcaption>
      <b>${c.name}</b>
      <span>${c.frames} frames · ${c.fps} fps · ${Math.round((c.frames / c.fps) * 1000)}ms · ${c.loop ? 'loops' : 'one-shot'}</span>
      <span class="dim">${frameW}×${c.h}</span>
    </figcaption>
  </figure>
  <style>@keyframes play-${c.name}{from{background-position:0 0}to{background-position:-${c.frames * frameW}px 0}}</style>`,
  )
  .join('');

const html = `<!doctype html><meta charset="utf-8">
<title>${path.basename(packedDir)} — boss clips</title>
<style>
  body{background:#14131a;color:#ece9da;font:14px/1.6 system-ui,sans-serif;margin:0;padding:28px}
  h1{font-size:24px;margin:0 0 4px}
  .sub{color:#9a9484;margin:0 0 22px}
  .grid{display:flex;flex-wrap:wrap;gap:26px;align-items:flex-end}
  figure{margin:0}
  /* Checker so alpha is visible — a boss packed with an opaque background
     looks fine on a dark page and wrong the moment it lands on an arena. */
  .stage{background:
      linear-gradient(45deg,#23222c 25%,transparent 25%,transparent 75%,#23222c 75%),
      linear-gradient(45deg,#23222c 25%,#1b1a22 25%,#1b1a22 75%,#23222c 75%);
    background-size:16px 16px;background-position:0 0,8px 8px;
    padding:10px;border-radius:8px;display:inline-block}
  .sprite{image-rendering:pixelated;background-repeat:no-repeat}
  figcaption{display:flex;flex-direction:column;margin-top:8px}
  figcaption span{color:#9a9484;font-size:12px}
  .dim{color:#6b6658}
  .warn{background:#4a2020;border:1px solid #7a3030;padding:10px 14px;border-radius:6px;margin-bottom:18px}
  .ok{color:#8fce7a}
</style>
<h1>${path.basename(packedDir)}</h1>
<p class="sub">Packed strips, played at manifest cadence. Shared frame box <b>${frameW}×${clips[0].h}</b> —
${geometryOk ? '<span class="ok">every clip divides evenly ✓</span>' : '<b>MISMATCH — a clip does not divide evenly</b>'}</p>
${geometryOk ? '' : '<p class="warn">Frame geometry mismatch: at least one strip is not a whole number of shared-box cells. The boss will change size when clips switch.</p>'}
<div class="grid">${cards}</div>
`;

fs.writeFileSync(outFile, html);
console.log(`wrote ${outFile}`);
console.log(`shared frame box: ${frameW}x${clips[0].h}  geometry ${geometryOk ? 'OK' : 'MISMATCH'}`);
for (const c of clips) console.log(`  ${c.name.padEnd(8)} ${c.frames} frames @ ${c.fps}fps ${c.loop ? 'loop' : 'once'}`);
