import { useEffect, useRef } from 'react';
import type { MotionLevel } from '../../../vfx/types';
import type { ResolvedPerformance, Trajectory } from '../../../services/combat/performance/types';
import {
  assetAvailable,
  assetKitIdFor,
  getAssetKit,
  performanceAssetUrl,
} from '../../../data/combat/performance/assetKits';
import { resolveCombatAssetPath } from '../../../data/combat/types';
import { StreamBody } from './StreamBody';
import { AssetFrames } from './AssetFrames';
import type { Point } from '../combatAnchors';
import {
  edgeDecoration,
  particleCount,
  particleDrift,
  thicknessAt,
  wobbleAt,
  impactArrival,
} from './materialStyle';

/**
 * The lash family — one choreography, any material.
 *
 * ## What is shared and what is not
 *
 * SHARED (this file, identical for every element): the spline between cast
 * point and target, how it is sampled, how the head advances along it during
 * `travel`, target tracking, the snap at contact, the retract, and cleanup.
 *
 * PER-MATERIAL (`materialStyle.ts`, driven by the kit): thickness profile
 * along the body, wobble signature, edge decoration, particle shape and drift,
 * impact geometry. And colour, last and least.
 *
 * That division IS the deliverable. A Blood lash and a Fire lash run the same
 * ~200 lines of path code and are told apart in greyscale, which is what the
 * Ability Theater's three-way comparison exists to prove. If someone can only
 * tell them apart by hue, this file has failed and the fix belongs in
 * `materialStyle.ts`, not here.
 *
 * ## Also serves `drain`
 *
 * A drain is a lash that comes back. The `return`/`arrival` stages reverse the
 * head's travel and carry particles home to the caster; everything else is the
 * same code. That is why Sanguine Tithe needs no renderer of its own.
 *
 * ## Rendering approach
 *
 * One SVG `<path>` whose `d` is rewritten each frame from a ref-driven rAF —
 * no React state per frame, no layout reads in the loop. Particles are CSS
 * animations declared once at mount, so the browser owns them on the compositor
 * rather than JavaScript ticking each one.
 */

interface Props {
  performance: ResolvedPerformance;
  from: Point;
  to: Point;
  motionLevel: MotionLevel;
  progressRef: React.RefObject<number>;
  stageName: string | null;
  /**
   * Fraction of the performance at which the head reaches the target.
   *
   * Derived from the stage plan by the layer rather than assumed here, so the
   * beam finishes travelling on exactly the frame the impact stage begins and
   * the splash fires. A constant would drift the moment any duration changed.
   */
  contactProgress?: number;
  /** True during the impact stage, when the three pieces release in order. */
  releasing?: boolean;
  /** How long after contact the beam starts fading — the card releases first. */
  releaseDelayMs?: number;
  releaseMs?: number;
  /**
   * How long the impact art is on screen — impact plus aftermath.
   *
   * A `bloom` arrival needs this to time its own fade-out, so smoke dissipates
   * over its whole life instead of being cut off when the performance ends.
   */
  impactVisibleMs?: number;
}

/** How many points the spline is sampled at. */
const SAMPLES = 26;

/** Arrival style → the class that animates it. */
const IMPACT_ARRIVAL_CLASS: Record<ReturnType<typeof impactArrival>, string> = {
  punch: 'perf-impact-art',
  bloom: 'perf-impact-bloom',
  spread: 'perf-impact-spread',
};

export function LashRenderer({
  performance: perf,
  from,
  to,
  motionLevel,
  progressRef,
  stageName,
  contactProgress = 0.4,
  releasing = false,
  releaseDelayMs = 0,
  releaseMs = 160,
  impactVisibleMs = 1600,
}: Props) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const corePathRef = useRef<SVGPathElement | null>(null);
  const kit = perf.material;

  const isReturning = stageName === 'return' || stageName === 'arrival';
  // Direction reverses for the drain's homeward leg. The spline itself is not
  // recomputed — only which end the head is travelling toward — so the return
  // traces exactly the path the outbound leg took, which is what makes it read
  // as the same material coming back rather than as a second effect.
  const origin = isReturning ? to : from;
  const destination = isReturning ? from : to;

  const still = motionLevel === 'off';

  useEffect(() => {
    const write = (d: string) => {
      pathRef.current?.setAttribute('d', d);
      corePathRef.current?.setAttribute('d', d);
    };

    if (still) {
      // Static variant: the full connection, drawn once and held. Reduced
      // motion must still show WHAT connected to WHAT and what it was made
      // of — only the movement goes away.
      write(buildPath(origin, destination, kit, 1, 0, perf.trajectory));
      return;
    }

    let raf = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const p = progressRef.current ?? 0;
      // Reaches full extension exactly at contact, which is the frame the
      // impact stage begins and the splash appears. Previously a hardcoded
      // 0.45 against a real contact point near 0.49 — the beam arrived and
      // then waited, which is the gap Raheem spotted.
      const extend = Math.min(1, p / Math.max(0.05, contactProgress));
      const phase = p * Math.PI * 4;
      write(buildPath(origin, destination, kit, extend, phase, perf.trajectory));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [origin, destination, kit, progressRef, still, perf.trajectory, contactProgress]);

  const [core, edge, accent] = kit.palette;
  const decoration = edgeDecoration(kit);
  const baseWidth = perf.intensity === 'ultimate' ? 1.5 : perf.intensity === 'heavy' ? 1.2 : 1;

  /*
   * Generated impact art, when the manifest has an approved piece for this
   * material. Resolved through `assetAvailable` rather than by testing the
   * path, because every manifest row HAS a path — a path is a spec, not a
   * file. When nothing is available the procedural burst carries the moment
   * alone, which is the state the whole system shipped in.
   */
  const kitAssets = getAssetKit(assetKitIdFor(perf.form, kit.element));
  const impactAsset = assetAvailable(kitAssets?.impact) ? kitAssets.impact : undefined;
  /*
   * Reviewed element art wins over the procedural spline for every travelling
   * damage family. The current stream sprites are authored as tiling strips,
   * so their path is intentionally direct even when the recipe's abstract
   * trajectory says lob/whip; showing the real Moon, Bone, Fire, etc. material
   * is more faithful than replacing it with the old same-shape SVG beam.
   */
  const streamAsset = assetAvailable(kitAssets?.stream) ? kitAssets.stream : undefined;

  /*
   * The jet stops once it has landed.
   *
   * Through `aftermath` the splash is the thing being looked at, and a stream
   * still pouring into it competes for attention and reads as the ability
   * never having finished. Firing, landing, and then the aftermath sitting on
   * the boss alone is the sequence Raheem asked for.
   */
  const streaming =
    stageName === 'cast' || stageName === 'travel' || stageName === 'impact' ||
    stageName === 'return' || stageName === 'arrival';
  const impactSizePx =
    (impactAsset?.dimensions.width ?? 64) *
    (perf.intensity === 'ultimate' ? 1.6 : perf.intensity === 'heavy' ? 1.3 : 1);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 22 }}
      aria-hidden
    >
      {/* The beam's release. Fades AFTER the card has stopped, so the order
          reads as cause and effect: the card lets go, then the stream runs
          out, then only the mark on the target is left. */}
      <div
        className={releasing && !still ? 'perf-beam-release' : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          ['--release-ms' as string]: `${releaseMs}ms`,
          ['--release-delay' as string]: `${releaseDelayMs}ms`,
        }}
      >
      {streamAsset ? (
        (streaming || still) && <StreamBody
          from={origin}
          to={destination}
          kit={kit}
          motionLevel={motionLevel}
          progressRef={progressRef}
          src={performanceAssetUrl(streamAsset)}
          frames={streamAsset.frames?.map(resolveCombatAssetPath)}
          fps={streamAsset.fps}
          tile={streamAsset.dimensions}
          intensity={perf.intensity}
        />
      ) : (
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        {/* Dark under-stroke, bright over-stroke — the same two-pass trick the
            card fractures and the shield cracks already use. A single stroke
            of any colour vanishes against half the arenas in the game. */}
        <path
          ref={pathRef}
          fill="none"
          stroke={edge}
          strokeWidth={thicknessAt(kit, 0.5, baseWidth) * 1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
          vectorEffect="non-scaling-stroke"
        />
        <path
          ref={corePathRef}
          fill="none"
          stroke={core}
          strokeWidth={thicknessAt(kit, 0.5, baseWidth)}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {decoration.kind !== 'none' && (
          <EdgeDecoration
            from={origin}
            to={destination}
            kind={decoration.kind}
            density={decoration.density}
            color={accent}
            still={still}
          />
        )}
      </svg>
      )}
      </div>

      {/* OUTSIDE the release wrapper on purpose — the splash is the last thing
          to go, and it outlives the beam by the whole aftermath. */}
      {impactAsset && (stageName === 'impact' || stageName === 'aftermath') && (
        <AssetFrames
          src={performanceAssetUrl(impactAsset)}
          frames={impactAsset.frames?.map(resolveCombatAssetPath)}
          fps={impactAsset.fps}
          loop={impactAsset.loop}
          motionLevel={motionLevel}
          playKey={perf.id}
          className={still ? undefined : IMPACT_ARRIVAL_CLASS[impactArrival(kit)]}
          style={{
            // Only the bloom reads this; the punch and spread are fixed-length
            // arrivals that resolve well before the aftermath ends.
            ['--impact-life' as string]: `${impactVisibleMs}ms`,
            position: 'absolute',
            left: `${destination.x}%`,
            top: `${destination.y}%`,
            width: impactSizePx,
            height: impactSizePx,
            marginLeft: -impactSizePx / 2,
            marginTop: -impactSizePx / 2,
            // Pixel art must not be smoothed by the browser's scaler — the
            // whole reason it reads as a deliberate material is its hard edges.
            imageRendering: 'pixelated',
            zIndex: 1,
          }}
        />
      )}

      {!still && <Particles kit={kit} at={destination} />}
    </div>
  );
}

/**
 * The spline.
 *
 * A quadratic-ish sampled curve rather than a bezier so the per-material
 * wobble can be evaluated at every sample — a real bezier would give a
 * smoother line but only two control points to express material character
 * through, and character is the point.
 *
 * `extend` clips the tail so the body grows out of the cast point instead of
 * appearing whole. `phase` advances the wobble so the body is alive.
 */
function buildPath(
  from: Point,
  to: Point,
  kit: Parameters<typeof thicknessAt>[0],
  extend: number,
  phase: number,
  trajectory: Trajectory,
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Perpendicular, so displacement pushes ACROSS the direction of travel.
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const last = Math.max(1, Math.round(SAMPLES * extend));
  const parts: string[] = [];

  for (let i = 0; i <= last; i++) {
    const t = i / SAMPLES;
    let offset: number;

    switch (trajectory) {
      case 'beam':
        // A pressurised stream. Almost straight — just enough live play that it
        // is not a ruler-drawn line, and it SHRINKS toward the target because a
        // jet is steadiest where it lands. The wobble signature is scaled right
        // down rather than removed, so blood still moves like blood.
        offset = wobbleAt(kit, t, phase) * len * 0.18 * (1 - t);
        break;

      case 'arc':
        // Ballistic lob. The arc is in the SCREEN-VERTICAL axis, not the path
        // normal — a thrown thing falls downward regardless of which way it was
        // thrown, and using the normal would tilt the arc sideways on a
        // diagonal shot and stop reading as gravity.
        return buildArcPath(from, dx, dy, last, kit, phase, len);

      case 'whip':
      default:
        offset = wobbleAt(kit, t, phase) * len;
        break;
    }

    const x = from.x + dx * t + nx * offset;
    const y = from.y + dy * t + ny * offset;
    parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return parts.join(' ');
}

/** The lob. Height is applied straight up the screen so it reads as gravity. */
function buildArcPath(
  from: Point,
  dx: number,
  dy: number,
  last: number,
  kit: Parameters<typeof thicknessAt>[0],
  phase: number,
  len: number,
): string {
  const parts: string[] = [];
  const height = Math.min(26, len * 0.42);
  for (let i = 0; i <= last; i++) {
    const t = i / SAMPLES;
    const lift = 4 * t * (1 - t) * height;
    const jitter = wobbleAt(kit, t, phase) * len * 0.1;
    const x = from.x + dx * t + jitter;
    const y = from.y + dy * t - lift;
    parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return parts.join(' ');
}

/**
 * Beads, crests, forks or barbs laid along the body.
 *
 * Static positions, deliberately: these are the silhouette cue, and a
 * silhouette that jitters stops being readable. The body moves; its
 * decoration marks it.
 */
function EdgeDecoration({
  from,
  to,
  kind,
  density,
  color,
  still,
}: {
  from: Point;
  to: Point;
  kind: 'beads' | 'crest' | 'forks' | 'barbs';
  density: number;
  color: string;
  still: boolean;
}) {
  const count = Math.round(6 * density);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const marks = Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / (count + 1);
    const x = from.x + dx * t;
    const y = from.y + dy * t;
    return { key: i, x, y, t };
  });

  return (
    <g opacity={still ? 0.9 : 0.75}>
      {marks.map((m) => {
        if (kind === 'beads') {
          // Heavier toward the head, matching blood's thickness profile.
          return <circle key={m.key} cx={m.x} cy={m.y} r={0.5 + m.t * 0.9} fill={color} />;
        }
        if (kind === 'crest') {
          return (
            <path
              key={m.key}
              d={`M ${m.x - 1} ${m.y} Q ${m.x} ${m.y - 1.4} ${m.x + 1} ${m.y}`}
              stroke={color}
              strokeWidth={0.5}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          );
        }
        if (kind === 'forks') {
          // Forks lean along the direction of travel and get longer toward the
          // tip — a flame's tongues, not a row of spikes.
          const l = 1 + m.t * 1.8;
          return (
            <path
              key={m.key}
              d={`M ${m.x} ${m.y} L ${m.x + nx * l} ${m.y + ny * l}`}
              stroke={color}
              strokeWidth={0.45}
              vectorEffect="non-scaling-stroke"
            />
          );
        }
        // barbs — alternate sides, perpendicular, short and hard.
        const side = m.key % 2 === 0 ? 1 : -1;
        return (
          <path
            key={m.key}
            d={`M ${m.x} ${m.y} L ${m.x + nx * 1.3 * side} ${m.y + ny * 1.3 * side}`}
            stroke={color}
            strokeWidth={0.55}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
}

/**
 * Shed particles at the contact point.
 *
 * Declared once and animated by CSS — the browser owns them after mount, so
 * a fourteen-ember fire impact costs no JavaScript per frame. Positions are
 * derived from the material's drift vector, which is what makes blood fall and
 * embers rise.
 */
function Particles({
  kit,
  at,
}: {
  kit: Parameters<typeof particleCount>[0];
  at: Point;
}) {
  const n = particleCount(kit);
  const drift = particleDrift(kit);
  const [, , accent] = kit.palette;

  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        // Deterministic spread rather than Math.random(): the same performance
        // replayed in the theater must look the same twice, or a reviewer
        // cannot tell a tweak from noise.
        const spread = ((i / Math.max(1, n - 1)) - 0.5) * 2;
        const dx = (drift.dx + spread * drift.spread) * 4;
        const dy = drift.dy * 4;
        return (
          <span
            key={i}
            className="perf-particle"
            style={{
              position: 'absolute',
              left: `${at.x}%`,
              top: `${at.y}%`,
              width: 4,
              height: 4,
              marginLeft: -2,
              marginTop: -2,
              borderRadius: kit.particle === 'shard' ? 0 : '50%',
              background: accent,
              // Per-particle custom properties, read by one shared keyframe.
              ['--pdx' as string]: `${dx}vh`,
              ['--pdy' as string]: `${dy}vh`,
              animationDelay: `${i * 12}ms`,
            }}
          />
        );
      })}
    </>
  );
}
