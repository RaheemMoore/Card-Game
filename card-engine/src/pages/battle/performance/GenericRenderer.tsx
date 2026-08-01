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

  const active = stageName === 'impact' || stageName === 'cast';
  if (!active) return null;

  const shape = impactShape(kit);
  const size = 46 * shape.radiusScale * (perf.intensity === 'ultimate' ? 1.5 : perf.intensity === 'heavy' ? 1.25 : 1);

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const length = Math.hypot(dx, dy);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 22 }} aria-hidden>
      {hasDamage && (
        <>
          <div
            className={still ? undefined : 'perf-bolt'}
            style={{
              position: 'absolute',
              left: `${from.x}%`,
              top: `${from.y}%`,
              width: `${length}%`,
              height: perf.intensity === 'normal' ? 4 : 8,
              transformOrigin: '0 50%',
              transform: `rotate(${angle}deg)`,
              background: `linear-gradient(to right, transparent, ${core})`,
              borderRadius: 4,
              opacity: still ? 0.9 : undefined,
            }}
          />
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
              background: `radial-gradient(circle, ${core} 0%, ${edge} 45%, transparent 72%)`,
              opacity: still ? 0.85 : undefined,
            }}
          />
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
