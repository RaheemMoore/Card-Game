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

/**
 * What the material looks like while it gathers.
 *
 * One shape per `chargeForm`, because "pool" was never generic — it was the
 * liquid case wearing a generic name, and it made Fire charge with a puddle of
 * flame. Each of these is a couple of primitives: the point is the SILHOUETTE
 * being right, not the rendering being clever.
 */
function ChargeShape({
  form,
  heavy,
  core,
  edge,
  accent,
}: {
  form: MaterialKit['chargeForm'];
  heavy: boolean;
  core: string;
  edge: string;
  accent: string;
}) {
  switch (form) {
    case 'flame':
      // A tongue that catches and rises — narrow at the base, wide and forked
      // at the top. The opposite proportion to a pool, so the two can never be
      // confused even in silhouette.
      return (
        <>
          <path
            d="M 50 46 C 38 36 42 26 50 8 C 58 26 62 36 50 46 Z"
            fill={core}
            opacity={0.9}
          />
          <path
            d="M 50 44 C 43 36 45 28 50 16 C 55 28 57 36 50 44 Z"
            fill={edge}
            opacity={0.95}
          />
          {/* Bright inner core — fire is the one material lit from inside. */}
          <path d="M 50 40 C 47 34 48 30 50 24 C 52 30 53 34 50 40 Z" fill={accent} />
          {/* Small licks breaking off, so it reads as burning rather than as
              a static leaf shape. */}
          <path d="M 40 34 C 36 28 38 24 41 20" stroke={edge} strokeWidth={2} fill="none" opacity={0.7} />
          <path d="M 60 36 C 64 30 62 26 59 22" stroke={edge} strokeWidth={2} fill="none" opacity={0.7} />
        </>
      );

    case 'bloom':
      // A plant that grew: a stem, leaves, and a flower opening at the top.
      // The delivery reaches out of THIS, so it has to look like a thing with
      // a mouth rather than a puddle or a glow.
      return (
        <>
          {/* Stem. */}
          <path d="M 50 48 C 49 38 51 32 50 22" stroke={core} strokeWidth={4} fill="none" strokeLinecap="round" />
          {/* Leaves, deliberately uneven — a symmetrical plant reads as a logo. */}
          <path d="M 50 40 C 40 38 34 32 33 26 C 41 26 48 32 50 40 Z" fill={core} opacity={0.95} />
          <path d="M 50 34 C 60 33 66 28 68 22 C 60 22 52 27 50 34 Z" fill={edge} opacity={0.95} />
          {/* The flower opening at the top — four petals around a bright centre. */}
          <path d="M 50 22 C 44 18 44 10 50 6 C 56 10 56 18 50 22 Z" fill={edge} />
          <path d="M 50 20 C 43 21 37 17 36 11 C 43 10 49 14 50 20 Z" fill={edge} opacity={0.85} />
          <path d="M 50 20 C 57 21 63 17 64 11 C 57 10 51 14 50 20 Z" fill={edge} opacity={0.85} />
          <circle cx={50} cy={15} r={4} fill={accent} />
        </>
      );

    case 'ground':
      // The floor stirring: a low mound with cracks radiating from it.
      return (
        <>
          <ellipse cx={50} cy={38} rx={40} ry={11} fill={core} opacity={0.8} />
          <path
            d="M 30 38 L 44 30 M 50 38 L 50 26 M 70 38 L 58 29"
            stroke={edge}
            strokeWidth={2.5}
            fill="none"
          />
          <ellipse cx={50} cy={38} rx={18} ry={5} fill={accent} opacity={0.5} />
        </>
      );

    case 'halo':
      // Light assembling into a ring — symmetrical, which nothing else here is.
      return (
        <>
          <ellipse cx={50} cy={28} rx={34} ry={16} fill="none" stroke={core} strokeWidth={5} opacity={0.85} />
          <ellipse cx={50} cy={28} rx={24} ry={11} fill="none" stroke={edge} strokeWidth={3} opacity={0.9} />
          <ellipse cx={50} cy={28} rx={11} ry={5} fill={accent} opacity={0.7} />
        </>
      );

    case 'motes':
      // The neutral fallback: particles converging. Deliberately plain, so an
      // element that has not been authored looks unfinished rather than wrong.
      return (
        <>
          {[20, 38, 50, 62, 80].map((x, i) => (
            <circle key={x} cx={x} cy={28 + (i % 2 === 0 ? -6 : 6)} r={4} fill={i === 2 ? accent : core} opacity={0.8} />
          ))}
        </>
      );

    case 'pool':
    default:
      return (
        <>
          <ellipse cx={50} cy={heavy ? 32 : 25} rx={38} ry={heavy ? 15 : 19} fill={core} opacity={0.85} />
          <ellipse cx={50} cy={heavy ? 28 : 22} rx={26} ry={heavy ? 9 : 13} fill={edge} opacity={0.9} />
          {/* Wet highlight — the cue that separates a pool of liquid from a
              coloured blob. */}
          <ellipse cx={40} cy={heavy ? 24 : 18} rx={9} ry={3.5} fill={accent} opacity={0.75} />
        </>
      );
  }
}

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
}: Props) {
  const [core, edge, accent] = kit.palette;
  const still = motionLevel === 'off';

  const scale = intensity === 'ultimate' ? 1.45 : intensity === 'heavy' ? 1.2 : 1;
  const w = 54 * scale;
  const h = 26 * scale;

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
        zIndex: 21,
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
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
        className={still || firing ? undefined : armed ? 'perf-charge-pulse' : 'perf-charge-gather'}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
      >
        {/*
          A flame is scaled up about its BASE, not its centre — so it grows
          taller out of the cast point rather than also growing downward
          through it. Raheem's note on review: the glow was the right size, the
          flame itself was too small. The glow is a separate element and is
          deliberately left alone.
        */}
        <g
          transform={
            kit.chargeForm === 'flame'
              ? 'translate(50 46) scale(1.55) translate(-50 -46)'
              : undefined
          }
        >
          <ChargeShape form={kit.chargeForm} heavy={heavy} core={core} edge={edge} accent={accent} />
        </g>
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
