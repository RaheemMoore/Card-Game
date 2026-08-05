import Phaser from 'phaser';
import {
  AMBIENT,
  GLOW_SPOTS,
  HERO_SHADOW,
  SPARKLE_SPAWN,
  WATER_LAYER,
} from '../../../data/castle/courtyardLayers';

/**
 * Ambient life for the painted courtyard.
 *
 * ZERO GENERATION COST. Everything is a Phaser tween, emitter, or procedurally
 * drawn texture, layered over the existing painting. The plate is untouched.
 *
 * TWO MISTAKES FROM THE FIRST VERSION, both reported as "I can't see it":
 *
 * 1. The lamp pulse was tweening `glow.alpha`, while update() ALSO wrote
 *    `glow.alpha` every frame for the proximity mute. The tween ran and was
 *    immediately stomped 60x a second, so the glow was mathematically constant.
 *    Fixed by tweening a plain proxy object and having update() combine
 *    `pulse.alpha * muteFactor` — the two concerns no longer fight over one
 *    property.
 *
 * 2. The water "shimmer" cross-faded two copies of the SAME cut-out image.
 *    Blending an image with itself only changes overall brightness; nothing
 *    appears to move. Replaced with things that genuinely move: expanding
 *    ripple rings and falling spout droplets.
 *
 * The lesson generalizes: an effect nobody can see is worth nothing, and
 * subtlety is not the same as invisibility.
 */

export interface Ambient {
  /** Call each frame with the hero's position and whether he is walking. */
  update(heroX: number, heroY: number, moving: boolean): void;
  setMotionOff(off: boolean): void;
}

/** Soft radial dot — glows, sparkles, motes, dust. Drawn once. */
function makeRadialTexture(scene: Phaser.Scene, key: string, size: number): void {
  if (scene.textures.exists(key)) return;
  const half = size / 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let i = 18; i > 0; i--) {
    const t = i / 18;
    g.fillStyle(0xffffff, 0.06);
    g.fillCircle(half, half, half * t);
  }
  g.generateTexture(key, size, size);
  g.destroy();
}

/** Soft ring, for expanding water ripples. */
function makeRingTexture(scene: Phaser.Scene, key: string, size: number): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const half = size / 2;
  for (let i = 0; i < 4; i++) {
    g.lineStyle(3 - i * 0.5, 0xffffff, 0.5 - i * 0.1);
    g.strokeCircle(half, half, half - 3 - i * 2);
  }
  g.generateTexture(key, size, size);
  g.destroy();
}

function makeShadowTexture(scene: Phaser.Scene, key: string, w: number, h: number): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let i = 6; i > 0; i--) {
    g.fillStyle(0x000000, 0.06);
    g.fillEllipse(w / 2, h / 2, (w * i) / 6, (h * i) / 6);
  }
  g.generateTexture(key, w, h);
  g.destroy();
}

interface Pulse {
  alpha: number;
  scale: number;
}

export function createAmbient(
  scene: Phaser.Scene,
  hero: Phaser.GameObjects.Sprite,
  worldWidth: number,
  worldHeight: number,
): Ambient {
  makeRadialTexture(scene, 'ambient-dot', 64);
  makeRingTexture(scene, 'ambient-ring', 96);
  makeShadowTexture(scene, 'hero-shadow', 64, 20);

  const tweens: Phaser.Tweens.Tween[] = [];
  const timers: Phaser.Time.TimerEvent[] = [];
  const emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  // ---- Contact shadow -----------------------------------------------------
  // A small patch under the feet, nothing more. A long directional CAST shadow
  // was tried and removed: it tracks the hero every frame, and a hard-edged
  // ellipse sliding across painted stone reads as a bug rather than as light.
  // Raheem, on seeing it: "the shadow that is following the pixel guy. That is
  // horrible." Grounding him is worth one soft patch; faking the sun is not.
  const shadow = scene.add
    .image(hero.x, hero.y, 'hero-shadow')
    .setAlpha(HERO_SHADOW.alpha)
    .setDisplaySize(hero.displayWidth * HERO_SHADOW.widthRatio, HERO_SHADOW.height);

  // ---- Water: the surface, plus things that actually move -----------------
  const water = scene.add.image(0, 0, WATER_LAYER.key).setOrigin(0, 0).setAlpha(0.9);
  water.setBlendMode(Phaser.BlendModes.SCREEN);
  tweens.push(
    scene.tweens.add({
      targets: water,
      alpha: { from: 0.55, to: 0.95 },
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }),
  );

  // Expanding ripple rings from under the spout — the clearest single cue that
  // water is running.
  const spawnRipple = () => {
    const ring = scene.add
      .image(WATER_LAYER.rippleCentre.x, WATER_LAYER.rippleCentre.y, 'ambient-ring')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(18, 10) // squashed: the basin is seen at an angle
      .setAlpha(0.75)
      .setDepth(2);
    scene.tweens.add({
      targets: ring,
      displayWidth: WATER_LAYER.rippleMaxRadius * 2,
      displayHeight: WATER_LAYER.rippleMaxRadius * 1.1,
      alpha: 0,
      duration: AMBIENT.rippleGrowMs,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    });
  };
  timers.push(
    scene.time.addEvent({
      delay: AMBIENT.ripplePeriodMs,
      loop: true,
      callback: spawnRipple,
    }),
  );

  // Droplets falling from the spout.
  const spout = scene.add.particles(0, 0, 'ambient-dot', {
    x: { min: WATER_LAYER.spout.x - 7, max: WATER_LAYER.spout.x + 7 },
    y: WATER_LAYER.spout.y,
    scale: { start: 0.09, end: 0.03 },
    alpha: { start: 0.85, end: 0.1 },
    speedY: { min: 55, max: 95 },
    speedX: { min: -12, max: 12 },
    lifespan: 620,
    frequency: AMBIENT.spoutFrequencyMs,
    blendMode: 'ADD',
    tint: 0xeafeff,
  });
  spout.setDepth(3);
  emitters.push(spout);

  // Surface sparkles.
  const sparkles = scene.add.particles(0, 0, 'ambient-dot', {
    x: { min: SPARKLE_SPAWN.x, max: SPARKLE_SPAWN.x + SPARKLE_SPAWN.width },
    y: { min: SPARKLE_SPAWN.y, max: SPARKLE_SPAWN.y + SPARKLE_SPAWN.height },
    scale: { start: 0.14, end: 0 },
    alpha: { start: 0.9, end: 0 },
    lifespan: 900,
    frequency: AMBIENT.sparkleFrequencyMs,
    blendMode: 'ADD',
    tint: 0xffffff,
  });
  sparkles.setDepth(3);
  emitters.push(sparkles);

  // ---- Crystal lamps: breathing light ------------------------------------
  // Each lamp gets a bright core and a wide soft halo, breathing on DIFFERENT
  // periods so the light feels emitted rather than switched.
  const lamps: { core: Phaser.GameObjects.Image; halo: Phaser.GameObjects.Image; corePulse: Pulse; haloPulse: Pulse; x: number; y: number }[] = [];

  GLOW_SPOTS.forEach((spot, i) => {
    const halo = scene.add
      .image(spot.x, spot.y, 'ambient-dot')
      .setDisplaySize(spot.radius * 2, spot.radius * 2)
      .setTint(spot.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      // The lamp's own ground line, not a fixed low depth — so the light sorts
      // with the post that emits it now that the post can occlude characters.
      // See GlowSpot.groundY.
      .setDepth(spot.groundY);
    const core = scene.add
      .image(spot.x, spot.y, 'ambient-dot')
      .setDisplaySize(spot.radius, spot.radius)
      .setTint(spot.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(spot.groundY + 1);

    const corePulse: Pulse = { alpha: AMBIENT.glowAlpha.min, scale: AMBIENT.glowScale.min };
    const haloPulse: Pulse = { alpha: AMBIENT.haloAlpha.min, scale: AMBIENT.haloScale.min };

    // Tween PROXY objects, never the sprites' own alpha — update() owns that,
    // and two writers on one property is what made this invisible before.
    tweens.push(
      scene.tweens.add({
        targets: corePulse,
        alpha: AMBIENT.glowAlpha.max,
        scale: AMBIENT.glowScale.max,
        duration: AMBIENT.glowPeriodMs,
        delay: (i * AMBIENT.glowPeriodMs) / GLOW_SPOTS.length,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }),
      scene.tweens.add({
        targets: haloPulse,
        alpha: AMBIENT.haloAlpha.max,
        scale: AMBIENT.haloScale.max,
        duration: AMBIENT.haloPeriodMs,
        delay: (i * AMBIENT.haloPeriodMs) / GLOW_SPOTS.length,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }),
    );

    lamps.push({ core, halo, corePulse, haloPulse, x: spot.x, y: spot.y });
  });

  // ---- Drifting motes -----------------------------------------------------
  const motes = scene.add.particles(0, 0, 'ambient-dot', {
    x: { min: 260, max: 1280 },
    y: { min: 320, max: 1000 },
    scale: { start: 0.1, end: 0.02 },
    alpha: { start: 0.5, end: 0, ease: 'Sine.easeInOut' },
    lifespan: 5200,
    frequency: AMBIENT.moteFrequencyMs,
    speedY: { min: -9, max: -3 },
    speedX: { min: -4, max: 4 },
    blendMode: 'ADD',
    tint: [0xfff2c4, 0xd8fbff],
  });
  emitters.push(motes);

  // ---- Dust under the hero's feet while walking ---------------------------
  const footDust = scene.add.particles(0, 0, 'ambient-dot', {
    scale: { start: 0.13, end: 0.3 },
    alpha: { start: 0.3, end: 0 },
    speedY: { min: -14, max: -4 },
    speedX: { min: -16, max: 16 },
    lifespan: 520,
    frequency: AMBIENT.footDustFrequencyMs,
    tint: 0xd9c49a,
    emitting: false,
  });
  emitters.push(footDust);

  // ---- Cloud shadow drifting across ---------------------------------------
  // Low contrast and slow, but it makes the light feel like it comes from a sky.
  // A thing in the world moves; the camera still never does.
  const cloud = scene.add
    .image(-worldWidth * 0.4, worldHeight * 0.35, 'ambient-dot')
    .setDisplaySize(worldWidth * 1.1, worldHeight * 1.3)
    .setTint(0x2a3350)
    .setAlpha(AMBIENT.cloudAlpha)
    .setBlendMode(Phaser.BlendModes.MULTIPLY)
    .setDepth(6);
  tweens.push(
    scene.tweens.add({
      targets: cloud,
      x: worldWidth * 1.4,
      duration: AMBIENT.cloudPeriodMs,
      repeat: -1,
      ease: 'Linear',
    }),
  );

  let motionOff = false;

  return {
    update(heroX: number, heroY: number, moving: boolean) {
      shadow.setPosition(heroX, heroY - HERO_SHADOW.height * 0.25);
      shadow.setDepth(hero.depth - 1);

      if (motionOff) return;

      footDust.setPosition(heroX, heroY - 2);
      if (moving && !footDust.emitting) footDust.start();
      else if (!moving && footDust.emitting) footDust.stop();

      // Apply the pulse, scaled by a proximity MULTIPLIER. Multiplying rather
      // than assigning is what keeps the breathing visible while still fading
      // the lamp out when the hero stands under it.
      for (const l of lamps) {
        const d = Phaser.Math.Distance.Between(heroX, heroY, l.x, l.y);
        const mute = d < AMBIENT.muteRadius ? Math.max(0, d / AMBIENT.muteRadius - 0.15) : 1;
        l.core.setAlpha(l.corePulse.alpha * mute).setScale(l.corePulse.scale);
        l.halo.setAlpha(l.haloPulse.alpha * mute).setScale(l.haloPulse.scale);
      }
    },

    setMotionOff(off: boolean) {
      motionOff = off;
      for (const t of tweens) {
        if (off) t.pause();
        else t.resume();
      }
      for (const tm of timers) tm.paused = off;
      for (const e of emitters) {
        if (off) {
          e.stop();
          e.killAll();
        } else if (e !== footDust) {
          e.start();
        }
      }
      if (off) {
        // Hold a steady lit state rather than a random mid-tween frame.
        water.setAlpha(0.85);
        for (const l of lamps) {
          l.core.setAlpha(AMBIENT.glowAlpha.min).setScale(1);
          l.halo.setAlpha(AMBIENT.haloAlpha.min).setScale(AMBIENT.haloScale.min);
        }
      }
    },
  };
}
