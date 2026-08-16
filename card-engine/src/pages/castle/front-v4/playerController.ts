import { ARENA, FRONT_V4_WALK_SPEED } from './layout';

/**
 * How the Card-wright moves in the side view: left, right, and nothing else.
 *
 * THE CAPABILITY THIS FILE EXISTS TO WITHHOLD. He cannot jump. Not "jump is
 * unimplemented" — he cannot, as a stated property with a test holding it, because
 * the whole enemy design downstream depends on it. The jelly's leap is fair only
 * because it is avoidable by ordinary walking; the moment a jump exists, every
 * telegraph gets re-tuned around a hero who can leave the ground, and the fairness
 * invariant in jellyLeap.ts is quietly measuring the wrong character. Jump arrives
 * later as unlocked progression, and cards may eventually grant far better than a
 * jump — wings, flight, a leap of their own. None of that is here.
 *
 * So `PlayerIntent` has no `jump` field. Not a boolean set to false: absent. A
 * flag that exists is a flag someone eventually sets.
 *
 * Pure — no Phaser, no clock, no sprite. The caller passes elapsed milliseconds
 * and gets the next state, exactly like actionState.ts and construct.ts. That is
 * what lets the leap's fairness be simulated in a unit test instead of eyeballed
 * in a browser.
 */

export interface PlayerIntent {
  left: boolean;
  right: boolean;
}

/** -1 is west/left, +1 is east/right. Never 0: he always faces somewhere. */
export type Facing = -1 | 1;

export interface PlayerState {
  /** Ground-contact X. Y is always GROUND_Y, which is why it is not stored. */
  x: number;
  /** Persists through idle — releasing the key does not turn him to face the camera. */
  facing: Facing;
  /** World units per second, for the walk-cycle gate and the dev snapshot. */
  vx: number;
}

/**
 * Stated as a constant so the snapshot can publish it and a test can assert it.
 *
 * If this ever becomes true, `jellyLeap.leapIsEvadable` is no longer a proof about
 * the character who is actually playing.
 */
export const CAN_JUMP = false as const;

export function initialPlayer(x: number): PlayerState {
  return { x, facing: 1, vx: 0 };
}

/**
 * Which way the keys are asking him to go.
 *
 * Opposing inputs CANCEL rather than one winning. Picking a winner means a player
 * rolling their hand across the keyboard gets a direction they did not choose, and
 * — worse for this scene — a player who panics during a telegraph and mashes both
 * ways would slide into the landing zone rather than standing still.
 */
export function moveAxis(intent: PlayerIntent): -1 | 0 | 1 {
  if (intent.left === intent.right) return 0;
  return intent.left ? -1 : 1;
}

export interface PlayerStepInput {
  intent: PlayerIntent;
  /**
   * From actionState.walkScale(phase) — 1 while exploring, 0 during every action
   * phase, because the firing performance is a planted stance.
   *
   * Passed in rather than imported so this module never has to know what a phase
   * is, and so a test can root him without constructing an action state.
   */
  walkScale: number;
}

export function stepPlayer(
  state: PlayerState,
  input: PlayerStepInput,
  dtMs: number,
  bounds: { minX: number; maxX: number } = ARENA,
): PlayerState {
  const axis = moveAxis(input.intent);
  const speed = FRONT_V4_WALK_SPEED * Math.max(0, input.walkScale);
  const step = (axis * speed * dtMs) / 1000;

  // Facing follows the last NONZERO axis, and is read before the movement is
  // scaled: a rooted hero mid-charge still turns to look, because turning is not
  // locomotion and a character who cannot even face the thing about to land on
  // him reads as broken rather than as committed.
  const facing: Facing = axis === 0 ? state.facing : (axis as Facing);

  return {
    x: clamp(state.x + step, bounds.minX, bounds.maxX),
    facing,
    vx: step === 0 ? 0 : axis * speed,
  };
}

/**
 * Shove him away from a hit.
 *
 * Instantaneous rather than a decaying impulse: the knockdown animation owns the
 * moment visually, and a velocity that outlives the frame would fight the
 * animation's own displacement. Clamped like everything else, which is what stops
 * a hit near the gate from putting him behind his own castle wall — §13's "clamps
 * against the western castle boundary rather than passing through it".
 */
export function applyKnockback(
  state: PlayerState,
  dirX: Facing,
  distancePx: number,
  bounds: { minX: number; maxX: number } = ARENA,
): PlayerState {
  return {
    ...state,
    x: clamp(state.x + dirX * distancePx, bounds.minX, bounds.maxX),
    vx: 0,
  };
}

/** Ground-contact rectangle, for overlap tests against the leaping jelly. */
export function playerBody(
  state: PlayerState,
  groundY: number,
  body: { halfWidthPx: number; heightPx: number },
) {
  return {
    left: state.x - body.halfWidthPx,
    right: state.x + body.halfWidthPx,
    top: groundY - body.heightPx,
    bottom: groundY,
  };
}

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
