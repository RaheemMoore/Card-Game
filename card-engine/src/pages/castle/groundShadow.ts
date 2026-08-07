/**
 * The contact shadow — the small patch of dark under an actor's feet.
 *
 * Lifted out of `courtyard/ambient.ts` on 2026-08-07 so the scene-preview runtime
 * could use it too. Elevation is why: once a sprite can leave the floor, the
 * shadow is the ONLY thing telling you the floor did not come with it. Without
 * one a jump reads as sliding.
 *
 * It is a contact patch and nothing more. A long directional CAST shadow was
 * built and removed after Raheem saw it — a hard-edged ellipse tracking a hero
 * across painted stone reads as a bug rather than as light. If that is ever
 * revisited it needs painting per-sprite, not drawing as a primitive.
 */

import type Phaser from 'phaser';

export const GROUND_SHADOW = {
  key: 'hero-shadow',
  width: 64,
  height: 20,
  /** Matches HERO_SHADOW in data/castle/courtyardLayers.ts. */
  widthRatio: 0.5,
  alpha: 0.28,
} as const;

/**
 * Six nested ellipses at 6% each. The stack is what gives a soft edge without a
 * blur shader — a single flat ellipse reads as a sticker.
 *
 * Idempotent: safe to call on every scene create.
 */
export function makeGroundShadowTexture(
  scene: Phaser.Scene,
  key: string = GROUND_SHADOW.key,
  w: number = GROUND_SHADOW.width,
  h: number = GROUND_SHADOW.height,
): string {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let i = 6; i > 0; i--) {
    g.fillStyle(0x000000, 0.06);
    g.fillEllipse(w / 2, h / 2, (w * i) / 6, (h * i) / 6);
  }
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}
