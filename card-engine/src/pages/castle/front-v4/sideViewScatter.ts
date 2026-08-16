import { ARENA, CASTLE_NO_DROP, PICKUP_RADIUS_PX } from './layout';

/**
 * Where his cards land when he is knocked down, in a world with one axis.
 *
 * WHY THIS IS NOT `combat/scatter.ts`. That module places cards on a circle —
 * three rings of twelve angles swept with cos/sin — which is exactly right in a
 * top-down courtyard and almost entirely off the floor here. Worse, it fails SOFT:
 * when no candidate on the circle passes the validity test it falls back to the
 * origin, so every card would land silently on his feet and be recovered the
 * instant he stood up. The knockdown would still play, the cards would still
 * scatter in the state machine, and nothing anywhere would report that the one
 * consequence in the fight had quietly stopped happening.
 *
 * So this module fails LOUD. If the constraints cannot be met it says so in its
 * return value and on the console, and the caller can surface it. A degraded
 * scatter is a bug in the layout, and a bug in the layout should look like a bug.
 *
 * THE COST THIS EXISTS TO IMPOSE: losing the hand has to mean a walk. Cards land
 * beyond automatic pickup reach, spread across the ground on both sides of him,
 * never behind the castle wall where they could not be fetched, and never inside
 * the creature that just floored him. Recovering one restores an attack, so the
 * walk is also the comeback.
 *
 * Pure and deterministic: same seed, same ground.
 */

export interface ScatterZone {
  minX: number;
  maxX: number;
}

export interface ScatterConstraints {
  /** The playable line. Nothing lands outside it. */
  bounds: ScatterZone;
  /** Ground a card may not occupy — the castle threshold, the creature's footprint. */
  exclusions: readonly ScatterZone[];
  /** How far apart two cards must be to be separately readable and separately worth walking to. */
  minSeparationPx: number;
  /** Nearest a card may land to him. Beyond pickup reach, or the knockdown costs nothing. */
  minSpreadPx: number;
  /** Furthest a card should ideally land. Not a hard limit; the scan will exceed it if it must. */
  maxSpreadPx: number;
}

export const DEFAULT_SCATTER_CONSTRAINTS: ScatterConstraints = {
  bounds: ARENA,
  exclusions: [CASTLE_NO_DROP],
  minSeparationPx: 64,
  // Comfortably past PICKUP_RADIUS_PX so nothing is collected by standing up.
  minSpreadPx: PICKUP_RADIUS_PX + 58,
  maxSpreadPx: 320,
};

export interface ScatterResult {
  /** Ground X per card, in the order the cards were given. */
  xs: number[];
  /**
   * True when the constraints could not all be met and the placement was relaxed.
   *
   * A caller may ignore it; a test may not. It is the difference between this
   * module and the radial one it replaces.
   */
  degraded: boolean;
  /** Which constraint gave way, for the console line and the dev snapshot. */
  degradedReason: string | null;
}

/** Sampling resolution of the ground scan, in world units. */
const SCAN_STEP_PX = 4;

export function sideViewScatter(
  heroX: number,
  count: number,
  constraints: ScatterConstraints = DEFAULT_SCATTER_CONSTRAINTS,
  seed = 1,
): ScatterResult {
  if (count <= 0) return { xs: [], degraded: false, degradedReason: null };

  // `minSpreadPx` is a HARD constraint, not a preference for where the scan
  // starts. Filtered here rather than left to the ideal-distance scoring, because
  // against the castle wall there is no ground on his west side and the scan
  // happily answered with the nearest thing east — a card two paces from his feet,
  // collected by standing up. The knockdown has to cost him a walk.
  const candidates = scanGround(constraints).filter(
    (x) => Math.abs(x - heroX) >= constraints.minSpreadPx,
  );
  if (candidates.length === 0) {
    return fail(heroX, count, 'no valid ground between the bounds, the exclusions and his own reach');
  }

  const rand = lcg(seed);
  const xs: number[] = [];
  let degradedReason: string | null = null;

  for (let i = 0; i < count; i++) {
    // Alternate sides so the hand is split around him rather than piled downwind,
    // and push each pair further out so four cards read as four places to walk to.
    const side = i % 2 === 0 ? 1 : -1;
    const rung = Math.floor(i / 2);
    const span = Math.max(0, constraints.maxSpreadPx - constraints.minSpreadPx);
    const ideal =
      heroX + side * (constraints.minSpreadPx + rung * span * 0.55 + rand() * span * 0.25);

    const full = nearestValid(candidates, ideal, xs, constraints.minSeparationPx);
    if (full !== null) {
      xs.push(full);
      continue;
    }

    const halved = nearestValid(candidates, ideal, xs, constraints.minSeparationPx / 2);
    if (halved !== null) {
      xs.push(halved);
      degradedReason ??= 'separation halved to fit the available ground';
      continue;
    }

    const anywhere = nearestValid(candidates, ideal, xs, 0);
    xs.push(anywhere ?? candidates[0]);
    degradedReason ??= 'separation abandoned; cards may overlap';
  }

  if (degradedReason) {
    // Loud on purpose. See the header: the failure this replaces was silent.
    console.error('[front-v4] sideViewScatter degraded', {
      reason: degradedReason,
      heroX,
      count,
      constraints,
      xs,
    });
  }

  return { xs, degraded: degradedReason !== null, degradedReason };
}

/** Every sampled ground position that is inside the bounds and outside every exclusion. */
function scanGround(c: ScatterConstraints): number[] {
  const out: number[] = [];
  for (let x = c.bounds.minX; x <= c.bounds.maxX; x += SCAN_STEP_PX) {
    if (c.exclusions.some((z) => x >= z.minX && x <= z.maxX)) continue;
    out.push(x);
  }
  return out;
}

/** The legal candidate closest to where we wanted the card, or null if none is legal. */
function nearestValid(
  candidates: readonly number[],
  ideal: number,
  placed: readonly number[],
  minSeparation: number,
): number | null {
  let best: number | null = null;
  let bestCost = Infinity;
  for (const x of candidates) {
    if (placed.some((p) => Math.abs(p - x) < minSeparation)) continue;
    const cost = Math.abs(x - ideal);
    if (cost < bestCost) {
      bestCost = cost;
      best = x;
    }
  }
  return best;
}

function fail(heroX: number, count: number, reason: string): ScatterResult {
  console.error('[front-v4] sideViewScatter has nowhere to put the hand', { reason, heroX, count });
  return {
    xs: Array.from({ length: count }, () => heroX),
    degraded: true,
    degradedReason: reason,
  };
}

/**
 * A small deterministic generator.
 *
 * Seeded from the knockdown count so two knockdowns in one fight do not produce
 * an identical pattern, while a test that passes a seed gets the same ground every
 * time. `Math.random()` would make the scatter untestable for the sake of variety
 * nobody asked for.
 */
function lcg(seed: number): () => number {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
