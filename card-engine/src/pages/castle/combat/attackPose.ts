import { ACTION_TIMING, MIN_CHARGE_LEVEL, type ActionPhase } from './actionState';
import type { AttackFeel } from './feel';
import type { Vec2 } from './aim';

/**
 * Where the Card-wright's BODY is through a throw, relative to where he stands.
 *
 * WHY THIS EXISTS. Before it, the hero did not move when he attacked. The
 * charge gathered particles, the card left his hand, a blast crossed the
 * courtyard — and through all of it he stood in his walk pose like a bystander.
 * The single most-cited reason an attack reads as unsatisfying is that the
 * effect appears to attack while the character stays disconnected from it, and
 * that was exactly the state of things.
 *
 * PURE, and deliberately so. It is a function of the action phase, the time
 * spent in it and the aim — no Phaser, no clock, no tweens — which means the
 * anticipation and commitment curves can be unit-tested as ARITHMETIC rather
 * than eyeballed in motion. That matters more than usual here: "the lunge feels
 * wrong" is unfalsifiable, but "at the contact frame he is 14px along the aim
 * and 11% squashed" is not.
 *
 * It returns an OFFSET and SCALE MULTIPLIERS, never absolute values. The
 * runtime owns where he actually stands and what size his sheet is; this only
 * ever says "and then lean him this far that way". A pose that returned
 * absolutes would silently undo the hero-scale work every time it was applied.
 *
 * IMPORTANT: the offset is a LIE TOLD TO THE SPRITE. Collision, depth and the
 * blast's origin all read the hero's true feet; only the drawn body moves. The
 * same split the jump arc already makes between `feetY` and the sprite's y, and
 * for the same reason — a hero who could walk through a wall at the far end of
 * his lunge would be a gameplay change, and this is a presentation feature.
 */

export interface AttackPose {
  /** Along the aim. Negative during the wind-up: he pulls BACK before he throws. */
  offsetX: number;
  offsetY: number;
  /** Multipliers on the sprite's own scale. 1 = untouched. */
  scaleX: number;
  scaleY: number;
  /**
   * Body tilt, radians, about the feet.
   *
   * Signed by the aim's HORIZONTAL component, not by the aim as a whole. A
   * throw aimed straight up or down has no visible lean — the lean is toward
   * or away from the camera, and a tilt would read as the character falling
   * over rather than as commitment. Aiming right leans right; aiming left
   * leans left; aiming at the horizon leans hardest.
   */
  rotation: number;
}

export const NEUTRAL_POSE: AttackPose = {
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
};

/**
 * The vertical share of the lean.
 *
 * Less than the horizontal, because the camera is a low top-down: movement
 * "into the screen" covers less ground on screen than movement across it, and
 * matching them one-for-one makes a throw aimed upward look like a jump.
 */
const VERTICAL_BIAS = 0.55;

/** Ease-out. Fast off the mark, settling — how a body arrives somewhere. */
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
/** Ease-in. Slow to start, accelerating — how a body commits to something. */
const easeIn = (t: number) => t * t;

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export interface AttackPoseInput {
  phase: ActionPhase;
  /** Time spent in THIS phase, ms. */
  elapsedMs: number;
  /** 0..1. Only read while charging, where the lean grows with the hold. */
  chargeLevel: number;
  /**
   * Unit vector he is throwing along. Null leaves him neutral rather than
   * guessing a direction — a lunge toward an arbitrary default would be worse
   * than no lunge at all.
   */
  aim: Vec2 | null;
  feel: AttackFeel;
}

/**
 * Resolve the pose for one frame.
 *
 * The four attacking phases each own one beat of the sequence:
 *
 *   charging  — ANTICIPATION. Drifts backward as the hold builds, so a fully
 *               charged shot is visibly wound up before it is released.
 *   windup    — the last of the pull-back, completed quickly.
 *   active    — COMMITMENT. Drives forward past neutral and squashes. This is
 *               the frame the shot is born on, so it is the frame the body has
 *               to be visibly throwing on.
 *   recovery  — settling back to standing.
 *
 * Everything else — exploring, summoning, knocked down, standing up — is
 * neutral. Those phases have their own art and must not be leaned on top of.
 */
export function attackPose(input: AttackPoseInput): AttackPose {
  const { phase, elapsedMs, chargeLevel, aim, feel } = input;
  if (!aim) return NEUTRAL_POSE;

  const along = (distance: number, squash = 0, tilt = 0): AttackPose => ({
    offsetX: aim.x * distance,
    offsetY: aim.y * distance * VERTICAL_BIAS,
    // Squash is WIDER and SHORTER, the classic weight cue. The width gain is
    // smaller than the height loss so he does not visibly gain mass.
    scaleX: 1 + squash * 0.6,
    scaleY: 1 - squash,
    // Scaled by the horizontal aim so a throw into or out of the screen does
    // not tip him sideways for no reason a viewer could name.
    rotation: tilt * aim.x,
  });

  switch (phase) {
    case 'charging': {
      // Grows from a tap's worth of charge to a full one, so the lean reports
      // the same thing the particle gather does: how much is coming.
      const held = clamp01(
        (chargeLevel - MIN_CHARGE_LEVEL) / Math.max(1 - MIN_CHARGE_LEVEL, 0.0001),
      );
      const wind = 0.35 + 0.65 * held;
      // Tilts BACKWARD — the negative of the strike's tilt — so the wind-up
      // and the throw are visibly opposite rather than merely different sizes.
      return along(-feel.windupLeanPx * wind, 0, -feel.tiltRad * 0.5 * wind);
    }

    case 'windup': {
      // Completing the pull-back, not starting it — a charged shot arrives here
      // already leaning, and a tap gets its whole anticipation in this window.
      const t = easeOut(clamp01(elapsedMs / ACTION_TIMING.windupMs));
      const wind = 0.6 + 0.4 * t;
      return along(-feel.windupLeanPx * wind, 0, -feel.tiltRad * 0.5 * wind);
    }

    case 'active': {
      // 60ms. Deliberately eased IN so the very first frame is already most of
      // the way forward: the projectile is created on entry to this phase, and
      // a body that arrives after its own shot reads as reacting to it.
      const t = easeIn(clamp01(elapsedMs / ACTION_TIMING.activeMs));
      const travel = -feel.windupLeanPx * 0.6 + (feel.lungePx + feel.windupLeanPx * 0.6) * t;
      // Swings through the whole arc, from wound back to fully committed.
      const tilt = -feel.tiltRad * 0.5 + feel.tiltRad * 1.5 * t;
      return along(travel, feel.squash * t, tilt);
    }

    case 'recovery': {
      // The settle. Long relative to the strike, which is what gives the throw
      // a rhythm instead of a snap back to standing.
      const t = easeOut(clamp01(elapsedMs / ACTION_TIMING.recoveryMs));
      return along(
        feel.lungePx * (1 - t),
        feel.squash * (1 - t) * 0.5,
        feel.tiltRad * (1 - t),
      );
    }

    default:
      return NEUTRAL_POSE;
  }
}

/**
 * Where the CARD is through a throw, relative to where it is normally held.
 *
 * WHY THIS MATTERS MORE THAN THE BODY. Raheem's note on the first attempt was
 * "the card just floats there above his head" — and he was watching the right
 * thing. The card is the brightest, highest-contrast object on screen, it is
 * what the shot comes out of, and it is the whole identity of the character.
 * A hero who leans while the card hangs motionless still reads as nothing
 * happening, because the eye is not on the hero.
 *
 * So the card performs the throw and the body supports it, not the reverse.
 */
export interface CardPose {
  /** Added to the hand position the runtime already computes. */
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  /**
   * False once the card has BECOME the projectile.
   *
   * The shot is born on entry to `active`, so the throw has to complete by the
   * end of the wind-up — the card reaches full extension on exactly the frame
   * it leaves. Keeping it drawn into `active` would show the player two of
   * them, the card and the blast, for sixty milliseconds.
   */
  visible: boolean;
}

export const NEUTRAL_CARD: CardPose = {
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  scale: 1,
  visible: false,
};

export function cardPose(input: AttackPoseInput): CardPose {
  const { phase, elapsedMs, chargeLevel, aim, feel } = input;
  if (!aim) return NEUTRAL_CARD;

  // Perpendicular to the aim, so the card sits BESIDE him rather than in front
  // of his face. A card dead-centre on the body reads as a shield.
  const perpX = -aim.y;
  const perpY = aim.x;

  const place = (along: number, aside: number, rotation: number, scale: number): CardPose => ({
    offsetX: aim.x * along + perpX * aside,
    // Same damping as the body: this is a low top-down camera and matching the
    // axes one-for-one makes an upward throw look like the card went over his
    // head rather than away from him.
    offsetY: (aim.y * along + perpY * aside) * VERTICAL_BIAS,
    rotation,
    scale,
    visible: true,
  });

  switch (phase) {
    case 'charging': {
      const held = clamp01(
        (chargeLevel - MIN_CHARGE_LEVEL) / Math.max(1 - MIN_CHARGE_LEVEL, 0.0001),
      );
      // Drawn back and cocked, growing as it fills. The growth is the clearest
      // possible statement of "this is getting stronger" on the object the
      // player is already looking at.
      return place(
        -feel.cardDrawPx * (0.4 + 0.6 * held),
        6 + 3 * held,
        -0.5 - 0.35 * held,
        1 + 0.45 * held,
      );
    }

    case 'windup': {
      // THE THROW. Eased in, so it hangs at the back of the swing and then
      // whips — the acceleration is what sells a throw, not the distance.
      const t = easeIn(clamp01(elapsedMs / ACTION_TIMING.windupMs));
      const from = -feel.cardDrawPx;
      const to = feel.cardThrowPx;
      return place(
        from + (to - from) * t,
        6 * (1 - t),
        // Spins through most of a turn on the way out. A card that translates
        // without rotating reads as being carried, not thrown.
        -0.85 + 3.6 * t,
        1.3 - 0.5 * t,
      );
    }

    default:
      // Explore, active, recovery, summon, knockdown: no card in hand. From
      // `active` onward it is a projectile, and everything else is not a throw.
      return NEUTRAL_CARD;
  }
}
