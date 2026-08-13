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
}

export const NEUTRAL_POSE: AttackPose = { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 };

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

  const along = (distance: number, squash = 0): AttackPose => ({
    offsetX: aim.x * distance,
    offsetY: aim.y * distance * VERTICAL_BIAS,
    // Squash is WIDER and SHORTER, the classic weight cue. The width gain is
    // smaller than the height loss so he does not visibly gain mass.
    scaleX: 1 + squash * 0.6,
    scaleY: 1 - squash,
  });

  switch (phase) {
    case 'charging': {
      // Grows from a tap's worth of charge to a full one, so the lean reports
      // the same thing the particle gather does: how much is coming.
      const held = clamp01(
        (chargeLevel - MIN_CHARGE_LEVEL) / Math.max(1 - MIN_CHARGE_LEVEL, 0.0001),
      );
      return along(-feel.windupLeanPx * (0.35 + 0.65 * held));
    }

    case 'windup': {
      // Completing the pull-back, not starting it — a charged shot arrives here
      // already leaning, and a tap gets its whole anticipation in this window.
      const t = easeOut(clamp01(elapsedMs / ACTION_TIMING.windupMs));
      return along(-feel.windupLeanPx * (0.6 + 0.4 * t));
    }

    case 'active': {
      // 60ms. Deliberately eased IN so the very first frame is already most of
      // the way forward: the projectile is created on entry to this phase, and
      // a body that arrives after its own shot reads as reacting to it.
      const t = easeIn(clamp01(elapsedMs / ACTION_TIMING.activeMs));
      const travel = -feel.windupLeanPx * 0.6 + (feel.lungePx + feel.windupLeanPx * 0.6) * t;
      return along(travel, feel.squash * t);
    }

    case 'recovery': {
      // The settle. Long relative to the strike, which is what gives the throw
      // a rhythm instead of a snap back to standing.
      const t = easeOut(clamp01(elapsedMs / ACTION_TIMING.recoveryMs));
      return along(feel.lungePx * (1 - t), feel.squash * (1 - t) * 0.5);
    }

    default:
      return NEUTRAL_POSE;
  }
}
