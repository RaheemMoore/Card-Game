import type { MotionLevel } from '../../../vfx/types';
import type { MaterialKit } from '../../../services/combat/performance/types';
import type { Point } from '../combatAnchors';

/**
 * The gathering — material pooling at the cast point before anything fires.
 *
 * ## Why this exists
 *
 * The `charge` stage rendered nothing at all, so the first ~260ms of every
 * ability was dead air. Worse, it meant the card never looked like it was
 * ABOUT to do something: the effect simply appeared, fully formed, out of a
 * card that had given no warning.
 *
 * Raheem's framing is the right one and it goes further than a stage: the tell
 * is "something sitting there waiting to be activated while the other cards
 * are choosing their ability". That is not a 260ms animation, it is an **armed
 * state** — so this component takes an `armed` flag that holds the pool open
 * indefinitely. Today the charge stage drives it; when the round becomes
 * plan-then-resolve, a queued-but-unfired card drives the same thing with no
 * change here.
 *
 * ## What it draws
 *
 * A pool of the caster's material at the cast anchor, which the delivery then
 * emerges THROUGH rather than from nothing. The pool persists while the effect
 * fires — the stream's muzzle mask fades in exactly over it — and only clears
 * in the aftermath. Blood gathers and drips; water swirls; fire builds an
 * ember bed. All procedural: no generation spent, and the shape comes from the
 * same `MaterialKit` that drives everything else, so a new element inherits a
 * charge tell for free.
 */

interface Props {
  at: Point;
  kit: MaterialKit;
  motionLevel: MotionLevel;
  /** Nominal charge duration, ms — drives the gather timing. */
  chargeMs: number;
  /**
   * Hold the pool open indefinitely instead of gathering once.
   *
   * The hook for plan-then-resolve: a card that has picked an ability but not
   * yet fired sits armed, visibly holding its material, until the round runs.
   */
  armed?: boolean;
  /** True once the delivery is under way — the pool stays, but stops growing. */
  firing?: boolean;
  intensity: 'normal' | 'heavy' | 'ultimate';
}

export function ChargeTell({
  at,
  kit,
  motionLevel,
  chargeMs,
  armed = false,
  firing = false,
  intensity,
}: Props) {
  const [core, edge, accent] = kit.palette;
  const still = motionLevel === 'off';

  const scale = intensity === 'ultimate' ? 1.45 : intensity === 'heavy' ? 1.2 : 1;
  const w = 54 * scale;
  const h = 26 * scale;

  // Blood pools and hangs; fire and water gather upward. The pool sits BELOW
  // the cast point for heavy materials so it reads as collecting, and centred
  // for the ones that billow.
  const heavy = kit.residue === 'dripping' || kit.silhouette === 'coiling_ribbon';

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${at.x}%`,
        top: `${at.y}%`,
        width: w,
        height: h,
        marginLeft: -w / 2,
        marginTop: -h / 2,
        zIndex: 21,
        ['--charge-ms' as string]: `${Math.max(120, chargeMs)}ms`,
      }}
      aria-hidden
    >
      {/* The glow that says "this card is holding something". Larger and
          softer than the pool so it reads on the card itself, not just at the
          muzzle point. */}
      <div
        className={still || firing ? undefined : armed ? 'perf-charge-pulse' : 'perf-charge-gather'}
        style={{
          position: 'absolute',
          inset: -w * 0.55,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 50% 50%, ${core}66 0%, ${edge}22 45%, transparent 72%)`,
          opacity: still ? 0.75 : undefined,
        }}
      />

      {/* The pool itself. */}
      <svg
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
        className={still || firing ? undefined : armed ? 'perf-charge-pulse' : 'perf-charge-gather'}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
      >
        <ellipse
          cx={50}
          cy={heavy ? 32 : 25}
          rx={38}
          ry={heavy ? 15 : 19}
          fill={core}
          opacity={0.85}
        />
        <ellipse
          cx={50}
          cy={heavy ? 28 : 22}
          rx={26}
          ry={heavy ? 9 : 13}
          fill={edge}
          opacity={0.9}
        />
        {/* Wet highlight — the cue that separates a pool of liquid from a
            coloured blob. */}
        <ellipse cx={40} cy={heavy ? 24 : 18} rx={9} ry={3.5} fill={accent} opacity={0.75} />
      </svg>

      {/* Drips, for materials that drip. Blood hangs and falls; nothing else
          here does, which is a silhouette cue rather than a colour one. */}
      {heavy && !still && (
        <>
          {[0.3, 0.55, 0.75].map((t, i) => (
            <span
              key={i}
              className="perf-charge-drip"
              style={{
                position: 'absolute',
                left: `${t * 100}%`,
                top: '68%',
                width: 4 * scale,
                height: 4 * scale,
                marginLeft: -2 * scale,
                borderRadius: '50%',
                background: edge,
                animationDelay: `${i * 220}ms`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
