import type { MotionLevel } from '../../../vfx/types';
import type { MaterialKit } from '../../../services/combat/performance/types';
import type { Point } from '../combatAnchors';
import { ChargeShapeScaled } from './chargeShapes';

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
  /**
   * The beat immediately before the delivery lands, when the tell brightens.
   *
   * Raheem asked for it explicitly: "right before it goes to fire, that plant
   * should be glowing a little bit brighter as it's activating on the boss."
   * It is the causal link made visible — the thing on the card surges, and
   * then the thing at the target happens. Without it the two halves of a
   * split-location ability like Rootgrasp read as unrelated events.
   */
  flaring?: boolean;
  /**
   * The card lets go. First of the three pieces to leave, so the player reads
   * "the card stopped" before "the stream ran out".
   */
  releasing?: boolean;
  releaseMs?: number;
  /**
   * Optional art for the gathered material, when it should be visibly the same
   * object the ability later produces. Falls back to the procedural shape.
   */
  art?: { src: string; sizePx: number };
  intensity: 'normal' | 'heavy' | 'ultimate';
  /** Scale the whole tell for persistent party-planning readability. */
  sizeMultiplier?: number;
  zIndex?: number;
}

export function ChargeTell({
  at,
  kit,
  motionLevel,
  chargeMs,
  armed = false,
  firing = false,
  flaring = false,
  releasing = false,
  releaseMs = 140,
  art,
  intensity,
  sizeMultiplier = 1,
  zIndex = 21,
}: Props) {
  const [core, edge, accent] = kit.palette;
  const still = motionLevel === 'off';

  const scale = intensity === 'ultimate' ? 1.45 : intensity === 'heavy' ? 1.2 : 1;
  const w = 54 * scale * sizeMultiplier;
  const h = 26 * scale * sizeMultiplier;

  // Blood pools and hangs; the pool sits BELOW the cast point for heavy
  // materials so it reads as collecting.
  const heavy = kit.residue === 'dripping' || kit.silhouette === 'coiling_ribbon';

  return (
    <div
      className={`absolute pointer-events-none${
        releasing && !still ? ' perf-charge-release' : ''
      }`}
      style={{
        left: `${at.x}%`,
        top: `${at.y}%`,
        width: w,
        height: h,
        marginLeft: -w / 2,
        marginTop: -h / 2,
        zIndex,
        ['--charge-ms' as string]: `${Math.max(120, chargeMs)}ms`,
        ['--release-ms' as string]: `${Math.max(80, releaseMs)}ms`,
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

      {/*
        Authored art for the gathered material, when the kit supplies it. The
        procedural shape below is the fallback and remains the default — most
        materials never need art here.
      */}
      {art ? (
        <img
          src={art.src}
          alt=""
          className={
            still || firing
              ? undefined
              : armed
                ? 'perf-charge-pulse'
                : 'perf-charge-gather'
          }
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: art.sizePx,
            height: art.sizePx,
            marginLeft: -art.sizePx / 2,
            marginTop: -art.sizePx / 2,
            imageRendering: 'pixelated',
            // The flare: the plant surges just before the ability lands.
            filter: flaring
              ? `brightness(1.75) drop-shadow(0 0 10px ${accent})`
              : `drop-shadow(0 0 4px ${core}88)`,
            transition: still ? undefined : 'filter 160ms ease-out',
          }}
        />
      ) : (
      /* The gathering shape itself, which is NOT always a pool. */
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        className={still || firing ? undefined : armed ? 'perf-charge-pulse' : 'perf-charge-gather'}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
      >
        {/*
          Shapes come from the shared module, scaled per form about their BASE
          so they grow upward out of the cast point rather than down through
          it. Both the sizing table and the geometry live with the gallery's
          copy, so the review page cannot show something the game does not do.
        */}
        <ChargeShapeScaled
          form={kit.chargeForm}
          heavy={heavy}
          core={core}
          edge={edge}
          accent={accent}
        />
      </svg>
      )}

      {/* Drips, for materials that drip. Blood hangs and falls; nothing else
          here does, which is a silhouette cue rather than a colour one. */}
      {kit.residue === 'dripping' && !still && (
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
