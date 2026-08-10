import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { WildlifeAgent } from './WildlifeAgent';
import { WILDLIFE_SPECIES } from './profiles';
import type { WildlifeAnimationSet, WildlifeBounds } from './types';

/**
 * The whole promise, end to end: drop a pond near an animal and it walks over and
 * drinks, with nothing else authored.
 *
 * Driven through the real agent rather than the brain alone, because the brain
 * only decides — everything that makes drinking actually happen (choosing which
 * pond, walking to it, being stopped at the bank by collision, turning to face
 * the water, switching from the walk clip to the drink clip) lives in the agent
 * and none of it is covered by a decision test.
 *
 * The sprite is a plain object. It only needs to hold x/y and remember which clip
 * it was told to play, and using a real Phaser sprite would drag a WebGL context
 * in for no extra truth.
 */
function fakeSprite(x: number, y: number) {
  const played: string[] = [];
  const sprite = {
    x,
    y,
    played,
    anims: { currentAnim: null as { key: string } | null, stop() {} },
    setOrigin() { return sprite; },
    setDepth() { return sprite; },
    setPosition(nx: number, ny: number) { sprite.x = nx; sprite.y = ny; },
    play(key: string) {
      sprite.anims.currentAnim = { key };
      if (played[played.length - 1] !== key) played.push(key);
    },
  };
  return sprite;
}

const facings = (name: string) => ({ down: `${name}-down`, up: `${name}-up`, left: `${name}-left`, right: `${name}-right` });

const CLIPS: WildlifeAnimationSet = {
  move: facings('move'),
  signature: facings('sniff'),
  observe: facings('watch'),
  idle: facings('idle'),
  drink: facings('drink'),
};

/** The pond as it is actually placed in WildlifeLab.scene, read from the file. */
const POND: WildlifeBounds = { x: 446, y: 266, width: 146, height: 136 };
const ROAM: WildlifeBounds = { x: 55, y: 165, width: 690, height: 330 };

/**
 * The pond as a real water SHAPE. Blocking now lives inside the agent — it is what
 * puts an animal on the bank — so the test hands over the same thing a scene does
 * rather than simulating collision itself.
 */
const inPond = (p: { x: number; y: number }) =>
  p.x > POND.x && p.x < POND.x + POND.width && p.y > POND.y && p.y < POND.y + POND.height;
const WATER = { bounds: POND, contains: inPond };

function runUntil(agent: WildlifeAgent, done: () => boolean, maxMs = 400_000) {
  for (let now = 0; now <= maxMs; now += 100) {
    agent.update(now, 100);
    if (done()) return now;
  }
  return null;
}

describe('an animal and a pond, with nothing wired between them', () => {
  it('walks to the water and drinks', () => {
    const sprite = fakeSprite(120, 400);
    const agent = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['red-fox'], {
      roamBounds: ROAM,
      animations: CLIPS,
      waterSources: [WATER],
      random: () => 0.5,
    });

    expect(agent.hasWater()).toBe(true);

    const at = runUntil(agent, () => sprite.played.some((k) => k.startsWith('drink')));
    expect(at).not.toBeNull();

    // It is AT the water when it drinks, not miming at the far side of the field.
    const gapX = Math.max(POND.x - sprite.x, sprite.x - (POND.x + POND.width), 0);
    const gapY = Math.max(POND.y - sprite.y, sprite.y - (POND.y + POND.height), 0);
    expect(Math.hypot(gapX, gapY)).toBeLessThanOrEqual(WILDLIFE_SPECIES['red-fox'].drinkRange!);

    // And it walked there rather than teleporting — the move clip ran first.
    const firstDrink = sprite.played.findIndex((k) => k.startsWith('drink'));
    expect(sprite.played.slice(0, firstDrink).some((k) => k.startsWith('move'))).toBe(true);
  });

  it('never walks into the pond', () => {
    const sprite = fakeSprite(120, 400);
    const agent = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['red-fox'], {
      roamBounds: ROAM,
      animations: CLIPS,
      waterSources: [WATER],
      random: () => 0.5,
    });
    for (let now = 0; now <= 200_000; now += 100) {
      agent.update(now, 100);
      const inWater =
        sprite.x > POND.x && sprite.x < POND.x + POND.width &&
        sprite.y > POND.y && sprite.y < POND.y + POND.height;
      expect(inWater).toBe(false);
    }
  });

  it('ignores a pond on the far side of the map', () => {
    const sprite = fakeSprite(120, 400);
    const agent = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['red-fox'], {
      roamBounds: ROAM,
      animations: CLIPS,
      waterSources: [{ bounds: { x: 9_000, y: 9_000, width: 146, height: 136 }, contains: () => false }],
      random: () => 0.5,
    });
    expect(agent.hasWater()).toBe(false);
    runUntil(agent, () => false, 60_000);
    expect(sprite.played.some((k) => k.startsWith('drink'))).toBe(false);
  });

  it('keeps the whole foot out of the water, not just the origin point', () => {
    // The origin is one pixel under the middle of the animal. Testing only that
    // lets a fox stand with its body half over the pool — which is what "not
    // accurate enough" looked like in play. The fox's foot is 26 wide, 12 deep.
    const feet = { width: 26, height: 12 };
    const sprite = fakeSprite(120, 400);
    const agent = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['red-fox'], {
      roamBounds: ROAM,
      animations: CLIPS,
      waterSources: [WATER],
      feet,
      random: () => 0.5,
    });
    runUntil(agent, () => sprite.played.some((k) => k.startsWith('drink')));

    // Every corner of the foot must be dry, not merely its centre.
    for (const dx of [-feet.width / 2, 0, feet.width / 2]) {
      for (const dy of [-feet.height, -feet.height / 2, 0]) {
        expect(inPond({ x: sprite.x + dx, y: sprite.y + dy })).toBe(false);
      }
    }
  });

  it('gives the tortoise no water even when it is standing beside some', () => {
    const sprite = fakeSprite(430, 340);
    const agent = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['glowcap-tortoise'], {
      roamBounds: ROAM,
      animations: CLIPS,
      waterSources: [WATER],
      random: () => 0.5,
    });
    expect(agent.hasWater()).toBe(false);
  });
});
