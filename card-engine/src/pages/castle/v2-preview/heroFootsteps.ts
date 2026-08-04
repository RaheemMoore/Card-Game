import Phaser from 'phaser';

export interface FootstepSnapshot {
  activeCount: number;
  emittedPuffs: number;
  emitterPosition: { x: number; y: number };
  lastBurstDirection: { x: number; y: number };
  nominalDriftVelocity: { x: number; y: number };
  withinBudget: boolean;
}

export interface HeroFootstepsController {
  update(feetX: number, feetY: number, direction: { x: number; y: number }): void;
  setMotionOff(off: boolean): void;
  getSnapshot(): FootstepSnapshot;
  destroy(): void;
}

function makeDustTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('courtyard-v2-footstep-dust')) return;
  const size = 56;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(0xd8e1e6, 0.48);
  graphics.fillCircle(28, 31, 15);
  graphics.fillCircle(17, 35, 10);
  graphics.fillCircle(40, 35, 11);
  graphics.fillStyle(0xf0f5f7, 0.78);
  graphics.fillCircle(18, 34, 9);
  graphics.fillCircle(38, 34, 10);
  graphics.fillCircle(28, 23, 11);
  graphics.fillStyle(0xffffff, 0.92);
  graphics.fillCircle(27, 30, 8);
  graphics.generateTexture('courtyard-v2-footstep-dust', size, size);
  graphics.destroy();
}

export function createHeroFootsteps(scene: Phaser.Scene): HeroFootstepsController {
  makeDustTexture(scene);
  let motionOff = false;
  let lastStepAt = -Infinity;
  let stepSide = -1;
  let emitterX = 0;
  let emitterY = 0;
  let emittedPuffs = 0;
  let burstDirection = { x: 0, y: 1 };

  const dust = scene.add.particles(0, 0, 'courtyard-v2-footstep-dust', {
    x: { min: -3, max: 3 },
    y: { min: -2, max: 1 },
    speedX: {
      onEmit: () => -burstDirection.x * 18 + Phaser.Math.FloatBetween(-4, 4),
    },
    speedY: {
      onEmit: () => -burstDirection.y * 8 - 14 + Phaser.Math.FloatBetween(-3, 2),
    },
    lifespan: { min: 480, max: 640 },
    scale: { start: 0.34, end: 0.62 },
    alpha: { start: 0.58, end: 0 },
    rotate: { min: -8, max: 8 },
    emitting: false,
    maxAliveParticles: 6,
  });

  return {
    update(feetX, feetY, direction) {
      const moving = direction.x !== 0 || direction.y !== 0;
      const sideX = -direction.y * stepSide * 4;
      const sideY = direction.x * stepSide * 2;
      emitterX = feetX - direction.x * 2 + sideX;
      emitterY = feetY - direction.y + sideY - 2;
      dust.setPosition(emitterX, emitterY).setDepth(feetY - 2);
      if (motionOff || !moving || scene.time.now - lastStepAt < 235) return;
      burstDirection = direction;
      dust.explode(1);
      emittedPuffs += 1;
      stepSide *= -1;
      lastStepAt = scene.time.now;
    },
    setMotionOff(off) {
      motionOff = off;
      if (off) {
        dust.stop();
        dust.killAll();
      }
    },
    getSnapshot() {
      const activeCount = dust.getAliveParticleCount();
      return {
        activeCount,
        emittedPuffs,
        emitterPosition: { x: emitterX, y: emitterY },
        lastBurstDirection: burstDirection,
        nominalDriftVelocity: {
          x: -burstDirection.x * 18,
          y: -burstDirection.y * 8 - 14,
        },
        withinBudget: activeCount <= 6,
      };
    },
    destroy() {
      dust.destroy();
    },
  };
}
