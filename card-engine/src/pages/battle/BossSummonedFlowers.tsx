import type { MotionLevel } from '../../vfx/types';

/**
 * Flowers that FADE INTO EXISTENCE around the boss when he acts, then fade back
 * out. Raheem's idea, and it is the piece that makes the ground effects read as
 * *his doing* rather than as ambient lighting.
 *
 * ── Why these are PixelLab props and not more CSS ────────────────────────
 * The charge already spawns glowing dots, and they read fine as sparks — but a
 * blurred circle is a blurred circle at every size, and it can never read as a
 * FLOWER. The arena plate has painted blossoms, but paint cannot appear on cue.
 * These are the only way to get flowers that are art-directed, stylistically
 * consistent with the boss, and free to animate.
 *
 * PixelLab returns objects as STILL images — there is no object-animation
 * endpoint. That is not a limitation here, it is the right shape: the still is
 * generated once, and CODE does the fading, growing and placing, so the same
 * four props can be re-timed and re-scattered forever at zero further cost.
 * They were style-anchored to the boss's own idle crop, so they share his
 * palette and pixel register by construction.
 *
 * ── Growth is implied by SWAPPING variants, not by scaling one ───────────
 * The four props are deliberately at different stages — bud, cluster, open
 * bloom, spreading spray. Scaling a single sprite up reads as a zoom; cutting
 * from bud to bloom reads as something growing.
 */
interface Props {
  /** Prop paths, resolved against /assets/combat/. */
  paths: readonly string[];
  resolveUrl: (path: string) => string;
  motionLevel: MotionLevel;
  /**
   * `charging` — they sprout, tear free of the floor and drift upward, growing
   *   the whole time. The growth IS the charge meter: the player can read how
   *   far along he is from how high and how large they have got.
   * `ultimate` — they are already airborne and go bigger, faster, brighter.
   */
  phase: 'off' | 'charging' | 'ultimate';
  /** Changes per cast so a repeated ultimate re-blooms instead of sitting open. */
  bloomKey?: string | number;
}

/**
 * Scatter positions. Hand-placed rather than generated, and NOT symmetric —
 * a mirrored scatter reads as a pattern, and the whole point is that the blight
 * is spreading rather than being arranged.
 *
 * `variant` indexes the prop list; `delay` staggers them so the bed grows
 * outward from him instead of switching on as one sheet. Nearer flowers (higher
 * `y`) are larger and arrive first, which is what sells the spread as radial.
 */
const SCATTER = [
  // The centre column is deliberately EMPTY. Flowers there crowded his
  // shoulders and read as growing out of him rather than out of the floor.
  { x: 30, y: 90, s: 1.0, variant: 0, delay: 0.0 },
  { x: 71, y: 91, s: 0.95, variant: 3, delay: 0.06 },
  { x: 20, y: 84, s: 0.85, variant: 1, delay: 0.13 },
  { x: 80, y: 85, s: 0.82, variant: 0, delay: 0.18 },
  { x: 41, y: 94, s: 0.9, variant: 3, delay: 0.24 },
  { x: 60, y: 95, s: 0.86, variant: 1, delay: 0.29 },
  { x: 10, y: 92, s: 0.72, variant: 2, delay: 0.36 },
  { x: 90, y: 90, s: 0.7, variant: 2, delay: 0.41 },
  { x: 14, y: 78, s: 0.5, variant: 1, delay: 0.47 },
  { x: 87, y: 77, s: 0.48, variant: 0, delay: 0.53 },
  { x: 4, y: 86, s: 0.6, variant: 3, delay: 0.58 },
  { x: 96, y: 84, s: 0.58, variant: 2, delay: 0.64 },
];

export function BossSummonedFlowers({
  paths,
  resolveUrl,
  motionLevel,
  phase,
  bloomKey = 0,
}: Props) {
  if (!paths.length || phase === 'off') return null;
  const still = motionLevel === 'off';

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none overflow-hidden"
      // Behind the fighters, in front of the arena — they grow out of the floor
      // the party is standing on, not over the top of it.
      style={{ zIndex: 0 }}
      key={`bloom:${bloomKey}`}
    >
      {SCATTER.map((f, i) => (
        <img
          key={i}
          src={resolveUrl(paths[f.variant % paths.length])}
          alt=""
          draggable={false}
          className={still ? undefined : `boss-flower boss-flower-${phase}`}
          style={{
            position: 'absolute',
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: `${f.s * 5.6}%`,
            height: 'auto',
            // Anchored at the BASE while it is still rooted: a flower that
            // scales from its middle sinks into the floor as it grows. Once it
            // lifts, `--rise` carries it up from that same anchor.
            translate: '-50% -100%',
            transformOrigin: '50% 100%',
            imageRendering: 'pixelated',
            filter: `drop-shadow(0 0 10px rgba(255,60,190,0.55))`,
            animationDelay: still ? undefined : `${f.delay}s`,
            opacity: still ? 0.9 : 0,
            ...({
              // A small per-flower lift so the bed does not rise as one sheet.
              // Nearer/larger flowers lift less: they are closer to camera, so
              // the same world distance covers fewer screen percent.
              '--rise': `${-(6 + (1 - f.s) * 8)}%`,
            } as React.CSSProperties),
          }}
        />
      ))}
      <style>{`
        /* CHARGING — they push up out of the floor, lift a LITTLE, and grow.
           They do NOT twirl. An earlier version spun them a full turn while
           they climbed and it looked terrible: a flower is a rooted thing, so
           spinning one in mid-air reads as debris, not as growth. It was worse
           still while the props carried their generated stone plinths, which
           made it a rock tumbling through the air. The stone is cut out of the
           props now and the motion is upward only.

           The growth is still doing a job — it is the charge meter, so the
           player can read how far along he is from how big they have got — but
           it stays modest and the rise is small enough that they read as
           standing IN the floor rather than flying over it. */
        .boss-flower-charging {
          animation:
            boss-flower-summon 2600ms cubic-bezier(0.16, 0.8, 0.3, 1) forwards,
            boss-flower-sway 3400ms ease-in-out 700ms infinite alternate;
        }
        @keyframes boss-flower-summon {
          /* breaking the surface */
          0%   { opacity: 0; scale: 0.15 0.25; translate: -50% -100%;
                 filter: brightness(2.6) drop-shadow(0 0 20px rgba(255,60,190,0.95)); }
          18%  { opacity: 1; scale: 1.08 1.06; translate: -50% -100%; }
          26%  { opacity: 1; scale: 1 1;       translate: -50% -100%;
                 filter: brightness(1.1) drop-shadow(0 0 10px rgba(255,60,190,0.6)); }
          /* swelling, barely leaving the ground */
          100% { opacity: 1; scale: 1.45 1.45;
                 translate: -50% calc(-100% + var(--rise, -8%));
                 filter: brightness(1.9) drop-shadow(0 0 26px rgba(255,60,190,0.9)); }
        }

        /* ULTIMATE — bigger and hotter, still rooted. */
        .boss-flower-ultimate {
          animation:
            boss-flower-summon 900ms cubic-bezier(0.2, 1, 0.3, 1) forwards,
            boss-flower-sway 1600ms ease-in-out 900ms infinite alternate,
            boss-flower-roar 1.25s ease-in-out 900ms infinite alternate;
        }
        @keyframes boss-flower-roar {
          from { filter: brightness(2)   drop-shadow(0 0 26px rgba(255,60,190,0.9)); }
          to   { filter: brightness(3.2) drop-shadow(0 0 52px rgba(255,90,215,1)); }
        }

        /* A lean from the base, not a spin. Rotating about 50% 100% pivots the
           bloom over its own root, which is how a real stem moves. Kept on its
           own animation so it composes with the summon's translate and scale —
           three separate properties, never one combined transform, or the last
           declaration silently wins and the rise disappears. */
        @keyframes boss-flower-sway {
          from { rotate: -2.5deg; }
          to   { rotate: 2.5deg; }
        }

        @media (prefers-reduced-motion: reduce) {
          .boss-flower,
          .boss-flower-charging,
          .boss-flower-ultimate {
            animation: none !important;
            opacity: 0.9 !important;
            scale: 1.4 !important;
          }
        }
      `}</style>
    </div>
  );
}
