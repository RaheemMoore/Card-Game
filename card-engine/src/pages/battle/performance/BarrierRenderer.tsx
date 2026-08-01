import type { MotionLevel } from '../../../vfx/types';
import type { ResolvedPerformance } from '../../../services/combat/performance/types';
import { CardShieldPane } from '../CardCombatFx';

/**
 * The barrier family — Bearing Witness.
 *
 * ## Why this extends `CardShieldPane` rather than drawing its own glass
 *
 * `CardShieldPane` already exists in `CardCombatFx.tsx` and is genuinely good:
 * a faceted, bevelled, transparent plate standing PROUD of the card so it
 * reads as a separate object held in front of it, with a travelling sheen and
 * a spiderweb crack pattern bound to integrity. It has never been rendered in
 * a real battle — until this file it existed only on `/dev/sprite-preview`.
 *
 * Duplicating that here would have produced a second glass vocabulary that
 * drifts from the first, and would have left the original still unused. So
 * this composes it, and adds only what a barrier PERFORMANCE needs on top: the
 * arrival, the cleanse beat, and the binding to live shield state.
 *
 * The material fit is not a coincidence — Holy's authored kit is
 * `faceted_plane` / `bevelled` precisely because the pane already is one.
 *
 * ## Persistence
 *
 * The pane's life is NOT this performance's life. The arrival animation is
 * ~700ms; the shield lasts until it is spent. So `integrity` comes from live
 * battle state via `PerformanceLayer`, and shatter fires when protection is
 * exhausted — never on a decorative timer, which is the failure the contract
 * calls out by name.
 */

interface Props {
  performance: ResolvedPerformance;
  /** Screen position of the protected card, in viewport %. */
  at: { x: number; y: number };
  motionLevel: MotionLevel;
  stageName: string | null;
  /** Nominal length of the manifest stage, ms — drives the arrival timing. */
  manifestMs: number;
  /**
   * Live shield integrity, 1 → 0. Supplied by the layer from battle state,
   * NOT derived from the animation clock.
   */
  integrity: number;
}

export function BarrierRenderer({
  performance: perf,
  at,
  motionLevel,
  stageName,
  manifestMs,
  integrity,
}: Props) {
  const kit = perf.material;
  const [, , accent] = kit.palette;
  const still = motionLevel === 'off';

  const forming = stageName === 'manifest';
  const cleansing = stageName === 'aftermath';
  const present = forming || cleansing || stageName === 'recover';

  if (!present) return null;

  return (
    <div
      // Reduced motion fades the pane in rather than assembling it from moving
      // shards — "a reduced barrier may appear with a short fade and use state
      // changes without shard motion". Both paths are CSS, so the arrival is
      // driven by the compositor rather than by a per-frame React update.
      className={`absolute pointer-events-none${!still && forming ? ' perf-barrier-form' : ''}`}
      style={{
        left: `${at.x}%`,
        top: `${at.y}%`,
        // Sized to the dock card the pane guards. Not measured from the DOM —
        // a layout read here would run inside the animation and is forbidden
        // by the performance budget.
        width: 116,
        height: 164,
        marginLeft: -58,
        marginTop: -82,
        zIndex: 23,
        transformStyle: 'preserve-3d',
        ['--barrier-form-ms' as string]: `${Math.max(120, manifestMs)}ms`,
      }}
      aria-hidden
    >
      {/* The real pane, live-bound to protection state. */}
      <CardShieldPane integrity={integrity} />

      {/* The cleanse. Its own beat AFTER the shield lands, so "you are
          protected" and "what was on you is lifted" read as two things. A
          single combined flash reads as one. */}
      {cleansing && (
        <div
          className={still ? undefined : 'perf-cleanse'}
          style={{
            position: 'absolute',
            inset: -14,
            borderRadius: 12,
            border: `2px solid ${accent}`,
            opacity: still ? 0.85 : undefined,
            // Rises and clears — what was on you goes UP and away.
            ['--cleanse-rise' as string]: '-16px',
          }}
        />
      )}

      {/* Formation motes converging inward. Suppressed entirely at motion off. */}
      {forming && !still && (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className="perf-barrier-mote"
              style={{
                position: 'absolute',
                left: `${12 + i * 15}%`,
                top: `${i % 2 === 0 ? -8 : 104}%`,
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: accent,
                animationDelay: `${i * 40}ms`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
