import Phaser from 'phaser';
import { fireballVisual } from './fireballGate1';

export interface FireballView {
  update(x: number, y: number, dtMs: number): void;
  destroy(): void;
}

/**
 * No generated art in Gate 1. This layered round projectile proves silhouette,
 * size, separation and timing before a paid VFX pass commits us to frames.
 */
export function createFireballView(
  scene: Phaser.Scene,
  x: number,
  y: number,
  facing: -1 | 1,
  charge01: number,
  depth: number,
): FireballView {
  const footprint = fireballVisual(charge01);
  const radius = footprint.bodyDiameterPx / 2;
  const tailX = -facing * (radius + footprint.tailLengthPx * 0.38);

  const halo = scene.add.circle(0, 0, radius * 1.2, 0xff5a18, 0.2).setBlendMode(Phaser.BlendModes.ADD);
  const tail = scene.add
    .ellipse(tailX, 0, footprint.tailLengthPx, footprint.heightPx * 0.48, 0xf04414, 0.72)
    .setBlendMode(Phaser.BlendModes.ADD);
  const body = scene.add.circle(0, 0, radius, 0xf56a18, 1);
  const inner = scene.add.circle(facing * radius * 0.08, 0, radius * 0.68, 0xffb323, 1);
  const core = scene.add.circle(facing * radius * 0.18, 0, radius * 0.34, 0xfff2a8, 1);

  const container = scene.add.container(x, y, [halo, tail, body, inner, core]).setDepth(depth);
  let ageMs = 0;

  return {
    update(nextX, nextY, dtMs) {
      ageMs += dtMs;
      container.setPosition(nextX, nextY);
      const pulse = 1 + Math.sin(ageMs / 42) * 0.025;
      body.setScale(pulse);
      inner.setScale(2 - pulse);
      halo.setAlpha(0.16 + (Math.sin(ageMs / 55) + 1) * 0.04);
    },
    destroy() {
      container.destroy(true);
    },
  };
}

export interface FireCardHeatView {
  set(position: { x: number; y: number }, heat: { visible: boolean; alpha: number; radiusPx: number; coreAlpha: number }): void;
  destroy(): void;
}

/** Glow-only overlay: the physical card remains visible in the hero sheet. */
export function createFireCardHeatView(scene: Phaser.Scene, depth: number): FireCardHeatView {
  const halo = scene.add.circle(0, 0, 12, 0xff5a18, 0).setBlendMode(Phaser.BlendModes.ADD);
  const core = scene.add.circle(0, 0, 5, 0xffe58a, 0).setBlendMode(Phaser.BlendModes.ADD);
  const container = scene.add.container(0, 0, [halo, core]).setDepth(depth).setVisible(false);

  return {
    set(position, heat) {
      container.setPosition(position.x, position.y).setVisible(heat.visible);
      if (!heat.visible) return;
      halo.setRadius(heat.radiusPx).setAlpha(heat.alpha);
      core.setRadius(Math.max(3, heat.radiusPx * 0.34)).setAlpha(heat.coreAlpha);
    },
    destroy() {
      container.destroy(true);
    },
  };
}
