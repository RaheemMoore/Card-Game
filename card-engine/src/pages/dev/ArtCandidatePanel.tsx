import { useState } from 'react';
import {
  BATCH_A,
  BATCH_B,
  KEPT_BY_ELEMENT,
  REJECTED_COUNT,
  TOTAL_GENERATIONS,
  type ArtCandidate,
  type KeptElement,
} from './artCandidates';
import { MATERIAL_KITS } from '../../data/combat/performance/materialKits';
import { ChargeShapeScaled } from '../battle/performance/chargeShapes';

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
  /*
   * Defaults to the NEWEST element, not to "all".
   *
   * The complaint that prompted this was not really about filtering — it was
   * "I have to scroll all the way to the bottom to see what you're generating
   * now." A filter alone would not have fixed that; opening on the most recent
   * element does. `All` is one click away for comparing across materials,
   * which is the other thing this page is for.
   */
  const [filter, setFilter] = useState<string>(
    KEPT_BY_ELEMENT[KEPT_BY_ELEMENT.length - 1]?.element ?? 'all',
  );

  const shown =
    filter === 'all'
      ? KEPT_BY_ELEMENT
      : KEPT_BY_ELEMENT.filter((g) => g.element === filter);

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-fantasy text-lg text-parchment">Generated art</h2>
        <p className="text-sm text-bone/70 max-w-3xl mt-1">
          Each element in the order its parts play: the material <strong>gathers</strong> on the
          card, the <strong>stream</strong> crosses to the boss, and the <strong>splash</strong>{' '}
          lands and stays. {TOTAL_GENERATIONS} generations spent in total, {REJECTED_COUNT}{' '}
          candidates rejected along the way and not shown.
        </p>
        <p className="text-sm mt-3 max-w-3xl border-l-2 border-amber-400/60 bg-amber-400/10 px-3 py-2 rounded-r text-bone/90">
          Switch to <strong>All</strong> above, turn <strong>Hide colour</strong> on in the
          Performances tab, and compare the streams and splashes against each other. If they are
          still distinct things in greyscale, the material axis is doing its job and colour is
          only reinforcing it — which is the Bible rule this was all built to satisfy.
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

      <div className="flex gap-2 items-center mb-5 flex-wrap">
        <span className="text-xs text-bone/50">Element</span>
        {KEPT_BY_ELEMENT.map((g, i) => (
          <button
            key={g.element}
            onClick={() => setFilter(g.element)}
            className={filter === g.element ? btnOn : btn}
          >
            {g.element}
            {i === KEPT_BY_ELEMENT.length - 1 && (
              <span className="text-amber-300/80"> · newest</span>
            )}
          </button>
        ))}
        <button onClick={() => setFilter('all')} className={filter === 'all' ? btnOn : btn}>
          All ({KEPT_BY_ELEMENT.length}) — compare
        </button>
      </div>

      {shown.map((group, i) => (
        <section key={group.element} className={i === 0 ? '' : 'mt-10 pt-6 border-t border-bone/15'}>
          <h2 className="font-fantasy text-lg text-parchment">
            {group.element} — the three parts of a performance
          </h2>
          <p className="text-sm text-bone/70 max-w-3xl mt-1 mb-4">
            {group.note}{' '}
            <span className="text-bone/50">
              {group.generations} generations{i > 0 ? ', no code changed' : ''}.
            </span>
          </p>
          <div className="space-y-5">
            <ChargeCard element={group.element} />
            {group.candidates.map((c) => (
              <CandidateCard key={c.id} candidate={c} zoom={zoom} showTiling={showTiling} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * The charge tell has no image, because it has no image — it is drawn from the
 * material kit. Shown alongside the generated pieces because it is one of the
 * three parts, and because "this one was free and always will be" is the most
 * useful fact on the page.
 */
/** How each gathering form is described in prose. Keeps the copy honest as
 *  new charge forms are added — a flame does not "pool". */
const GATHER_VERB: Record<string, string> = {
  pool: 'pools',
  flame: 'catches and flickers',
  ground: 'stirs the ground',
  bloom: 'grows and blooms',
  halo: 'gathers into a ring',
  motes: 'condenses',
};

function ChargeCard({ element }: { element: KeptElement['element'] }) {
  const kit = MATERIAL_KITS[element];
  const [core, edge, accent] = kit.palette;
  const drips = kit.residue === 'dripping';

  return (
    <section className="rounded border border-emerald-400/50 bg-void/40 p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-fantasy text-base text-parchment">1 · Charge — the gathering</h3>
          <p className="text-sm text-bone/80 mt-1 max-w-2xl">
            {element} {GATHER_VERB[kit.chargeForm]} at the card's edge before anything fires, and
            the delivery then comes out of it. It also holds indefinitely while the other cards
            are still choosing.
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
            {/*
              Literally the same component the game renders, held still.
              It used to be a hand-copied pool drawn for EVERY element, so this
              page showed Shadow as a puddle while the theater showed motes —
              a review tool confidently displaying something other than the
              thing under review. Sharing the geometry makes that impossible.
            */}
            <svg width={130} height={78} viewBox="0 0 100 60" style={{ overflow: 'visible' }}>
              <ChargeShapeScaled
                form={kit.chargeForm}
                heavy={drips}
                core={core}
                edge={edge}
                accent={accent}
              />
              {/* Only materials that drip get drips — Blood does, Water does not. */}
              {drips && (
                <>
                  <circle cx={32} cy={55} r={2.6} fill={edge} />
                  <circle cx={54} cy={58} r={2.6} fill={edge} />
                </>
              )}
            </svg>
          </div>
          <figcaption className="text-[10px] text-bone/45 mt-1.5 text-center">
            {`${kit.chargeForm} — the same shape the game draws`}
          </figcaption>
        </figure>

        <p className="text-sm text-bone/85 max-w-md leading-relaxed">
          <span className="text-emerald-300 font-semibold">Cost: 0 generations.</span> Drawn in
          code from the same material kit that drives everything else — this one is a{' '}
          <code className="text-bone/60">{kit.silhouette}</code> whose residue is{' '}
          <code className="text-bone/60">{kit.residue}</code>, which is why it{' '}
          {drips ? 'hangs and drips' : 'gathers without dripping'}. Every element gets a charge
          tell for free, including ones nobody has generated art for yet.
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
