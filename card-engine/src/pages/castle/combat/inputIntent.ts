import type { AimInputs, Vec2 } from './aim';

/**
 * Turning three devices into one frame of intent.
 *
 * This is the seam between Phaser and the pure aim rules. Everything that needs a
 * `Phaser.Scene` — polling a gamepad, reading `activePointer` — stays in the
 * runtime; everything that needs a decision lives here and in aim.ts, where it can
 * be tested without booting a game.
 *
 * WHY POINTER TRAVEL IS MEASURED IN SCREEN PIXELS, NOT WORLD UNITS. The camera
 * follows the player, so a perfectly still mouse sweeps across the world every
 * time he walks. Measured in world units, "the pointer moved" would be true
 * constantly while walking and the mouse would steal aim from the keys forever.
 * Screen space is the only frame in which "the player moved the mouse" means what
 * it says.
 */

export interface DeviceSample {
  /** Movement intent from the keys, already normalised for diagonals. */
  move: Vec2;
  /** Pointer position in SCREEN space, or null when there is no pointer. */
  pointerScreen: Vec2 | null;
  /** Pointer position in WORLD space, for aiming from the player toward it. */
  pointerWorld: Vec2 | null;
  /** Right stick, raw, in [-1, 1] per axis. */
  stick: Vec2;
  /** Fire was pressed this frame, from any device. */
  firePressed: boolean;
}

/** What the sampler remembers between frames. */
export interface PointerTracker {
  lastScreen: Vec2 | null;
}

export const newPointerTracker = (): PointerTracker => ({ lastScreen: null });

/**
 * Build one frame of aim input, and advance the pointer tracker.
 *
 * Returns the inputs rather than mutating anything the caller passed, except the
 * tracker, whose entire job is to remember.
 */
export function buildAimInputs(
  sample: DeviceSample,
  playerWorld: Vec2,
  tracker: PointerTracker,
  now: number,
): AimInputs {
  let pointerTravelPx = 0;
  if (sample.pointerScreen) {
    if (tracker.lastScreen) {
      pointerTravelPx = Math.hypot(
        sample.pointerScreen.x - tracker.lastScreen.x,
        sample.pointerScreen.y - tracker.lastScreen.y,
      );
    }
    tracker.lastScreen = { ...sample.pointerScreen };
  } else {
    tracker.lastScreen = null;
  }

  // Aim is the direction from the player to the cursor. A cursor sitting exactly
  // on him expresses no direction at all, so it is reported as absent rather than
  // as a zero vector that would normalise to something arbitrary.
  let pointer: Vec2 | null = null;
  if (sample.pointerWorld) {
    const dx = sample.pointerWorld.x - playerWorld.x;
    const dy = sample.pointerWorld.y - playerWorld.y;
    if (Math.hypot(dx, dy) > 1) pointer = { x: dx, y: dy };
  }

  return {
    move: sample.move,
    pointer,
    pointerTravelPx,
    stick: sample.stick,
    firePressed: sample.firePressed,
    now,
  };
}

/**
 * Movement vector from the four direction booleans, with diagonals normalised.
 *
 * Extracted so the walk code and any future replay/test harness produce the same
 * vector — an un-normalised diagonal is 41% faster, which is the oldest bug in
 * top-down movement.
 */
export function moveVector(left: boolean, right: boolean, up: boolean, down: boolean): Vec2 {
  let x = (right ? 1 : 0) - (left ? 1 : 0);
  let y = (down ? 1 : 0) - (up ? 1 : 0);
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}
