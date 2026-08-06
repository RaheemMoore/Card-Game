/**
 * Angled collision for the courtyard, without Arcade's axis-aligned limit.
 *
 * WHY THIS EXISTS: Phaser's Arcade physics bodies are axis-aligned rectangles.
 * Rotating a sprite does not rotate its body, so a wall that leans with the
 * castle's perspective cannot be expressed as one Arcade body — its bounding box
 * would seal off ~80px of open paving at each end.
 *
 * The workaround was to stack six upright rectangles per wall. It works, but
 * each one jogs ~24px sideways against 34px-wide feet, so walking the wall
 * diagonally snags on every step. That reads as a bug, not as a stone wall.
 *
 * The courtyard has one walking character, no projectiles and no bouncing, so it
 * does not need a physics simulation at all — only "may the feet go here?".
 * That is a point-in-polygon test, which handles Raheem's traced quads exactly,
 * at any angle, with no steps. It also means he keeps tracing shapes the way the
 * perspective actually runs, instead of squaring everything off by hand.
 *
 * Arcade rectangles stay in use for the small object footprints. A brazier's
 * 8px foot is a square already and there is nothing to win there.
 */

export type Polygon = readonly (readonly [number, number])[];

export interface WalkRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Crossing-number test. A point exactly on an edge may land either way; that is
 * fine here because the feet are sampled as a rectangle, so a single ambiguous
 * corner never decides a move on its own.
 */
export function pointInPolygon(px: number, py: number, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Sample points for a feet rectangle: four corners plus each edge midpoint.
 * Corners alone let a polygon whose vertex pokes into the middle of an edge slip
 * through, which shows up as the hero standing inside a wall's corner.
 */
function samples(feet: WalkRect): [number, number][] {
  const { x, y, width: w, height: h } = feet;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return [
    [x, y], [x + w, y], [x, y + h], [x + w, y + h],
    [cx, y], [cx, y + h], [x, cy], [x + w, cy],
  ];
}

export function feetBlocked(feet: WalkRect, blockers: readonly Polygon[]): boolean {
  const pts = samples(feet);
  for (const poly of blockers) {
    for (const [px, py] of pts) {
      if (pointInPolygon(px, py, poly)) return true;
    }
  }
  return false;
}

export interface WalkResolution {
  x: number;
  y: number;
  /** True when the full requested move could not be taken. */
  blocked: boolean;
  /** True when the move was reduced to one axis and the hero slid along a face. */
  slid: boolean;
}

/**
 * Resolve a walk step against angled blockers.
 *
 * Try the whole move; if it is blocked, try each axis alone. Sliding on the
 * surviving axis is what makes an angled wall feel smooth — walking south-west
 * into a wall that leans south-west keeps the southward component and drops the
 * westward one, so the hero tracks the lean instead of stopping dead.
 *
 * `feet` is the feet rectangle at the CURRENT position; dx/dy is the step.
 */
export function resolveWalk(
  feet: WalkRect,
  dx: number,
  dy: number,
  blockers: readonly Polygon[],
): WalkResolution {
  const at = (ox: number, oy: number): WalkRect => ({ ...feet, x: feet.x + ox, y: feet.y + oy });

  if (!feetBlocked(at(dx, dy), blockers)) {
    return { x: feet.x + dx, y: feet.y + dy, blocked: false, slid: false };
  }
  if (dx !== 0 && !feetBlocked(at(dx, 0), blockers)) {
    return { x: feet.x + dx, y: feet.y, blocked: true, slid: true };
  }
  if (dy !== 0 && !feetBlocked(at(0, dy), blockers)) {
    return { x: feet.x, y: feet.y + dy, blocked: true, slid: true };
  }
  return { x: feet.x, y: feet.y, blocked: true, slid: false };
}
