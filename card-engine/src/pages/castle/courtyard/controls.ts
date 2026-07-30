/**
 * Input → normalized direction vector, kept separate from the scene so the
 * movement math is testable without a running Phaser game.
 *
 * Walking is the primary interaction on every platform: WASD/arrows on
 * desktop, tap-to-move on touch. The courtyard is one fixed screen, so every
 * destination is always visible — that makes tap-to-move strictly better than
 * a virtual stick here (no chrome over the painted scene, one gesture for
 * "go there", thumb-reachable regardless of where the stall sits).
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** Stop seeking once this close, or the hero jitters around the target. */
export const ARRIVAL_RADIUS = 6;

/**
 * Normalizes a raw direction so diagonals aren't faster than cardinals.
 * A zero vector stays zero rather than becoming NaN.
 */
export function normalize({ x, y }: Vec2): Vec2 {
  const len = Math.hypot(x, y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

/** Combines keyboard axes into a normalized vector. */
export function keyboardVector(
  left: boolean,
  right: boolean,
  up: boolean,
  down: boolean,
): Vec2 {
  return normalize({
    x: (right ? 1 : 0) - (left ? 1 : 0),
    y: (down ? 1 : 0) - (up ? 1 : 0),
  });
}

/**
 * Direction from the hero toward a tapped destination, or zero once arrived.
 * Collision handles obstacles by sliding — with a handful of static stalls
 * that is enough, and cheaper than pathfinding. A hero that snags on a corner
 * is a level-design fix (rounder collider, wider lane), not a routing one.
 */
export function seekVector(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.hypot(dx, dy) <= ARRIVAL_RADIUS) return { x: 0, y: 0 };
  return normalize({ x: dx, y: dy });
}
