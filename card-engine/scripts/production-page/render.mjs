/**
 * PRODUCTION.md → a structured tree of parts and pages.
 *
 * This module knows markdown and nothing else — no styling, no client script,
 * no page assembly. It was split out of build.mjs when that file passed 500
 * lines against its own "keep this under 300" warning, and the split is the
 * point: the parser is the part most likely to grow (every new markdown
 * convention lands here), so it needed to stop sharing a file with the theme.
 *
 * Output shape:
 *   { title, parts: [ { title, id, intro, pages: [ { id, mark, text, html } ] } ] }
 *
 * A PAGE is one `##` section and everything under it. The renderer groups them
 * rather than emitting a flat stream because the page IS the reading unit —
 * see theme.mjs, which shows exactly one at a time.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const slug = (s) =>
  s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');

const titleCase = (s) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Art that heads each numbered section, keyed by ANCHOR ID.
 *
 * Chosen so the image is ABOUT the section, not decoration: the landscape opens
 * "what this game is", the druid emblem heads the architecture tour, the seraph
 * emblem heads the studio roster, the moot ground heads the decision log.
 * Sections that are pure reference get no image — atmosphere belongs in the
 * margins, never between Raheem and a number he is reading.
 *
 * Every path must be a COMMITTED asset. This once pointed at the Still Season's
 * colosseum, which is uncommitted work-in-progress, and a fresh clone would have
 * silently rendered that section with no art.
 *
 * Keyed by id, not by section number: numbers restart inside each part —
 * Infrastructure has a §1 and so does Game Mechanics — so a numeric key put the
 * same image on two different sections.
 */
const SECTION_ART = {
  '1-what-this-game-is': 'backgrounds/fantasy-landscape.jpg',
  '2-the-map': 'archetype-emblems/druid.jpg',
  '6-the-workshops': 'archetype-emblems/seraph.jpg',
  '8-decision-log': 'combat/arenas/barbarian-moot-ground/base.png',
};

/**
 * Downscale + inline an image as a data URI.
 *
 * SELF-CONTAINED IS NOT OPTIONAL — the published page runs under a CSP that
 * blocks every external host. The archetype emblems are ~1.8 MB each at source;
 * inlining them raw would produce a document too heavy to open on a phone,
 * which is the primary reading surface. PIL is already a sprite-lab dependency.
 */
function makeImageInliner(assetsDir) {
  const cache = new Map();
  return function inlineImage(relPath, width, base = assetsDir) {
    const key = `${base}|${relPath}@${width}`;
    if (cache.has(key)) return cache.get(key);
    const abs = path.join(base, relPath);
    if (!fs.existsSync(abs)) return null;
    try {
      const b64 = execFileSync(
        'python3',
        [
          '-c',
          `
import sys, io, base64
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w = int(sys.argv[2])
im = im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)
buf = io.BytesIO(); im.save(buf, 'JPEG', quality=78, optimize=True)
sys.stdout.write(base64.b64encode(buf.getvalue()).decode())
`,
          abs,
          String(width),
        ],
        { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
      );
      const uri = `data:image/jpeg;base64,${b64}`;
      cache.set(key, uri);
      return uri;
    } catch {
      return null;
    }
  };
}

/**
 * Inline spans. Code is extracted FIRST so its contents are never re-processed
 * — a glob like ** / *.ts inside backticks must not become <strong>.
 *
 * THE PLACEHOLDER IS DELIMITED BY CONTROL BYTES, and it has to be. They cannot
 * occur in the source markdown, so the restore pass can never collide with real
 * prose. A readable delimiter — the index surrounded by spaces — would make the
 * restore regex match any standalone number in a sentence: "delete 17 dead
 * branches" would look up code[17], find nothing, and render
 * "deleteundefineddead branches".
 *
 * They are written as NAMED \\u ESCAPES rather than as literal bytes, which is
 * the only change from the original. The original embedded raw NULs in the
 * source, where they are invisible in most editors and render as spaces in
 * tooling — and this function was silently broken exactly that way while being
 * split out of build.mjs, by copying what looked like spaces. Escapes cannot be
 * lost in transit. Do not "simplify" them back to literal characters.
 */
const PH_OPEN = '\u0000';
const PH_CLOSE = '\u0001';
const PH_RESTORE = new RegExp(PH_OPEN + '(\\d+)' + PH_CLOSE, 'g');

function inline(s) {
  const code = [];
  s = s.replace(
    /`([^`]+)`/g,
    (_, c) => PH_OPEN + (code.push('<code>' + esc(c) + '</code>') - 1) + PH_CLOSE,
  );
  s = esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, h) => '<a href="' + h + '">' + t + '</a>');
  return s.replace(PH_RESTORE, (_, i) => code[i]);
}

/** Compact renderer for the markdown subset PRODUCTION.md actually uses. */
export function render(md, { assetsDir, docsDir }) {
  const inlineImage = makeImageInliner(assetsDir);

  /**
   * Inline a whole folder of art as a labelled grid.
   *
   * The emblems and element crystals were expensive to make and are the
   * best-looking thing the project owns. A guide that describes them in prose
   * while showing none of them undersells the work. Read off disk so the grid
   * can never disagree with what actually exists.
   */
  function gallery(kind) {
    const dir = kind === 'elements' ? 'elements' : 'archetype-emblems';
    const abs = path.join(assetsDir, dir);
    if (!fs.existsSync(abs)) return '';
    const cells = fs
      .readdirSync(abs)
      .filter((f) => /\.(jpe?g|png)$/i.test(f))
      .sort()
      .map((f) => {
        const uri = inlineImage(path.join(dir, f), 240);
        if (!uri) return '';
        const name = titleCase(f.replace(/\.[^.]+$/, ''));
        return (
          `<figure class="gc"><img src="${uri}" alt="${esc(name)}" loading="lazy">` +
          `<figcaption>${esc(name)}</figcaption></figure>`
        );
      })
      .filter(Boolean)
      .join('');
    return `<div class="gal">${cells}</div>`;
  }

  const lines = md.split('\n');
  let i = 0;
  let title = '';

  /**
   * PARTS hold PAGES. A level-1 heading opens a part; a level-2 heading opens a
   * page inside it. Both are derived from the heading tree — there is no
   * registry to keep in sync, which is the same reason the contents grid is
   * generated rather than hand-written, and the same reason it cannot drift.
   */
  const parts = [];
  let part = null;
  let page = null;

  const startPart = (t, id) => {
    part = { title: t, id, intro: [], pages: [] };
    page = null;
    parts.push(part);
  };
  /* A document with no `#` headings still renders: one unnamed part, no tabs. */
  startPart(null, 'part-main');

  /* Before the first `##` inside a part, content is part intro (front matter). */
  const out = { push: (s) => (page ? page.out.push(s) : part.intro.push(s)) };

  let inDetails = false;
  const closeDetails = () => {
    if (inDetails) {
      out.push('</details>');
      inDetails = false;
    }
  };

  while (i < lines.length) {
    const ln = lines[i];

    /* `<!-- gallery: elements -->` inlines every element crystal; `emblems`
       every archetype emblem. A new emblem appears the day it lands. */
    const gal = ln.match(/^<!--\s*gallery:\s*(elements|emblems)\s*-->\s*$/);
    if (gal) {
      out.push(gallery(gal[1]));
      i++;
      continue;
    }

    if (/^<!--/.test(ln)) {
      i++;
      continue;
    }

    if (ln.startsWith('```')) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    const h = ln.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const depth = h[1].length;
      let text = h[2];
      const anchorMatch = text.match(/\s*\{#([\w-]+)\}\s*$/);
      let id;
      if (anchorMatch) {
        id = anchorMatch[1];
        text = text.replace(anchorMatch[0], '');
      } else id = slug(text);

      closeDetails();

      if (depth === 1) {
        /* First h1 is the document title. Every later one opens a part. */
        if (!title) title = `<h1>${inline(text)}</h1>`;
        else if (!part.title && part.pages.length === 0) {
          part.title = text;
          part.id = `part-${id}`;
        } else startPart(text, `part-${id}`);
        i++;
        continue;
      }

      const num = text.match(/^(\d+)\.\s+(.*)$/);

      if (depth === 2) {
        const mark = num ? num[1] : '·';
        const label = num ? num[2] : text;
        page = { id, mark, text: label, out: [] };
        part.pages.push(page);

        const art = SECTION_ART[id];
        if (art) {
          const uri = inlineImage(art, 900);
          if (uri) page.out.push(`<div class="strip"><img src="${uri}" alt=""></div>`);
        }
        page.out.push(
          `<h2 id="${id}"><span class="mark">${mark}</span>${inline(label)}</h2>`,
        );
      } else {
        /* A trailing "— 4 items" becomes a count chip, so a collapsed row still
           says how much is inside. */
        const c = text.match(/^(.*?)\s+—\s+(\d+)\s+items?$/);
        const label = c ? c[1] : text;
        const chip = c ? `<span class="cnt">${c[2]}</span>` : '';
        out.push(
          `<details id="${id}"><summary><span class="sx" aria-hidden="true"></span>` +
            `<span class="st">${inline(label)}</span>${chip}</summary>`,
        );
        inDetails = true;
      }
      i++;
      continue;
    }

    if (/^\|/.test(ln)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i].replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
        i++;
      }
      const body = rows.filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c)));
      const [head, ...rest] = body;
      out.push(
        `<div class="tw"><table><thead><tr>${head
          .map((c) => `<th>${inline(c)}</th>`)
          .join('')}</tr></thead><tbody>${rest
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      );
      continue;
    }

    /* A screenshot figure shows what a workshop's tool actually produces. */
    const fig = ln.match(/^!\[([^\]]*)\]\((screenshots\/[^)]+)\)\s*$/);
    if (fig) {
      const uri = inlineImage(fig[2], 1000, docsDir);
      if (uri) {
        out.push(
          `<figure class="shot"><img src="${uri}" alt="${esc(fig[1])}">` +
            `<figcaption>${inline(fig[1])}</figcaption></figure>`,
        );
      }
      i++;
      continue;
    }

    /* Start row: Raheem reads a workshop, taps copy, pastes it to Claude. */
    const start = ln.match(/^>\s*\*\*Start:\*\*\s*(.+)$/);
    if (start) {
      const txt = start[1].trim();
      out.push(
        `<div class="start"><span class="sl">Start</span>` +
          `<code class="sp">${esc(txt)}</code>` +
          `<button class="cp" data-copy="${esc(txt)}">Copy</button></div>`,
      );
      i++;
      continue;
    }

    if (/^>\s?/.test(ln)) {
      /* Wrapped source lines are ONE paragraph. A <p> per line — the obvious
         implementation — turned every hard-wrapped quote into a column of
         double-spaced fragments. Blank quote lines separate paragraphs. */
      const paras = [[]];
      while (i < lines.length && /^>/.test(lines[i])) {
        const t = lines[i++].replace(/^>\s?/, '');
        if (t.trim()) paras[paras.length - 1].push(t);
        else if (paras[paras.length - 1].length) paras.push([]);
      }
      out.push(
        `<blockquote>${paras
          .filter((p) => p.length)
          .map((p) => `<p>${inline(p.join(' '))}</p>`)
          .join('')}</blockquote>`,
      );
      continue;
    }

    const BULLET = /^(\s*)([-*]|\d+\.)\s+/;
    const listMatch = ln.match(BULLET);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[2]);
      const items = [];
      while (i < lines.length && BULLET.test(lines[i])) {
        items.push(lines[i].replace(BULLET, ''));
        i++;
        /* A hard-wrapped item continues on indented lines carrying no bullet.
           Without this the loop stopped at the first wrap and the rest of the
           sentence fell out of the <li> into a stray paragraph below the list —
           every multi-line bullet in the document was broken in half. */
        while (
          i < lines.length &&
          lines[i].trim() &&
          !BULLET.test(lines[i]) &&
          !/^(#|\||>|```|---+$)/.test(lines[i].trim())
        ) {
          items[items.length - 1] += ` ${lines[i].trim()}`;
          i++;
        }
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }

    if (/^---+$/.test(ln)) {
      out.push('<hr>');
      i++;
      continue;
    }

    if (ln.trim() === '') {
      i++;
      continue;
    }

    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#|\||>|```|---+$|\s*([-*]|\d+\.)\s)/.test(lines[i])
    ) {
      buf.push(lines[i++]);
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }

  closeDetails();

  for (const p of parts) {
    p.intro = p.intro.join('\n');
    for (const pg of p.pages) {
      pg.html = pg.out.join('\n');
      delete pg.out;
    }
  }

  return { title, parts };
}
