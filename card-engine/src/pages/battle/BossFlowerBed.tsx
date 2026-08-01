import type { FlowerBedSpec } from '../../data/combat/bossSignatureManifest';
import type { MotionLevel } from '../../vfx/types';

/**
 * A bed of the boss's blight across the arena floor.
 *
 * ── This is the AREA-ATTACK tell ─────────────────────────────────────────
 * It is bound to `act_season_root` ("A whole season of growth arrives at once"),
 * the Still Season's only `area_attack`. When the floor blooms, everyone is
 * about to be hit. That is a mechanic taught by colour and position rather than
 * by reading the intent banner — the same problem the wind-up clip solved for
 * single-target swings, one level up.
 *
 * ── Why the arena plate is deliberately duller than this ─────────────────
 * The arena already carries his blight, but `finish_arena.py` damps it to a
 * matte, unlit bruise on purpose. If the floor already glowed this colour, the
 * bloom would read as more floor instead of as something he just did. Dormant
 * stain in the plate, acute flare in code: that contrast IS the tell, and it
 * only works because the two were separated.
 *
 * ── Rules inherited from BossWeaponRing ──────────────────────────────────
 * Baked alpha (never `mix-blend-mode`, which a transformed ancestor traps);
 * per-clump negative delays so the bed ripples rather than throbbing as one
 * sheet; and reduced motion stops the motion but keeps the art.
 */
export type FlowerPhase = 'idle' | 'charging' | 'firing' | 'defeated' | 'ultimate';

interface Props {
  spec: FlowerBedSpec;
  resolveUrl: (path: string) => string;
  motionLevel: MotionLevel;
  phase?: FlowerPhase;
  fireKey?: string | number;
}

/** Three overlapping copies at slightly different scales and phases. One image
 *  pulsing as a unit reads as a flashing rectangle; three offset copies read as
 *  a field of separate living things, for two extra `<img>` tags. */
const CLUMPS = [
  { dx: -4, hScale: 1.0, delay: 0 },
  { dx: 4, hScale: 0.86, delay: -1.7 },
];

export function BossFlowerBed({
  spec,
  resolveUrl,
  motionLevel,
  phase = 'idle',
  fireKey = 0,
}: Props) {
  const still = motionLevel === 'off';

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none overflow-hidden"
      // In FRONT of the arena but BEHIND the fighters, so the party stands IN
      // the bed rather than under a decal pasted over them.
      //
      // zIndex 0, not 1. At 1 it outranked the boss's sprite box (which sets no
      // z-index of its own) and painted the flowers over the top of him.
      style={{ zIndex: 0 }}
      key={phase === 'firing' ? `fire:${fireKey}` : 'bed'}
    >
      {CLUMPS.map((c, i) => (
        <img
          key={i}
          src={resolveUrl(spec.path)}
          alt=""
          draggable={false}
          className={still ? undefined : `boss-bed boss-bed-${phase}`}
          style={{
            position: 'absolute',
            left: `calc(50% + ${c.dx}%)`,
            bottom: `${spec.bottomPercent}%`,
            // Height-driven, full-bleed width. `object-fit: fill` stretches
            // rather than preserving aspect — correct here, because this is a
            // decal band whose job is to cover the floor edge to edge, and a
            // few percent of horizontal stretch on a field of blossoms is
            // invisible. Preserving aspect is what made it swallow the arena.
            height: `${spec.heightPercent * c.hScale}%`,
            width: '112%',
            objectFit: 'fill',
            translate: '-50% 0',
            filter: `drop-shadow(0 0 12px ${spec.glow}0.45))`,
            animationDelay: `${c.delay}s, ${c.delay * 0.6}s`,
          }}
        />
      ))}
      <style>{`
        /* RESTING — barely there. The bed is dormant between casts; if it
           pulsed at rest the bloom would have nothing to escalate from. */
        /* RESTING — almost invisible, and that is the point now.
           The arena plate paints its OWN blighted floor, so a code bed at rest
           just doubles it and the two compete. The clean split is exactly the
           one the plate's magenta damp was built around: the PLATE carries the
           dormant stain, and this layer exists only for the acute bloom. Left
           at 0.2 the floor read as permanently mid-attack. */
        .boss-bed {
          opacity: 0.07;
          animation: boss-bed-breathe 5.5s ease-in-out infinite;
        }
        @keyframes boss-bed-breathe {
          0%, 100% { opacity: 0.05; }
          50%      { opacity: 0.11; }
        }

        /* CHARGING — the growth arrives. Swells up from the floor and burns,
           holding for however many hero turns the telegraph stays up. */
        .boss-bed-charging {
          animation:
            boss-bed-bloom 1.1s ease-in-out infinite alternate,
            boss-bed-heat 0.7s ease-in-out infinite alternate !important;
        }
        @keyframes boss-bed-bloom {
          from { opacity: 0.55; scale: 1 0.94; }
          to   { opacity: 1;    scale: 1.04 1.14; }
        }
        @keyframes boss-bed-heat {
          from { filter: brightness(1.1) saturate(1.1); }
          to   { filter: brightness(2.2) saturate(1.5); }
        }

        /* FIRING — the season lands. Snaps to full and settles back. */
        .boss-bed-firing {
          animation: boss-bed-burst 620ms cubic-bezier(0.2, 0, 0.4, 1) forwards !important;
        }
        @keyframes boss-bed-burst {
          0%   { opacity: 1;    scale: 1.12 1.3; filter: brightness(3) saturate(1.7); }
          100% { opacity: 0.07; scale: 1 1;      filter: brightness(1) saturate(1); }
        }

        /* ULTIMATE — the whole floor answers the scream. The bed does this
           regardless of which action owns it: an ultimate is the one moment
           where every layer should fire at once. */
        .boss-bed-ultimate {
          animation: boss-bed-roar 1.25s ease-in-out infinite alternate !important;
        }
        @keyframes boss-bed-roar {
          from { opacity: 0.7; scale: 1 1.05;  filter: brightness(1.4) saturate(1.3); }
          to   { opacity: 1;   scale: 1.06 1.4; filter: brightness(2.8) saturate(1.8); }
        }

        /* DEFEATED — the growth stops and goes grey with him. */
        .boss-bed-defeated {
          animation: boss-bed-wither 1400ms ease-in forwards !important;
        }
        @keyframes boss-bed-wither {
          0%   { opacity: 0.34; filter: brightness(1) grayscale(0); }
          100% { opacity: 0.10; filter: brightness(0.4) grayscale(0.85); }
        }

        @media (prefers-reduced-motion: reduce) {
          .boss-bed,
          .boss-bed-charging,
          .boss-bed-ultimate,
          .boss-bed-firing,
          .boss-bed-defeated {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
