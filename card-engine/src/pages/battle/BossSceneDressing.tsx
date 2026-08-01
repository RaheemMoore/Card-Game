import type { SceneDressingSpec } from '../../data/combat/bossSignatureManifest';
import type { MotionLevel } from '../../vfx/types';

/**
 * Atmosphere for a boss's arena: overgrowth, the light he throws, shafts and
 * drifting motes. Not the boss, not an attack, and not the arena plate.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * The first assembled Still Season scene got the note "it's just very grey, it
 * doesn't feel very druid". Three causes, and none of them was the arena's
 * fault:
 *
 *  1. Nothing in frame was ALIVE except the boss. A ruined stone bowl is grey
 *     because stone is grey.
 *  2. Nothing MOVED except the boss, so the scene read as a still photograph
 *     with a sprite pasted on.
 *  3. Nothing was lit by anything the boss was doing.
 *
 * ── The rule this layer is built on ──────────────────────────────────────
 * A green colour grade on the arena was tried first and rejected, correctly:
 *
 *   "Making the stone the colour of moss doesn't make the environment more
 *    nature-like. That would be including more plants or more overgrowth —
 *    actually changing the image, not just tinting the stones."
 *
 * So the greenery here is CONTENT — real plant plates, cut from the boss's own
 * concept art and draped over the stone. A grade cannot add a subject. The only
 * coloured light in this file is the `wash`, and that is not a tint standing in
 * for foliage; it is the boss's own glow falling on the room.
 *
 * Everything here costs zero generations: the plates come out of the source
 * painting, and the shafts, motes and wash are drawn in CSS.
 */
interface Props {
  spec: SceneDressingSpec;
  resolveUrl: (path: string) => string;
  motionLevel: MotionLevel;
  /** Drives the wash: the room brightens as he gathers an attack. */
  charging?: boolean;
  defeated?: boolean;
}

/**
 * Where the overgrowth hangs. Hand-placed rather than evenly spaced — a drape
 * repeated on a regular pitch reads as wallpaper, and the whole point is that
 * the forest arrived here without a plan. Mirrored pairs are deliberately NOT
 * exact mirrors (differing scale and depth) for the same reason.
 */
const DRAPES = [
  // Upper corners — these also do the HUD's job of keeping those panels dark.
  { left: -6, top: -8, w: 44, flip: false, depth: 1.0, delay: 0 },
  { left: 64, top: -10, w: 42, flip: true, depth: 0.95, delay: -3.1 },
  // MID-TIERS. The first pass put everything at the top and the middle of the
  // bowl stayed bare stone — which is the whole complaint, since the overgrowth
  // is what makes the place read as reclaimed rather than merely ruined. The
  // forest has to be growing THROUGH the seating, not perched above it.
  { left: 8, top: 16, w: 30, flip: true, depth: 0.72, delay: -5.4 },
  { left: 58, top: 12, w: 32, flip: false, depth: 0.78, delay: -1.8 },
  { left: 30, top: 26, w: 24, flip: false, depth: 0.55, delay: -6.7 },
  { left: 74, top: 30, w: 26, flip: true, depth: 0.6, delay: -4.2 },
  { left: -4, top: 34, w: 26, flip: false, depth: 0.5, delay: -8.9 },
  { left: 44, top: 36, w: 20, flip: true, depth: 0.42, delay: -2.6 },
];

export function BossSceneDressing({
  spec,
  resolveUrl,
  motionLevel,
  charging = false,
  defeated = false,
}: Props) {
  const still = motionLevel === 'off';
  const { throne: _throne, growth, wash, shafts, motes } = spec;

  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* HE LIGHTS THE ROOM. Sits under the growth so the plants are lit by it
          rather than pasted over it. Brightens while he gathers, so the room
          itself carries the telegraph. */}
      {wash && (
        <div
          className={still ? undefined : `boss-wash${charging ? ' boss-wash-charging' : ''}${defeated ? ' boss-wash-dead' : ''}`}
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse ${wash.radius}% ${wash.radius * 0.8}% at 50% 44%, rgba(${wash.color},${wash.strength}) 0%, rgba(${wash.color},${wash.strength * 0.45}) 38%, rgba(${wash.color},0) 72%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* OVERGROWTH — real plant plates cut from the concept art. This is the
          layer that actually answers "make it feel druidic"; the arena stays
          honest stone underneath it. */}
      {growth &&
        DRAPES.map((d, i) => (
          <img
            key={i}
            src={resolveUrl(growth.path)}
            alt=""
            draggable={false}
            className={still ? undefined : 'boss-drape'}
            style={{
              position: 'absolute',
              left: `${d.left}%`,
              top: `${d.top}%`,
              width: `${d.w * growth.scale}%`,
              height: 'auto',
              // Farther drapes are dimmer and cooler, so the overgrowth has
              // depth instead of reading as one flat sticker sheet.
              opacity: growth.opacity * d.depth,
              filter: `brightness(${0.5 + d.depth * 0.5}) saturate(${0.7 + d.depth * 0.5})`,
              transform: d.flip ? 'scaleX(-1)' : undefined,
              transformOrigin: '50% 0%',
              animationDelay: `${d.delay}s`,
            }}
          />
        ))}

      {/* LIGHT SHAFTS. One repeating-gradient, skewed. Cheapest possible way to
          turn a quarry into a forest interior. */}
      {shafts && (
        <div
          className={still ? undefined : 'boss-shafts'}
          style={{
            position: 'absolute',
            inset: '-20% -30%',
            transform: `rotate(${shafts.tiltDeg}deg)`,
            background: `repeating-linear-gradient(90deg,
              rgba(${shafts.color},0) 0px,
              rgba(${shafts.color},0) 60px,
              rgba(${shafts.color},0.055) 82px,
              rgba(${shafts.color},0.11) 96px,
              rgba(${shafts.color},0.055) 110px,
              rgba(${shafts.color},0) 132px)`,
            // Fade out before the floor: a shaft that reaches the ground looks
            // like a wall, and the lower third has to stay low contrast for the
            // party to read against.
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.75) 42%, rgba(0,0,0,0) 78%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.75) 42%, rgba(0,0,0,0) 78%)',
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* GROUND CHARGE — light coming UP out of the floor while he gathers.
          Only exists during a charge, and that is the whole idea: the room is
          inert until he does something, and then the ground itself answers. It
          also solves a staging problem — everything else he does happens at head
          height (halo, core, skull), so the lower half of the frame had no part
          in his biggest moments. Columns rise and FADE IN rather than sliding on
          from off-screen; light that arrives by travelling reads as a projectile,
          light that arrives by appearing reads as something surfacing. */}
      {charging &&
        !still &&
        Array.from({ length: 14 }).map((_, i) => {
          // Clustered around him and thinning outward, so the source reads as
          // the boss rather than as an evenly-lit floor.
          const t = (i / 13) * 2 - 1;
          const x = 50 + Math.sign(t) * Math.abs(t) ** 1.6 * 34;
          // Heights vary widely and irregularly. Similar heights on a regular
          // pitch read as a bar chart, which is what the first pass looked like.
          const h = 5 + ((i * 37) % 13) * 1.9;
          // NOT the wash colour. `150,255,110` is a pale green whose red and
          // blue channels are both high, so once these overlap and bloom they
          // desaturate straight to white — which is exactly how they read.
          // A deeper green with the off-channels pulled down survives stacking.
          const c = '70,225,60';
          return (
            <span
              key={`gc${i}`}
              className="boss-ground-column"
              style={{
                position: 'absolute',
                left: `${x}%`,
                bottom: `${5 + ((i * 7) % 6)}%`,
                // Narrower and heavily blurred. The first pass was wide and
                // lightly blurred, so the columns stacked into solid WHITE bars
                // — a saturated colour at high alpha plus a hard edge blows out
                // to white the moment two of them overlap. Thin + soft + lower
                // alpha keeps them reading as light instead of as geometry.
                width: `${0.5 + ((i * 5) % 3) * 0.28}%`,
                height: `${h}%`,
                translate: '-50% 0',
                background: `linear-gradient(to top, rgba(${c},0.85) 0%, rgba(${c},0.5) 40%, rgba(${c},0) 100%)`,
                filter: 'blur(4px)',
                animationDelay: `${(i % 7) * 0.11}s`,
              }}
            />
          );
        })}

      {/* PINK DOTS surfacing in the floor around him — his blight answering the
          call. Deliberately magenta against the green columns: two different
          things waking up, not one effect in one colour. */}
      {charging &&
        !still &&
        Array.from({ length: 44 }).map((_, i) => {
          // Two interleaved sequences with coprime strides, so the field looks
          // scattered rather than banded. A single stride against a fixed count
          // lays dots on visible diagonals.
          const x = 50 + (((i * 37) % 101) - 50) * 1.9;
          const y = 66 + ((i * 23) % 33);
          const s = 4 + ((i * 13) % 7);
          return (
            <span
              key={`gd${i}`}
              className="boss-ground-dot"
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                width: `${s}px`,
                height: `${s}px`,
                borderRadius: '50%',
                background: 'rgba(255,120,215,0.95)',
                boxShadow: `0 0 ${s * 3}px rgba(255,60,190,0.95), 0 0 ${s * 7}px rgba(255,40,170,0.55)`,
                animationDelay: `${(i % 13) * 0.075}s`,
              }}
            />
          );
        })}

      {/* MOTES. The air had nothing in it, which is most of why the scene read
          as a photograph. Deterministic positions — no Math.random(), because a
          replay of the same fight should look identical. */}
      {motes &&
        Array.from({ length: motes.count }).map((_, i) => {
          const x = ((i * 37) % 100) + ((i % 3) - 1) * 1.5;
          const y = ((i * 61) % 78) + 8;
          const size = 1.5 + ((i * 7) % 5) * 0.7;
          return (
            <span
              key={i}
              className={still ? undefined : 'boss-mote'}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                background: `rgba(${motes.color},0.75)`,
                boxShadow: `0 0 ${size * 3}px rgba(${motes.color},0.6)`,
                animationDelay: `${-(i * 1.7) % 11}s`,
                animationDuration: `${9 + (i % 5) * 2.4}s`,
              }}
            />
          );
        })}

      <style>{`
        .boss-wash { animation: boss-wash-breathe 4.2s ease-in-out infinite; }
        @keyframes boss-wash-breathe { 0%,100% { opacity: 0.78; } 50% { opacity: 1; } }
        /* The room brightens with him — the telegraph is readable from the
           architecture, not only from the boss. */
        .boss-wash-charging { animation: boss-wash-surge 0.85s ease-in-out infinite alternate !important; }
        @keyframes boss-wash-surge { from { opacity: 1; } to { opacity: 1.9; } }
        .boss-wash-dead { animation: boss-wash-out 1800ms ease-out forwards !important; }
        @keyframes boss-wash-out { to { opacity: 0.08; filter: grayscale(0.9); } }

        /* Drapes sway, they do not translate. A hanging plant pivots from where
           it is attached; moving it bodily would detach it from the stone. */
        .boss-drape {
          animation: boss-drape-sway 13s ease-in-out infinite;
          transform-box: fill-box;
        }
        @keyframes boss-drape-sway {
          0%, 100% { rotate: -0.7deg; }
          50%      { rotate: 0.7deg; }
        }

        .boss-shafts { animation: boss-shafts-drift 24s ease-in-out infinite; }
        @keyframes boss-shafts-drift {
          0%, 100% { opacity: 0.55; translate: 0 0; }
          50%      { opacity: 0.85; translate: 14px 0; }
        }

        /* Columns FADE UP in place and keep breathing while the charge holds.
           A one-shot rise, then a held shimmer — a telegraph can span several
           hero turns, so it must not finish and vanish.
           (No backticks in comments inside this template literal: they close
           the string and produce a wall of JSX parse errors.) */
        .boss-ground-column {
          transform-origin: 50% 100%;
          animation: boss-gc-rise 620ms ease-out forwards,
                     boss-gc-hold 1.1s ease-in-out 620ms infinite alternate;
        }
        /* FLASHES up rather than easing up. It overshoots bright and settles —
           a light that fades in evenly reads as a fade, a light that punches
           past its resting value reads as ignition. */
        @keyframes boss-gc-rise {
          0%   { opacity: 0;    scale: 1 0.1;  filter: blur(4px) brightness(1); }
          55%  { opacity: 1;    scale: 1 1.12; filter: blur(4px) brightness(2.6); }
          100% { opacity: 0.85; scale: 1 1;    filter: blur(4px) brightness(1.6); }
        }
        @keyframes boss-gc-hold {
          from { opacity: 0.6;  filter: blur(4px) brightness(1.35); }
          to   { opacity: 1;    filter: blur(4px) brightness(2.3); }
        }

        .boss-ground-dot {
          animation: boss-gd-surface 520ms ease-out forwards,
                     boss-gd-pulse 1.4s ease-in-out 520ms infinite alternate;
        }
        @keyframes boss-gd-surface {
          from { opacity: 0; scale: 0.2; }
          to   { opacity: 1; scale: 1; }
        }
        @keyframes boss-gd-pulse {
          from { opacity: 0.55; }
          to   { opacity: 1; }
        }

        .boss-mote { animation-name: boss-mote-drift; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        @keyframes boss-mote-drift {
          0%   { translate: 0 0;     opacity: 0; }
          15%  { opacity: 0.9; }
          85%  { opacity: 0.7; }
          100% { translate: 14px -46px; opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .boss-wash, .boss-wash-charging, .boss-wash-dead,
          .boss-drape, .boss-shafts, .boss-mote {
            animation: none !important;
          }
          /* The ground charge is a TELEGRAPH, so it still has to be visible —
             it just arrives already risen instead of rising. */
          .boss-ground-column { animation: none !important; opacity: 0.85; }
          .boss-ground-dot { animation: none !important; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
