import { useState } from 'react';
import {
  BATCH_A,
  BATCH_B,
  KEPT,
  KEPT_WATER,
  REJECTED_COUNT,
  TOTAL_GENERATIONS,
  type ArtCandidate,
} from './artCandidates';
import { MATERIAL_KITS } from '../../data/combat/performance/materialKits';

/**
 * The generated-art gallery — the pieces we KEPT, in the order they play.
 *
 * ## Why rejects are not shown
 *
 * They were, and it made the page worse. Scrolling past four versions of the
 * same failure is not review; the lesson is stated once and the rest is
 * clutter. Rejected candidates stay in `artCandidates.ts` with their full
 * provenance — that record is what stops us re-running a failed experiment —
 * but the gallery presents the finished performance, not its history.
 *
 * ## Why it is ordered charge → blast → impact
 *
 * Because that is the order the player sees them in. Grouping by "batch" was
 * an accident of how the work happened, which is meaningless to anyone
 * reviewing the result.
 *
 * One of the three costs nothing: the charge tell is drawn in code from the
 * material kit, so every element gets one free. That is worth seeing next to
 * the pieces that did cost generations.
 */

export function ArtCandidatePanel() {
  const [zoom, setZoom] = useState(2);
  const [showTiling, setShowTiling] = useState(true);

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-fantasy text-lg text-parchment">
          Blood — the three parts of a performance
        </h2>
        <p className="text-sm text-bone/70 max-w-3xl mt-1">
          In the order they play: the material <strong>gathers</strong> on the card, the
          <strong> stream</strong> crosses to the boss, and the <strong>splash</strong> lands and
          stays. {TOTAL_GENERATIONS} generations spent in total, {REJECTED_COUNT} candidates
          rejected along the way and not shown.
        </p>
      </div>

      <div className="flex gap-2 items-center mb-5">
        <span className="text-xs text-bone/50">Zoom</span>
        {[1, 2, 4, 6].map((z) => (
          <button key={z} onClick={() => setZoom(z)} className={z === zoom ? btnOn : btn}>
            {z}×{z === 1 ? ' (in game)' : ''}
          </button>
        ))}
        <button onClick={() => setShowTiling((v) => !v)} className={showTiling ? btnOn : btn}>
          Tiling test
        </button>
      </div>

      <div className="space-y-5">
        <ChargeCard element="Blood" />
        {KEPT.map((c) => (
          <CandidateCard key={c.id} candidate={c} zoom={zoom} showTiling={showTiling} />
        ))}
      </div>

      <div className="mt-10 mb-5 pt-6 border-t border-bone/15">
        <h2 className="font-fantasy text-lg text-parchment">Water — the same three parts</h2>
        <p className="text-sm text-bone/70 max-w-3xl mt-1">
          Four generations, and <strong>not one line of code changed</strong> to support it — a
          new element is a manifest entry, because the renderers read the material rather than
          hard-coding it. Compare the shapes against Blood above with the colour off: rolling
          foam crests versus a smooth beaded band, an upward crown versus a flat radial splatter.
        </p>
        <div className="space-y-5 mt-4">
          <ChargeCard element="Water" />
          {KEPT_WATER.map((c) => (
            <CandidateCard key={c.id} candidate={c} zoom={zoom} showTiling={showTiling} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The charge tell has no image, because it has no image — it is drawn from the
 * material kit. Shown alongside the generated pieces because it is one of the
 * three parts, and because "this one was free and always will be" is the most
 * useful fact on the page.
 */
function ChargeCard({ element }: { element: 'Blood' | 'Water' }) {
  const kit = MATERIAL_KITS[element];
  const [core, edge, accent] = kit.palette;
  const drips = kit.residue === 'dripping';

  return (
    <section className="rounded border border-emerald-400/50 bg-void/40 p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-fantasy text-base text-parchment">1 · Charge — the gathering</h3>
          <p className="text-sm text-bone/80 mt-1 max-w-2xl">
            {element} pools at the card's edge before anything fires, and the stream then shoots
            through it. It also holds indefinitely while other cards are still choosing.
          </p>
        </div>
        <span className="shrink-0 text-xs font-fantasy px-2.5 py-1 rounded bg-emerald-400/20 text-emerald-100">
          ✓ in the game
        </span>
      </div>

      <div className="flex gap-5 mt-4 items-start flex-wrap">
        <figure className="m-0">
          <div
            className="rounded border border-bone/20 flex items-center justify-center"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, #241a2e 0%, #0b0910 70%)',
              width: 180,
              height: 120,
            }}
          >
            {/* The same shapes ChargeTell draws, held still. */}
            <svg width={120} height={70} viewBox="0 0 100 60">
              <ellipse cx={50} cy={38} rx={44} ry={17} fill={core} opacity={0.85} />
              <ellipse cx={50} cy={33} rx={30} ry={11} fill={edge} opacity={0.9} />
              <ellipse cx={39} cy={28} rx={10} ry={4} fill={accent} opacity={0.75} />
              {/* Only materials that drip get drips — Blood does, Water does not. */}
              {drips && (
                <>
                  <circle cx={32} cy={52} r={2.6} fill={edge} />
                  <circle cx={54} cy={55} r={2.6} fill={edge} />
                </>
              )}
            </svg>
          </div>
          <figcaption className="text-[10px] text-bone/45 mt-1.5 text-center">
            pool + wet highlight + drips
          </figcaption>
        </figure>

        <p className="text-sm text-bone/85 max-w-md leading-relaxed">
          <span className="text-emerald-300 font-semibold">Cost: 0 generations.</span> This is
          drawn in code from the same material kit that drives everything else — the pool shape,
          the highlight and the drips all come from Blood being{' '}
          <code className="text-bone/60">dripping</code> and a{' '}
          <code className="text-bone/60">coiling_ribbon</code>. Water will pool and swirl without
          dripping; Fire will build an ember bed. No art needed, for any element, ever.
        </p>
      </div>

      <p className="text-[10px] font-mono text-bone/35 mt-3">
        code · pages/battle/performance/ChargeTell.tsx · 0 generations
      </p>
    </section>
  );
}

function CandidateCard({
  candidate: c,
  zoom,
  showTiling,
}: {
  candidate: ArtCandidate;
  zoom: number;
  showTiling: boolean;
}) {
  return (
    <section className="rounded border border-emerald-400/50 bg-void/40 p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-fantasy text-base text-parchment">{c.label}</h3>
          <p className="text-sm text-bone/80 mt-1 max-w-2xl">{c.what}</p>
        </div>
        <span className="shrink-0 text-xs font-fantasy px-2.5 py-1 rounded bg-emerald-400/20 text-emerald-100">
          ✓ in the game
        </span>
      </div>

      <div className="flex gap-5 mt-4 flex-wrap items-start">
        <figure className="m-0">
          <div
            className="rounded border border-bone/20 p-3 flex items-center justify-center"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, #241a2e 0%, #0b0910 70%)',
              minWidth: 120,
              minHeight: 120,
            }}
          >
            <img
              src={c.file}
              width={c.size * zoom}
              height={c.size * zoom}
              alt={c.label}
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <figcaption className="text-[10px] text-bone/45 mt-1.5 text-center">
            {zoom}× on arena
          </figcaption>
        </figure>

        <figure className="m-0">
          <div className="flex gap-1.5">
            {['#0b0910', '#6b5f7a', '#f2ece0'].map((bg) => (
              <div key={bg} className="rounded p-2" style={{ background: bg }}>
                <img
                  src={c.file}
                  width={c.size}
                  height={c.size}
                  alt=""
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            ))}
          </div>
          <figcaption className="text-[10px] text-bone/45 mt-1.5 text-center">
            cutout on dark / mid / light
          </figcaption>
        </figure>

        {showTiling && c.tileable && (
          <figure className="m-0">
            <TilingTest file={c.file} />
            <figcaption className="text-[10px] text-bone/45 mt-1.5">
              9× along the real beam — this is how the stream is built
            </figcaption>
          </figure>
        )}
      </div>

      <p className="text-sm text-bone/85 mt-4 max-w-3xl leading-relaxed">{c.why}</p>

      <p className="text-[10px] font-mono text-bone/35 mt-3">
        {c.provenance.tool} · job {c.provenance.jobId} · seed {c.provenance.seed} ·{' '}
        {c.provenance.generationCost} generation
        {c.provenance.generationCost === 1 ? '' : 's'} · {c.size}px
      </p>
    </section>
  );
}

/** Nine copies along the beam curve, each rotated to follow the tangent. */
function TilingTest({ file }: { file: string }) {
  const W = 420;
  const H = 140;
  const N = 9;

  const at = (t: number) => {
    const x0 = 26, y0 = 108, x1 = W - 26, y1 = 34;
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2 - 40;
    const u = 1 - t;
    return {
      x: u * u * x0 + 2 * u * t * mx + t * t * x1,
      y: u * u * y0 + 2 * u * t * my + t * t * y1,
    };
  };

  let d = '';
  for (let i = 0; i <= 40; i++) {
    const p = at(i / 40);
    d += `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
  }

  return (
    <div
      className="relative rounded border border-bone/20"
      style={{
        width: W,
        height: H,
        background: 'radial-gradient(ellipse at 50% 30%, #241a2e 0%, #0b0910 70%)',
      }}
    >
      <svg width={W} height={H} className="absolute inset-0">
        <path d={d} fill="none" stroke="#ffffff22" strokeWidth={11} />
      </svg>
      {Array.from({ length: N }, (_, i) => {
        const t = i / (N - 1);
        const p = at(t);
        const a = at(Math.min(1, t + 0.02));
        const ang = (Math.atan2(a.y - p.y, a.x - p.x) * 180) / Math.PI;
        return (
          <img
            key={i}
            src={file}
            width={32}
            height={32}
            alt=""
            style={{
              position: 'absolute',
              left: p.x - 16,
              top: p.y - 16,
              transform: `rotate(${ang}deg)${i % 2 ? ' scaleX(-1)' : ''}`,
              imageRendering: 'pixelated',
            }}
          />
        );
      })}
    </div>
  );
}

/* Referenced so the rejected records stay reachable from this module rather
 * than becoming dead data nobody can find. */
void BATCH_A;
void BATCH_B;

const btn =
  'px-2.5 py-1 rounded text-xs font-fantasy border border-bone/25 bg-void/50 hover:bg-void/80 transition-colors';
const btnOn =
  'px-2.5 py-1 rounded text-xs font-fantasy border border-amber-400/60 bg-amber-400/20 text-amber-100';
