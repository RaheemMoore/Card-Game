import { useEffect, useMemo, useState } from 'react';
import { LESSONS, type Block, type Lesson, type Actor } from './phaserSchool/lessons';

/**
 * `/dev/phaser-school` — the teaching harness for Phaser Editor world authoring.
 *
 * Built 2026-08-06 at Raheem's request: he is a first-time Phaser Editor user and
 * a visual learner, and wanted the world-building work turned into a syllabus he
 * can repeat later rather than a chat transcript he cannot.
 *
 * Design language is deliberately borrowed from studio-wiki (dark violet canvas,
 * #7c70ff accent, 252px sticky sidebar) so the two surfaces read as one studio,
 * with three additions the wiki does not have: a per-lesson table of contents,
 * persisted progress, and `try` blocks — experiments that prove a claim rather
 * than asserting it.
 *
 * Content lives entirely in `phaserSchool/lessons.ts`. Adding a lesson never
 * touches this file, which is the property that lets the harness grow.
 */

const KEY = 'phaser-school-progress-v1';

/* Minimal inline formatting: **bold** and `code`. Deliberately not a markdown
   parser — lesson copy is ours, and a parser is a dependency plus a footgun. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return (
            <strong key={i} style={{ color: '#fff', fontWeight: 600 }}>
              {p.slice(2, -2)}
            </strong>
          );
        }
        if (p.startsWith('`') && p.endsWith('`')) {
          return (
            <code key={i} style={S.code}>
              {p.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

const ACTOR: Record<Actor, { label: string; bg: string; fg: string }> = {
  claude: { label: 'Claude', bg: 'rgba(124,112,255,.18)', fg: '#a89fff' },
  raheem: { label: 'You', bg: 'rgba(47,229,167,.14)', fg: '#2fe5a7' },
  both: { label: 'Together', bg: 'rgba(245,181,68,.14)', fg: '#f5b544' },
};

const TONE = {
  key: { bar: '#7c70ff', bg: 'rgba(124,112,255,.10)', label: 'Key idea' },
  tip: { bar: '#2fe5a7', bg: 'rgba(47,229,167,.08)', label: 'Tip' },
  warn: { bar: '#f5b544', bg: 'rgba(245,181,68,.08)', label: 'Watch out' },
} as const;

/**
 * Origin is spatial, so it gets a spatial explanation. Shows a real kit tree at
 * a FIXED x/y against a ground line, with the origin adjustable. The readout
 * deliberately keeps x/y pinned while the sprite visibly jumps — that
 * contradiction is the whole lesson and cannot be delivered by prose.
 */
function OriginLab({ src }: { src: string }) {
  const [ox, setOx] = useState(0.5);
  const [oy, setOy] = useState(1);
  const W = 300;
  const H = 210;
  const ANCHOR = { x: 150, y: 150 }; // the object's fixed x/y in the little world
  const IMG = { w: 128, h: 142 }; // castle-tree-broadleaf-large, real size

  const preset = (x: number, y: number, label: string) => (
    <button
      key={label}
      onClick={() => {
        setOx(x);
        setOy(y);
      }}
      style={{
        ...S.originBtn,
        ...(ox === x && oy === y ? S.originBtnOn : null),
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={S.lab}>
      <div style={{ ...S.labStage, width: W, height: H }}>
        {/* the ground line — the thing origin is measured against */}
        <div style={{ ...S.ground, top: ANCHOR.y }} />
        <span style={{ ...S.groundLabel, top: ANCHOR.y + 5 }}>ground</span>

        {/* the sprite, positioned by the origin formula Phaser itself uses */}
        <img
          src={src}
          alt="tree"
          style={{
            position: 'absolute',
            width: IMG.w,
            height: IMG.h,
            left: ANCHOR.x - IMG.w * ox,
            top: ANCHOR.y - IMG.h * oy,
            transition: 'left .18s, top .18s',
          }}
        />
        {/* bounding box, so you can see WHICH corner the handle sits on */}
        <div
          style={{
            position: 'absolute',
            width: IMG.w,
            height: IMG.h,
            left: ANCHOR.x - IMG.w * ox,
            top: ANCHOR.y - IMG.h * oy,
            border: '1px dashed rgba(124,112,255,.55)',
            transition: 'left .18s, top .18s',
            pointerEvents: 'none',
          }}
        />
        {/* the handle itself, which never moves — because x/y never changes */}
        <div style={{ ...S.anchorDot, left: ANCHOR.x - 5, top: ANCHOR.y - 5 }} />
      </div>

      <div style={{ flex: 1, minWidth: 210 }}>
        <p style={S.labHead}>Origin</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {preset(0.5, 1, '0.5 / 1  ·  feet')}
          {preset(0.5, 0.5, '0.5 / 0.5  ·  centre')}
          {preset(0, 0, '0 / 0  ·  top-left')}
          {preset(1, 1, '1 / 1  ·  bottom-right')}
        </div>

        {(
          [
            ['originX', ox, setOx],
            ['originY', oy, setOy],
          ] as const
        ).map(([label, val, set]) => (
          <div key={label} style={{ marginBottom: 10 }}>
            <div style={S.sliderRow}>
              <span>{label}</span>
              <code style={S.code}>{val.toFixed(2)}</code>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={val}
              onChange={(e) => set(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#7c70ff' }}
            />
          </div>
        ))}

        <div style={S.readout}>
          <span style={{ color: '#f5b544' }}>x = 150 · y = 150</span>
          <span style={{ color: '#828097' }}> — unchanged, always</span>
        </div>
        <p style={S.labNote}>
          The <span style={{ color: '#f5b544' }}>gold dot</span> is the object's x/y. It never
          moves. Only the picture slides around it.
        </p>
      </div>
    </div>
  );
}

/**
 * Slices the REAL 16-tile Wang sheet live via CSS background-position and
 * labels each tile with its index and its four corner materials, derived from
 * the index bits (TL=8, TR=4, BL=2, BR=1).
 *
 * The corner mapping was verified against the actual pixels of
 * castle-ground-grass-dirt-wang-32.png — all 16 combinations present, in binary
 * order — rather than assumed from the filename.
 */
function WangLab({ src, a, b }: { src: string; a: string; b: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const CELL = 76;
  const corners = (i: number) => ({
    tl: !!(i & 8),
    tr: !!(i & 4),
    bl: !!(i & 2),
    br: !!(i & 1),
  });

  return (
    <div>
      <div style={S.wangGrid}>
        {Array.from({ length: 16 }, (_, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          const c = corners(i);
          const on = hover === i;
          return (
            <div
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ ...S.wangCell, borderColor: on ? '#7c70ff' : '#3f3e54' }}
            >
              <div
                style={{
                  width: CELL,
                  height: CELL,
                  imageRendering: 'pixelated',
                  backgroundImage: `url(${src})`,
                  backgroundSize: `${CELL * 4}px ${CELL * 4}px`,
                  backgroundPosition: `-${col * CELL}px -${row * CELL}px`,
                  position: 'relative',
                }}
              >
                {/* corner dots: green = material B, brown = material A */}
                {(
                  [
                    ['tl', 3, 3],
                    ['tr', 3, undefined],
                    ['bl', undefined, 3],
                    ['br', undefined, undefined],
                  ] as const
                ).map(([k, top, left]) => (
                  <span
                    key={k}
                    style={{
                      position: 'absolute',
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      border: '1.5px solid rgba(0,0,0,.55)',
                      background: c[k] ? '#5fd97a' : '#9c6b3f',
                      top: top ?? undefined,
                      bottom: top === undefined ? 3 : undefined,
                      left: left ?? undefined,
                      right: left === undefined ? 3 : undefined,
                    }}
                  />
                ))}
              </div>
              <div style={S.wangMeta}>
                <strong style={{ color: on ? '#fff' : '#c9c3ff' }}>{i}</strong>
                <span style={S.wangBits}>
                  {[c.tl, c.tr, c.bl, c.br].map((g) => (g ? 'G' : 'D')).join('')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={S.wangKey}>
        <span>
          <i style={{ ...S.keyDot, background: '#9c6b3f' }} /> D = {a} corner
        </span>
        <span>
          <i style={{ ...S.keyDot, background: '#5fd97a' }} /> G = {b} corner
        </span>
        <span style={{ color: '#828097' }}>corners read TL · TR · BL · BR</span>
      </div>
      <p style={S.caption}>
        The real sheet, sliced live. Index = TL×8 + TR×4 + BL×2 + BR×1. Tile 0 is all {a}; tile 15
        is all {b}.
      </p>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'bullets':
      return (
        <ul style={S.ul}>
          {block.items.map((it, i) => (
            <li key={i} style={S.li}>
              <Rich text={it} />
            </li>
          ))}
        </ul>
      );

    case 'terms':
      return (
        <div style={S.termGrid}>
          {block.items.map((t) => (
            <div key={t.term} style={S.term}>
              <strong style={{ color: '#c9c3ff', fontSize: 13 }}>{t.term}</strong>
              <p style={S.termPlain}>{t.plain}</p>
              {t.where && <p style={S.termWhere}>{t.where}</p>}
            </div>
          ))}
        </div>
      );

    case 'image':
      return (
        <figure style={S.figure}>
          <img
            src={block.src}
            alt={block.caption}
            style={{
              maxWidth: block.maxWidth ?? 320,
              width: '100%',
              imageRendering: block.pixel ? 'pixelated' : 'auto',
              borderRadius: 8,
              background: '#1a1926',
            }}
          />
          <figcaption style={S.caption}>{block.caption}</figcaption>
        </figure>
      );

    case 'gallery':
      return (
        <div>
          <div style={S.gallery}>
            {block.items.map((it) => (
              <div key={it.src} style={S.galleryCell}>
                <div style={S.galleryFrame}>
                  <img
                    src={it.src}
                    alt={it.label}
                    style={{
                      maxWidth: '100%',
                      maxHeight: 150,
                      imageRendering: block.pixel ? 'pixelated' : 'auto',
                    }}
                  />
                </div>
                <span style={S.galleryLabel}>{it.label}</span>
                {it.sub && <span style={S.gallerySub}>{it.sub}</span>}
              </div>
            ))}
          </div>
          {block.caption && <p style={S.caption}>{block.caption}</p>}
        </div>
      );

    case 'steps':
      return (
        <ol style={S.steps}>
          {block.items.map((s, i) => {
            const a = ACTOR[s.who];
            return (
              <li key={i} style={S.step}>
                <span style={{ ...S.pill, background: a.bg, color: a.fg }}>{a.label}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#e6e4f5', fontSize: 14 }}>
                    <Rich text={s.do} />
                  </div>
                  {s.see && (
                    <div style={S.see}>
                      <span style={{ color: '#2fe5a7' }}>→ you should see</span> {s.see}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      );

    case 'try':
      return (
        <div style={S.try}>
          <div style={S.tryHead}>
            <span style={S.tryTag}>Try it</span>
            <strong style={{ fontSize: 14 }}>{block.title}</strong>
          </div>
          <ol style={S.tryList}>
            {block.steps.map((s, i) => (
              <li key={i} style={{ marginBottom: 5 }}>
                <Rich text={s} />
              </li>
            ))}
          </ol>
          <p style={S.proves}>
            <strong style={{ color: '#2fe5a7' }}>What it proves — </strong>
            <Rich text={block.proves} />
          </p>
        </div>
      );

    case 'callout': {
      const t = TONE[block.tone];
      return (
        <div style={{ ...S.callout, background: t.bg, borderLeftColor: t.bar }}>
          <span style={{ ...S.calloutTag, color: t.bar }}>{t.label}</span>
          {block.title && <strong style={S.calloutTitle}>{block.title}</strong>}
          <p style={S.calloutText}>
            <Rich text={block.text} />
          </p>
        </div>
      );
    }

    case 'compare':
      return (
        <div style={S.compare}>
          {[block.left, block.right].map((side, i) => (
            <div key={i} style={{ ...S.compareCol, borderColor: i ? '#7c70ff66' : '#4a4960' }}>
              <strong style={{ fontSize: 13, color: i ? '#c9c3ff' : '#aaa9bd' }}>{side.title}</strong>
              <ul style={{ ...S.ul, marginTop: 8 }}>
                {side.points.map((p, j) => (
                  <li key={j} style={S.li}>
                    <Rich text={p} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );

    case 'originLab':
      return <OriginLab src={block.src} />;

    case 'wangLab':
      return <WangLab src={block.src} a={block.a} b={block.b} />;

    case 'table':
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                {block.head.map((h) => (
                  <th key={h} style={S.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} style={S.td}>
                      <Rich text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export function PhaserSchool() {
  const [activeId, setActiveId] = useState(LESSONS[0].id);
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(done));
  }, [done]);

  const lesson: Lesson = useMemo(
    () => LESSONS.find((l) => l.id === activeId) ?? LESSONS[0],
    [activeId],
  );

  const total = LESSONS.reduce((n, l) => n + l.checkpoint.length, 0);
  const complete = Object.values(done).filter(Boolean).length;

  return (
    <div style={S.shell}>
      {/* ---------------------------------------------- sidebar: the syllabus */}
      <aside style={S.sidebar}>
        <div style={S.brand}>
          <div style={S.brandMark}>PS</div>
          <div>
            <strong style={{ display: 'block', fontSize: 14 }}>Phaser School</strong>
            <span style={{ fontSize: 11, color: '#aaa9bd' }}>World authoring, lesson by lesson</span>
          </div>
        </div>

        <p style={S.navHead}>Syllabus</p>
        {LESSONS.map((l) => {
          const active = l.id === activeId;
          const lDone = l.checkpoint.filter((c) => done[`${l.id}::${c}`]).length;
          return (
            <button
              key={l.id}
              onClick={() => {
                setActiveId(l.id);
                window.scrollTo({ top: 0 });
              }}
              style={{ ...S.navItem, ...(active ? S.navItemActive : null) }}
            >
              <span style={S.navNum}>{l.number}</span>
              <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <span style={{ display: 'block' }}>{l.title}</span>
                <span style={S.navMeta}>
                  {l.status === 'draft' ? 'draft' : `${lDone}/${l.checkpoint.length} · ${l.minutes} min`}
                </span>
              </span>
            </button>
          );
        })}

        <div style={S.sidebarFoot}>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill, width: `${total ? (complete / total) * 100 : 0}%` }} />
          </div>
          <span>
            {complete} of {total} checkpoints
          </span>
        </div>
      </aside>

      {/* ------------------------------------------------------- main column */}
      <main style={S.main}>
        <header style={S.header}>
          <span style={S.eyebrow}>
            Lesson {lesson.number}
            {lesson.status === 'draft' && <span style={S.draftTag}>draft</span>}
          </span>
          <h1 style={S.h1}>{lesson.title}</h1>
          <p style={S.outcome}>
            <strong style={{ color: '#2fe5a7' }}>You will be able to — </strong>
            {lesson.outcome}
          </p>
          <span style={S.time}>≈ {lesson.minutes} minutes at the keyboard</span>
        </header>

        {/* Table of contents — inline on the page, not only in the sidebar, so
            it survives an export to a static file later. */}
        <nav style={S.toc}>
          <p style={S.tocHead}>On this page</p>
          <ol style={S.tocList}>
            {lesson.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${lesson.id}-${s.id}`} style={S.tocLink}>
                  <span style={S.tocNum}>{i + 1}</span>
                  {s.title}
                </a>
              </li>
            ))}
            <li>
              <a href={`#${lesson.id}-checkpoint`} style={S.tocLink}>
                <span style={S.tocNum}>✓</span>
                Checkpoint
              </a>
            </li>
          </ol>
        </nav>

        {lesson.sections.map((s, i) => (
          <section key={s.id} id={`${lesson.id}-${s.id}`} style={S.section}>
            <h2 style={S.h2}>
              <span style={S.h2Num}>{i + 1}</span>
              {s.title}
            </h2>
            {s.blocks.map((b, j) => (
              <div key={j} style={{ marginBottom: 18 }}>
                <BlockView block={b} />
              </div>
            ))}
          </section>
        ))}

        <section id={`${lesson.id}-checkpoint`} style={S.section}>
          <h2 style={S.h2}>
            <span style={{ ...S.h2Num, background: 'rgba(47,229,167,.16)', color: '#2fe5a7' }}>✓</span>
            Checkpoint
          </h2>
          <p style={{ ...S.caption, textAlign: 'left', marginTop: -6 }}>
            Objective and checkable. Tick these off yourself — they persist.
          </p>
          {lesson.checkpoint.map((c) => {
            const k = `${lesson.id}::${c}`;
            return (
              <label key={c} style={{ ...S.check, ...(done[k] ? S.checkDone : null) }}>
                <input
                  type="checkbox"
                  checked={!!done[k]}
                  onChange={(e) => setDone((d) => ({ ...d, [k]: e.target.checked }))}
                  style={{ accentColor: '#2fe5a7', width: 16, height: 16, flexShrink: 0 }}
                />
                <span>
                  <Rich text={c} />
                </span>
              </label>
            );
          })}
        </section>

        <footer style={S.footer}>
          Lessons live in{' '}
          <code style={S.code}>src/pages/dev/phaserSchool/lessons.ts</code> — content is data, so
          this page grows without being rewritten.
        </footer>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ styles */
/* Inline rather than Tailwind: this surface intentionally does NOT inherit the
   game's fantasy theme. It is a studio tool and reads as one, like the wiki. */

const S: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100dvh',
    display: 'grid',
    gridTemplateColumns: '252px minmax(0,1fr)',
    background:
      'radial-gradient(circle at 75% 0, rgba(98,84,255,.09), transparent 32%), #201f30',
    color: '#f7f6ff',
    fontFamily: '"DM Sans", system-ui, sans-serif',
  },
  sidebar: {
    position: 'sticky',
    top: 0,
    height: '100dvh',
    background: '#29283a',
    borderRight: '1px solid #3f3e54',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px 26px' },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(145deg,#8074ff,#4a3cca)',
    boxShadow: '0 8px 30px rgba(98,84,255,.28)',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  navHead: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: '#828097',
    padding: '0 12px',
    margin: '0 0 8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    padding: '10px 12px',
    borderRadius: 9,
    border: 'none',
    background: 'transparent',
    color: '#b8b7c9',
    fontSize: 13,
    margin: '2px 0',
    cursor: 'pointer',
    width: '100%',
  },
  navItemActive: { color: '#fff', background: 'rgba(124,112,255,.18)' },
  navNum: {
    width: 22,
    height: 22,
    borderRadius: 6,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(255,255,255,.06)',
    fontSize: 11,
    flexShrink: 0,
  },
  navMeta: { display: 'block', fontSize: 10.5, color: '#828097', marginTop: 2 },
  sidebarFoot: {
    marginTop: 'auto',
    paddingTop: 14,
    borderTop: '1px solid #3c3b50',
    color: '#bab9c9',
    fontSize: 11,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    background: '#3a394d',
    overflow: 'hidden',
    marginBottom: 7,
  },
  progressFill: { height: '100%', background: '#2fe5a7', transition: 'width .2s' },

  main: { padding: '44px 44px 90px', maxWidth: 880, width: '100%' },
  header: { marginBottom: 30 },
  eyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: '#8d84ff',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  draftTag: {
    background: 'rgba(245,181,68,.16)',
    color: '#f5b544',
    borderRadius: 5,
    padding: '2px 7px',
    letterSpacing: 0,
  },
  h1: { fontSize: 34, margin: '8px 0 12px', lineHeight: 1.15 },
  outcome: { fontSize: 15, color: '#d6d4e8', margin: '0 0 8px', lineHeight: 1.55 },
  time: { fontSize: 12, color: '#828097' },

  toc: {
    background: '#2a2939',
    border: '1px solid #3f3e54',
    borderRadius: 12,
    padding: '16px 18px',
    marginBottom: 34,
  },
  tocHead: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: '#828097',
    margin: '0 0 10px',
  },
  tocList: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 },
  tocLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
    color: '#c4c2d6',
    fontSize: 13.5,
    padding: '5px 0',
  },
  tocNum: {
    width: 20,
    height: 20,
    borderRadius: 5,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(124,112,255,.16)',
    color: '#a89fff',
    fontSize: 11,
    flexShrink: 0,
  },

  section: { marginBottom: 42, scrollMarginTop: 20 },
  h2: { fontSize: 20, display: 'flex', alignItems: 'center', gap: 11, margin: '0 0 16px' },
  h2Num: {
    width: 26,
    height: 26,
    borderRadius: 7,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(124,112,255,.16)',
    color: '#a89fff',
    fontSize: 13,
    flexShrink: 0,
  },

  ul: { margin: 0, paddingLeft: 20, display: 'grid', gap: 7 },
  li: { fontSize: 14, lineHeight: 1.6, color: '#d6d4e8' },
  code: {
    background: 'rgba(255,255,255,.07)',
    borderRadius: 4,
    padding: '1px 5px',
    fontSize: '.88em',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    color: '#c9c3ff',
  },

  termGrid: { display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' },
  term: { background: '#2a2939', border: '1px solid #3f3e54', borderRadius: 10, padding: '12px 14px' },
  termPlain: { fontSize: 13, color: '#d6d4e8', lineHeight: 1.5, margin: '5px 0 0' },
  termWhere: {
    fontSize: 11,
    color: '#828097',
    margin: '6px 0 0',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },

  figure: { margin: 0 },
  caption: { fontSize: 12.5, color: '#9997ad', lineHeight: 1.55, margin: '10px 0 0', textAlign: 'center' },
  gallery: { display: 'flex', flexWrap: 'wrap', gap: 12 },
  galleryCell: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 168 },
  galleryFrame: {
    width: '100%',
    height: 160,
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(#23222f,#1b1a26)',
    border: '1px solid #3f3e54',
    borderRadius: 10,
    padding: 8,
  },
  galleryLabel: { fontSize: 12.5, color: '#e6e4f5' },
  gallerySub: { fontSize: 11, color: '#828097', textAlign: 'center' },

  steps: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 },
  step: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  pill: {
    fontSize: 10.5,
    fontWeight: 700,
    borderRadius: 5,
    padding: '3px 8px',
    flexShrink: 0,
    width: 68,
    textAlign: 'center',
    marginTop: 1,
  },
  see: { fontSize: 12.5, color: '#9997ad', marginTop: 4 },

  try: {
    background: 'rgba(47,229,167,.06)',
    border: '1px solid rgba(47,229,167,.24)',
    borderRadius: 12,
    padding: '16px 18px',
  },
  tryHead: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  tryTag: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    background: 'rgba(47,229,167,.16)',
    color: '#2fe5a7',
    borderRadius: 5,
    padding: '3px 8px',
  },
  tryList: { margin: 0, paddingLeft: 20, fontSize: 13.5, color: '#d6d4e8', lineHeight: 1.55 },
  proves: { fontSize: 13, color: '#b9b7cc', lineHeight: 1.6, margin: '12px 0 0' },

  callout: { borderLeft: '3px solid', borderRadius: '0 10px 10px 0', padding: '13px 16px' },
  calloutTag: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 5,
  },
  calloutTitle: { display: 'block', fontSize: 14.5, marginBottom: 5 },
  calloutText: { fontSize: 13.5, color: '#d6d4e8', lineHeight: 1.6, margin: 0 },

  compare: { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))' },
  compareCol: { background: '#2a2939', border: '1px solid', borderRadius: 10, padding: '14px 16px' },

  table: { borderCollapse: 'collapse', width: '100%', fontSize: 13.5 },
  th: {
    textAlign: 'left',
    padding: '9px 12px',
    color: '#828097',
    fontSize: 11,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    borderBottom: '1px solid #4a4960',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #35344a', color: '#d6d4e8', lineHeight: 1.5 },

  lab: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 22,
    background: '#2a2939',
    border: '1px solid #3f3e54',
    borderRadius: 12,
    padding: 18,
  },
  labStage: {
    position: 'relative',
    background: 'linear-gradient(#23222f,#1b1a26)',
    border: '1px solid #3f3e54',
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    background: 'repeating-linear-gradient(90deg,#5a5870 0 6px,transparent 6px 12px)',
  },
  groundLabel: { position: 'absolute', left: 6, fontSize: 10, color: '#6c6a80' },
  anchorDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#f5b544',
    boxShadow: '0 0 0 2px rgba(0,0,0,.5), 0 0 10px rgba(245,181,68,.7)',
  },
  labHead: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: '#828097',
    margin: '0 0 9px',
  },
  originBtn: {
    background: 'rgba(255,255,255,.05)',
    border: '1px solid #3f3e54',
    color: '#b8b7c9',
    borderRadius: 7,
    padding: '6px 10px',
    fontSize: 11.5,
    cursor: 'pointer',
  },
  originBtnOn: { background: 'rgba(124,112,255,.2)', borderColor: '#7c70ff', color: '#fff' },
  sliderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#aaa9bd',
    marginBottom: 4,
  },
  readout: {
    background: 'rgba(245,181,68,.08)',
    border: '1px solid rgba(245,181,68,.25)',
    borderRadius: 7,
    padding: '8px 11px',
    fontSize: 12.5,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    marginTop: 4,
  },
  labNote: { fontSize: 12, color: '#9997ad', lineHeight: 1.55, margin: '9px 0 0' },

  wangGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(78px,78px))', gap: 10 },
  wangCell: {
    border: '1px solid',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#1b1a26',
    transition: 'border-color .15s',
  },
  wangMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 6px',
    fontSize: 11,
  },
  wangBits: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 9.5,
    color: '#828097',
    letterSpacing: '.06em',
  },
  wangKey: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    fontSize: 12,
    color: '#b8b7c9',
    marginTop: 12,
    alignItems: 'center',
  },
  keyDot: {
    display: 'inline-block',
    width: 9,
    height: 9,
    borderRadius: '50%',
    marginRight: 6,
    border: '1.5px solid rgba(0,0,0,.5)',
  },

  check: {
    display: 'flex',
    gap: 11,
    alignItems: 'flex-start',
    background: '#2a2939',
    border: '1px solid #3f3e54',
    borderRadius: 9,
    padding: '11px 14px',
    marginBottom: 8,
    fontSize: 13.5,
    color: '#d6d4e8',
    cursor: 'pointer',
    lineHeight: 1.5,
  },
  checkDone: { color: '#828097', textDecoration: 'line-through', borderColor: 'rgba(47,229,167,.3)' },

  footer: { fontSize: 12, color: '#828097', borderTop: '1px solid #3c3b50', paddingTop: 16 },
};
