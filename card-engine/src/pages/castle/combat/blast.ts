import type { Vec2 } from './aim';

/**
 * A closed shape a shot cannot pass through.
 *
 * Owned here rather than imported from the walk code. It used to come from the
 * top-down courtyard's `walkBlocking`, which meant the projectile system depended
 * on a module about where feet may stand — and when the top-down world was deleted
 * in the side-view move, ten lines of geometry were the only thing keeping a live
 * system tied to a dead one.
 */
export type Polygon = readonly (readonly [number, number])[];

/**
 * Crossing-number test. A point exactly on an edge may land either way, which is
 * immaterial here: shots are sampled along a substepped path, so no single
 * ambiguous sample decides a hit on its own.
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
 * The held-card blast: what a card throws, and how it travels.
 *
 * The Card-wright is deliberately weak and the card is the weapon, so this is the
 * first real verb in the game. It is data-driven from the start — `BlastDef` is
 * per-card, and nothing here branches on a card's name — because the milestone
 * after this one is two cards that share the system and read differently. A
 * `switch` on card id would be rewritten the same week it was written.
 *
 * It is NOT a general ability framework. The typed ability catalog already exists
 * for the turn-based tower, where a "turn" is a discrete event and timing is
 * bookkeeping; here everything is continuous and frame-stepped. Reusing that
 * timing model would be the wrong shape, so this reuses card IDENTITY and leaves
 * resolution alone. Handoff §12.3.
 *
 * Pure: stepped by the caller with a delta. No Phaser, no rendering.
 */

export interface BlastDef {
  /** World units per second. */
  speed: number;
  /** How far it flies before expiring, in world units. */
  rangePx: number;
  /** Collision radius against blockers and targets. */
  radiusPx: number;
  /** Damage applied on contact with a target. */
  damage: number;
  /** Palette/VFX key, resolved by the presentation layer. */
  visualKey: string;
}

/**
 * The starting card until real cards are wired to the hand.
 *
 * Tuned against the courtyard rather than in the abstract: at 190 units of walk
 * speed a 520-unit shot crosses about a third of the visible world, which is far
 * enough to be worth aiming and short enough that the player has to close in.
 */
export const DEFAULT_BLAST: BlastDef = {
  speed: 520,
  rangePx: 640,
  radiusPx: 10,
  damage: 10,
  visualKey: 'blast-default',
};

/**
 * Apply a charge level to a blast.
 *
 * A charged shot is bigger, faster and harder, and the three move together on
 * purpose: a shot that only did more damage would look identical to a tap, and
 * the player would have no way to read what they had built other than a number
 * they never see. Size and speed are what make a full charge legible across a
 * courtyard.
 *
 * Range deliberately does NOT scale. Letting a charged shot outrange an uncharged
 * one turns charging into the only correct option at distance, and the choice
 * between a quick tap and a held shot stops being a choice.
 */
export function scaleBlast(def: BlastDef, chargeLevel: number): BlastDef {
  const t = Math.max(0, Math.min(1, chargeLevel));
  return {
    ...def,
    speed: def.speed * (0.75 + 0.35 * t),
    radiusPx: Math.round(def.radiusPx * (0.7 + 0.6 * t)),
    damage: Math.round(def.damage * (0.4 + 1.6 * t)),
  };
}

export interface Projectile {
  id: number;
  pos: Vec2;
  /** Unit vector; fixed at spawn so the shot cannot be steered after release. */
  dir: Vec2;
  travelledPx: number;
  def: BlastDef;
  /** Set once it has hit something; the caller reads it, then reaps it. */
  outcome: 'flying' | 'hitBlocker' | 'hitTarget' | 'expired';
  /** Index into the targets array, when `outcome` is 'hitTarget'. */
  hitTargetIndex: number | null;
}

export interface BlastTarget {
  pos: Vec2;
  radiusPx: number;
  /** A dead target stops absorbing shots without having to be removed mid-step. */
  alive: boolean;
}

let nextId = 1;

/** Reset the id counter. Tests only — ids are otherwise never reused. */
export function resetProjectileIds() {
  nextId = 1;
}

export function spawnProjectile(origin: Vec2, dir: Vec2, def: BlastDef = DEFAULT_BLAST): Projectile {
  const len = Math.hypot(dir.x, dir.y) || 1;
  return {
    id: nextId++,
    pos: { ...origin },
    dir: { x: dir.x / len, y: dir.y / len },
    travelledPx: 0,
    def,
    outcome: 'flying',
    hitTargetIndex: null,
  };
}

/**
 * How far a projectile may move between collision samples, in world units.
 *
 * Collision is point-in-polygon at sampled positions, so the honest statement of
 * its limit is this number: a blocker thinner than SUBSTEP_PX can still be shot
 * through. That is acceptable because blockers here are rectangles drawn by hand
 * in the Editor around walls and buildings, and the thinnest in the courtyard is
 * an order of magnitude wider. If a genuinely thin blocker is ever needed, this
 * wants a swept segment test, not a smaller number.
 */
export const SUBSTEP_PX = 4;

/**
 * Advance one projectile.
 *
 * SUBSTEPPED, because a fast shot moves further in one frame than a wall is
 * thick. At 520 units/s a 16ms frame is 8.3 units and a 30ms hitch is 15.6 — wide
 * enough to step straight through a blocker and out the other side with no
 * collision reported at either end.
 *
 * Targets are checked before blockers so a target standing against a wall can
 * still be hit, rather than being shielded by the wall it is touching.
 */
export function stepProjectile(
  p: Projectile,
  dtMs: number,
  blockers: readonly Polygon[],
  targets: readonly BlastTarget[],
): Projectile {
  if (p.outcome !== 'flying') return p;

  const distance = (p.def.speed * dtMs) / 1000;
  const steps = Math.max(1, Math.ceil(distance / SUBSTEP_PX));
  const per = distance / steps;

  let { x, y } = p.pos;
  let travelled = p.travelledPx;

  for (let i = 0; i < steps; i++) {
    x += p.dir.x * per;
    y += p.dir.y * per;
    travelled += per;

    for (let t = 0; t < targets.length; t++) {
      const target = targets[t];
      if (!target.alive) continue;
      const reach = target.radiusPx + p.def.radiusPx;
      if (Math.hypot(target.pos.x - x, target.pos.y - y) <= reach) {
        return { ...p, pos: { x, y }, travelledPx: travelled, outcome: 'hitTarget', hitTargetIndex: t };
      }
    }

    if (blockers.some((poly) => pointInPolygon(x, y, poly))) {
      return { ...p, pos: { x, y }, travelledPx: travelled, outcome: 'hitBlocker', hitTargetIndex: null };
    }

    if (travelled >= p.def.rangePx) {
      return { ...p, pos: { x, y }, travelledPx: travelled, outcome: 'expired', hitTargetIndex: null };
    }
  }

  return { ...p, pos: { x, y }, travelledPx: travelled };
}

/**
 * How high the card is held, in world units above the feet.
 *
 * Used only for DRAWING. A projectile's position is its point on the ground
 * plane, because that is what the world's depth contract sorts on — an object's
 * depth is where it touches the ground. A blast whose depth came from its visible
 * height would sort as though it were standing further north than it is and draw
 * through the front of walls it should pass behind. Handoff §7.6.
 */
export const CARD_HEIGHT_PX = 58;

/**
 * Where the shot is born, on the ground plane.
 *
 * The projectile must read as coming from the CARD, not from the hero's chest —
 * handoff §3.4 is explicit, and it is the difference between "his card did that"
 * and "he has unexplained hand magic". Height is added at draw time; what this
 * returns is the ground point under the raised card, pushed along the aim so the
 * shot does not begin inside his own body.
 */
export function cardOrigin(feet: Vec2, aim: Vec2, forwardPx = 14): Vec2 {
  const len = Math.hypot(aim.x, aim.y) || 1;
  return {
    x: feet.x + (aim.x / len) * forwardPx,
    y: feet.y + (aim.y / len) * forwardPx,
  };
}
