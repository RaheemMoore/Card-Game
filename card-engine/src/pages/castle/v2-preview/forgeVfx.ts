import Phaser from 'phaser';

/** Candidate anchors measured from the current Figma Courtyard v2 composition. */
export const FORGE_PREVIEW = {
  source: { x: 1004, y: 316 },
  groundDepth: 474,
  envelope: { x: 840, y: 140, width: 330, height: 470 },
  wind: { x: 18, y: -42 },
} as const;

export type ForgeSurgePhase = 'idle' | 'charge' | 'burst' | 'decay' | 'reduced-static';

export interface ForgeVfxSnapshot {
  enabled: boolean;
  motionOff: boolean;
  smokeCount: number;
  sparkCount: number;
  gatherCount: number;
  activeParticleCount: number;
  surgePhase: ForgeSurgePhase;
  surgeActive: boolean;
  ignoredSurgeCount: number;
  wind: { x: number; y: number };
  withinBudget: boolean;
  collisionModel: 'none-preview-only';
}

export interface ForgeVfxController {
  setMotionOff(off: boolean): void;
  surge(): boolean;
  getSnapshot(): ForgeVfxSnapshot;
  destroy(): void;
}

function makeSoftTexture(scene: Phaser.Scene, key: string, size: number): void {
  if (scene.textures.exists(key)) return;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  const half = size / 2;
  for (let ring = 12; ring > 0; ring -= 1) {
    const ratio = ring / 12;
    graphics.fillStyle(0xffffff, 0.035 + (1 - ratio) * 0.025);
    graphics.fillCircle(half, half, half * ratio);
  }
  graphics.generateTexture(key, size, size);
  graphics.destroy();
}

function makeSparkTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('forge-preview-spark')) return;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(0xffffff, 1).fillCircle(5, 5, 3);
  graphics.fillStyle(0xffffff, 0.35).fillCircle(5, 5, 5);
  graphics.generateTexture('forge-preview-spark', 10, 10);
  graphics.destroy();
}

function makeShimmerTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('forge-preview-shimmer')) return;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(0xffffff, 0.65).fillRoundedRect(0, 0, 64, 8, 4);
  graphics.generateTexture('forge-preview-shimmer', 64, 8);
  graphics.destroy();
}

function makeEnergyRingTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('forge-preview-energy-ring')) return;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let line = 0; line < 4; line += 1) {
    graphics.lineStyle(4 - line * 0.7, 0xffffff, 0.72 - line * 0.12);
    graphics.strokeEllipse(64, 40, 112 - line * 6, 62 - line * 3);
  }
  graphics.generateTexture('forge-preview-energy-ring', 128, 80);
  graphics.destroy();
}

export function createForgeVfx(scene: Phaser.Scene): ForgeVfxController {
  makeSoftTexture(scene, 'forge-preview-smoke', 80);
  makeSparkTexture(scene);
  makeShimmerTexture(scene);
  makeEnergyRingTexture(scene);

  const { source, groundDepth, wind } = FORGE_PREVIEW;
  const ambientTimers: Phaser.Time.TimerEvent[] = [];
  const ambientTweens: Phaser.Tweens.Tween[] = [];
  const surgeTimers: Phaser.Time.TimerEvent[] = [];
  const surgeTweens: Phaser.Tweens.Tween[] = [];
  let motionOff = false;
  let surgePhase: ForgeSurgePhase = 'idle';
  let ignoredSurgeCount = 0;

  const steadyGlow = scene.add
    .image(source.x, source.y + 7, 'forge-preview-smoke')
    .setDisplaySize(82, 58)
    .setTint(0xff8a2b)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0.15)
    .setDepth(groundDepth);

  const smoke = scene.add.particles(source.x, source.y - 12, 'forge-preview-smoke', {
    x: { min: -7, max: 7 },
    y: { min: -4, max: 4 },
    speedX: { min: wind.x - 5, max: wind.x + 7 },
    speedY: { min: wind.y - 8, max: wind.y + 5 },
    lifespan: { min: 3400, max: 4300 },
    scale: { start: 0.2, end: 0.9 },
    alpha: { start: 0.26, end: 0 },
    tint: [0x5b5360, 0x74636a, 0x86777a],
    frequency: 860,
    maxAliveParticles: 8,
  });
  smoke.setDepth(groundDepth - 1);

  const sparks = scene.add.particles(source.x, source.y + 8, 'forge-preview-spark', {
    x: { min: -10, max: 10 },
    y: { min: -4, max: 5 },
    speedX: { min: -72, max: 88 },
    speedY: { min: -135, max: -58 },
    gravityY: 130,
    lifespan: { min: 650, max: 1050 },
    scale: { start: 0.9, end: 0.1 },
    alpha: { start: 1, end: 0 },
    tint: [0xfff1a6, 0xffb23c, 0xff6a1a],
    blendMode: 'ADD',
    emitting: false,
    maxAliveParticles: 18,
  });
  sparks.setDepth(groundDepth + 1);

  const gather = scene.add.particles(source.x, source.y + 6, 'forge-preview-spark', {
    x: { min: -78, max: 78 },
    y: { min: -48, max: 48 },
    moveToX: 0,
    moveToY: 0,
    lifespan: { min: 420, max: 560 },
    scale: { start: 0.5, end: 0.12 },
    alpha: { start: 0.22, end: 0.95 },
    tint: [0xffd56a, 0xff8b2c, 0xfff4c2],
    blendMode: 'ADD',
    emitting: false,
    maxAliveParticles: 14,
  });
  gather.setDepth(groundDepth + 1);

  const surgeRing = scene.add
    .image(source.x, source.y + 6, 'forge-preview-energy-ring')
    .setTint(0xffb43c)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0)
    .setScale(0.2)
    .setDepth(groundDepth + 2);

  const shimmerBands = [0, 1, 2].map((index) => {
    const band = scene.add
      .image(source.x, source.y - 18 - index * 12, 'forge-preview-shimmer')
      .setDisplaySize(34 - index * 4, 4)
      .setTint(0xffd18a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.08)
      .setDepth(groundDepth + 2);
    ambientTweens.push(
      scene.tweens.add({
        targets: band,
        x: source.x + (index % 2 === 0 ? 7 : -7),
        alpha: { from: 0.035, to: 0.13 },
        scaleX: { from: 0.8, to: 1.15 },
        duration: 1050 + index * 220,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }),
    );
    return band;
  });

  const trackSurgeTimer = (delay: number, callback: () => void) => {
    let timer: Phaser.Time.TimerEvent;
    timer = scene.time.delayedCall(delay, () => {
      const index = surgeTimers.indexOf(timer);
      if (index >= 0) surgeTimers.splice(index, 1);
      callback();
    });
    surgeTimers.push(timer);
  };

  const finishSurge = () => {
    surgePhase = 'idle';
    steadyGlow.setAlpha(0.15).setScale(1);
    surgeRing.setAlpha(0).setScale(0.2);
  };

  const surge = (): boolean => {
    if (surgePhase !== 'idle') {
      ignoredSurgeCount += 1;
      return false;
    }

    surgeTweens.splice(0).forEach((tween) => tween.destroy());

    if (motionOff) {
      surgePhase = 'reduced-static';
      steadyGlow.setAlpha(0.34).setScale(1.15);
      trackSurgeTimer(480, finishSurge);
      return true;
    }

    surgePhase = 'charge';
    gather.explode(12);
    surgeTweens.push(
      scene.tweens.add({
        targets: steadyGlow,
        alpha: 0.5,
        scale: 1.35,
        duration: 430,
        ease: 'Sine.easeIn',
      }),
    );
    trackSurgeTimer(430, () => {
      surgePhase = 'burst';
      sparks.explode(16);
      surgeRing.setAlpha(0.85).setScale(0.2);
      surgeTweens.push(
        scene.tweens.add({
          targets: surgeRing,
          alpha: 0,
          scaleX: 1.25,
          scaleY: 0.78,
          duration: 520,
          ease: 'Cubic.easeOut',
        }),
      );
    });
    trackSurgeTimer(900, () => {
      surgePhase = 'decay';
      surgeTweens.push(
        scene.tweens.add({
          targets: steadyGlow,
          alpha: 0.15,
          scale: 1,
          duration: 420,
          ease: 'Sine.easeOut',
        }),
      );
    });
    trackSurgeTimer(1380, finishSurge);
    return true;
  };

  const setMotionOff = (off: boolean) => {
    motionOff = off;
    for (const tween of ambientTweens) {
      if (off) tween.pause();
      else tween.resume();
    }
    for (const timer of ambientTimers) timer.paused = off;
    if (off) {
      smoke.stop();
      smoke.killAll();
      sparks.stop();
      sparks.killAll();
      gather.stop();
      gather.killAll();
      surgeTimers.splice(0).forEach((timer) => timer.destroy());
      surgeTweens.splice(0).forEach((tween) => tween.destroy());
      shimmerBands.forEach((band) => band.setVisible(false));
      surgeRing.setAlpha(0);
      if (surgePhase !== 'idle') {
        surgePhase = 'reduced-static';
        steadyGlow.setAlpha(0.34).setScale(1.15);
        trackSurgeTimer(480, finishSurge);
      } else {
        steadyGlow.setAlpha(0.09).setScale(1);
      }
    } else {
      smoke.start();
      shimmerBands.forEach((band) => band.setVisible(true));
      steadyGlow.setAlpha(0.15).setScale(1);
    }
  };

  const getSnapshot = (): ForgeVfxSnapshot => {
    const smokeCount = smoke.getAliveParticleCount();
    const sparkCount = sparks.getAliveParticleCount();
    const gatherCount = gather.getAliveParticleCount();
    const activeParticleCount = smokeCount + sparkCount + gatherCount;
    return {
      enabled: true,
      motionOff,
      smokeCount,
      sparkCount,
      gatherCount,
      activeParticleCount,
      surgePhase,
      surgeActive: surgePhase !== 'idle',
      ignoredSurgeCount,
      wind: { ...wind },
      withinBudget:
        smokeCount <= 8 && sparkCount <= 18 && gatherCount <= 14 && activeParticleCount <= 40,
      collisionModel: 'none-preview-only',
    };
  };

  return {
    setMotionOff,
    surge,
    getSnapshot,
    destroy() {
      ambientTimers.forEach((timer) => timer.destroy());
      ambientTweens.forEach((tween) => tween.destroy());
      surgeTimers.forEach((timer) => timer.destroy());
      surgeTweens.forEach((tween) => tween.destroy());
      smoke.destroy();
      sparks.destroy();
      gather.destroy();
      surgeRing.destroy();
      shimmerBands.forEach((band) => band.destroy());
      steadyGlow.destroy();
    },
  };
}
