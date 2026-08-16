import { ARENA, FRONT_V4_WALK_SPEED, GROUND_Y, HERO_BODY, JELLY_BODY } from './layout';

/**
 * The Ember Jelly's side-view leap: the one intentional new enemy behaviour here.
 *
 * WHY IT IS A MODULE AND NOT A TWEEN. A Phaser tween would put the trajectory
 * inside a callback chain, where the only way to ask "could he have got out of the
 * way?" is to play it and see. The whole reason this creature is allowed to leave
 * the ground is that the answer is arithmetic — `leapIsEvadable()` at the bottom of
 * this file simulates the thing at 60Hz with no engine attached, and the tests hold
 * the tuning to it. Fairness that can only be checked by eye is fairness that
 * silently breaks the first time someone shortens the tell to make it feel snappier.
 *
 * THE SHAPE OF THE ATTACK, and why the numbers are arranged the way they are:
 *
 *   It lands ON the spot he was standing when the tell began — not past him.
 *   That is what makes standing still lethal, which is what makes the tell mean
 *   something. The arc rises high enough to clear his head at the crossing, so a
 *   player who runs TOWARD it passes underneath and comes out behind, and the
 *   creature lands on empty ground with its back to him and 900ms of recovery to
 *   be punished in. Running away works too. Both are real answers; only standing
 *   there is not.
 *
 *   Nothing after launch reads the player's position. `beginLeap` takes a captured
 *   X and returns a committed start/landing pair, and `stepLeap` only advances a
 *   clock. A leap that homed would make the tell decorative and would punish the
 *   exact reaction it is asking for.
 *
 * The hit is a REAL BODY OVERLAP, sampled every frame, and the geometry does the
 * work: near takeoff and near landing the creature is low and can hit him, and
 * over the top of the arc it physically cannot. There is no "dangerous window"
 * constant, because a window is a second opinion about the arc that can disagree
 * with the drawing. What you see is what hits you.
 */

export interface LeapTuning {
  /** Peak height of the creature's UNDERSIDE above the ground line, in world units. */
  apexPx: number;
  /** Takeoff to landing. */
  durationMs: number;
  /**
   * A leap must cover at least this much ground.
   *
   * Without it, a captured X almost on top of the creature produces a hop of a few
   * units that reads as a stumble and cannot be walked out of, because there is
   * nowhere to walk to.
   */
  minTravelPx: number;
  /**
   * Required daylight between the creature's underside and the top of his head at
   * the moment the two cross, in world units.
   *
   * Asserted against `apexPx` as a static invariant rather than trusted: if the
   * apex is ever lowered for feel, running underneath stops being possible and the
   * attack silently becomes unavoidable for the half of players who answer it by
   * closing distance.
   */
  clearancePx: number;
  bodyHalfWidthPx: number;
  bodyHeightPx: number;
  /**
   * How far from an arena bound the creature is allowed to land.
   *
   * THIS IS THE COUNTER-EXAMPLE THE CORNER TEST FOUND, and it is the only rule
   * here that exists purely for fairness rather than for physics. Pinned against
   * the castle with the creature to his east, he has no ground to retreat to and
   * cannot pass it; a leap aimed at his feet is then unavoidable, and the tell is
   * a countdown rather than a warning. Holding the landing a body-contact away
   * from the wall leaves a cornered man a sliver of floor to survive on — he still
   * ends up with a creature in his face and has earned nothing but a moment, which
   * is the correct amount of mercy.
   *
   * Half of it is plain physics anyway: landing centred on the bound would put
   * half the body inside the castle.
   */
  boundInsetPx: number;
}

/**
 * Every knob the leap is made of, in one object.
 *
 * PROVISIONAL. These are a first playable arc, not canon — §12.1 asks for the
 * duration, apex and collision window to live together precisely so they can be
 * argued with as a set after somebody has watched it.
 */
export const LEAP_TUNING: LeapTuning = {
  /**
   * 260, not the 210 this started at.
   *
   * 210 cleared his head standing still and failed the corner: pinned against the
   * castle with the creature 96 units east, his only way out is past it, so the
   * two must cross while it is still early in its arc and low. At 210 the daylight
   * at the crossing was under three units — technically a miss, and the kind of
   * margin that becomes a hit the moment anything else is tuned. Raising the apex
   * steepens the early climb, which is what the pass actually needs.
   */
  apexPx: 260,
  durationMs: 780,
  /**
   * 90, and it MUST stay below CONSTRUCT_TUNING.preferredRangePx (96).
   *
   * It started at 120, which is above the range the creature commits from — so
   * every ordinary leap was silently overridden by the floor and landed 24 units
   * past him instead of on the ground he was standing on. A minimum meant for the
   * degenerate case was quietly governing the normal one.
   */
  minTravelPx: 90,
  clearancePx: 24,
  bodyHalfWidthPx: JELLY_BODY.halfWidthPx,
  bodyHeightPx: JELLY_BODY.heightPx,
  /** Its half-width plus his, plus a few units so the survival is visible rather than pixel-thin. */
  boundInsetPx: JELLY_BODY.halfWidthPx + HERO_BODY.halfWidthPx + 8,
};

export interface LeapState {
  startX: number;
  /** Committed at launch. Nothing may write this afterwards. */
  landingX: number;
  durationMs: number;
  elapsedMs: number;
  done: boolean;
}

export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Commit to a trajectory.
 *
 * `capturedHeroX` comes from the construct's own `committedTarget`, which it takes
 * once at the start of the telegraph and never updates — so the commitment point
 * is already correct upstream and this function does not need to know when "now"
 * is. It only decides where that intention lands on this ground.
 */
export function beginLeap(
  jellyX: number,
  capturedHeroX: number,
  bounds: { minX: number; maxX: number } = ARENA,
  t: LeapTuning = LEAP_TUNING,
): LeapState {
  const delta = capturedHeroX - jellyX;
  const dir = delta === 0 ? 1 : Math.sign(delta);
  const travel = Math.max(Math.abs(delta), t.minTravelPx);
  const landingX = clamp(
    jellyX + dir * travel,
    bounds.minX + t.boundInsetPx,
    bounds.maxX - t.boundInsetPx,
  );

  return { startX: jellyX, landingX, durationMs: t.durationMs, elapsedMs: 0, done: false };
}

export function stepLeap(s: LeapState, dtMs: number): LeapState {
  const elapsedMs = Math.min(s.durationMs, s.elapsedMs + dtMs);
  return { ...s, elapsedMs, done: elapsedMs >= s.durationMs };
}

/** Normalised progress, 0 at takeoff and 1 at landing. */
export const leapProgress = (s: LeapState) => (s.durationMs <= 0 ? 1 : s.elapsedMs / s.durationMs);

/**
 * Where it is right now: ground X, and how far its underside is off the floor.
 *
 * `4·apex·t·(1−t)` is a parabola through (0,0) and (1,0) peaking at exactly `apex`
 * halfway. Deterministic and closed-form, so a test can assert the apex without
 * stepping to find it.
 */
export function leapPos(s: LeapState, t: LeapTuning = LEAP_TUNING): { x: number; heightPx: number } {
  const p = leapProgress(s);
  return {
    x: s.startX + (s.landingX - s.startX) * p,
    heightPx: 4 * t.apexPx * p * (1 - p),
  };
}

/** The creature's world-space box at its current point on the arc. */
export function leapBody(s: LeapState, groundY = GROUND_Y, t: LeapTuning = LEAP_TUNING): Rect {
  const { x, heightPx } = leapPos(s, t);
  const bottom = groundY - heightPx;
  return {
    left: x - t.bodyHalfWidthPx,
    right: x + t.bodyHalfWidthPx,
    top: bottom - t.bodyHeightPx,
    bottom,
  };
}

/** Resting box, for the grounded phases the wrapper still owns. */
export function groundedBody(x: number, groundY = GROUND_Y, t: LeapTuning = LEAP_TUNING): Rect {
  return {
    left: x - t.bodyHalfWidthPx,
    right: x + t.bodyHalfWidthPx,
    top: groundY - t.bodyHeightPx,
    bottom: groundY,
  };
}

export const rectsOverlap = (a: Rect, b: Rect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/**
 * Stop him walking through the creature while it is standing on the ground.
 *
 * Not decoration, and not merely §9's "must not become permanently
 * interpenetrated": this is load-bearing for fairness. Cornered against the castle
 * with the creature to his east, his only escape is past it — and if he can walk
 * INTO it during the tell he arrives flush against its body and is caught by the
 * takeoff. Blocked, he stops one body-width short and the leap clears him. The
 * evasion proof and the scene must use the same rule or the proof is about a
 * different game.
 *
 * Only applies while it is grounded. Once it is airborne he is meant to run under
 * it, which is the entire point.
 */
export function blockGroundedApproach(
  desiredX: number,
  fromX: number,
  jellyX: number,
  t: LeapTuning = LEAP_TUNING,
  heroBody: { halfWidthPx: number } = HERO_BODY,
): number {
  const gap = t.bodyHalfWidthPx + heroBody.halfWidthPx;
  const west = jellyX - gap;
  const east = jellyX + gap;
  if (desiredX > west && desiredX < east) {
    // Push back to whichever face he came from, so a hero already overlapping is
    // eased out rather than teleported across.
    return fromX <= jellyX ? west : east;
  }
  return desiredX;
}

/**
 * Does the creature, where it actually is, touch him, where he actually is?
 *
 * Both boxes, every frame. Not "did it enter the attack phase" — a miss has to
 * stay a miss, and a phase-entry test would charge him for an attack that sailed
 * over his head, which is the precise experience of being punished for playing
 * correctly.
 */
export function leapHitsHero(
  s: LeapState,
  hero: { x: number },
  groundY = GROUND_Y,
  t: LeapTuning = LEAP_TUNING,
  heroBody: { halfWidthPx: number; heightPx: number } = HERO_BODY,
): boolean {
  return rectsOverlap(leapBody(s, groundY, t), {
    left: hero.x - heroBody.halfWidthPx,
    right: hero.x + heroBody.halfWidthPx,
    top: groundY - heroBody.heightPx,
    bottom: groundY,
  });
}

/**
 * Is the arc physically tall enough to run under?
 *
 * Closed form: at the apex the underside sits `apexPx` off the floor and his head
 * is at `heroHeight`, so the daylight between them is the difference. Separate
 * from the evasion simulation because they fail for different reasons and a single
 * boolean would not say which — this one breaks when the arc is lowered, and
 * `leapIsEvadable` breaks when the tell is shortened or he is slowed down.
 */
export function apexClearsHero(
  t: LeapTuning = LEAP_TUNING,
  heroBody: { heightPx: number } = HERO_BODY,
): boolean {
  return t.apexPx - heroBody.heightPx >= t.clearancePx;
}

const FIXED_STEP_MS = 1000 / 60;

export interface EvadeOptions {
  /** Ground units between him and the creature when the tell begins. */
  commitDistancePx: number;
  /** Which side of the creature he is on: -1 west of it, +1 east of it. */
  heroSide: -1 | 1;
  /** Where the creature stands. */
  jellyX: number;
  telegraphMs: number;
  walkSpeed?: number;
  /**
   * Human allowance before he starts moving, in milliseconds.
   *
   * The tell is not worth its length if the proof assumes a player who begins
   * walking on the exact frame it appears.
   */
  reactionMs?: number;
  bounds?: { minX: number; maxX: number };
  tuning?: LeapTuning;
  groundY?: number;
  heroBody?: { halfWidthPx: number; heightPx: number };
}

export interface EvadeOutcome {
  /** True when at least one direction gets him out. He only needs one. */
  evadable: boolean;
  /** Which way out worked, for a failing test to report something actionable. */
  escapes: Array<-1 | 1>;
}

/**
 * Simulate the whole exchange and report whether he could have survived it.
 *
 * THE INVARIANT THIS ENFORCES, and it is not a preference: the Card-wright has no
 * dodge, no roll, no shield and no jump, so an attack he cannot walk out of is an
 * attack no amount of skill answers. `construct.ts` states the grounded version of
 * this for its melee strike; that version is scalar and assumes he can retreat in
 * any direction, which was true in a top-down courtyard and is not true here,
 * where retreat is one axis with a castle wall at one end of it.
 *
 * IT ONLY COVERS A HERO WHO IS FREE TO WALK. `actionState.walkScale` returns 0 for
 * every phase except `explore` — the firing stance is planted — so a player who
 * commits to a charge while the tell is up has chosen to eat it. That is intended
 * risk and the reason the evade scenario starts him in `explore`.
 */
export function evaluateEvade(opts: EvadeOptions): EvadeOutcome {
  const t = opts.tuning ?? LEAP_TUNING;
  const bounds = opts.bounds ?? ARENA;
  const groundY = opts.groundY ?? GROUND_Y;
  const heroBody = opts.heroBody ?? HERO_BODY;
  const walkSpeed = opts.walkSpeed ?? FRONT_V4_WALK_SPEED;
  const reactionMs = opts.reactionMs ?? 150;

  const heroStartX = clamp(
    opts.jellyX + opts.heroSide * opts.commitDistancePx,
    bounds.minX,
    bounds.maxX,
  );

  const escapes: Array<-1 | 1> = [];
  for (const escapeDir of [-1, 1] as const) {
    if (survives(escapeDir)) escapes.push(escapeDir);
  }
  return { evadable: escapes.length > 0, escapes };

  function survives(escapeDir: -1 | 1): boolean {
    // The construct captures its target at the START of the tell, so this is the
    // number the leap will be aimed at no matter what he does afterwards.
    const capturedHeroX = heroStartX;
    let heroX = heroStartX;
    let clock = 0;

    while (clock < opts.telegraphMs) {
      const dt = Math.min(FIXED_STEP_MS, opts.telegraphMs - clock);
      clock += dt;
      if (clock <= reactionMs) continue;
      // Blocked by the grounded creature, exactly as the scene blocks him. Without
      // this the cornered hero walks into its body and is caught by the takeoff.
      heroX = blockGroundedApproach(walk(heroX, escapeDir, dt), heroX, opts.jellyX, t, heroBody);
    }

    let leap = beginLeap(opts.jellyX, capturedHeroX, bounds, t);
    // Sampled before the first advance too: a hero standing inside the creature's
    // resting box at takeoff is already touching it.
    if (leapHitsHero(leap, { x: heroX }, groundY, t, heroBody)) return false;

    while (!leap.done) {
      leap = stepLeap(leap, FIXED_STEP_MS);
      heroX = walk(heroX, escapeDir, FIXED_STEP_MS);
      if (leapHitsHero(leap, { x: heroX }, groundY, t, heroBody)) return false;
    }
    return true;
  }

  function walk(x: number, dir: -1 | 1, dtMs: number) {
    return clamp(x + (dir * walkSpeed * dtMs) / 1000, bounds.minX, bounds.maxX);
  }
}

/** The boolean form, for the assertion that matters most. */
export const leapIsEvadable = (opts: EvadeOptions): boolean => evaluateEvade(opts).evadable;

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
