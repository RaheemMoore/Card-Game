#!/usr/bin/env node
/**
 * Render PRODUCTION.md into a single self-contained themed HTML page.
 *
 * WHY A GENERATOR AND NOT A HAND-WRITTEN PAGE: PRODUCTION.md is the source of
 * truth because markdown is what Claude can keep accurate cheaply and what the
 * push hook can diff. Raheem never has to read it — he reads this output. One
 * source, two views, and they cannot disagree.
 *
 * THIS FILE IS ORCHESTRATION ONLY. Markdown lives in render.mjs, look and
 * behaviour in theme.mjs. It used to be all three and it grew past 500 lines
 * against its own "keep this under 300" warning, which is exactly how a build
 * script becomes the file nobody will touch. Keep the split.
 *
 * Usage: node build.mjs [--out <path>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, esc } from './render.mjs';
import { CSS, SCRIPT } from './theme.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const SRC = path.join(ROOT, 'PRODUCTION.md');
const ASSETS = path.join(ROOT, 'card-engine/public/assets');
const DOCS = path.join(ROOT, 'docs/production');

const outFlag = process.argv.indexOf('--out');
const OUT =
  outFlag > -1 ? path.resolve(process.argv[outFlag + 1]) : path.join(DOCS, 'production.html');

/**
 * Normalize to LF before anything else touches it. `core.autocrlf=true` means
 * PRODUCTION.md round-trips through CRLF on Windows checkouts, and render.mjs's
 * line-oriented parsing was never exercised against `\r`-terminated lines —
 * a real edited file (correct content, CRLF line endings) hung this script for
 * six-plus minutes before OOM-crashing, while the identical content saved as
 * LF rendered in under 150ms. Normalizing here, once, at the only read site,
 * means every downstream regex can keep assuming `\n` and stay correct
 * regardless of which line ending git handed back.
 */
const raw = fs.readFileSync(SRC, 'utf8').replace(/\r\n?/g, '\n');

/**
 * Drop the markdown "## Contents" table. It earns its place in the .md — GitHub
 * and Claude both read it — but the page generates a real nav from the headings,
 * and shipping both would put two tables of contents above the fold on a phone.
 */
const md = raw.replace(/\n## Contents\n[\s\S]*?\n---\n/, '\n');
const { title, parts } = render(md, { assetsDir: ASSETS, docsDir: DOCS });
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

/**
 * Anything before the first part heading is front matter — the lede and the
 * freshness line. It belongs above the tab strip, not inside whichever part
 * happens to come first, or switching tabs would hide the document's own
 * description.
 */
let front = '';
if (parts.length > 1 && !parts[0].title && parts[0].pages.length === 0) {
  front = parts.shift().intro;
}

/* Lift the opening blockquote so the reading order is title → freshness → what
   this is → contents. In document order the page opened on a toolbar and a nav,
   which buried the one sentence saying what the reader is looking at. */
let lede = (front.match(/<blockquote>[\s\S]*?<\/blockquote>/) || [''])[0];
if (lede) front = front.replace(lede, '');

const tabbed = parts.length > 1;

const contents = (p) =>
  `<nav class="toc" aria-label="Sections">${p.pages
    .map(
      (pg) =>
        `<a href="#${pg.id}"><span class="m" aria-hidden="true">${pg.mark}</span><span>${esc(pg.text)}</span></a>`,
    )
    .join('')}</nav>`;

/* Foot nav. Without it, finishing a page is a dead end that forces a trip back
   to the index — the read-straight-through path a long scroll gives for free. */
const foot = (p, n) => {
  const prev = p.pages[n - 1];
  const next = p.pages[n + 1];
  if (!prev && !next) return '';
  return (
    `<nav class="foot">` +
    (prev ? `<a href="#${prev.id}"><span class="lb">Previous</span>${esc(prev.text)}</a>` : '') +
    (next ? `<a class="nx" href="#${next.id}"><span class="lb">Next</span>${esc(next.text)}</a>` : '') +
    `</nav>`
  );
};

const body = parts
  .map(
    (p, n) =>
      `<section class="part" id="${p.id}" data-title="${esc(p.title ?? '')}" data-active="${n === 0}">` +
      (p.intro ? `<div class="intro">${p.intro}</div>` : '') +
      contents(p) +
      p.pages
        .map(
          (pg, k) =>
            `<article class="pg" id="${pg.id}" data-title="${esc(pg.text)}" data-active="false">` +
            pg.html +
            foot(p, k) +
            `</article>`,
        )
        .join('') +
      `</section>`,
  )
  .join('\n');

const tabs = tabbed
  ? `<div class="tabs" role="tablist">${parts
      .map(
        (p, n) =>
          `<button role="tab" class="tab" data-part="${p.id}" aria-selected="${n === 0}">${esc(p.title ?? 'Contents')}</button>`,
      )
      .join('')}</div>`
  : '';

/* charset: python's http.server serves .html without one, which mojibaked the
   title locally. viewport: without it a phone lays the page out at 980px and
   zooms out, and the phone is the surface this document is mainly read on. */
const page = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Card Engine — Production Guide</title>
<style>${CSS}</style>

<div id="topbar">
  <div class="tbin">
    <button id="tbback">&larr; Contents</button>
    <span id="tbtitle"></span>
    <span class="pn">
      <button id="tbprev" title="Previous section">&larr;</button>
      <button id="tbnext" title="Next section">&rarr;</button>
    </span>
  </div>
</div>

<div class="wrap">
${title}
<div class="bar">
  <span>Last generated ${stamp} · source PRODUCTION.md</span>
  <span class="acts">
    <input id="q" type="search" placeholder="Search the guide…" aria-label="Search the guide">
    <button id="xall" aria-expanded="false">Expand all</button>
    <button id="refresh">Refresh</button>
  </span>
</div>
${lede}
${front}
${tabs}
${body}
<div id="results"></div>
</div>
<script>${SCRIPT}</script>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, page);
const count = parts.reduce((n, p) => n + p.pages.length, 0);
console.log(
  `production page → ${path.relative(ROOT, OUT)}  (${(page.length / 1024).toFixed(0)} KB, ` +
    `${count} pages across ${parts.length} part${parts.length === 1 ? '' : 's'})`,
);
