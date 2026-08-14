import { CONSTRUCT_TUNING, type ConstructPhase } from './construct';
import type { Vec2 } from './aim';

/**
 * How the construct's BODY moves through a strike, relative to where it stands.
 *
 * WHY THIS EXISTS. The construct's attack was, visually, nothing: `construct.ts`
 * leaves `pos` untouched for the whole `attack` phase and only recolours the
 * body to `0xff5b3a`, so a strike that reached 132 pixels and could knock the
 * hero down was drawn as a stationary rectangle changing hue. The hero was being
 * hit by something that never appeared to move.
 *
 * PURE, like its counterpart for the hero. It answers "where is the body drawn
 * this frame" as arithmetic over the phase and its elapsed time, which means the
 * one thing that actually matters about the timing — that the body is already
 * committed forward on the frame the damage lands — is a test rather than a
 * judgement call about a video.
 *
 * WHAT IT MUST NOT DO. It never moves `pos`, never touches the collider, and
 * never changes when the strike resolves. `telegraphIsAvoidable()` is arithmetic
 * over `telegraphMs`, the hero's walk speed and the lunge's reach; none of those
 * appear here. The body is allowed to lie about where it is exactly as far as
 * the hero's pose is, and for the same reason: a fair fight is decided by the
 * simulation, and the picture's job is to make the simulation legible.
 */

export interface ConstructPose {
  /** Added to the drawn position. Never to `pos`. */
  offsetX: number;
  offsetY: number;
  /** Multipliers on the body's size. 1 = untouched. */
  scaleX: number;
  scaleY: number;
  /** Radians about the feet. Only the collapse uses it. */
  rotation: number;
  /** Multiplier on the body's alpha, so the collapse can fade as it lands. */
  alpha: number;
}

export const CONSTRUCT_NEUTRAL: ConstructPose = {
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  alpha: 1,
};

/**
 * How long the body takes to go down, ms.
 *
 * Shorter than `reviveMs` (600) so the fall has finished before it starts
 * getting up — otherwise the two read as one confused motion, and the moment
 * the player earned is spent underneath the moment they did not.
 */
export const COLLAPSE_MS = 420;

/**
 * How far the body visibly travels on a strike, px.
 *
 * Well short of `lungeReachPx` (132), which is how far the STRIKE reaches — the
 * blow extends past the body, as a blow does. Matching the two would mean the
 * construct teleporting most of the way to the hero on every swing, which reads
 * as a charge rather than an attack and would make the shape of the hitbox
 * impossible to learn.
 */
const LUNGE_TRAVEL_PX = 30;

/** How far it winds BACK during the tell, px. Anticipation, and part of the tell. */
const WIND_BACK_PX = 9;

/**
 * The share of the attack spent extending, the rest withdrawing.
 *
 * Small on purpose. The damage frame is the FIRST step of the attack phase
 * (`construct.ts` is explicit), so the body has to arrive essentially with it;
 * a lunge that peaked halfway through would be a body catching up to a hit that
 * had already landed.
 */
const EXTEND_SHARE = 0.3;

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeIn = (t: number) => t * t;
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * Same damping the hero's pose uses: this is a low top-down camera, so motion
 * "into the screen" covers less ground on screen than motion across it.
 */
const VERTICAL_BIAS = 0.55;

/**
 * Going down.
 *
 * WHAT IT REPLACED. Defeat was `alpha 0.45` and a dark fill — the construct
 * simply became a dimmer version of itself and stood there. Nothing fell,
 * nothing stopped, and the moment the player had worked the whole exchange for
 * was the least eventful thing on screen.
 *
 * The shape is: pitch over hard and early, drop, and fade as it lands. It
 * TOPPLES rather than sinking straight down because a body that shrinks in
 * place reads as being deleted; one that rotates about its feet reads as losing
 * a fight. It never fades to nothing — the corpse stays legible at a third
 * alpha, because it is about to revive from exactly there and a construct that
 * vanished and reappeared would be two different objects.
 */
function collapse(elapsedMs: number, fallDir: Vec2, motionOff: boolean): ConstructPose {
  // Motion off keeps the STATE — it is clearly dead — and drops the fall.
  if (motionOff) return { ...CONSTRUCT_NEUTRAL, alpha: 0.35 };

  const t = clamp01(elapsedMs / COLLAPSE_MS);
  // Eased out, so most of the topple happens in the first moments: a body
  // falling at a constant rate reads as being lowered.
  const e = easeOut(t);

  const len = Math.hypot(fallDir.x, fallDir.y);
  // Nothing to fall away from — pitch left, which is at least a direction.
  const ux = len === 0 ? -1 : fallDir.x / len;
  const uy = len === 0 ? 0 : fallDir.y / len;

  return {
    // Slides a little as it goes over, the way a toppling thing does.
    offsetX: ux * 14 * e,
    offsetY: uy * 14 * e * VERTICAL_BIAS,
    // Splays as it flattens.
    scaleX: 1 + 0.18 * e,
    scaleY: 1 - 0.55 * e,
    // Most of a right angle: flat on the ground, not face-planted through it.
    rotation: ux * 1.15 * e,
    alpha: 1 - 0.65 * e,
  };
}

export interface ConstructPoseInput {
  phase: ConstructPhase;
  /** Time spent in THIS phase, ms. */
  elapsedMs: number;
  /** Where the body actually is. */
  pos: Vec2;
  /**
   * Where the committed strike is aimed, frozen at the telegraph's start.
   *
   * Null outside a committed strike — and when it is null there is no lunge,
   * because there is no direction to lunge in that would mean anything.
   */
  committedTarget: Vec2 | null;
  /**
   * Which way it topples when it dies.
   *
   * The direction of the blow that killed it, so a construct shot from the left
   * falls to the right. A fixed fall direction would make every death identical
   * regardless of how it was earned, which is the difference between a death
   * that happened TO something and a death animation being played back.
   */
  fallDir: Vec2;
  /** Held still when the player has asked for no motion. */
  motionOff: boolean;
}

/**
 * Resolve the body's pose for one frame.
 *
 *   telegraph — winds BACK, away from where it is about to hit, and swells.
 *               Both are extra tell: the ring already says "here", this says
 *               "now", and it costs no time out of `telegraphMs`.
 *   attack    — drives forward to `LUNGE_TRAVEL_PX` in the first third, then
 *               withdraws. Squashes as it commits.
 *   recovery  — settles back from wherever the withdrawal left it.
 *   defeated  — topples away from the blow, sinks, and fades.
 *
 * Everything else is neutral. `hitReact` and `knockbackReact` already have the
 * view's own knockback lag and a colour, and stacking a pose on top of those
 * would fight feedback that is already reading correctly.
 */
export function constructPose(input: ConstructPoseInput): ConstructPose {
  const { phase, elapsedMs, pos, committedTarget, fallDir, motionOff } = input;

  /**
   * Death is resolved FIRST, before the committed-target guard below.
   *
   * `defeatConstruct` clears `committedTarget`, so a collapse that came after
   * that guard would be unreachable in every real death and reachable only in a
   * test that forgot to clear it — the worst possible arrangement, because it
   * would look covered.
   */
  if (phase === 'defeated') return collapse(elapsedMs, fallDir, motionOff);

  if (motionOff || !committedTarget) return CONSTRUCT_NEUTRAL;

  const dx = committedTarget.x - pos.x;
  const dy = committedTarget.y - pos.y;
  const len = Math.hypot(dx, dy);
  // A target it is standing exactly on has no direction to strike along; the
  // colour and the ring still carry the beat.
  if (len === 0) return CONSTRUCT_NEUTRAL;
  const ux = dx / len;
  const uy = dy / len;

  const along = (distancePx: number, squash = 0): ConstructPose => ({
    offsetX: ux * distancePx,
    offsetY: uy * distancePx * VERTICAL_BIAS,
    scaleX: 1 + squash * 0.5,
    scaleY: 1 - squash,
    rotation: 0,
    alpha: 1,
  });

  switch (phase) {
    case 'telegraph': {
      // Rocks back over the tell, arriving at full wind-up exactly as it fires.
      const t = easeOut(clamp01(elapsedMs / CONSTRUCT_TUNING.telegraphMs));
      // Swells rather than squashes — it is loading, not landing.
      return along(-WIND_BACK_PX * t, -0.06 * t);
    }

    case 'attack': {
      const t = clamp01(elapsedMs / CONSTRUCT_TUNING.attackMs);
      if (t <= EXTEND_SHARE) {
        // Eased IN so the very first frame is already most of the way out —
        // the frame the damage lands on.
        const e = easeIn(t / EXTEND_SHARE);
        const travel = -WIND_BACK_PX + (LUNGE_TRAVEL_PX + WIND_BACK_PX) * e;
        return along(travel, 0.1 * e);
      }
      // The withdrawal. Slower than the strike, which is what leaves the
      // recovery window feeling like an opening rather than a snap back.
      const w = easeOut((t - EXTEND_SHARE) / (1 - EXTEND_SHARE));
      return along(LUNGE_TRAVEL_PX * (1 - w), 0.1 * (1 - w));
    }

    case 'recovery': {
      const t = easeOut(clamp01(elapsedMs / CONSTRUCT_TUNING.recoveryMs));
      // Overshoots slightly behind its feet before settling, so the long
      // recovery reads as being off balance rather than merely waiting.
      return along(-WIND_BACK_PX * 0.4 * (1 - t));
    }

    default:
      return CONSTRUCT_NEUTRAL;
  }
}
