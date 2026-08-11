import type Phaser from 'phaser';

/**
 * Rings on the water where something touched it.
 *
 * WHY THIS IS NOT A GENERATED ANIMATION
 *
 * The obvious move is to have PixelLab draw a ripple and play it. It is the wrong
 * move, and the reason is placement rather than cost: a generated ripple is baked
 * into the pond art at one fixed spot, but an animal drinks wherever it happens to
 * arrive — north rim one time, west rim the next. The ripple has to appear under
 * the muzzle, and only the runtime knows where that is. Drawn here it also serves
 * the fish jumps later, and every future pond, for nothing.
 *
 * THE RINGS ARE ELLIPSES, NOT CIRCLES
 *
 * A ring spreading on water is a circle on the GROUND PLANE, and our ground plane
 * is foreshortened — the same fact that had the pond squashed to 0.82 so it would
 * sit at the kit's camera angle. Drawing true circles here would undo that
 * agreement at the one moment the eye is looking straight at the water.
 */

/**
 * Matches the vertical squash baked into the pond art, so a ring lies flat on the
 * same ground the pond does. Change one and you must change the other.
 */
const GROUND_SQUASH = 0.82;

const RING_LIFE_MS = 1_100;
/** Small. A drinking animal disturbs an inch of water, not a pond. */
const RING_MAX_RADIUS = 11;
const RING_COLOR = 0xdff6ff;

interface Ring {
  x: number;
  y: number;
  age: number;
  /** 1 is a tongue tip. A paw in the water pushes more of it. */
  strength: number;
}

export interface WaterRipples {
  /** Disturb the water here. Ignored while motion is off. */
  pulse(x: number, y: number, strength?: number): void;
  update(deltaMs: number): void;
  /** Reduced motion: still water, no rings. */
  setMotionOff(off: boolean): void;
  destroy(): void;
}

export function createWaterRipples(
  scene: Phaser.Scene,
  /**
   * Just above the pond, below anything standing on the bank. The pond and the
   * ground are placed at depth 0 by the Editor and animals set their depth to
   * their own Y, so a small positive number sits between the two without needing
   * to know either.
   */
  depth = 1,
): WaterRipples {
  const graphics = scene.add.graphics().setDepth(depth);
  const rings: Ring[] = [];
  let motionOff = false;

  return {
    pulse(x, y, strength = 1) {
      if (motionOff) return;
      // Cheap guard against a ring per frame: the caller decides the rhythm, but
      // a bug there should degrade to a thicker ripple, never to a thousand.
      if (rings.length > 24) return;
      rings.push({ x, y, age: 0, strength });
    },

    update(deltaMs) {
      graphics.clear();
      if (motionOff) {
        rings.length = 0;
        return;
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.age += deltaMs;
        const t = ring.age / RING_LIFE_MS;
        if (t >= 1) {
          rings.splice(i, 1);
          continue;
        }
        // Fast at first and slowing, the way a real ring spreads; and fading the
        // whole time so it never blinks out at full strength.
        const radius = RING_MAX_RADIUS * ring.strength * Math.sqrt(t);
        graphics.lineStyle(1, RING_COLOR, 0.55 * (1 - t));
        graphics.strokeEllipse(ring.x, ring.y, radius * 2, radius * 2 * GROUND_SQUASH);
      }
    },

    setMotionOff(off) {
      motionOff = off;
      if (off) {
        rings.length = 0;
        graphics.clear();
      }
    },

    destroy() {
      graphics.destroy();
      rings.length = 0;
    },
  };
}
