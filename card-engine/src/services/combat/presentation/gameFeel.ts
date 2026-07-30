import type { MotionLevel } from '../../../vfx/types';
import type { BeatSeverity } from './types';

/**
 * Every number describing how combat FEELS, in one place.
 *
 * The desktop tree (`pages/battle/`) and the mobile tree (`pages/battle/mobile/`)
 * are separate component trees that attach these to different DOM nodes. They
 * are allowed to differ in WHERE an effect lands; they are not allowed to
 * differ in HOW HARD it hits. Keeping the numbers here is what stops the two
 * from drifting into two different games — which is the failure mode that
 * "ship desktop now, do mobile later" always produces.
 *
 * This file is deliberately NOT part of `src/vfx/`. It describes this game's
 * camera and sprites, not anything intrinsic to an effect, so it stays on the
 * game side of the portability seam. The one import from `src/vfx` is the
 * `MotionLevel` type, and that direction is one-way.
 */

export interface GameFeel {
  /**
   * Fraction of the reaction animation spent frozen at the contact pose
   * before motion resumes — hitstop, the single biggest "weight" signal in
   * fighting games. Baked into the front of a keyframe set rather than
   * driven by a game loop, so it costs no new infrastructure.
   */
  hitstopFraction: number;
  /** Peak brightness at the contact frame. 1 = no flash. */
  impactFlash: number;
  /** Sprite displacement, px. Knockback is folded in as its first, directional beat. */
  spriteShakePx: number;
  /** Total sprite reaction duration, ms. */
  spriteShakeMs: number;
  /** How far an attacker travels toward its target, px. */
  lungePx: number;
  /** Arena-wide displacement, px. Zero on normal hits — world motion is a privilege. */
  arenaShakeX: number;
  arenaShakeY: number;
  arenaShakeMs: number;
  /**
   * Peak opacity of the full-bleed impact flash. Zero means no flash at all.
   * Capped well below 1: a strobe over a dark palette is an accessibility
   * hazard, and the HUD has to stay readable straight through it.
   */
  flashPeak: number;
  /** Total flash duration, ms. Kept short — a lingering flash reads as a bug. */
  flashMs: number;
  /**
   * True when motion is off. Consumers must substitute a STATIC tell — a held
   * brightness, an outline, a banner — never simply drop the effect. Losing
   * motion must never mean losing the information that something happened.
   */
  staticFallback: boolean;
}

const NONE: GameFeel = {
  hitstopFraction: 0,
  impactFlash: 1,
  spriteShakePx: 0,
  spriteShakeMs: 0,
  lungePx: 0,
  arenaShakeX: 0,
  arenaShakeY: 0,
  arenaShakeMs: 0,
  flashPeak: 0,
  flashMs: 0,
  staticFallback: true,
};

/** Full intensity, by severity. Subtle and off are derived from these. */
const FULL: Record<BeatSeverity, GameFeel> = {
  normal: {
    hitstopFraction: 0.18,
    impactFlash: 2.2,
    spriteShakePx: 4,
    spriteShakeMs: 350,
    lungePx: 14,
    // The world does not move for a routine hit. If everything shakes,
    // nothing does.
    arenaShakeX: 0,
    arenaShakeY: 0,
    arenaShakeMs: 0,
    flashPeak: 0,
    flashMs: 0,
    staticFallback: false,
  },
  heavy: {
    hitstopFraction: 0.22,
    impactFlash: 2.6,
    spriteShakePx: 7,
    spriteShakeMs: 640,
    lungePx: 18,
    arenaShakeX: 6,
    arenaShakeY: 3,
    arenaShakeMs: 260,
    flashPeak: 0.35,
    flashMs: 180,
    staticFallback: false,
  },
  ultimate: {
    hitstopFraction: 0.24,
    impactFlash: 3,
    spriteShakePx: 9,
    spriteShakeMs: 700,
    lungePx: 22,
    arenaShakeX: 10,
    arenaShakeY: 5,
    arenaShakeMs: 420,
    flashPeak: 0.5,
    flashMs: 220,
    staticFallback: false,
  },
};

/**
 * Resolve the feel for one beat.
 *
 * 'subtle' keeps everything that happens ON a sprite and drops everything
 * that happens to the WORLD — no arena shake, no full-screen flash, hitstop
 * halved. That is roughly "today's game plus weight", and it is the setting
 * to fall back to if the full treatment turns out to be too much.
 */
export function getGameFeel(
  severity: BeatSeverity | undefined,
  motion: MotionLevel,
): GameFeel {
  if (motion === 'off') return NONE;
  const base = FULL[severity ?? 'normal'];
  if (motion === 'full') return base;
  return {
    ...base,
    hitstopFraction: base.hitstopFraction / 2,
    arenaShakeX: 0,
    arenaShakeY: 0,
    arenaShakeMs: 0,
    flashPeak: 0,
    flashMs: 0,
  };
}

/** Storage key for the player's Motion choice. */
export const MOTION_LEVEL_STORAGE_KEY = 'cardEngine.combat.motionLevel';
