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
interface Props {
  spec: BossRingSpec;
  /** Resolves a manifest path to a public URL. */
  resolveUrl: (path: string) => string;
  motionLevel: MotionLevel;
  /** Indices already spent this fight — dimmed rather than removed. */
  spentPieces?: readonly number[];
}

export function BossWeaponRing({ spec, resolveUrl, motionLevel, spentPieces = [] }: Props) {
  const { pieces, arcDegrees, startDegrees, radiusX, radiusY, pieceScale, centerYOffset } = spec;
  const still = motionLevel === 'off';
  const n = pieces.length;

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {pieces.map((path, i) => {
        // Single piece sits at the arc's midpoint rather than dividing by zero.
        const t = n > 1 ? i / (n - 1) : 0.5;
        const rad = ((startDegrees + arcDegrees * t) * Math.PI) / 180;
        const x = 50 + Math.sin(rad) * radiusX * 50;
        const y = 50 - Math.cos(rad) * radiusY * 50 + centerYOffset * 100;
        const spent = spentPieces.includes(i);
        return (
          <img
            key={path}
            src={resolveUrl(path)}
            alt=""
            draggable={false}
            className={still ? undefined : 'boss-ring-piece'}
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
        @media (prefers-reduced-motion: reduce) {
          .boss-ring-piece { animation: none; }
        }
      `}</style>
    </div>
  );
}
