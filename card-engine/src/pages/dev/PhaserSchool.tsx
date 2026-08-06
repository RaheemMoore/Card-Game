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
