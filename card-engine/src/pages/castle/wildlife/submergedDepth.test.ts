import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { WildlifeAgent } from './WildlifeAgent';
import { WILDLIFE_SPECIES } from './profiles';
import type { WildlifeAnimationSet, WildlifeBounds, WildlifePoint } from './types';

/**
 * WHO OWNS AN ANIMAL'S DEPTH, AND WHERE THAT OWNERSHIP HAS TO STOP.
 *
 * `WildlifeAgent` sorts a land animal by its feet and a swimmer into a narrow band
 * just above the pond and below the surface. That is right everywhere.
 *
 * The courtyard then adds a TERRACE term on top, because it has floors at
 * different heights and an animal on the upper level must draw over one below it.
 * Applied to a swimmer that term is wrong twice over: water has no floor level,
 * and adding the sprite's own Y lifts the fish clean out of the water band and
 * puts it on top of the ripples it is supposed to be swimming beneath.
 *
 * `isSubmerged()` is the seam. It is public for exactly one caller, so these
 * checks guard the contract rather than the arithmetic: they assert WHEN a
 * swimmer claims the water band and when it gives it back. The courtyard's own
 * loop skips anything that claims it.
 *
 * Found by inspection, not on screen — the Wildlife Lab has no terraces, so the
 * scene where the fish looked right could never have shown this.
 */

const facings = (n: string) => ({
  down: `${n}-down`,
  up: `${n}-up`,
  left: `${n}-left`,
  right: `${n}-right`,
});
const CLIPS: WildlifeAnimationSet = {
  move: facings('move'),
  signature: facings('sig'),
  observe: facings('watch'),
  idle: facings('idle'),
  swim: facings('swim'),
};

const POOL: WildlifeBounds = { x: 378, y: 201, width: 364, height: 265 };
const BANK: WildlifeBounds = { x: 348, y: 171, width: 424, height: 325 };
const inPool = (p: WildlifePoint) =>
  p.x > POOL.x && p.x < POOL.x + POOL.width && p.y > POOL.y && p.y < POOL.y + POOL.height;
const WATER = { bounds: BANK, contains: inPool };

function fakeSprite(x: number, y: number, body: { width: number; height: number }) {
  const sprite = {
    x,
    y,
    scaleX: 1,
    scaleY: 1,
    displayWidth: body.width,
    displayHeight: body.height,
    setScale(sx: number, sy?: number) {
      sprite.scaleX = sx;
      sprite.scaleY = sy ?? sx;
      return sprite;
    },
    anims: { currentAnim: null as { key: string } | null, stop() {} },
    depthSet: 0,
    tint: null as number | null,
    alpha: 1,
    setTint(t: number) {
      sprite.tint = t;
      return sprite;
    },
    clearTint() {
      sprite.tint = null;
      return sprite;
    },
    setAlpha(a: number) {
      sprite.alpha = a;
      return sprite;
    },
    setOrigin: () => sprite,
    setDepth(d: number) {
      sprite.depthSet = d;
      return sprite;
    },
    setPosition(nx: number, ny: number) {
      sprite.x = nx;
      sprite.y = ny;
    },
    play(key: string) {
      sprite.anims.currentAnim = { key };
    },
  };
  return sprite;
}

const seeded = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
};

function makeAgent(
  species: 'pond-fish' | 'glowcap-tortoise' | 'red-fox',
  at: WildlifePoint,
  body: { width: number; height: number },
) {
  const sprite = fakeSprite(at.x, at.y, body);
  const agent = new WildlifeAgent(
    sprite as unknown as Phaser.GameObjects.Sprite,
    WILDLIFE_SPECIES[species],
    {
      roamBounds: BANK,
      animations: CLIPS,
      waterSources: [WATER],
      feet: { width: 18, height: 10 },
      random: seeded(31),
    },
  );
  return { agent, sprite };
}

const middle = { x: POOL.x + POOL.width / 2, y: POOL.y + POOL.height / 2 };
/** Well clear of the pond, so no part of a body overlaps it. */
const grass = { x: 90, y: 620 };

describe('who may claim the water band', () => {
  it('a fish claims it, and keeps claiming it as it swims', () => {
    const { agent, sprite } = makeAgent('pond-fish', middle, { width: 36, height: 36 });
    expect(agent.isSubmerged()).toBe(true);
    for (let now = 0; now <= 30_000; now += 100) {
      agent.update(now, 100);
      expect(agent.isSubmerged()).toBe(true);
      // And the depth the agent set really is the water band, not the fish's Y —
      // which for this pond is in the hundreds.
      expect(sprite.depthSet).toBeLessThan(10);
    }
  });

  it('a fox never claims it, standing on the bank', () => {
    const { agent, sprite } = makeAgent('red-fox', grass, { width: 102, height: 70 });
    for (let now = 0; now <= 30_000; now += 100) {
      agent.update(now, 100);
      expect(agent.isSubmerged()).toBe(false);
    }
    // Sorted by its feet, which is what the courtyard then adds a terrace term to.
    expect(sprite.depthSet).toBeCloseTo(sprite.y, 5);
  });

  it('a tortoise claims it only while it is actually in the pond', () => {
    // The amphibious case is the whole reason this is a method and not a constant.
    // Dry on the grass it must sort like a fox, so the terrace term applies; in the
    // water it must sort like a fish, so the terrace term must not.
    const dry = makeAgent('glowcap-tortoise', grass, { width: 60, height: 44 });
    expect(dry.agent.isSubmerged()).toBe(false);

    const wet = makeAgent('glowcap-tortoise', middle, { width: 60, height: 44 });
    expect(wet.agent.isSubmerged()).toBe(true);
    expect(wet.sprite.depthSet).toBeLessThan(10);
  });

  it('a tortoise gives the band back when it climbs out', () => {
    // Proves the claim is live rather than decided once at construction. A latched
    // flag would leave a tortoise on the grass sorted underneath the pond forever.
    const { agent, sprite } = makeAgent('glowcap-tortoise', middle, { width: 60, height: 44 });
    expect(agent.isSubmerged()).toBe(true);

    let released: number | null = null;
    for (let now = 0; now <= 240_000 && released === null; now += 100) {
      agent.update(now, 100);
      if (!agent.isSubmerged()) released = now;
    }
    expect(released).not.toBeNull();
    // And it is sorting by its feet again, ready for the terrace term.
    expect(sprite.depthSet).toBeCloseTo(sprite.y, 5);

    // The band is given back part-way out, while the origin is still over water —
    // deliberately, because submersion is judged on the BODY. A tortoise half up
    // the bank is no longer under the surface and must not sort as though it were.
    // Left running, it does finish the climb.
    let ashore = false;
    for (let now = released! + 100; now <= released! + 60_000 && !ashore; now += 100) {
      agent.update(now, 100);
      ashore = !inPool({ x: sprite.x, y: sprite.y });
    }
    expect(ashore).toBe(true);
  });
});
