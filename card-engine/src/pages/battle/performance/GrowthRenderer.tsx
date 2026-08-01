import type { MotionLevel } from '../../../vfx/types';
import type { ResolvedPerformance } from '../../../services/combat/performance/types';
import type { Point } from '../combatAnchors';
import { thicknessAt } from './materialStyle';

/**
 * The growth family — Rootgrasp's staged emergence and restraint.
 *
 * ## The rule this renderer exists to obey
 *
 * "Do not scale one finished vine from tiny to large and call it growth."
 *
 * So the geometry is a BRANCHING GRAPH of five roots erupting from five
 * different ground points, each revealed by a stroke draw-on with its own
 * delay. Roots arrive at different moments, the trunk before the forks. A
 * uniformly scaling shape reads as a projectile with a leaf texture no matter
 * how good the texture is.
 *
 * ## Why draw-on rather than a per-frame loop
 *
 * Each root is revealed by animating `stroke-dashoffset` from its own length
 * to zero — the path is drawn from the ground outward, which IS emergence.
 * Declaring it in CSS with a per-branch `animation-delay` gets the staggering
 * for free and hands the whole thing to the compositor: no React state per
 * frame, no rAF, no layout reads in a loop. It is also deterministic, so the
 * same cast replays identically in the Ability Theater, which is what makes
 * the theater usable for judging a change.
 *
 * ## Stage mapping
 *
 *  - `manifest` — ground tell, then roots draw on, staggered.
 *  - `impact`   — the constriction. Damage lands HERE, not when the first tip
 *                 appears, because being gripped is the moment that hurts.
 *  - `aftermath`— the bind persists, communicating `weakened` long enough to
 *                 read as a lasting condition rather than a flash.
 */

interface Props {
  performance: ResolvedPerformance;
  /** Ground anchor the roots erupt from. */
  from: Point;
  /** What is being seized. */
  to: Point;
  motionLevel: MotionLevel;
  stageName: string | null;
  /** Nominal length of the manifest stage, ms — drives the draw-on timing. */
  manifestMs: number;
}

/**
 * The branching graph. Authored and fixed rather than generated: the same cast
 * must look the same twice or the theater cannot be used to judge a change.
 * `emergeAt` is a fraction of the manifest stage and is what staggers them.
 */
const BRANCHES: readonly {
  originDx: number;
  reachDx: number;
  reachUp: number;
  emergeAt: number;
  forks: number;
}[] = [
  { originDx: 0, reachDx: 0, reachUp: 1, emergeAt: 0, forks: 2 },
  { originDx: -4.5, reachDx: -0.55, reachUp: 0.78, emergeAt: 0.18, forks: 1 },
  { originDx: 4.2, reachDx: 0.6, reachUp: 0.72, emergeAt: 0.26, forks: 1 },
  { originDx: -7.5, reachDx: -0.85, reachUp: 0.5, emergeAt: 0.48, forks: 0 },
  { originDx: 7.8, reachDx: 0.9, reachUp: 0.46, emergeAt: 0.58, forks: 0 },
];

/** Generous over-estimate of any root's path length in viewBox units. */
const DASH_LENGTH = 140;

export function GrowthRenderer({
  performance: perf,
  from,
  to,
  motionLevel,
  stageName,
  manifestMs,
}: Props) {
  const kit = perf.material;
  const [core, edge, accent] = kit.palette;
  const still = motionLevel === 'off';

  const before = stageName === 'charge' || stageName === 'cast';
  const gripping = stageName === 'impact';
  const bound = stageName === 'aftermath' || stageName === 'recover';
  // Everything from `manifest` onward is drawn; before that, nothing has
  // broken the surface yet.
  const emerged = !before;

  const baseWidth = perf.intensity === 'ultimate' ? 1.4 : 1;
  const drawMs = Math.max(120, manifestMs);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 22 }} aria-hidden>
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        {/* The ground tell. Present from the first beat — the floor is what
            warns you, and a grab with no warning reads as a bug. */}
        <ellipse
          cx={from.x}
          cy={from.y}
          rx={11}
          ry={2.6}
          fill="none"
          stroke={accent}
          strokeWidth={0.5}
          opacity={before ? 0.85 : 0.45}
          vectorEffect="non-scaling-stroke"
        />

        {emerged && (
          <g
            style={{
              // Tightening on the grip beat. Small — a big lurch would read as
              // the root snapping rather than closing.
              transformOrigin: `${from.x}px ${from.y}px`,
              transform: gripping && !still ? 'scale(0.965)' : 'scale(1)',
              transition: still ? undefined : 'transform 140ms ease-out',
            }}
          >
            {BRANCHES.map((branch, i) => {
              const originX = from.x + branch.originDx;
              const gap = from.y - to.y;
              const tipY = from.y - gap * branch.reachUp;
              const tipX = originX + (to.x - originX) * (0.35 + branch.reachDx * 0.9);
              const d = rootPath(originX, from.y, tipX, tipY, i);

              // Each branch draws on over its own slice of the manifest stage.
              const delay = branch.emergeAt * drawMs;
              const dur = drawMs * (1 - branch.emergeAt);

              const drawStyle = still
                ? undefined
                : {
                    strokeDasharray: DASH_LENGTH,
                    strokeDashoffset: DASH_LENGTH,
                    animation: `perf-root-draw ${Math.max(90, dur)}ms ease-out ${delay}ms forwards`,
                  };

              return (
                <g key={i}>
                  <path
                    d={d}
                    fill="none"
                    stroke={edge}
                    strokeWidth={thicknessAt(kit, 0.5, baseWidth) * 2.1}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={0.9}
                    style={drawStyle}
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={core}
                    strokeWidth={thicknessAt(kit, 0.5, baseWidth)}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    style={drawStyle}
                  />
                  {Array.from({ length: branch.forks }, (_, f) => {
                    const ft = 0.55 + f * 0.25;
                    const fx = originX + (tipX - originX) * ft;
                    const fy = from.y + (tipY - from.y) * ft;
                    const dir = f % 2 === 0 ? 1 : -1;
                    // Forks wait for their parent to reach them.
                    const forkDelay = delay + dur * ft;
                    return (
                      <path
                        key={f}
                        d={`M ${fx} ${fy} q ${dir * 2} ${-2.5} ${dir * 3.4} ${-5}`}
                        fill="none"
                        stroke={core}
                        strokeWidth={thicknessAt(kit, ft, baseWidth) * 0.6}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        style={
                          still
                            ? undefined
                            : {
                                strokeDasharray: DASH_LENGTH,
                                strokeDashoffset: DASH_LENGTH,
                                animation: `perf-root-draw ${Math.max(80, dur * 0.4)}ms ease-out ${forkDelay}ms forwards`,
                              }
                        }
                      />
                    );
                  })}
                </g>
              );
            })}
          </g>
        )}

        {/* The bind. Persists through aftermath so `weakened` reads as a
            condition the target is still in, not a moment that passed. */}
        {bound && (
          <ellipse
            cx={to.x}
            cy={to.y}
            rx={7}
            ry={3.2}
            fill="none"
            stroke={accent}
            strokeWidth={0.8}
            strokeDasharray="2 1.4"
            opacity={0.85}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}

/**
 * One root, from ground origin to tip.
 *
 * The kink is per-branch (`seed`) and deliberate: roots do not travel in clean
 * arcs, and five identical smooth curves read as tentacles. Fixed per index
 * rather than random so replays match.
 */
function rootPath(x0: number, y0: number, x1: number, y1: number, seed: number): string {
  const midX = (x0 + x1) / 2 + (seed % 2 === 0 ? 1.6 : -1.9);
  const midY = (y0 + y1) / 2 + (seed % 3 === 0 ? 1.2 : -0.8);
  return `M ${x0} ${y0} Q ${midX} ${midY} ${x1} ${y1}`;
}
