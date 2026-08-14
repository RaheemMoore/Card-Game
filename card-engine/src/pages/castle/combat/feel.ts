import type { MotionLevel } from '../../../vfx/types';

/**
 * Every number describing how a courtyard hit FEELS, in one place.
 *
 * WHY THIS IS NOT `services/combat/presentation/gameFeel.ts`. The boss battle
 * already has a feel model with the same vocabulary, and importing it was the
 * obvious move until you read its units. Its `hitstopFraction` is a fraction of
 * a CSS keyframe set — a number that means nothing in a realtime dt loop — and
 * its pixel values assume the battle stage's sprite scale, not the courtyard's
 * 71-pixel hero. Sharing the record would also mean that tuning the boss fight
 * silently retunes the overworld, which is exactly the drift its own header
 * warns about between desktop and mobile.
 *
 * So the VOCABULARY is shared and the NUMBERS are not: severity tiers, the
 * motion-level ladder, and the rule that losing motion must never lose
 * information. The one real import is `MotionLevel`, whose direction is one-way
 * by the portability contract in `src/vfx/types.ts`. The player's stored choice
 * uses the same key, so Motion is one setting across both fights rather than
 * two settings the player has to find separately.
 *
 * PURE. No Phaser, no clock, no randomness — the same discipline as every other
 * module in this folder. It answers "how hard is this hit" and hands the answer
 * to a presenter; it never draws anything and never reaches the state machines.
 */

/**
 * How hard a hit reads.
 *
 * Three tiers, not four. The reference material's LIGHT/MEDIUM/HEAVY/ULTIMATE
 * ladder assumes a move list that does not exist yet — the courtyard has one
 * attack with a continuous charge — and a tier nothing can currently produce is
 * a number that gets tuned by guesswork and never played. `ultimate` earns its
 * place when there is an ability that deserves it.
 */
export type HitSeverity = 'light' | 'normal' | 'heavy';

export interface HitFeel {
  /**
   * How long the world holds still at contact, ms.
   *
   * The single biggest weight signal there is, and the one most easily
   * overdone: hitstop is a hole in the player's control, so it is capped hard
   * (see HITSTOP_CAP_MS) and never stacks.
   */
  hitstopMs: number;
  /** Peak alpha of the white fill flashed over the struck body. 0 = no flash. */
  flashPeakAlpha: number;
  /** How long that flash lasts, ms. Short — a lingering flash reads as a bug. */
  flashMs: number;
  /**
   * Camera shake amplitude, in Phaser's units (fraction of the viewport).
   *
   * Zero on a light hit on purpose. If the world moves for every tap it stops
   * meaning anything, and the player is going to be firing taps constantly.
   */
  shakeIntensity: number;
  shakeMs: number;
  /**
   * How long the VIEW takes to catch up to a knockback the state applied
   * instantly, ms. This is what turns a 36px teleport into a shove.
   */
  knockbackEaseMs: number;
  /** Particles in the directional contact spray. Budgeted, not decorative. */
  particleCount: number;
  /**
   * True when motion is off. The consumer must still show that the hit
   * happened — a held flash, a colour, a shape — never nothing. Losing motion
   * must cost movement, never information.
   */
  staticFallback: boolean;
}

/**
 * The ceiling on hitstop, ms.
 *
 * At 60fps this is five and a half frames. Past roughly this the pause stops
 * reading as impact and starts reading as a dropped frame — and because the
 * courtyard is an idle game where several things may land at once, the cap is
 * also what stops a crowd of simultaneous hits from freezing the game solid.
 */
export const HITSTOP_CAP_MS = 90;

/**
 * Charge at or above which a shot is heavy.
 *
 * Kept here rather than inline in the runtime because two places already ask
 * this question — the construct's knockback reaction and now the feel — and
 * they must never disagree about which shots are the big ones.
 */
export const HEAVY_CHARGE = 0.6;

/**
 * Charge below which a shot is merely light.
 *
 * A quick tap fires at exactly `MIN_CHARGE_LEVEL` (0.25) by actionState's own
 * rule, so this threshold sits just above it: taps are light, and any deliberate
 * hold is at least normal.
 */
export const LIGHT_MAX_CHARGE = 0.3;

/** Which tier a shot of this charge lands as. */
export function severityForCharge(charge: number): HitSeverity {
  if (charge >= HEAVY_CHARGE) return 'heavy';
  if (charge <= LIGHT_MAX_CHARGE) return 'light';
  return 'normal';
}

const RANK: Record<HitSeverity, number> = { light: 0, normal: 1, heavy: 2 };

/**
 * The louder of two hits, for a frame in which more than one landed.
 *
 * Max rather than last-wins or sum. Two shots arriving together should read as
 * the bigger of them — summing would make a pair of taps outrank a charged
 * shot, and last-wins would make the feel depend on the order the projectile
 * list happened to be iterated in.
 */
export function louder(a: HitSeverity | null, b: HitSeverity): HitSeverity {
  if (!a) return b;
  return RANK[b] > RANK[a] ? b : a;
}

const FULL: Record<HitSeverity, HitFeel> = {
  /**
   * The tap. Deliberately the quiet one.
   *
   * It has to feel like it connected and nothing more: a flash, a nudge, a few
   * sparks. Everything above it only reads as heavier because this one is
   * restrained, which is the part that is tempting to get wrong.
   */
  light: {
    hitstopMs: 25,
    flashPeakAlpha: 0.75,
    flashMs: 60,
    shakeIntensity: 0,
    shakeMs: 0,
    knockbackEaseMs: 70,
    particleCount: 5,
    staticFallback: false,
  },
  normal: {
    hitstopMs: 55,
    flashPeakAlpha: 0.9,
    flashMs: 90,
    shakeIntensity: 0.002,
    shakeMs: 90,
    knockbackEaseMs: 105,
    particleCount: 9,
    staticFallback: false,
  },
  /** A held shot. The only tier that gets the full cap and a real camera kick. */
  heavy: {
    hitstopMs: HITSTOP_CAP_MS,
    flashPeakAlpha: 1,
    flashMs: 140,
    shakeIntensity: 0.0045,
    shakeMs: 160,
    knockbackEaseMs: 140,
    particleCount: 16,
    staticFallback: false,
  },
};

/**
 * With motion off, everything that MOVES is dropped and the flash is kept —
 * held longer, so a player who cannot have motion still gets a clear, readable
 * statement that a hit landed and roughly how hard.
 */
const still = (base: HitFeel): HitFeel => ({
  ...base,
  hitstopMs: 0,
  flashMs: Math.round(base.flashMs * 1.6),
  shakeIntensity: 0,
  shakeMs: 0,
  knockbackEaseMs: 0,
  particleCount: 0,
  staticFallback: true,
});

/**
 * 'subtle' keeps what happens ON a body and drops what happens to the WORLD —
 * no camera shake, hitstop halved. Same split the boss battle draws, because a
 * player who set the preference there means the same thing here.
 */
const subtle = (base: HitFeel): HitFeel => ({
  ...base,
  hitstopMs: Math.round(base.hitstopMs / 2),
  shakeIntensity: 0,
  shakeMs: 0,
  particleCount: Math.round(base.particleCount / 2),
});

/** Resolve the feel for one contact. */
export function getHitFeel(severity: HitSeverity, motion: MotionLevel = 'full'): HitFeel {
  const base = FULL[severity];
  if (motion === 'off') return still(base);
  if (motion === 'subtle') return subtle(base);
  return base;
}

/**
 * How the ATTACKER moves, per tier — the commitment half of the exchange.
 *
 * Separate from `HitFeel` because it is decided at a different moment by a
 * different thing: the attacker leans and lunges on release, before anyone knows
 * whether the shot will connect at all, while `HitFeel` is resolved at contact.
 * Folding them together would mean a shot that misses still owed the world a
 * hitstop.
 */
export interface AttackFeel {
  /** How far the body pulls BACK during the windup, px. Anticipation. */
  windupLeanPx: number;
  /** How far it drives forward on release, px. Commitment. */
  lungePx: number;
  /** Vertical squash at full commitment, as a scale multiplier on 1. */
  squash: number;
  /**
   * How far the body TILTS at the moment of the strike, radians.
   *
   * The single biggest readability win at this camera. The hero is 71 world
   * pixels tall and the courtyard is zoomed out; a lean expressed only as a
   * horizontal slide moves his feet a few pixels and is invisible, while the
   * same commitment expressed as rotation swings his HEAD through several
   * times that distance. The sprite's origin is already at his feet, so this
   * pivots where a person pivots.
   */
  tiltRad: number;
  /** How far the card is drawn back past the hand before the throw, px. */
  cardDrawPx: number;
  /** How far past the hand it ends up at full extension, px. */
  cardThrowPx: number;
  /**
   * How hard the blast shoves him BACKWARD as it leaves the card, px.
   *
   * The ranged counterpart to `lungePx`, and deliberately smaller: a lunge is a
   * decision he made, a recoil is something that happened to him. If the two
   * were the same size the brace would read as a shove rather than as a shot.
   */
  recoilPx: number;
  /** How high the card is held while casting, px above the resting hand. */
  cardRaisePx: number;
}

/**
 * Full-intensity attacker motion.
 *
 * These numbers were DOUBLED on 2026-08-13 after Raheem watched a recording
 * and reported, correctly, that the hero does nothing when he attacks. Part of
 * that was a bug (the pose was computed and never applied — see
 * `applyHeroTransform`'s call site), but the rest was that the original values
 * were chosen by reading them rather than by watching them: a 5px lunge on a
 * 71px character at courtyard zoom is roughly one pixel on screen.
 *
 * Tuning knobs, not canon. If they read as too much in play, come down — but
 * come down from something that was visible, not up from something that was
 * not.
 */
const ATTACK_FULL: Record<HitSeverity, AttackFeel> = {
  light: {
    windupLeanPx: 4,
    lungePx: 10,
    squash: 0.08,
    tiltRad: 0.1,
    cardDrawPx: 10,
    cardThrowPx: 16,
    recoilPx: 5,
    cardRaisePx: 10,
  },
  normal: {
    windupLeanPx: 8,
    lungePx: 18,
    squash: 0.13,
    tiltRad: 0.16,
    cardDrawPx: 14,
    cardThrowPx: 24,
    recoilPx: 9,
    cardRaisePx: 14,
  },
  heavy: {
    windupLeanPx: 14,
    lungePx: 26,
    squash: 0.18,
    tiltRad: 0.24,
    cardDrawPx: 20,
    cardThrowPx: 32,
    recoilPx: 14,
    cardRaisePx: 18,
  },
};

const ATTACK_NONE: AttackFeel = {
  windupLeanPx: 0,
  lungePx: 0,
  squash: 0,
  tiltRad: 0,
  cardDrawPx: 0,
  cardThrowPx: 0,
  recoilPx: 0,
  cardRaisePx: 0,
};

/**
 * Resolve the attacker's motion.
 *
 * Motion off zeroes it outright — unlike the flash, a lunge carries no
 * information the player cannot get from the card leaving his hand.
 */
export function getAttackFeel(severity: HitSeverity, motion: MotionLevel = 'full'): AttackFeel {
  if (motion === 'off') return ATTACK_NONE;
  return ATTACK_FULL[severity];
}
