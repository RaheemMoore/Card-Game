/**
 * Tuning numbers and pure curves for the forge counter crystals.
 *
 * This module deliberately imports NOTHING. `crystalVfx.ts` needs Phaser, and
 * Phaser cannot initialise under jsdom (CanvasFeatures touches a real 2D
 * context at import time), so anything that has to be asserted in a test has to
 * live outside that import graph. Same reason `courtyard/layout.ts` is separate
 * from the scene that consumes it.
 */

/**
 * The three gems painted onto `art-counter` (Figma node 18:2), in plate space.
 *
 * Positions were read off counter-depth.png (214x110, drawn at 1:1 from x 894,
 * y 357) by isolating the saturated non-wood pixels, not estimated by eye.
 */
export const FORGE_CRYSTALS = [
  { id: 'rose', x: 1044, y: 381, color: 0xff5f9e },
  { id: 'azure', x: 1060, y: 372, color: 0x6aa8ff },
  { id: 'verdant', x: 1072, y: 382, color: 0x5fd98a },
] as const;

/** Cluster centre, used for the hero-proximity ramp. */
export const CRYSTAL_CLUSTER = { x: 1058, y: 378 } as const;

/** Matches PREVIEW_FORGE_OCCLUDERS['forge-counter'].groundY so the glow sits on
 *  the counter art but still loses to a hero standing in front of it. */
export const CRYSTAL_DEPTH = 467;

/** Hero distance at which the gems are fully "approached", and where they return
 *  to their calm resting state. Between the two the excitement ramps smoothly. */
export const NEAR_DISTANCE = 80;
export const FAR_DISTANCE = 260;

export function crystalExcitementTarget(distance: number): number {
  const t = (distance - NEAR_DISTANCE) / (FAR_DISTANCE - NEAR_DISTANCE);
  return 1 - Math.min(Math.max(t, 0), 1);
}

/** `wave` is the 0..1 output of the bloom's sine. */
export function crystalBloomAlpha(excitement: number, wave: number): number {
  return 0.1 + excitement * 0.14 + (0.07 + excitement * 0.12) * wave;
}

/** Milliseconds until the next glint. Calm gems ~4.2s, gems at the counter ~1.6s. */
export function crystalGlintInterval(excitement: number): number {
  return 4200 + (1600 - 4200) * excitement;
}

/** Motes are the only element that hard-mutes when the hero is close. */
export function crystalMotesMuted(distance: number): boolean {
  return distance < NEAR_DISTANCE;
}
