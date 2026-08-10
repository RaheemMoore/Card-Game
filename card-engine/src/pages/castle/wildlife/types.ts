export type WildlifeSpeciesId = 'red-fox' | 'forest-rabbit' | 'glowcap-tortoise';

export type WildlifeActivity = 'idle' | 'roam' | 'signature' | 'observe' | 'flee' | 'drink';

export type WildlifeFacing = 'down' | 'left' | 'right' | 'up';

export interface WildlifePoint {
  x: number;
  y: number;
}

export interface WildlifeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A patch of drinkable water, and the exact shape of it.
 *
 * `bounds` alone is not enough and measuring proved it: the pond's water is 72%
 * of its sprite and wildly irregular, so a rectangle either lets an animal wade
 * into the middle or stops it out in the grass. `contains` answers for a single
 * point, which is what both jobs actually need — "may I step here" and "am I at
 * the edge yet".
 *
 * The shape comes from the artwork, so no collider has to be drawn for a pond to
 * work. A scene may still supply its own for water that is not a sprite.
 */
export interface WildlifeWater {
  bounds: WildlifeBounds;
  contains(point: WildlifePoint): boolean;
}

export interface WildlifeRoutine {
  activity: Exclude<WildlifeActivity, 'flee'>;
  /** Relative likelihood after context and recent-memory rules are applied. */
  weight: number;
  durationMs: readonly [minimum: number, maximum: number];
  /** How long this activity must wait after it finishes before it can be selected again. */
  cooldownMs: number;
}

export interface WildlifeSpeciesProfile {
  id: WildlifeSpeciesId;
  label: string;
  movementStyle: 'hop' | 'toddle' | 'trot';
  roamSpeed: number;
  fleeSpeed: number;
  arrivalRadius: number;
  noticeRadius: number;
  fleeRadius: number;
  closePlayerResponse: 'flee' | 'observe';
  routines: readonly WildlifeRoutine[];
  signatureLabel: string;
  /**
   * How close to the water's edge counts as "at the water".
   *
   * A species drinks if and only if it has a `drink` routine — there is no second
   * boolean saying so, because two places to declare one fact is how a tortoise
   * ends up with a drinking clip it never plays. The tortoise simply has no such
   * routine.
   */
  drinkRange?: number;
  drinkLabel?: string;
  /**
   * How far past the waterline the muzzle reaches when the head is down.
   *
   * Without it the ripple lands on the shoreline immediately in front of the
   * paws — which is where the FEET are, not where the tongue is, and it read as
   * the water reacting to the wrong part of the animal.
   */
  muzzleReach?: number;
}

export interface WildlifeStimulus {
  now: number;
  playerPosition?: WildlifePoint;
  playerDistance?: number;
  /**
   * Whether there is drinkable water this animal could actually reach.
   *
   * A boolean, not a position, on purpose: the brain decides WHETHER to drink and
   * stays ignorant of where anything is, exactly as it is ignorant of sprites. The
   * agent owns "which pond and how do I get there". Keeping that line is what lets
   * a pond be dropped anywhere without the brain learning about the world.
   */
  waterAvailable?: boolean;
}

export interface WildlifeDecision {
  activity: WildlifeActivity;
  startedAt: number;
  endsAt: number;
  reason: 'routine' | 'player-nearby';
}

export interface WildlifeNeeds {
  /** Available effort. Rest restores it; movement spends it. */
  energy: number;
  /** Desire to explore or inspect something new. */
  curiosity: number;
  /** Desire to perform the species' characteristic activity. */
  signatureUrge: number;
  /** Desire to find water. Rises with time and faster with exertion. */
  thirst: number;
}

export interface WildlifeBrainSnapshot {
  current: WildlifeDecision | null;
  needs: WildlifeNeeds;
  recent: readonly WildlifeActivity[];
}

export type WildlifeRandom = () => number;

export interface WildlifeAnimationSet {
  idle: Partial<Record<WildlifeFacing, string>>;
  move: Partial<Record<WildlifeFacing, string>>;
  signature: Partial<Record<WildlifeFacing, string>>;
  observe?: Partial<Record<WildlifeFacing, string>>;
  /** Falls back to `signature` while the real head-down clips are being made. */
  drink?: Partial<Record<WildlifeFacing, string>>;
}

/**
 * Lets the courtyard decide whether a proposed step is legal. The first lab can
 * use the default open-floor resolver; Courtyard V2 can later inject its traced
 * wall resolver without giving the animal system a second collision model.
 */
export type WildlifeMoveResolver = (
  current: WildlifePoint,
  proposed: WildlifePoint,
) => WildlifePoint;
