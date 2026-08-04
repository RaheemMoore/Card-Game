import type { MotionLevel } from '../../../vfx/types';
import type { ResolvedPerformance } from '../../../services/combat/performance/types';
import type { Point } from '../combatAnchors';
import { impactShape } from './materialStyle';

/**
 * The safety net — and the only surviving home of the old bolt.
 *
 * ## What this is for
 *
 * An ability with no authored recipe and no inferable form still has to LOOK
 * like something. This draws a restrained treatment chosen by what actually
 * happened: a bolt for damage, a rising bloom for healing, a brace for
 * shielding, a quiet mark for a status.
 *
 * ## What this must not become
 *
 * The pre-existing `AttackVFX` drew one rotated gradient bar coloured by
 * `DamageType` for every attack in the game. That is why Blood, Void and Bone
 * were the same violet streak, and it is the bug this whole system exists to
 * fix. The bolt is kept here — deliberately, because for a genuinely
 * projectile-like hit it is the right answer — but it is the FLOOR of the
 * resolution chain and not its default. Every performance that lands here is
 * reported as `isFallback` and shows up as debt in the Ability Theater's
 * coverage readout. If that list stops shrinking, the system has quietly
 * regressed to where it started.
 */

interface Props {
  performance: ResolvedPerformance;
  from: Point;
  to: Point;
  motionLevel: MotionLevel;
  stageName: string | null;
}

export function GenericRenderer({
  performance: perf,
  from,
  to,
  motionLevel,
  stageName,
}: Props) {
  const kit = perf.material;
  const [core, edge, accent] = kit.palette;
  const still = motionLevel === 'off';

  // What kind of thing happened? Read from the placed consequences rather than
  // guessed, so the treatment matches the mechanics even when the shape does
  // not.
  const kinds = new Set(perf.stages.flatMap((s) => s.consequences.map((c) => c.kind)));
  const hasDamage = kinds.has('damage');
  const hasHealing = kinds.has('healing');
  const hasShield = kinds.has('shield');

  const active = stageName === 'impact' || stageName === 'cast' || stageName === 'travel';
  if (!active) return null;

  const shape = impactShape(kit);
  const size = 46 * shape.radiusScale * (perf.intensity === 'ultimate' ? 1.5 : perf.intensity === 'heavy' ? 1.25 : 1);

  const travelMs = perf.stages.find((stage) => stage.stage === 'travel')?.durationMs ?? 460;
  const deliveryVisible = stageName === 'travel' || stageName === 'impact';

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 22 }} aria-hidden>
      {hasDamage && deliveryVisible && (
        <>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              overflow: 'visible',
            }}
          >
            {/* SVG owns the endpoint geometry. A rotated CSS bar measures its
                percentage width against viewport width but its Y against
                viewport height, so it overshoots on every non-square screen. */}
            <line
              className={!still && stageName === 'travel' ? 'perf-generic-line' : undefined}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              pathLength={1}
              vectorEffect="non-scaling-stroke"
              stroke={edge}
              strokeWidth={perf.intensity === 'normal' ? 10 : 14}
              strokeLinecap="round"
              style={{
                opacity: still || stageName === 'impact' ? 0.78 : undefined,
                animationDuration: stageName === 'travel' ? `${travelMs}ms` : undefined,
                filter: `drop-shadow(0 0 8px ${accent})`,
              }}
            />
            <line
              className={!still && stageName === 'travel' ? 'perf-generic-line' : undefined}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              pathLength={1}
              vectorEffect="non-scaling-stroke"
              stroke={core}
              strokeWidth={perf.intensity === 'normal' ? 4 : 6}
              strokeLinecap="round"
              style={{
                opacity: still || stageName === 'impact' ? 0.98 : undefined,
                animationDuration: stageName === 'travel' ? `${travelMs}ms` : undefined,
              }}
            />
          </svg>
          {stageName === 'impact' && (
            <div
              className={still ? undefined : 'perf-burst'}
              style={{
                position: 'absolute',
                left: `${to.x}%`,
                top: `${to.y}%`,
                width: size,
                height: size * (0.4 + 0.6 * shape.roundness),
                marginLeft: -size / 2,
                marginTop: (-size * (0.4 + 0.6 * shape.roundness)) / 2,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${accent} 0%, ${core} 30%, ${edge} 58%, transparent 76%)`,
                filter: `drop-shadow(0 0 10px ${accent})`,
                opacity: still ? 0.9 : undefined,
              }}
            />
          )}
        </>
      )}

      {hasHealing && (
        <div
          className={still ? undefined : 'perf-bloom'}
          style={{
            position: 'absolute',
            left: `${to.x}%`,
            top: `${to.y}%`,
            width: size * 0.8,
            height: size * 0.8,
            marginLeft: (-size * 0.8) / 2,
            marginTop: (-size * 0.8) / 2,
            borderRadius: '50%',
            border: `2px solid ${accent}`,
            opacity: still ? 0.8 : undefined,
          }}
        />
      )}

      {hasShield && (
        <div
          className={still ? undefined : 'perf-brace'}
          style={{
            position: 'absolute',
            left: `${to.x}%`,
            top: `${to.y}%`,
            width: size,
            height: size * 1.3,
            marginLeft: -size / 2,
            marginTop: (-size * 1.3) / 2,
            borderRadius: 6,
            border: `2px solid ${accent}`,
            background: `linear-gradient(160deg, ${edge}33, transparent)`,
            opacity: still ? 0.8 : undefined,
          }}
        />
      )}
    </div>
  );
}
