/**
 * Elevation — the reason the castle is safe.
 *
 * Raheem, 2026-08-07: "the castle is supposed to be on somewhat of a higher
 * ground, and I want monsters at the bottom of the cliff so they have to climb
 * up... it's the safe zone away from the monsters who are on the lower ground."
 *
 * So this is not a movement toy. Height is how the courtyard says who is safe,
 * and the climb is the thing the player earns. Everything else follows from that.
 *
 * WHAT THE GAME WAS MISSING
 *
 * Until now the world was one flat floor plus impassable walls, which made a
 * cliff and a castle wall literally the same object. A collider is a 2D floor
 * shape and carries no height, so there was nothing to ask "could I clear that?"
 * about. Adding a jump button to that world would have been a button that did
 * nothing. The missing piece is levels, not jumping — jumping is what levels
 * make possible.
 *
 * NOTHING HERE IS HERO-SPECIFIC.
 *
 * Every function takes the actor's state and returns new state. Monsters climb
 * with the same calls the player does, which is the whole point: if the hero can
 * reach a ledge the monster cannot, that has to be a fact about the geometry, not
 * an accident of which class the code lives in.
 *
 * AUTHORING
 *
 * Floor is drawn in the Editor as rectangles, one Editor layer per level
 * (`L20_GROUND_L0`, `L21_GROUND_L1`, ...). Plates may OVERLAP and the highest
 * level wins, so Raheem draws one big rectangle over the walkable world and then
 * lays terraces on top — no cutting holes, no precise tiling.
 *
 * Ramps (`L23_RAMPS`) are the stairs. While an actor's feet are inside a ramp,
 * climbing is permitted. That is the entire stair implementation: no slope maths,
 * no interpolation, one exception in one branch.
 */

import { feetBlocked, resolveWalk, pointInPolygon, type Polygon, type WalkRect } from './walkBlocking';

export interface LevelPlate {
  level: number;
  polygon: Polygon;
}

export interface ElevationMap {
  /** Sorted by level DESCENDING, so the first hit is the highest floor. */
  plates: LevelPlate[];
  ramps: Polygon[];
}

export const EMPTY_ELEVATION: ElevationMap = { plates: [], ramps: [] };

export function makeElevationMap(plates: LevelPlate[], ramps: Polygon[] = []): ElevationMap {
  return { plates: [...plates].sort((a, b) => b.level - a.level), ramps };
}

/**
 * The floor level at a point, or null for void — somewhere no plate covers.
 *
 * Highest wins, which is what lets plates overlap and makes authoring cheap.
 */
export function levelAt(x: number, y: number, map: ElevationMap): number | null {
  for (const plate of map.plates) {
    if (pointInPolygon(x, y, plate.polygon)) return plate.level;
  }
  return null;
}

export function onRamp(x: number, y: number, map: ElevationMap): boolean {
  return map.ramps.some((r) => pointInPolygon(x, y, r));
}

/**
 * Level is sampled at the feet-rect CENTRE, never the eight-point rect that
 * `feetBlocked` uses.
 *
 * That difference is deliberate and it must not drift: centre-sampling lets the
 * feet box overhang a lip by half its width, which is how a Zelda ledge reads.
 * Mixing the two modes makes drops fire half a body early on one axis and late on
 * the other, and the symptom looks like bad collision rather than bad sampling.
 */
export function centreOf(feet: WalkRect): [number, number] {
  return [feet.x + feet.width / 2, feet.y + feet.height / 2];
}

export interface LevelWalk {
  x: number;
  y: number;
  level: number;
  blocked: boolean;
  slid: boolean;
  /** True when this step took the actor down one or more levels. */
  dropped: boolean;
}

/**
 * A walk step that also respects height.
 *
 * Walls still come from BLOCK polygons. Cliffs do NOT — the plates block by
 * themselves, because a cliff is just the boundary where the floor stops being
 * this high. That means a terrace never needs a collider drawn along its lip, and
 * the two can never disagree about where the edge is.
 */
export function resolveWalkOnLevel(
  feet: WalkRect,
  dx: number,
  dy: number,
  blockers: readonly Polygon[],
  map: ElevationMap,
  level: number,
): LevelWalk {
  // No plates authored: behave exactly as the flat game always did.
  if (map.plates.length === 0) {
    const flat = resolveWalk(feet, dx, dy, blockers);
    return { ...flat, level, dropped: false };
  }

  const climbable = (nx: number, ny: number): number | false => {
    const target = levelAt(nx, ny, map);

    // Void. Fail OPEN and keep the current level: failing closed would turn every
    // unplated seam into an invisible wall in open grass, which is far harder to
    // diagnose than a missing ledge. `?levels=show` is how gaps get found.
    if (target === null) return level;

    if (target <= level) return target;
    return onRamp(nx, ny, map) ? target : false;
  };

  const tryStep = (ox: number, oy: number): LevelWalk | null => {
    const moved: WalkRect = { ...feet, x: feet.x + ox, y: feet.y + oy };
    if (feetBlocked(moved, blockers)) return null;

    const [cx, cy] = centreOf(moved);
    const target = climbable(cx, cy);
    if (target === false) return null;

    return {
      x: moved.x,
      y: moved.y,
      level: target,
      blocked: ox !== dx || oy !== dy,
      slid: (ox !== dx || oy !== dy) && (ox !== 0 || oy !== 0),
      dropped: target < level,
    };
  };

  // Same order as resolveWalk: full move, then X-only, then Y-only. Keeping the
  // fallback order identical is what makes sliding along a cliff lip feel the
  // same as sliding along a wall.
  return (
    tryStep(dx, dy) ??
    (dx !== 0 ? tryStep(dx, 0) : null) ??
    (dy !== 0 ? tryStep(0, dy) : null) ?? {
      x: feet.x,
      y: feet.y,
      level,
      blocked: true,
      slid: false,
      dropped: false,
    }
  );
}

export type JumpOutcome = 'landed' | 'blocked' | 'too-high' | 'void';

export interface JumpResult {
  x: number;
  y: number;
  level: number;
  outcome: JumpOutcome;
}

/** Horizontal reach of a jump, in pixels. ~109px at the shipped constants. */
export const JUMP_MS = 420;
export const JUMP_SPEED = 260;
export const JUMP_RISE = 34;
export const JUMP_REACH = (JUMP_SPEED * JUMP_MS) / 1000;

/** Height of the sprite's arc at normalised time t. Display only — never collision. */
export const jumpArc = (t: number) => 4 * JUMP_RISE * t * (1 - t);

/**
 * Where a jump ends up, as a pure function of where it started.
 *
 * Velocity is fixed at takeoff and there is no mid-air steering, which is exactly
 * what makes this testable without a running game — and what makes a failed jump
 * the ledge's answer rather than a twitch of the stick.
 *
 * A jump may land LOWER than it started; leaping off a terrace should just work.
 * It may never gain more than one level, ever. That cap is the whole difficulty
 * curve of the climb, so it lives here and not in a tuning table.
 */
export function resolveJump(
  feet: WalkRect,
  dirX: number,
  dirY: number,
  blockers: readonly Polygon[],
  map: ElevationMap,
  level: number,
): JumpResult {
  const len = Math.hypot(dirX, dirY) || 1;
  const landing: WalkRect = {
    ...feet,
    x: feet.x + (dirX / len) * JUMP_REACH,
    y: feet.y + (dirY / len) * JUMP_REACH,
  };

  const fail = (outcome: JumpOutcome): JumpResult => ({ x: feet.x, y: feet.y, level, outcome });

  if (feetBlocked(landing, blockers)) return fail('blocked');

  const [cx, cy] = centreOf(landing);
  const target = levelAt(cx, cy, map);

  if (target === null) return fail(map.plates.length === 0 ? 'landed' : 'void');
  if (target > level + 1) return fail('too-high');

  return { x: landing.x, y: landing.y, level: target, outcome: 'landed' };
}

/**
 * Plates too small to be a landing.
 *
 * A terrace narrower than the feet box in BOTH axes can be seen and never stood
 * on — no error, no feedback, just a place the player watches themselves bounce
 * off. Silent unreachability is the failure mode this whole system is most prone
 * to, so it gets a dev warning rather than a bug report three weeks later.
 *
 * Thin in ONE axis is fine and normal: that is a ledge.
 */
export function unlandablePlates(
  map: ElevationMap,
  feetWidth: number,
  feetHeight: number,
): { level: number; width: number; height: number }[] {
  const out: { level: number; width: number; height: number }[] = [];
  for (const plate of map.plates) {
    const xs = plate.polygon.map((p) => p[0]);
    const ys = plate.polygon.map((p) => p[1]);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    if (width < feetWidth && height < feetHeight) out.push({ level: plate.level, width, height });
  }
  return out;
}
