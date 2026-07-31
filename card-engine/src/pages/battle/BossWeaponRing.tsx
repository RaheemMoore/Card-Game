import type { BossRingSpec } from '../../data/combat/bossRingManifest';
import type { MotionLevel } from '../../vfx/types';

/**
 * The orbiting effect ring behind a boss.
 *
 * Sits BETWEEN the arena and the boss sprite so the figure occludes the arc's
 * inner edge — that overlap is what sells the pieces as being behind him rather
 * than floating on the glass in front of the scene.
 *
 * Every piece is its own element, laid out on an ellipse from the spec. Nothing
 * is baked, so a future `spentPieces` prop can dim or detach individual weapons
 * as the boss's moves fire, and the player can read how much she has left.
 *
 * ── Transparency is baked in, NOT a blend mode ───────────────────────────
 * The pieces carry alpha derived from their own luminance, so the artwork's
 * black ground is already gone before compositing. `mix-blend-mode: screen`
 * was tried first and failed in the real arena: a blend mode composites against
 * the backdrop WITHIN ITS OWN STACKING CONTEXT, and the boss sprite box creates
 * one (it is transformed and animated), so the black never dropped out and each
 * piece showed as a visible grey rectangle. Baked alpha cannot be defeated by
 * whatever stacking context it lands in, and on a dark arena it reads the same.
 *
 * ── Motion ───────────────────────────────────────────────────────────────
 * Each piece drifts and pulses on its own offset phase, so the ring breathes
 * rather than throbbing in unison; synchronised pulsing is what makes an effect
 * look canned. At `MotionLevel: 'off'` all of it stops and the ring simply
 * hangs there — reduced motion means no MOTION, not no RING.
 */
/**
 * What the ring is doing right now.
 *
 * 'charging' — pulling inward and brightening as she gathers a heavy attack.
 * 'firing'   — one piece leaves the ring and flies at the viewer.
 * 'defeated' — the arc comes apart and falls.
 */
export type RingPhase = 'idle' | 'charging' | 'firing' | 'defeated';

interface Props {
  spec: BossRingSpec;
  /** Resolves a manifest path to a public URL. */
  resolveUrl: (path: string) => string;
  motionLevel: MotionLevel;
  /** Indices already spent this fight — dimmed rather than removed. */
  spentPieces?: readonly number[];
  phase?: RingPhase;
  /** Which piece launches on 'firing'. Chosen by the caller so the same hit
   *  always throws the same weapon on replay. */
  firingIndex?: number;
  /** Changes per firing so a second launch replays instead of sitting spent. */
  fireKey?: string | number;
}

export function BossWeaponRing({
  spec,
  resolveUrl,
  motionLevel,
  spentPieces = [],
  phase = 'idle',
  firingIndex = 0,
  fireKey = 0,
}: Props) {
  const { pieces, arcDegrees, startDegrees, radiusX, radiusY, pieceScale, centerYOffset } = spec;
  const still = motionLevel === 'off';
  const n = pieces.length;

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      // The ring normally sits BEHIND the sprite so the figure occludes the
      // arc's inner edge. While a weapon is in flight it has to come FORWARD,
      // past her, toward the viewer.
      //
      // This has to move on the container, not the piece: `zIndex: 0` here
      // creates a stacking context, which traps any z-index a child sets. The
      // firing piece carried `zIndex: 30` and still painted behind the boss,
      // because 30 only ranked it against its siblings inside this context.
      style={{ zIndex: phase === 'firing' ? 30 : 0 }}
    >
      {pieces.map((path, i) => {
        // Single piece sits at the arc's midpoint rather than dividing by zero.
        const t = n > 1 ? i / (n - 1) : 0.5;
        const rad = ((startDegrees + arcDegrees * t) * Math.PI) / 180;
        const x = 50 + Math.sin(rad) * radiusX * 50;
        const y = 50 - Math.cos(rad) * radiusY * 50 + centerYOffset * 100;
        const spent = spentPieces.includes(i);
        const isFiring = phase === 'firing' && i === firingIndex % n;

        // How far this piece sits from centre, so the charge pull and the
        // defeat scatter are computed from its OWN position rather than all
        // pieces moving the same way — a ring that collapses uniformly reads
        // as one image scaling, which is the exact thing the per-piece layout
        // exists to avoid.
        const dx = x - 50;
        const dy = y - 50;

        const cls = still
          ? undefined
          : isFiring
            ? 'boss-ring-fire'
            : phase === 'charging'
              ? 'boss-ring-piece boss-ring-charging'
              : phase === 'defeated'
                ? 'boss-ring-fall'
                : 'boss-ring-piece';

        return (
          <img
            // Firing pieces get a key that changes per launch so React remounts
            // them and the animation replays; a repeated attack otherwise shows
            // a weapon already parked at the end of its flight.
            key={isFiring ? `${path}:${fireKey}` : path}
            src={resolveUrl(path)}
            alt=""
            draggable={false}
            className={cls}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: `${pieceScale * 100}%`,
              height: 'auto',
              transform: 'translate(-50%, -50%)',
              opacity: spent ? 0.18 : 1,
              filter: spent
                ? 'grayscale(0.7) brightness(0.6)'
                : `drop-shadow(0 0 10px ${spec.glow}0.85)) drop-shadow(0 0 28px ${spec.glow}0.5))`,
              // Negative delays start each piece mid-cycle, so they are already
              // out of phase on the first frame rather than easing into it.
              animationDelay: `${i * -0.55}s, ${i * -0.37}s`,
              zIndex: isFiring ? 30 : undefined,
              ...({
                '--pull-x': `${-dx * 0.45}%`,
                '--pull-y': `${-dy * 0.45}%`,
                '--fall-x': `${dx * 0.25}%`,
              } as React.CSSProperties),
            }}
          />
        );
      })}
      <style>{`
        .boss-ring-piece {
          animation:
            boss-ring-bob 4.5s ease-in-out infinite,
            boss-ring-pulse 2.6s ease-in-out infinite;
        }
        @keyframes boss-ring-bob {
          0%, 100% { translate: 0 -5px; }
          50%      { translate: 0 5px; }
        }
        @keyframes boss-ring-pulse {
          0%, 100% { opacity: 0.82; scale: 0.97; }
          50%      { opacity: 1;    scale: 1.03; }
        }

        /* CHARGING — the arc draws inward toward her and burns hotter. Each
           piece pulls along its OWN vector back to centre, so the ring closes
           like something being gathered rather than a picture being scaled.
           Alternating so it strains inward and eases back, building. */
        .boss-ring-charging {
          animation:
            boss-ring-pull 1.15s ease-in-out infinite alternate,
            boss-ring-heat 0.75s ease-in-out infinite alternate !important;
        }
        @keyframes boss-ring-pull {
          from { translate: 0 0; scale: 1; }
          to   { translate: var(--pull-x, 0) var(--pull-y, 0); scale: 1.12; }
        }
        @keyframes boss-ring-heat {
          from { filter: brightness(1) saturate(1); }
          to   { filter: brightness(2.1) saturate(1.5); }
        }

        /* FIRING — one weapon leaves the arc and comes at the camera. Scaling
           up while translating down IS the depth cue: there is no 3D here, so
           "toward the viewer" has to be sold by growth plus a fast fade at the
           end, before it gets big enough for the pixels to break down. */
        .boss-ring-fire {
          animation: boss-ring-launch 460ms cubic-bezier(0.4, 0, 0.9, 0.6) forwards;
        }
        @keyframes boss-ring-launch {
          0% {
            translate: 0 0;
            scale: 1;
            opacity: 1;
            filter: brightness(1.4) drop-shadow(0 0 12px rgba(255,140,50,0.9));
          }
          /* Cocks backward into the ring first. A strike that starts travelling
             on frame 1 has no anticipation and reads as a jump cut. */
          22% {
            translate: calc(var(--pull-x, 0) * -0.4) calc(var(--pull-y, 0) * -0.4);
            scale: 0.9;
            opacity: 1;
            filter: brightness(1.8) drop-shadow(0 0 18px rgba(255,150,60,1));
          }
          /* Full brightness while it is BIG and still opaque. Fading and
             growing together made it invisible exactly when it filled the
             screen, which is the frame that was supposed to land the hit. */
          70% {
            translate: 0 70%;
            scale: 3.4;
            opacity: 1;
            filter: brightness(2.8) drop-shadow(0 0 34px rgba(255,180,80,1));
          }
          100% {
            translate: 0 150%;
            scale: 6;
            opacity: 0;
            filter: brightness(3.2) drop-shadow(0 0 44px rgba(255,200,100,1));
          }
        }

        /* DEFEATED — the ledger comes apart. Pieces drop, tumble outward and
           go cold. Staggered by the same per-piece delay the bob used, so they
           fall raggedly instead of as one sheet. */
        .boss-ring-fall {
          animation: boss-ring-fall 900ms ease-in forwards;
        }
        @keyframes boss-ring-fall {
          0%   { translate: 0 0; rotate: 0deg; opacity: 1; filter: brightness(1); }
          100% {
            translate: var(--fall-x, 0) 60%;
            rotate: 35deg;
            opacity: 0;
            filter: brightness(0.35) grayscale(0.8);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .boss-ring-piece,
          .boss-ring-charging,
          .boss-ring-fire,
          .boss-ring-fall {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
