/**
 * Where the Card-wright is pointing, and which device gets to say so.
 *
 * Three inputs can express a direction — the movement keys, the mouse, and the
 * right stick — and they disagree constantly. A player walking left with the
 * mouse resting on the right of the screen is expressing two directions at once,
 * and both are sincere: he means to walk left and to shoot right.
 *
 * So aim is not a blend. One source OWNS it at a time, and ownership changes only
 * on a deliberate act. The failure this avoids is flicker: sample every device
 * each frame and take the loudest, and a hand resting on a stick at 0.05 fights
 * the walk direction forever, twenty times a second, which reads as the character
 * being drunk rather than as an input bug.
 *
 * WHY THE BODY AND THE SHOT DISAGREE ON PURPOSE. `facing` is one of four poses,
 * because that is how many the sprite sheet has. `aim` stays a continuous vector,
 * because a projectile that can only fly along four axes is a worse game than one
 * whose thrower is drawn approximately. Handoff §7.3.
 *
 * Pure: no Phaser, no globals, no clock of its own. The caller passes `now`.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** Which device currently owns the aim direction. */
export type AimSource = 'movement' | 'pointer' | 'stick';

/** The four poses the hero sheet actually has. */
export type Facing = 'down' | 'up' | 'left' | 'right';

/**
 * Below this, a stick is resting, not aiming.
 *
 * Analogue sticks do not return to exactly zero — a worn controller can idle
 * around 0.1 — and a threshold under that hands aim to a stick nobody touched.
 */
export const STICK_DEAD_ZONE = 0.25;

/**
 * How far the pointer must travel, in screen pixels, to count as intent.
 *
 * A mouse sitting still still reports jitter of a pixel or two. Requiring real
 * travel is what stops a resting hand from stealing aim from the walk keys.
 */
export const POINTER_INTENT_PX = 6;

export interface AimInputs {
  /** Movement intent, unnormalised. Zero when standing still. */
  move: Vec2;
  /** Player-to-pointer direction, or null when there is no pointer. */
  pointer: Vec2 | null;
  /** How far the pointer has moved on screen since the last sample. */
  pointerTravelPx: number;
  /** Right stick, raw, in [-1, 1] per axis. */
  stick: Vec2;
  /**
   * A fire or aim button was pressed this frame.
   *
   * Pressing fire is an unambiguous statement that the pointer means it, even if
   * the mouse has not moved a pixel — otherwise a player who lines up a shot and
   * waits gets the walk direction instead of the one under the crosshair.
   */
  firePressed: boolean;
  now: number;
}

/**
 * How long an override keeps aim after its last deliberate act.
 *
 * Without a grace window the rule "movement resumes when no override is active"
 * is true twice a second: a player strafing while firing has a live pointer on
 * the fire frame and a dead one between shots, so the body would snap between
 * the crosshair and the walk direction for as long as the fight lasted. Holding
 * the override briefly makes aiming-while-moving feel like one intention.
 */
export const OVERRIDE_GRACE_MS = 600;

export interface AimState {
  owner: AimSource;
  /** When the current owner took over. */
  ownedSince: number;
  /** Last frame this owner did something deliberate. Drives the grace window. */
  ownerActiveAt: number;
  /** Unit vector. Never zero — it holds the last real direction. */
  aim: Vec2;
  /** Nearest of the four body poses to `aim`. */
  facing: Facing;
}

const length = (v: Vec2) => Math.hypot(v.x, v.y);

const normalise = (v: Vec2, fallback: Vec2): Vec2 => {
  const len = length(v);
  return len > 0 ? { x: v.x / len, y: v.y / len } : fallback;
};

/**
 * Nearest of the four poses.
 *
 * Screen axes: +y is down, so a positive y is 'down'. The comparison is on
 * absolute magnitude, and the horizontal wins a tie — an exact diagonal has to
 * resolve somewhere, and left/right reads better than up/down for a body that is
 * mostly a silhouette.
 */
export function quantiseFacing(aim: Vec2): Facing {
  if (Math.abs(aim.x) >= Math.abs(aim.y)) return aim.x >= 0 ? 'right' : 'left';
  return aim.y >= 0 ? 'down' : 'up';
}

/** The state a scene starts in: facing the camera, owned by nothing in particular. */
export function initialAim(now = 0): AimState {
  return {
    owner: 'movement',
    ownedSince: now,
    ownerActiveAt: now,
    aim: { x: 0, y: 1 },
    facing: 'down',
  };
}

/**
 * Resolve this frame's aim.
 *
 * Priority among devices expressing intent THIS frame: stick, then pointer, then
 * movement. That order is deliberate — the two override devices are only ever
 * live when a hand is deliberately on them, whereas movement is held down for
 * most of the game and would otherwise win permanently.
 *
 * When no device is expressing intent, a recent override keeps aim until its
 * grace window lapses, and after that movement takes over again. Standing
 * perfectly still changes nothing: the last real direction is held, so letting go
 * of every input does not spin the character round.
 */
export function resolveAim(previous: AimState, input: AimInputs): AimState {
  const stickLive = length(input.stick) >= STICK_DEAD_ZONE;
  const pointerLive =
    input.pointer !== null && (input.pointerTravelPx >= POINTER_INTENT_PX || input.firePressed);
  const moveLive = length(input.move) > 0;

  const commit = (owner: AimSource, raw: Vec2): AimState => {
    const aim = normalise(raw, previous.aim);
    return {
      owner,
      ownedSince: owner === previous.owner ? previous.ownedSince : input.now,
      ownerActiveAt: input.now,
      aim,
      facing: quantiseFacing(aim),
    };
  };

  if (stickLive) return commit('stick', input.stick);
  if (pointerLive) return commit('pointer', input.pointer!);

  // An override that acted recently stays in charge even though it is idle this
  // frame — see OVERRIDE_GRACE_MS. Its aim vector is held, not recomputed.
  const overrideHolding =
    previous.owner !== 'movement' && input.now - previous.ownerActiveAt < OVERRIDE_GRACE_MS;
  if (overrideHolding) return previous;

  if (moveLive) return commit('movement', input.move);

  // Nothing live and nothing held: keep the last real direction.
  return previous;
}

/**
 * Hand aim back to the walk keys.
 *
 * Called when a fight ends or an override device disconnects. Without it, a
 * player who used the mouse once would walk around aiming at wherever the cursor
 * happened to be left, forever.
 */
export function releaseOverride(previous: AimState, now: number): AimState {
  if (previous.owner === 'movement') return previous;
  return { ...previous, owner: 'movement', ownedSince: now, ownerActiveAt: now };
}
