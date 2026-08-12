import type Phaser from 'phaser';
import type { EffectClip, EffectKit } from './effectKit';

/**
 * The Phaser half of the elemental effects.
 *
 * The art comes from the boss battle's library — 545 PixelLab PNGs packed into
 * strips by scripts/effects/pack_effects.py. Its RENDERERS do not come with it:
 * they are React components positioning `<img>` tags in percent against a DOM
 * stage and animating them with CSS keyframes, none of which exists inside a
 * Phaser scene. So the art is shared and this file is the second, small
 * implementation of how to play it.
 *
 * Everything here is presentation. The blast's position, collision and lifetime
 * are decided by the pure simulation in blast.ts; nothing in this file may feed
 * anything back into it.
 */

/** Animation keys are namespaced by texture so two clips can never collide. */
const animKey = (clip: EffectClip) => `fx:${clip.key}`;

/**
 * Register a clip's animation once.
 *
 * Phaser's animation manager is global and throws on a duplicate key, so this is
 * idempotent by design — the courtyard calls it whenever a card is drawn rather
 * than tracking which elements it has already seen.
 *
 * A one-frame clip still gets an animation. Three elements were only ever given a
 * still shard and four only a still impact, and giving them a degenerate
 * animation means the caller has exactly one way to play an effect instead of
 * branching on whether the art happens to move.
 */
export function ensureEffectAnim(scene: Phaser.Scene, clip: EffectClip | null): string | null {
  if (!clip) return null;
  const key = animKey(clip);
  if (scene.anims.exists(key)) return key;
  // A texture that failed to load would slice into nothing and animate an empty
  // sprite forever, so refuse rather than draw a green box.
  if (!scene.textures.exists(clip.key)) return null;

  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(clip.key, { start: 0, end: clip.frameCount - 1 }),
    frameRate: clip.fps,
    repeat: clip.frameCount > 1 ? -1 : 0,
  });
  return key;
}

/**
 * How long the blast sprite reads, as a fraction of its native 128px.
 *
 * The hero ships 71 world pixels tall, so a full-length beam segment would be
 * nearly twice his height and read as a wall rather than a shot. Charge widens
 * it, which is most of what makes a held shot legible from across the courtyard.
 */
export function blastScale(chargeLevel: number): number {
  return 0.34 + 0.26 * Math.max(0, Math.min(1, chargeLevel));
}

/**
 * Build the travelling body of a shot.
 *
 * Returns null when the element has no art, so the caller can fall back to its
 * placeholder rather than this file inventing one — a stand-in drawn here would
 * be a second place to look when a blast renders wrongly.
 */
export function createBlastSprite(
  scene: Phaser.Scene,
  kit: EffectKit,
  x: number,
  y: number,
  aim: { x: number; y: number },
  chargeLevel: number,
): Phaser.GameObjects.Sprite | null {
  const key = ensureEffectAnim(scene, kit.stream);
  if (!key || !kit.stream) return null;

  const sprite = scene.add.sprite(x, y, kit.stream.key, 0);
  sprite.setOrigin(0.5, 0.5);
  sprite.setScale(blastScale(chargeLevel));
  // The art is drawn pointing right, so the aim angle rotates it directly.
  sprite.setRotation(Math.atan2(aim.y, aim.x));
  sprite.play(key);
  return sprite;
}

/**
 * Play an element's impact once, then clean it up.
 *
 * Fire-and-forget: it removes itself on completion rather than being tracked, so
 * a shot resolving off-screen or during a scene teardown cannot leak a sprite.
 * Falls back to a brief tinted flare when the element has no impact art, because
 * a hit that shows nothing reads as a miss.
 */
export function playImpact(
  scene: Phaser.Scene,
  kit: EffectKit,
  x: number,
  y: number,
  depth: number,
  chargeLevel: number,
): void {
  const key = ensureEffectAnim(scene, kit.impact);
  const scale = 0.5 + 0.5 * Math.max(0, Math.min(1, chargeLevel));

  if (key && kit.impact) {
    const burst = scene.add.sprite(x, y, kit.impact.key, 0);
    burst.setDepth(depth).setScale(scale);
    if (kit.impact.frameCount > 1) {
      burst.once('animationcomplete', () => burst.destroy());
      burst.anims.play({ key, repeat: 0 });
      // A clip that never completes — an interrupted scene, a dropped frame —
      // must not leave the burst on screen forever. Time is the backstop, the
      // same rule the action state follows.
      scene.time.delayedCall((kit.impact.frameCount / kit.impact.fps) * 1000 + 120, () => {
        if (burst.active) burst.destroy();
      });
    } else {
      scene.time.delayedCall(160, () => burst.destroy());
    }
    return;
  }

  const flare = scene.add.circle(x, y, 10 * scale, colourOf(kit.palette[1]));
  flare.setDepth(depth);
  scene.tweens.add({
    targets: flare,
    alpha: 0,
    scale: 2,
    duration: 180,
    onComplete: () => flare.destroy(),
  });
}

/** '#c8203a' -> 0xc8203a, so the authored palettes can tint Phaser objects. */
export function colourOf(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16) || 0xffffff;
}

const CHARGE_DOT = 'fx-charge-dot';

/**
 * A soft white dot for the gather to tint.
 *
 * Drawn here rather than borrowed from `courtyard/ambient.ts`, which belongs to
 * the retired painted courtyard and does not export it. Copying twelve lines is
 * cheaper than making the combat system depend on a surface that is on its way
 * out.
 */
function ensureDotTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(CHARGE_DOT)) return;
  const size = 32;
  const half = size / 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let i = 18; i > 0; i--) {
    g.fillStyle(0xffffff, 0.06);
    g.fillCircle(half, half, half * (i / 18));
  }
  g.generateTexture(CHARGE_DOT, size, size);
  g.destroy();
}

/**
 * The gather that builds while a card is charging.
 *
 * Code-drawn rather than art: the boss battle's charge tells are inline SVG with
 * no raster behind them, so there was nothing to reuse and nothing generated yet.
 * It reads the element's authored palette so a charging Fire card and a charging
 * Void card are still telling the truth about what is coming, and it follows the
 * emitter pattern already used by the forge crystals and the fountain.
 */
export function createChargeEmitter(
  scene: Phaser.Scene,
  palette: readonly [string, string, string],
): Phaser.GameObjects.Particles.ParticleEmitter {
  ensureDotTexture(scene);
  return scene.add.particles(0, 0, CHARGE_DOT, {
    // Particles fly INWARD, toward the card. An outward spray reads as something
    // already released; the whole point of a charge is that it is being gathered.
    speed: { min: -90, max: -40 },
    angle: { min: 0, max: 360 },
    lifespan: 420,
    quantity: 1,
    frequency: 45,
    scale: { start: 0.9, end: 0.1 },
    alpha: { start: 0.9, end: 0 },
    tint: [colourOf(palette[0]), colourOf(palette[1]), colourOf(palette[2])],
    blendMode: 'ADD',
    emitting: false,
  });
}

/**
 * Drive the gather from the charge level.
 *
 * Intensity rising with the hold is the only feedback the player gets for a
 * mechanic whose whole point is deciding when to let go, so it has to be visible
 * well before full.
 */
export function updateChargeEmitter(
  emitter: Phaser.GameObjects.Particles.ParticleEmitter,
  chargeLevel: number,
  x: number,
  y: number,
): void {
  emitter.setPosition(x, y);
  emitter.frequency = Math.max(8, 60 - 50 * chargeLevel);
  emitter.setParticleScale(0.6 + 0.9 * chargeLevel);
}
