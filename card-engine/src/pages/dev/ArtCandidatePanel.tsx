import { useState } from 'react';
import { BATCH_A, BATCH_A_COST, BATCH_A_FINDING, type ArtCandidate } from './artCandidates';

/**
 * The generated-art review gallery inside the Ability Theater.
 *
 * Built so a piece can be judged rather than merely admired. Three things are
 * shown for every candidate, because each answers a different question:
 *
 *  - **At 1×, on the arena background.** This is the size it actually appears
 *    in combat. A piece that only reads at 4× does not work, because the game
 *    never draws it at 4×.
 *  - **The tiling test**, for anything meant to repeat along the lash path.
 *    Nine copies laid along the real spline, next to the procedural stroke they
 *    would replace. This is where a "segment" that is secretly a finished
 *    object gives itself away — the closed ends collide instead of joining.
 *  - **Alpha on three backgrounds.** A grey fringe that shows on light but not
 *    on dark is a semi-transparent halo that will glow wrongly over a bright
 *    arena.
 *
 * Every card carries what the piece is for, what it was testing, what it cost,
 * and my verdict with reasoning — stated plainly so it can be argued with.
 */

export function ArtCandidatePanel() {
  const [zoom, setZoom] = useState(2);
  const [showTiling, setShowTiling] = useState(true);

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-fantasy text-lg text-parchment">Batch A — first generated pieces</h2>
        <p className="text-sm text-bone/70 max-w-3xl mt-1">
          Six probes, {BATCH_A_COST} generations total. These were deliberately cheap: the
          question was not “which material looks best” but whether generated pixel art sits
          convincingly on top of the code-drawn shapes the system already renders.
        </p>
        <p className="text-sm mt-3 max-w-3xl border-l-2 border-amber-400/60 bg-amber-400/10 px-3 py-2 rounded-r">
          <span className="text-amber-200 font-semibold">What I think this batch proved: </span>
          <span className="text-bone/90">{BATCH_A_FINDING}</span>
        </p>
      </div>

      <div className="flex gap-2 items-center mb-4">
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
        {BATCH_A.map((c) => (
          <CandidateCard key={c.id} candidate={c} zoom={zoom} showTiling={showTiling} />
        ))}
      </div>
    </div>
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
  const tone =
    c.verdict === 'recommend'
      ? { border: 'border-emerald-400/50', chip: 'bg-emerald-400/20 text-emerald-100', label: '✓ I recommend this' }
      : c.verdict === 'reject'
        ? { border: 'border-rose-400/40', chip: 'bg-rose-400/20 text-rose-100', label: '✕ I’d reject this' }
        : { border: 'border-amber-400/50', chip: 'bg-amber-400/20 text-amber-100', label: '? Your call' };

  return (
    <section className={`rounded border ${tone.border} bg-void/40 p-4`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-fantasy text-base text-parchment">{c.label}</h3>
          <p className="text-sm text-bone/80 mt-1 max-w-2xl">{c.what}</p>
          <p className="text-xs text-bone/50 mt-1 max-w-2xl">
            <span className="text-bone/40">Testing: </span>
            {c.testing}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-fantasy px-2.5 py-1 rounded ${tone.chip}`}>
          {tone.label}
        </span>
      </div>

      <div className="flex gap-5 mt-4 flex-wrap items-start">
        {/* At scale, on the real arena background. */}
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

        {/* Alpha check. */}
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
              9× along the real lash curve — faint band is the code-drawn body it would replace
            </figcaption>
          </figure>
        )}
      </div>

      <p className="text-sm text-bone/85 mt-4 max-w-3xl leading-relaxed">{c.why}</p>

      <p className="text-[10px] font-mono text-bone/35 mt-3">
        {c.provenance.tool} · job {c.provenance.jobId} · seed {c.provenance.seed} ·{' '}
        {c.provenance.generationCost} generation · {c.size}×{c.size}
      </p>
    </section>
  );
}

/**
 * Nine copies laid along the same quadratic the lash renderer uses, each
 * rotated to follow the tangent. The procedural stroke is drawn underneath so
 * the comparison is direct: this is the thing the pieces would be replacing.
 */
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
        <path d={d} fill="none" stroke="#c8203a" strokeWidth={3} />
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
              transform: `rotate(${ang}deg)`,
              imageRendering: 'pixelated',
            }}
          />
        );
      })}
    </div>
  );
}

const btn =
  'px-2.5 py-1 rounded text-xs font-fantasy border border-bone/25 bg-void/50 hover:bg-void/80 transition-colors';
const btnOn =
  'px-2.5 py-1 rounded text-xs font-fantasy border border-amber-400/60 bg-amber-400/20 text-amber-100';
