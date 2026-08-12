import type { Vec2 } from './aim';

/**
 * Where a knocked-down Card-wright's cards land.
 *
 * The pretty part of this feature is the pop and the wobble. The FEATURE is that
 * every card lands somewhere he can walk to. Handoff §12.7 says it plainly:
 * random arcs are easy, guaranteed reachable landings are the real work — a card
 * inside a wall, in the pond, over a cliff edge or beyond the map is not a
 * setback, it is a character deleted from the player's collection by a physics
 * accident.
 *
 * So this module never asks "does this look good", only "can he stand there".
 * Validity is supplied by the caller as a predicate, because what makes a point
 * standable — bounds, blockers, water, which elevation plate it sits on — already
 * exists in the runtime and must not be reimplemented here to drift from it.
 *
 * Pure and deterministic: the caller passes the random source, so a scatter can
 * be replayed exactly in a test.
 */

export interface ScatterOptions {
  /** Where he fell. */
  origin: Vec2;
  /** How many cards are being thrown. */
  count: number;
  /** True when a card at this point could be walked to and picked up. */
  isValid: (point: Vec2) => boolean;
  /** [0, 1). Injected so tests are deterministic. */
  random: () => number;
  /** Closest a card may land to him, so they do not all pile on his feet. */
  minRadius?: number;
  /** Furthest a card may land. Beyond this the run to collect stops being fun. */
  maxRadius?: number;
  /** Cards land at least this far apart, so two pickups are two pickups. */
  minSeparation?: number;
}

/**
 * Defaults tuned against the courtyard, not in the abstract.
 *
 * At 190 units of walk speed, 150 units is about eight tenths of a second of
 * running — far enough that recovery is a real scramble, close enough that it
 * stays cute rather than punishing. Handoff §12.8: the weak protagonist must not
 * become a helpless one.
 */
const MIN_RADIUS = 55;
const MAX_RADIUS = 150;
const MIN_SEPARATION = 34;

/** How many directions are tried per card before the radius is relaxed. */
const ANGLE_ATTEMPTS = 12;

/** Radii tried, from maxRadius down to minRadius inclusive. */
const RINGS = 3;

/**
 * Choose a landing point for every card.
 *
 * Always returns exactly `count` points. A card that cannot find anywhere valid
 * falls back to the origin — he is standing there, so it is by definition
 * reachable, and a card under his feet is a worse pickup than a good one but an
 * infinitely better outcome than a lost character.
 */
export function scatterPoints(options: ScatterOptions): Vec2[] {
  const {
    origin,
    count,
    isValid,
    random,
    minRadius = MIN_RADIUS,
    maxRadius = MAX_RADIUS,
    minSeparation = MIN_SEPARATION,
  } = options;

  const placed: Vec2[] = [];
  const farEnoughFromOthers = (p: Vec2) =>
    placed.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= minSeparation);

  for (let i = 0; i < count; i++) {
    // Spread the starting angles around the circle so a four-card scatter reads
    // as a burst rather than as a clump on one side.
    const baseAngle = (i / Math.max(1, count)) * Math.PI * 2 + random() * 0.6;
    let chosen: Vec2 | null = null;

    // Try the full radius first, then closer in. A cramped corner of the
    // courtyard should still produce a scatter, just a tighter one.
    //
    // The last ring must BE minRadius. Dividing the span by the ring count
    // instead of by the gaps between rings stopped short of it — a corner where
    // only the innermost ring was standable found nothing and dumped every card
    // on the fallback, which is the one outcome this whole file exists to avoid.
    for (let ring = 0; ring < RINGS && !chosen; ring++) {
      const radius = maxRadius - ((maxRadius - minRadius) / (RINGS - 1)) * ring;

      for (let a = 0; a < ANGLE_ATTEMPTS && !chosen; a++) {
        const angle = baseAngle + (a / ANGLE_ATTEMPTS) * Math.PI * 2;
        const point = {
          x: origin.x + Math.cos(angle) * radius,
          y: origin.y + Math.sin(angle) * radius,
        };
        if (isValid(point) && farEnoughFromOthers(point)) chosen = point;
      }
    }

    // Last resort: on top of him. Ugly, reachable, and never loses the card.
    placed.push(chosen ?? { ...origin });
  }

  return placed;
}

/**
 * The visual hop a card makes on the way to its landing point.
 *
 * Position is interpolated on the GROUND and the height is added only when
 * drawing — the same rule the blast follows, and for the same reason: depth sorts
 * on ground contact, so a card that used its drawn height as its position would
 * sort as though it had landed further north than it did.
 *
 * `t` runs 0 to 1. Height is a simple parabola: nothing about a card tumbling out
 * of someone's hands needs gravity simulated.
 */
export function scatterArc(from: Vec2, to: Vec2, t: number, peakPx = 46) {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    x: from.x + (to.x - from.x) * clamped,
    y: from.y + (to.y - from.y) * clamped,
    heightPx: Math.sin(clamped * Math.PI) * peakPx,
  };
}

/** How long a card spends in the air, in milliseconds. */
export const SCATTER_FLIGHT_MS = 420;

/**
 * How close he must get to sweep a card up.
 *
 * Generous on purpose. Walk-over pickup that demands precision turns a playful
 * scramble into a chore, and the handoff is explicit that recovery should be
 * cute urgency rather than punishment.
 */
export const PICKUP_RADIUS = 26;
