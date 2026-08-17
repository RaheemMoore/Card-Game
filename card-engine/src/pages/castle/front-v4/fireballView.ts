import Phaser from 'phaser';
import {
  fireballVisual,
  type FireballContact,
  type FireCardHeat,
} from './fireballGate1';

export interface FireballView {
  update(x: number, y: number, dtMs: number): void;
  destroy(): void;
}

export const FIRE_CARD_CHARGE_SHEET = {
  key: 'front-v4-fire-card-charge',
  path: '/assets/castle/fire-card/fire-card-charge.png',
  frameWidth: 64,
  frameHeight: 64,
  frames: 8,
} as const;

export const FIRE_CARD_PROJECTILE_SHEET = {
  key: 'front-v4-fire-card-projectile',
  path: '/assets/castle/fire-card/fire-card-projectile.png',
  frameWidth: 64,
  frameHeight: 64,
  frames: 8,
} as const;

const FIRE_CARD_PROJECTILE_ANIM = 'front-v4-fire-card-projectile-loop';
/** Leaves headroom for stronger cards while keeping the level-one cast satisfying. */
const BASIC_FIRE_CARD_WIND_STRENGTH = 0.8;

export function registerFireballAnimations(scene: Phaser.Scene) {
  if (scene.anims.exists(FIRE_CARD_PROJECTILE_ANIM)) return;
  scene.anims.create({
    key: FIRE_CARD_PROJECTILE_ANIM,
    frames: scene.anims.generateFrameNumbers(FIRE_CARD_PROJECTILE_SHEET.key, {
      start: 0,
      end: FIRE_CARD_PROJECTILE_SHEET.frames - 1,
    }),
    frameRate: 14,
    repeat: -1,
  });
}

/** The approved spiral-core pixel flame, with its light kept on a separate layer. */
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
  const flameWidth = footprint.totalLengthPx * 1.28;
  const flameHeight = footprint.heightPx * 1.28;

  const halo = scene.add.circle(0, 0, radius, 0xff5a18, 0.12).setBlendMode(Phaser.BlendModes.ADD);
  const flame = scene.add
    .sprite(-facing * footprint.totalLengthPx * 0.22, 0, FIRE_CARD_PROJECTILE_SHEET.key, 0)
    .setFlipX(facing < 0)
    .setDisplaySize(flameWidth, flameHeight)
    .play(FIRE_CARD_PROJECTILE_ANIM);

  const container = scene.add.container(x, y, [halo, flame]).setDepth(depth);
  let ageMs = 0;
  let trailMs = 0;
  const embers = new Set<Phaser.GameObjects.Arc>();

  return {
    update(nextX, nextY, dtMs) {
      ageMs += dtMs;
      trailMs += dtMs;
      container.setPosition(nextX, nextY);
      const pulse = 1 + Math.sin(ageMs / 42) * 0.025;
      flame.setDisplaySize(flameWidth * pulse, flameHeight * pulse);
      halo.setAlpha(0.08 + (Math.sin(ageMs / 55) + 1) * 0.025);
      if (trailMs >= 32) {
        trailMs = 0;
        const ember = scene.add
          .circle(
            nextX - facing * (radius + 3),
            nextY + Math.sin(ageMs / 31) * radius * 0.18,
            Math.max(2, radius * 0.22),
            0xff8b18,
            0.62,
          )
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(depth - 0.01);
        embers.add(ember);
        scene.tweens.add({
          targets: ember,
          x: ember.x - facing * footprint.tailLengthPx * 0.55,
          scale: 0.25,
          alpha: 0,
          duration: 150,
          onComplete: () => {
            embers.delete(ember);
            ember.destroy();
          },
        });
      }
    },
    destroy() {
      for (const ember of embers) {
        scene.tweens.killTweensOf(ember);
        ember.destroy();
      }
      embers.clear();
      container.destroy(true);
    },
  };
}

/**
 * Fire-owned launch punctuation: the projectile displaces the air around the
 * caster without moving the caster. A pressure ring opens at the muzzle while
 * short, cool-coloured streaks peel backward around the body and feet.
 */
export function playFireballLaunchBurst(
  scene: Phaser.Scene,
  origin: { x: number; y: number },
  caster: { x: number; groundY: number },
  facing: -1 | 1,
  charge01: number,
  depth: number,
  reducedMotion = false,
) {
  const charge = Phaser.Math.Clamp(charge01, 0, 1);
  const strength = (0.55 + charge * 0.45) * BASIC_FIRE_CARD_WIND_STRENGTH;
  const ring = scene.add
    .ellipse(origin.x, origin.y, 12, 30 + charge * 16, 0xffffff, 0)
    .setStrokeStyle(
      3 + charge * 2,
      0xffe0a3,
      0.9 * BASIC_FIRE_CARD_WIND_STRENGTH,
    )
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(depth + 0.02)
    .setScale(0.35, 0.72);
  scene.tweens.add({
    targets: ring,
    x: origin.x + facing * (12 + charge * 10) * BASIC_FIRE_CARD_WIND_STRENGTH,
    scaleX: 1 + (0.55 + charge * 0.55) * BASIC_FIRE_CARD_WIND_STRENGTH,
    scaleY: 1 + (0.05 + charge * 0.2) * BASIC_FIRE_CARD_WIND_STRENGTH,
    alpha: 0,
    duration: reducedMotion ? 90 : 165,
    ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  });

  if (reducedMotion) return;

  for (let index = 0; index < 2; index += 1) {
    const windArch = scene.add
      .ellipse(
        caster.x - facing * (16 + index * 12),
        caster.groundY - 56,
        58 + index * 22,
        112 + index * 20,
        0xffffff,
        0,
      )
      .setStrokeStyle(
        4 - index,
        index === 0 ? 0xe8f5f2 : 0xffd8a0,
        (0.78 - index * 0.16) * BASIC_FIRE_CARD_WIND_STRENGTH,
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth - 0.015);
    scene.tweens.add({
      targets: windArch,
      x: windArch.x - facing * (42 + index * 24) * strength,
      scaleX: 1.45 + charge * 0.18,
      scaleY: 1.12 + charge * 0.08,
      alpha: 0,
      duration: 235 + index * 65 + charge * 45,
      ease: 'Cubic.easeOut',
      onComplete: () => windArch.destroy(),
    });
  }

  const streakSpecs = [
    { y: -104, length: 46, drift: 78, angle: -9 },
    { y: -78, length: 62, drift: 102, angle: -5 },
    { y: -50, length: 54, drift: 92, angle: 3 },
    { y: -24, length: 68, drift: 116, angle: 7 },
    { y: -8, length: 44, drift: 84, angle: 10 },
  ];
  streakSpecs.forEach((spec, index) => {
    const startX = caster.x - facing * (10 + (index % 2) * 7);
    const startY = caster.groundY + spec.y;
    const colour = index % 2 === 0 ? 0xd9edf0 : 0xffd39a;
    const streak = scene.add
      .rectangle(
        startX,
        startY,
        spec.length * strength,
        index % 2 === 0 ? 5 : 6,
        colour,
        0.9 * BASIC_FIRE_CARD_WIND_STRENGTH,
      )
      .setOrigin(facing > 0 ? 1 : 0, 0.5)
      .setAngle(spec.angle * facing)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth - 0.01);
    scene.tweens.add({
      targets: streak,
      x: startX - facing * spec.drift * strength,
      y: startY + (index - 2) * 2,
      scaleX: 1.5 + charge * 0.5,
      alpha: 0,
      duration: 235 + index * 22 + charge * 65,
      ease: 'Cubic.easeOut',
      onComplete: () => streak.destroy(),
    });
  });

  // Ground-skimming air gives the burst a low "woof" without shaking or
  // translating the character. These are wind flecks, not enemy debris.
  for (let index = 0; index < 5; index += 1) {
    const fleck = scene.add
      .rectangle(
        caster.x - facing * (8 + index * 5),
        caster.groundY - 5 - (index % 2) * 4,
        13 + (index % 3) * 5,
        4,
        index % 2 ? 0xe8d1a8 : 0xc9d9d8,
        0.78 * BASIC_FIRE_CARD_WIND_STRENGTH,
      )
      .setDepth(depth - 0.02);
    scene.tweens.add({
      targets: fleck,
      x: fleck.x - facing * (52 + index * 11) * strength,
      y: fleck.y - 4 - (index % 3) * 3,
      scaleX: 1.6,
      alpha: 0,
      duration: 230 + index * 24,
      ease: 'Quad.easeOut',
      onComplete: () => fleck.destroy(),
    });
  }
}

/** Fire-owned contact punctuation. It never moves or changes the struck body. */
export function playFireballImpact(
  scene: Phaser.Scene,
  contact: FireballContact,
  depth: number,
  reducedMotion = false,
) {
  const radius = contact.visualFootprint.bodyDiameterPx * 0.52;
  const halo = scene.add
    .circle(contact.position.x, contact.position.y, radius * 1.35, 0xff4a12, 0.28)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(depth);
  const ring = scene.add
    .circle(contact.position.x, contact.position.y, radius * 0.72, 0xffb323, 0.86)
    .setStrokeStyle(Math.max(2, radius * 0.14), 0xfff0a0, 1)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(depth + 0.01);

  if (reducedMotion) {
    scene.time.delayedCall(110, () => {
      halo.destroy();
      ring.destroy();
    });
    return;
  }

  scene.tweens.add({
    targets: halo,
    scale: 1.7,
    alpha: 0,
    duration: 170,
    ease: 'Quad.easeOut',
    onComplete: () => halo.destroy(),
  });
  scene.tweens.add({
    targets: ring,
    x: ring.x + contact.direction.x * radius * 0.45,
    y: ring.y + contact.direction.y * radius * 0.45,
    scale: 1.35,
    alpha: 0,
    duration: 135,
    ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  });

  const sparkCount = contact.severity === 'heavy' ? 10 : contact.severity === 'normal' ? 7 : 5;
  for (let i = 0; i < sparkCount; i += 1) {
    const spread = (i / Math.max(1, sparkCount - 1) - 0.5) * Math.PI * 1.25;
    const baseAngle = Math.atan2(contact.direction.y, contact.direction.x);
    const angle = baseAngle + spread;
    const distance = radius * (0.8 + (i % 3) * 0.22);
    const spark = scene.add
      .circle(contact.position.x, contact.position.y, Math.max(2, radius * 0.1), i % 2 ? 0xff7a18 : 0xffe17a, 0.92)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth + 0.02);
    scene.tweens.add({
      targets: spark,
      x: contact.position.x + Math.cos(angle) * distance,
      y: contact.position.y + Math.sin(angle) * distance,
      scale: 0.2,
      alpha: 0,
      duration: 120 + (i % 3) * 25,
      ease: 'Quad.easeOut',
      onComplete: () => spark.destroy(),
    });
  }
}

export interface FireCardHeatView {
  set(
    position: { x: number; y: number },
    heat: FireCardHeat,
    facing: -1 | 1,
    groundY: number,
    reducedMotion?: boolean,
  ): void;
  destroy(): void;
}

export interface FireCardHeroLightView {
  set(hero: Phaser.GameObjects.Sprite, heat: FireCardHeat, facing: -1 | 1): void;
  destroy(): void;
}

/**
 * Fire-owned character lighting. Two masked copies preserve the authored cast
 * frames: warm additive light reaches around the flame-facing side, while a
 * quieter multiply pass deepens the far side. Neither changes the hero pose.
 */
export function createFireCardHeroLightView(
  scene: Phaser.Scene,
  depth: number,
): FireCardHeroLightView {
  const backShade = scene.add
    .sprite(0, 0, FIRE_CARD_CHARGE_SHEET.key, 0)
    .setTint(0x09070c)
    .setBlendMode(Phaser.BlendModes.MULTIPLY)
    .setDepth(depth)
    .setVisible(false);
  const warmFront = scene.add
    .sprite(0, 0, FIRE_CARD_CHARGE_SHEET.key, 0)
    .setTint(0xff9c3a)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(depth + 0.01)
    .setVisible(false);
  const hotRim = scene.add
    .sprite(0, 0, FIRE_CARD_CHARGE_SHEET.key, 0)
    .setTint(0xffe3a0)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(depth + 0.02)
    .setVisible(false);
  const backMaskShape = scene.add.graphics().setVisible(false);
  const frontMaskShape = scene.add.graphics().setVisible(false);
  const rimMaskShape = scene.add.graphics().setVisible(false);
  backShade.setMask(backMaskShape.createGeometryMask());
  warmFront.setMask(frontMaskShape.createGeometryMask());
  hotRim.setMask(rimMaskShape.createGeometryMask());

  const copyHero = (target: Phaser.GameObjects.Sprite, hero: Phaser.GameObjects.Sprite) => {
    target
      .setTexture(hero.texture.key, hero.frame.name)
      .setPosition(hero.x, hero.y)
      .setOrigin(hero.originX, hero.originY)
      .setRotation(hero.rotation)
      .setScale(hero.scaleX, hero.scaleY)
      .setFlip(hero.flipX, hero.flipY);
  };

  return {
    set(hero, heat, facing) {
      const visible = heat.visible && heat.alpha > 0.04;
      backShade.setVisible(visible);
      warmFront.setVisible(visible);
      hotRim.setVisible(visible);
      if (!visible) return;

      copyHero(backShade, hero);
      copyHero(warmFront, hero);
      copyHero(hotRim, hero);

      const charge = heat.charge01;
      // Most of the contrast arrives late in the charge. That steep curve is
      // what makes full power feel like a lighting event instead of a tint.
      const drama = charge * charge;
      warmFront.setAlpha(heat.alpha * (0.08 + drama * 0.58));
      hotRim.setAlpha(heat.alpha * drama * 0.42);
      backShade.setAlpha(heat.alpha * (0.06 + drama * 0.46));

      // World-space ovals make a curved light boundary instead of cutting the
      // character down the middle with a rectangular crop.
      const centreY = hero.y - 58;
      const frontReach = 42 + drama * 74;
      const frontHeight = 78 + drama * 88;
      frontMaskShape
        .clear()
        .fillStyle(0xffffff, 1)
        .fillEllipse(hero.x + facing * (24 + drama * 10), centreY, frontReach, frontHeight);
      rimMaskShape
        .clear()
        .fillStyle(0xffffff, 1)
        .fillEllipse(
          hero.x + facing * (38 + drama * 8),
          centreY - 8,
          34 + drama * 34,
          68 + drama * 42,
        );
      backMaskShape
        .clear()
        .fillStyle(0xffffff, 1)
        .fillEllipse(hero.x - facing * (24 + drama * 10), centreY, 86 + drama * 18, 154);
    },
    destroy() {
      backShade.clearMask(true).destroy();
      warmFront.clearMask(true).destroy();
      hotRim.clearMask(true).destroy();
      backMaskShape.destroy();
      frontMaskShape.destroy();
      rimMaskShape.destroy();
    },
  };
}

/**
 * A visible origin story for the fireball: loose heat streams into the held
 * card, condenses into a flame core, then launches from this exact position.
 */
export function createFireCardHeatView(scene: Phaser.Scene, depth: number): FireCardHeatView {
  const halo = scene.add.circle(0, 0, 18, 0xff3d0c, 1).setBlendMode(Phaser.BlendModes.ADD);
  const groundCurrents = Array.from({ length: 2 }, () =>
    scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD),
  );
  const windRibbons = Array.from({ length: 6 }, () =>
    scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD),
  );
  const groundDebris = Array.from({ length: 7 }, (_, index) =>
    scene.add.rectangle(0, 0, index % 3 === 0 ? 4 : 3, index % 2 === 0 ? 2 : 3, 0x594737, 1),
  );
  const flame = scene.add
    .sprite(0, 0, FIRE_CARD_CHARGE_SHEET.key, 0)
    .setOrigin(0.5, 0.64);
  const motes = Array.from({ length: 10 }, (_, index) =>
    scene.add
      .circle(0, 0, index % 3 === 0 ? 3.5 : 2.5, index % 2 === 0 ? 0xffd35a : 0xff6817, 1),
  );
  const container = scene.add
    .container(0, 0, [...groundCurrents, ...groundDebris, ...windRibbons, ...motes, halo, flame])
    .setDepth(depth)
    .setVisible(false);

  return {
    set(position, heat, facing, groundY, reducedMotion = false) {
      container.setPosition(position.x, position.y).setVisible(heat.visible);
      if (!heat.visible) return;

      const time = scene.time.now;
      const pulse = reducedMotion ? 1 : 1 + Math.sin(time / 68) * (0.06 + heat.charge01 * 0.05);
      const flicker = reducedMotion ? 0 : Math.sin(time / 43) * heat.radiusPx * 0.1;
      const windAlpha = heat.windGatherAlpha * heat.alpha * BASIC_FIRE_CARD_WIND_STRENGTH;
      const groundLocalY = groundY - position.y - 3;

      // The reference sells force in the environment, not with a ring around
      // the orb. These low, shallow currents skim the floor first and then curl
      // upward into the card flame. They stay local for this basic spell; later
      // tiers can extend the exact same visual language across the whole scene.
      groundCurrents.forEach((current, index) => {
        current.clear();
        if (windAlpha <= 0.01) return;
        const seed = (index + 0.35) / groundCurrents.length;
        const cycle = reducedMotion
          ? seed
          : (time / (820 - heat.charge01 * 300) + seed) % 1;
        const startX = -facing * (106 + index * 38 + heat.charge01 * 18);
        const curve = new Phaser.Curves.CubicBezier(
          new Phaser.Math.Vector2(startX, groundLocalY - index * 3),
          new Phaser.Math.Vector2(startX * 0.66, groundLocalY + 2 - index * 2),
          new Phaser.Math.Vector2(-facing * (38 + index * 8), groundLocalY - 9 - index * 5),
          new Phaser.Math.Vector2(-facing * (10 + index * 3), 13 + index * 7),
        );
        const head = 0.38 + cycle * 0.62;
        const tail = Math.max(0, head - (0.42 + heat.charge01 * 0.18));
        const points = Array.from({ length: 13 }, (_, pointIndex) =>
          curve.getPoint(Phaser.Math.Linear(tail, head, pointIndex / 12)),
        );
        const alpha = windAlpha * (0.34 + cycle * 0.36);
        current
          .lineStyle(4.5 + heat.charge01 * 3.5, 0x91aaa7, alpha * 0.25)
          .strokePoints(points, false)
          .lineStyle(1.5 + heat.charge01 * 1.7, 0xe7f4ed, alpha)
          .strokePoints(points.slice(3), false);
      });

      groundDebris.forEach((debris, index) => {
        const seed = index / groundDebris.length;
        const cycle = reducedMotion
          ? seed * 0.72
          : (time / (920 - heat.charge01 * 310) + seed) % 1;
        const draw = windAlpha > 0.08 && cycle < 0.82;
        const travel = Math.min(1, cycle / 0.82);
        const startX = -facing * (48 + seed * 105);
        const endX = -facing * (12 + (index % 3) * 5);
        const lift = Math.sin(travel * Math.PI) * (9 + heat.charge01 * (17 + (index % 3) * 5));
        debris
          .setVisible(draw)
          .setPosition(
            Phaser.Math.Linear(startX, endX, travel),
            Phaser.Math.Linear(groundLocalY, 17 + (index % 2) * 8, travel) - lift,
          )
          .setRotation(reducedMotion ? 0 : time / (210 + index * 23) * (index % 2 ? 1 : -1))
          .setAlpha(windAlpha * Math.sin(Math.min(1, travel) * Math.PI));
      });

      windRibbons.forEach((ribbon, index) => {
        ribbon.clear();
        if (windAlpha <= 0.01) return;
        const seed = index / windRibbons.length;
        const cycle = reducedMotion
          ? seed
          : (time / (660 - heat.charge01 * 260) + seed) % 1;
        const verticalBands = [-55, -34, -13, 16, 36, 56];
        const startY = verticalBands[index];
        const startX = -facing * (62 + (index % 3) * 14 + heat.charge01 * 14);
        const bend = index % 2 === 0 ? 1 : -1;
        const curve = new Phaser.Curves.CubicBezier(
          new Phaser.Math.Vector2(startX, startY),
          new Phaser.Math.Vector2(startX * 0.66, startY + bend * (22 + index * 2)),
          new Phaser.Math.Vector2(-facing * 20, -startY * 0.48 - bend * 16),
          new Phaser.Math.Vector2(-facing * (5 + heat.charge01 * 3), startY * 0.06),
        );
        const head = 0.3 + cycle * 0.7;
        const tail = Math.max(0, head - (0.3 + heat.charge01 * 0.24));
        const points = Array.from({ length: 10 }, (_, pointIndex) =>
          curve.getPoint(Phaser.Math.Linear(tail, head, pointIndex / 9)),
        );
        const colour = index % 3 === 0 ? 0xbfd9d8 : 0xe7f4ed;
        const baseAlpha = windAlpha * (0.56 + cycle * 0.4);
        ribbon
          .lineStyle(1.8 + heat.charge01 * 1.8, colour, baseAlpha * 0.7)
          .strokePoints(points.slice(0, 5), false)
          .lineStyle(3 + heat.charge01 * 2.6, colour, baseAlpha)
          .strokePoints(points.slice(4, 8), false)
          .lineStyle(1.5 + heat.charge01 * 1.4, colour, baseAlpha * 0.72)
          .strokePoints(points.slice(7), false);
      });
      halo
        .setRadius(heat.radiusPx * 1.02)
        .setAlpha(heat.alpha * (0.1 + heat.charge01 * 0.06))
        .setScale(pulse);
      const growthFrame = Math.min(6, Math.floor(heat.charge01 * 7));
      const flameFrame = heat.charge01 >= 0.84 && !reducedMotion
        ? 5 + Math.floor(time / 95) % 3
        : growthFrame;
      const flameSize = (64 + heat.charge01 * 14) * pulse;
      flame
        .setFrame(flameFrame)
        .setPosition(flicker * 0.35, 2)
        .setDisplaySize(flameSize, flameSize)
        .setAlpha(heat.coreAlpha);

      motes.forEach((mote, index) => {
        const seed = index / motes.length;
        const cycle = reducedMotion ? seed : (time / (280 - heat.charge01 * 90) + seed) % 1;
        const angle = seed * Math.PI * 2 + (reducedMotion ? 0 : time / 520) * (index % 2 ? 1 : -1);
        const distance = heat.gatherRadiusPx * (1 - cycle * 0.88);
        mote
          .setPosition(Math.cos(angle) * distance, Math.sin(angle) * distance * 0.72)
          .setAlpha((0.2 + 0.72 * cycle) * heat.alpha)
          .setScale(0.72 + heat.charge01 * 0.55);
      });
    },
    destroy() {
      container.destroy(true);
    },
  };
}
