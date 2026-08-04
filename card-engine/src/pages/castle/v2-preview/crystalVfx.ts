import Phaser from 'phaser';
import {
  CRYSTAL_CLUSTER as CLUSTER,
  CRYSTAL_DEPTH as COUNTER_GROUND_Y,
  FORGE_CRYSTALS,
  crystalBloomAlpha,
  crystalExcitementTarget,
  crystalGlintInterval,
  crystalMotesMuted,
} from './crystalTuning';

/**
 * WHY THE GEMS ARE ANIMATED IN CODE AND NOT IN ART: PixelLab has no
 * object-animation endpoint at all — `/create-1-direction-object` returns a
 * still, and `/characters/animations` is skeleton-driven and needs a
 * character_id, so it animates a rigged humanoid, not a gem. Faking it with
 * "frame 1/2/3" prompts is the drift trap the playbook already paid 186
 * generations to learn. The gems therefore stay static paint and every bit of
 * life they have is synthesized here, for free.
 *
 * Positions, depth and every tuning curve live in ./crystalTuning so they can
 * be asserted without a WebGL context.
 */

export interface CrystalVfxSnapshot {
  enabled: boolean;
  motionOff: boolean;
  /** 0 = resting at distance, 1 = hero is at the counter. */
  excitement: number;
  heroDistance: number;
  /** Motes are the noisy element, so they alone obey the hard proximity mute. */
  motesMuted: boolean;
  moteCount: number;
  glintsFired: number;
  glintActive: boolean;
  bloomAlphas: number[];
  /** One ambient source (the cluster pulses as a unit), 6 motes, 1 glint. */
  withinBudget: boolean;
}

export interface CrystalVfxController {
  setMotionOff(off: boolean): void;
  update(heroX: number, heroY: number): void;
  getSnapshot(): CrystalVfxSnapshot;
  destroy(): void;
}

function makeCrystalBloomTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('forge-crystal-bloom')) return;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let ring = 14; ring > 0; ring -= 1) {
    const ratio = ring / 14;
    graphics.fillStyle(0xffffff, 0.03 + (1 - ratio) * 0.03);
    graphics.fillCircle(32, 32, 32 * ratio);
  }
  graphics.generateTexture('forge-crystal-bloom', 64, 64);
  graphics.destroy();
}

function makeGlintTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('forge-crystal-glint')) return;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  // A four-point star: two tapered bars plus a hot core. Reads as a specular
  // catch at 15px, which a moving highlight band does not.
  graphics.fillStyle(0xffffff, 0.9);
  graphics.fillTriangle(16, 0, 14, 16, 18, 16);
  graphics.fillTriangle(16, 32, 14, 16, 18, 16);
  graphics.fillTriangle(0, 16, 16, 14, 16, 18);
  graphics.fillTriangle(32, 16, 16, 14, 16, 18);
  graphics.fillStyle(0xffffff, 1).fillCircle(16, 16, 2.5);
  graphics.generateTexture('forge-crystal-glint', 32, 32);
  graphics.destroy();
}

function makeMoteTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('forge-crystal-mote')) return;
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(0xffffff, 0.55).fillCircle(3, 3, 3);
  graphics.fillStyle(0xffffff, 1).fillCircle(3, 3, 1.5);
  graphics.generateTexture('forge-crystal-mote', 6, 6);
  graphics.destroy();
}

export function createCrystalVfx(scene: Phaser.Scene): CrystalVfxController {
  makeCrystalBloomTexture(scene);
  makeGlintTexture(scene);
  makeMoteTexture(scene);

  let motionOff = false;
  let excitement = 0;
  let heroDistance = Number.POSITIVE_INFINITY;
  let motesMuted = false;
  let glintsFired = 0;
  let nextGlintAt = 0;
  let glintUntil = 0;

  // The blooms are driven by an explicit sine in update() rather than by yoyo
  // tweens. A tween's amplitude is fixed at creation, and this amplitude has to
  // track the hero-proximity ramp every frame; driving it by hand also means
  // motionOff freezes by simply not advancing, with no pause bookkeeping.
  const blooms = FORGE_CRYSTALS.map((crystal, index) => {
    const image = scene.add
      .image(crystal.x, crystal.y, 'forge-crystal-bloom')
      .setDisplaySize(30, 34)
      .setTint(crystal.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.1)
      .setDepth(COUNTER_GROUND_Y);
    return {
      image,
      // Staggered so the cluster breathes as one slow wave instead of three
      // things blinking in lockstep. Periods are all >= 2s per the motion budget.
      period: 2600 + index * 420,
      phase: index * ((Math.PI * 2) / 3),
      baseSize: { width: 30, height: 34 },
    };
  });

  const glint = scene.add
    .image(0, 0, 'forge-crystal-glint')
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0)
    .setScale(0.5)
    .setDepth(COUNTER_GROUND_Y + 1);

  const motes = scene.add.particles(CLUSTER.x, CLUSTER.y - 4, 'forge-crystal-mote', {
    x: { min: -18, max: 18 },
    y: { min: -8, max: 6 },
    speedX: { min: -5, max: 5 },
    speedY: { min: -20, max: -9 },
    lifespan: { min: 2600, max: 3400 },
    scale: { start: 0.85, end: 0.2 },
    tint: [0xff5f9e, 0x6aa8ff, 0x5fd98a],
    blendMode: 'ADD',
    frequency: 1400,
    maxAliveParticles: 6,
  });
  motes.setDepth(COUNTER_GROUND_Y + 1);

  const update = (heroX: number, heroY: number) => {
    heroDistance = Phaser.Math.Distance.Between(heroX, heroY, CLUSTER.x, CLUSTER.y);

    // DELIBERATE DEVIATION from the blanket "proximity-mute every emitter within
    // ~80px" rule in card-engine-courtyard-life-plan.md. That rule exists so the
    // eye never loses the player in ambient noise, and it still governs the
    // MOTES, which are the drifting, eye-catching part. But the gems are the
    // forge's attractor: muting them the moment the player walks up would make
    // the counter go dead exactly when he is looking at it, which is the
    // opposite of "make it more exciting". So the bloom and glint RAMP UP on
    // approach instead. Flagged for Raheem, not decided silently.
    const target = crystalExcitementTarget(heroDistance);
    excitement = Phaser.Math.Linear(excitement, target, 0.06);

    motesMuted = crystalMotesMuted(heroDistance);
    if (motionOff || motesMuted) {
      if (motes.emitting) {
        motes.stop();
        motes.killAll();
      }
    } else if (!motes.emitting) {
      motes.start();
    }

    if (motionOff) return;

    const now = scene.time.now;

    for (const bloom of blooms) {
      const wave = 0.5 + 0.5 * Math.sin((now / bloom.period) * Math.PI * 2 + bloom.phase);
      bloom.image.setAlpha(crystalBloomAlpha(excitement, wave));
      const swell = 1 + (0.06 + excitement * 0.1) * wave;
      bloom.image.setDisplaySize(bloom.baseSize.width * swell, bloom.baseSize.height * swell);
    }

    // Fade each mote in and out over its own lifetime, so none ever pops into
    // existence at full brightness. Done here rather than through the emitter's
    // `alpha` op because that op only interpolates start -> end, and this needs
    // a 0 -> peak -> 0 arc. Particle.data is deliberately untouched: the emitter
    // uses it internally for its own interpolation state.
    motes.forEachAlive((particle) => {
      const elapsed = 1 - particle.lifeCurrent / particle.lifeT;
      particle.alpha = Math.sin(elapsed * Math.PI) * 0.6;
    }, null);

    if (now >= glintUntil && glint.alpha > 0) {
      glint.setAlpha(0);
    }

    if (now >= nextGlintAt) {
      const crystal = Phaser.Utils.Array.GetRandom([...FORGE_CRYSTALS]);
      glint
        .setPosition(crystal.x, crystal.y - 4)
        .setTint(0xffffff)
        .setAlpha(0.55 + excitement * 0.4)
        .setScale(0.42 + excitement * 0.22)
        .setRotation(Phaser.Math.FloatBetween(-0.4, 0.4));
      glintsFired += 1;
      glintUntil = now + 260;
      nextGlintAt = now + crystalGlintInterval(excitement);
    }
  };

  const setMotionOff = (off: boolean) => {
    motionOff = off;
    if (off) {
      motes.stop();
      motes.killAll();
      glint.setAlpha(0);
      // Hold the gems lit but still. A gem that goes flat black under reduced
      // motion reads as broken art rather than as disabled motion.
      for (const bloom of blooms) {
        bloom.image.setAlpha(0.16);
        bloom.image.setDisplaySize(bloom.baseSize.width, bloom.baseSize.height);
      }
    } else {
      motes.start();
    }
  };

  const getSnapshot = (): CrystalVfxSnapshot => {
    const moteCount = motes.getAliveParticleCount();
    return {
      enabled: true,
      motionOff,
      excitement: Number(excitement.toFixed(3)),
      heroDistance: Number.isFinite(heroDistance) ? Math.round(heroDistance) : -1,
      motesMuted,
      moteCount,
      glintsFired,
      glintActive: scene.time.now < glintUntil,
      bloomAlphas: blooms.map((bloom) => Number(bloom.image.alpha.toFixed(3))),
      withinBudget: moteCount <= 6 && blooms.length === 3,
    };
  };

  return {
    setMotionOff,
    update,
    getSnapshot,
    destroy() {
      motes.destroy();
      glint.destroy();
      for (const bloom of blooms) bloom.image.destroy();
    },
  };
}
