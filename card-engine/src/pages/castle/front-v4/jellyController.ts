import {
  CONSTRUCT_TUNING,
  forcePhase,
  initialConstruct,
  isHittable,
  resetConstruct,
  stepConstruct,
  type ConstructHit,
  type ConstructPhase,
  type ConstructState,
} from '../combat/construct';
import { ARENA, GROUND_Y, JELLY_BODY } from './layout';
import {
  LEAP_TUNING,
  beginLeap,
  groundedBody,
  leapBody,
  leapHitsHero,
  leapPos,
  stepLeap,
  type LeapState,
  type LeapTuning,
  type Rect,
} from './jellyLeap';

/**
 * The Ember Jelly in a world with gravity in it, WITHOUT forking the creature.
 *
 * `combat/construct.ts` is untouched and untouchable here — another branch is
 * working in those files, and more to the point its state machine is already the
 * right one: wake, notice, turn, close, tell, commit, recover, flinch, die, return.
 * All of that is perspective-free. The only thing the side view changes is what
 * "commit" means: instead of a lunge drawn as travel it is a leap that genuinely
 * leaves the ground, and while it is up there the creature's position belongs to a
 * parabola rather than to the state machine.
 *
 * So this is a SUPERSTATE, not a rewrite. Two modes:
 *
 *   ground  — `stepConstruct` runs exactly as it does in the courtyard, with both
 *             actors on the same Y so its 2D vector maths degenerates cleanly to
 *             one axis. Position is then clamped and re-pinned, because the
 *             construct never clamps its own — approach and knockback will walk it
 *             off the end of the world otherwise.
 *
 *   leaping — the wrapper owns the clock and the position. `stepConstruct` is not
 *             called at all.
 *
 * THREE THINGS THAT LOOK LIKE DETAILS AND ARE NOT:
 *
 * 1. The construct emits its melee strike on the FIRST step of `attack`, not on
 *    entry. Because the wrapper stops stepping it at the moment of entry, that
 *    strike never happens — which is what we want, since the leap replaces it. Any
 *    strike that does come back is discarded explicitly rather than trusted not to
 *    exist, because "it can't happen" is how it happens.
 *
 * 2. Freezing the AI would NOT protect it mid-flight. `applyHits` runs before the
 *    `aiEnabled` check inside `stepConstruct`, so a frozen construct still flinches
 *    into `hitReact` — and a flinch mid-leap would teleport it out of its own arc.
 *    Withholding the hits is the only thing that actually works.
 *
 * 3. It is UNHITTABLE while airborne, and that is a design choice with a cost. A
 *    shot passes through it. The alternative — queueing damage until it lands —
 *    banks a knockback that then fires from a position the player never aimed at,
 *    and a creature that teleports on touchdown is worse than one that was briefly
 *    out of reach. The commitment cuts both ways: it cannot change its mind, and
 *    neither can you.
 *
 * Pure. No Phaser.
 */

export type JellyMode = 'ground' | 'leaping';

export interface JellyState {
  mode: JellyMode;
  construct: ConstructState;
  leap: LeapState | null;
  /** Height of the underside above the ground line. Zero unless airborne. */
  heightPx: number;
  /** One hit per leap, latched — a leap is one attack, however long the bodies touch. */
  struckThisLeap: boolean;
}

export type JellyEvent = 'leapStart' | 'leapLand' | 'defeated' | 'revived';

export interface JellyHitOnHero {
  kind: 'light' | 'strong';
  /** Which way to shove him: away from where the creature came down. */
  dirX: -1 | 1;
}

export interface JellyStepInput {
  heroX: number;
  heroDownedOrGraced: boolean;
  /** Blast damage that landed this frame. Ignored while airborne — see (3) above. */
  hits: ConstructHit[];
}

export interface JellyStepResult {
  state: JellyState;
  heroHit: JellyHitOnHero | null;
  events: JellyEvent[];
}

/**
 * The strip of world the creature lives in.
 *
 * `groundY` is here rather than imported as a constant because the surface is
 * authored in Phaser Editor now: move the GROUND rectangle and everything that
 * stands on it has to follow, or the creature hops along an invisible line where
 * the floor used to be. It defaults to the layout's value, which is what the
 * scene uses until an authored ground is found.
 */
export interface JellyWorld {
  minX: number;
  maxX: number;
  groundY: number;
}

export const DEFAULT_JELLY_WORLD: JellyWorld = { ...ARENA, groundY: GROUND_Y };

export function initialJelly(x: number, groundY = GROUND_Y): JellyState {
  return {
    mode: 'ground',
    // Straight to `idle`: `initialConstruct` starts `disabled`, which is correct
    // for a courtyard the player might never walk into and wrong for an arena that
    // exists only for this fight.
    construct: { ...initialConstruct({ x, y: groundY }), phase: 'idle' },
    leap: null,
    heightPx: 0,
    struckThisLeap: false,
  };
}

export function stepJelly(
  state: JellyState,
  input: JellyStepInput,
  dtMs: number,
  world: JellyWorld = DEFAULT_JELLY_WORLD,
  t: LeapTuning = LEAP_TUNING,
): JellyStepResult {
  return state.mode === 'leaping'
    ? stepAirborne(state, input, dtMs, world, t)
    : stepGrounded(state, input, dtMs, world, t);
}

function stepGrounded(
  state: JellyState,
  input: JellyStepInput,
  dtMs: number,
  world: JellyWorld,
  t: LeapTuning,
): JellyStepResult {
  const before = state.construct.phase;
  const { state: stepped } = stepConstruct(
    state.construct,
    {
      // Same ground line for both, so `unit(toHero)` comes back as a pure
      // horizontal and every range check in the construct becomes |dx|.
      heroFeet: { x: input.heroX, y: world.groundY },
      heroDownedOrGraced: input.heroDownedOrGraced,
      hits: input.hits,
    },
    dtMs,
  );

  const construct = pinToGround(stepped, world);
  const events: JellyEvent[] = [];
  if (construct.phase === 'defeated' && before !== 'defeated') events.push('defeated');
  if (before === 'reviving' && construct.phase === 'idle') events.push('revived');

  // THE HANDOFF. It has decided where it is going; from here the parabola owns it.
  if (before === 'telegraph' && construct.phase === 'attack' && construct.committedTarget) {
    events.push('leapStart');
    return {
      state: {
        mode: 'leaping',
        construct,
        leap: beginLeap(construct.pos.x, construct.committedTarget.x, world, t),
        heightPx: 0,
        struckThisLeap: false,
      },
      heroHit: null,
      events,
    };
  }

  return { state: { ...state, mode: 'ground', construct, leap: null, heightPx: 0 }, heroHit: null, events };
}

function stepAirborne(
  state: JellyState,
  input: JellyStepInput,
  dtMs: number,
  world: JellyWorld,
  t: LeapTuning,
): JellyStepResult {
  // Frozen AI holds it mid-arc, exactly as it holds any grounded phase. The
  // construct's own contract is "AI off means it holds whatever state it is in,
  // for review from every side", and the apex of a leap is precisely the state a
  // reviewer most wants to stop and look at — is it really clearing his head?
  // Without this the arc ran on regardless and the creature could only ever be
  // photographed on the ground.
  if (!state.construct.aiEnabled) {
    return { state, heroHit: null, events: [] };
  }

  const leap = stepLeap(state.leap!, dtMs);
  const { x, heightPx } = leapPos(leap, t);
  const events: JellyEvent[] = [];

  // Contact is the two boxes touching, sampled where they actually are. A miss
  // stays a miss: nothing here charges him for an attack that sailed overhead.
  let heroHit: JellyHitOnHero | null = null;
  let struckThisLeap = state.struckThisLeap;
  if (!struckThisLeap && !input.heroDownedOrGraced && leapHitsHero(leap, { x: input.heroX }, world.groundY, t)) {
    struckThisLeap = true;
    heroHit = {
      kind: state.construct.strongHits ? 'strong' : 'light',
      // Shoved away from the creature, so a hit near the castle drives him out
      // into the open rather than into his own wall.
      dirX: input.heroX < x ? -1 : 1,
    };
  }

  const construct: ConstructState = { ...state.construct, pos: { x, y: world.groundY } };

  if (leap.done) {
    events.push('leapLand');
    return {
      state: {
        mode: 'ground',
        // Straight into the punish window at the ground it committed to. The
        // construct's own 900ms recovery then runs unmodified, which is where the
        // rhythm of the fight comes from.
        construct: pinToGround(forcePhase({ ...construct, pos: { x: leap.landingX, y: world.groundY } }, 'recovery'), world),
        leap: null,
        heightPx: 0,
        struckThisLeap: false,
      },
      heroHit,
      events,
    };
  }

  return { state: { ...state, construct, leap, heightPx, struckThisLeap }, heroHit, events };
}

/**
 * Put it back on the floor, inside the world.
 *
 * `construct.ts` never clamps: `approach` integrates freely toward the hero and a
 * heavy hit displaces it by `knockbackPx` with no bound in sight. In a courtyard
 * the walk blockers caught that; here there is nothing but this function between a
 * charged shot near the eastern edge and a creature standing outside the arena.
 */
function pinToGround(construct: ConstructState, world: JellyWorld): ConstructState {
  const x = Math.min(world.maxX, Math.max(world.minX, construct.pos.x));
  if (x === construct.pos.x && construct.pos.y === world.groundY) return construct;
  return { ...construct, pos: { x, y: world.groundY } };
}

/** Its box right now, grounded or airborne. Used for blast targeting and scatter exclusion. */
export function jellyBody(
  state: JellyState,
  groundY = GROUND_Y,
  t: LeapTuning = LEAP_TUNING,
): Rect {
  return state.mode === 'leaping' && state.leap
    ? leapBody(state.leap, groundY, t)
    : groundedBody(state.construct.pos.x, groundY, t);
}

/**
 * Whether a blast can connect right now.
 *
 * Airborne is deliberately excluded — the commitment cuts both ways. See (3).
 */
export const jellyIsTargetable = (state: JellyState) =>
  state.mode === 'ground' && isHittable(state.construct.phase);

/** Centre of mass, for the projectile target and the HP bar. */
export function jellyCentre(state: JellyState, groundY = GROUND_Y) {
  return {
    x: state.construct.pos.x,
    y: groundY - state.heightPx - JELLY_BODY.heightPx / 2,
  };
}

/** Radius the blast tests against. Half the body's shorter axis, so grazes miss. */
export const JELLY_TARGET_RADIUS = JELLY_BODY.heightPx / 2;

// ---------------------------------------------------------------------------
// Commands. Semantic, and reached by the dev bridge and the named scenarios
// alike — automation must call these rather than synthesise keystrokes.
// ---------------------------------------------------------------------------

export const resetJelly = (state: JellyState, x: number, groundY = GROUND_Y): JellyState => ({
  mode: 'ground',
  construct: resetConstruct(state.construct, { x, y: groundY }),
  leap: null,
  heightPx: 0,
  struckThisLeap: false,
});

/**
 * Drop it into a phase outright.
 *
 * Lands it first: forcing a telegraph while it is halfway through an arc would
 * leave the parabola holding a position the state machine has moved on from.
 */
export const forceJellyPhase = (
  state: JellyState,
  phase: ConstructPhase,
  heroX?: number,
  groundY = GROUND_Y,
): JellyState => ({
  mode: 'ground',
  construct: forcePhase(
    { ...state.construct, pos: { x: state.construct.pos.x, y: groundY } },
    phase,
    heroX === undefined ? undefined : { x: heroX, y: groundY },
  ),
  leap: null,
  heightPx: 0,
  struckThisLeap: false,
});

export { CONSTRUCT_TUNING };
