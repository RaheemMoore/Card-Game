import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { WildlifeAgent } from './WildlifeAgent';
import { WILDLIFE_SPECIES } from './profiles';
import type { WildlifeAnimationSet, WildlifeBounds } from './types';

/**
 * Where the ripple is allowed to appear.
 *
 * The point matters more than it sounds: a ring drawn at the animal's own
 * position would sit on the bank, and a ring drawn at the pond's centre would
 * appear yards from its mouth. It has to be the spot on the shoreline directly in
 * front of wherever the animal happened to stop.
 */
const facings = (n: string) => ({ down: `${n}-down`, up: `${n}-up`, left: `${n}-left`, right: `${n}-right` });
const CLIPS: WildlifeAnimationSet = {
  move: facings('move'), signature: facings('sniff'), observe: facings('watch'),
  idle: facings('idle'), drink: facings('drink'),
};

/**
 * The pond's real geometry, not a convenient one.
 *
 * A pond SPRITE's bounds include its earth bank, so the water is a smaller, inset
 * shape within a larger box — which means an animal stopped at the waterline is
 * inside the bounds and outside the water. Modelling the bounds as if they were the
 * water made these tests pass against the very facing bug they exist to catch.
 */
const POND: WildlifeBounds = { x: 446, y: 266, width: 146, height: 136 };
const BANK: WildlifeBounds = { x: 416, y: 236, width: 206, height: 196 };
const ROAM: WildlifeBounds = { x: 55, y: 165, width: 690, height: 330 };
const inPond = (p: { x: number; y: number }) =>
  p.x > POND.x && p.x < POND.x + POND.width && p.y > POND.y && p.y < POND.y + POND.height;
const WATER = { bounds: BANK, contains: inPond };

function fakeSprite(x: number, y: number) {
  const sprite = {
    x, y, played: [] as string[],
    anims: { currentAnim: null as { key: string } | null, stop() {} },
    setOrigin: () => sprite, setDepth: () => sprite,
    setPosition(nx: number, ny: number) { sprite.x = nx; sprite.y = ny; },
    play(key: string) { sprite.anims.currentAnim = { key }; sprite.played.push(key); },
  };
  return sprite;
}

function drinkingFox(startX: number, startY: number) {
  const sprite = fakeSprite(startX, startY);
  const agent = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['red-fox'], {
    roamBounds: ROAM, animations: CLIPS, waterSources: [WATER],
    feet: { width: 26, height: 12 }, random: () => 0.5,
  });
  for (let now = 0; now <= 400_000; now += 100) {
    agent.update(now, 100);
    if (!agent.drinkContactPoint()) continue;
    // KEEP GOING for a second after it arrives, and assert on THAT.
    //
    // The frame it arrives on still carries the facing from the walk, which is
    // correct by accident — the standing-still branch has not run yet. Asserting
    // there made these tests pass against the very bug they exist to catch, which
    // was only found by re-introducing the bug and watching them stay green.
    for (let held = now + 100; held <= now + 1_000; held += 100) agent.update(held, 100);
    return { agent, sprite };
  }
  return { agent, sprite };
}

describe('where the ripple goes', () => {
  it('lands on the water, not on the bank the animal is standing on', () => {
    const { agent, sprite } = drinkingFox(120, 400);
    const contact = agent.drinkContactPoint();
    expect(contact).not.toBeNull();
    expect(inPond(contact!)).toBe(true);
    expect(inPond({ x: sprite.x, y: sprite.y })).toBe(false);
  });

  it('puts it within reach of the muzzle, not out in the middle of the pond', () => {
    const { agent, sprite } = drinkingFox(120, 400);
    const contact = agent.drinkContactPoint()!;
    const reach = Math.hypot(contact.x - sprite.x, contact.y - sprite.y);
    expect(reach).toBeLessThanOrEqual(WILDLIFE_SPECIES['red-fox'].drinkRange!);
  });

  it('moves with the animal — a fox on the far side ripples on the far side', () => {
    const west = drinkingFox(120, 400).agent.drinkContactPoint()!;
    const east = drinkingFox(700, 340).agent.drinkContactPoint()!;
    expect(east.x).toBeGreaterThan(west.x);
  });

  it('puts the ring where the TONGUE is, not where the paws are', () => {
    // The complaint that produced this test: the ripple appeared at the shoreline
    // immediately in front of the feet, so the water looked like it was reacting
    // to the paws. The tongue lands further out, by the species' muzzle reach.
    const { agent, sprite } = drinkingFox(120, 400);
    const contact = agent.drinkContactPoint()!;
    const reach = Math.hypot(contact.x - sprite.x, contact.y - sprite.y);

    // Further from the animal than the first wet pixel in front of it.
    let waterlineGap = Infinity;
    for (let step = 0; step <= 40; step += 1) {
      const probe = { x: sprite.x + step, y: sprite.y };
      if (inPond(probe)) { waterlineGap = step; break; }
    }
    expect(reach).toBeGreaterThan(Math.min(waterlineGap, 10));
    // …but still attached to the animal, not out in open water.
    expect(reach).toBeLessThanOrEqual(WILDLIFE_SPECIES['red-fox'].drinkRange!);
  });

  it('reports no wet paws, because the water is solid to a fox', () => {
    const { agent } = drinkingFox(120, 400);
    expect(agent.wetFeet()).toEqual([]);
  });

  it('shows nothing while it is still walking there', () => {
    const sprite = fakeSprite(120, 400);
    const agent = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['red-fox'], {
      roamBounds: ROAM, animations: CLIPS, waterSources: [WATER],
      feet: { width: 26, height: 12 }, random: () => 0.5,
    });
    // Before it has ever reached the water there is nothing to disturb.
    expect(agent.drinkContactPoint()).toBeNull();
  });
});

/**
 * Which way it turns when it gets there.
 *
 * The bug this pins, in Raheem's words: "the fox keeps standing on the left side of
 * the pond, but is using the forward drinking motion." The facing was taken from a
 * point CLAMPED into the water's bounding box — and an animal stopped at the
 * waterline is inside that box, so the clamp returned its own position, the vector
 * was (0,0), and the ternary fell through to 'down' for every side of the pond.
 */
describe('which way it faces to drink', () => {
  const CENTRE = { x: POND.x + POND.width / 2, y: POND.y + POND.height / 2 };

  const cases: { from: string; start: { x: number; y: number }; clip: string }[] = [
    { from: 'the west shore', start: { x: 120, y: CENTRE.y }, clip: 'drink-right' },
    { from: 'the east shore', start: { x: 700, y: CENTRE.y }, clip: 'drink-left' },
    { from: 'the north shore', start: { x: CENTRE.x, y: 185 }, clip: 'drink-down' },
    { from: 'the south shore', start: { x: CENTRE.x, y: 470 }, clip: 'drink-up' },
  ];

  for (const { from, start, clip } of cases) {
    it(`turns to the water when it drinks from ${from}`, () => {
      const { agent, sprite } = drinkingFox(start.x, start.y);
      expect(agent.drinkContactPoint()).not.toBeNull();
      expect(sprite.anims.currentAnim?.key).toBe(clip);
    });
  }

  it('never answers down just because it is inside the water bounding box', () => {
    // The real geometry, which the fixture above does not reproduce: a pond SPRITE's
    // bounds include its bank, so the water is a smaller shape inside a bigger box.
    // An animal stopped on the bank is therefore inside the bounds and outside the
    // water — the exact state where the old clamp returned the animal's own position
    // and forced the forward clip on every side of the pond.
    const bank = { x: 400, y: 220, width: 240, height: 230 };
    const pool = { x: 446, y: 266, width: 146, height: 136 };
    const water = {
      bounds: bank,
      contains: (p: { x: number; y: number }) =>
        p.x > pool.x && p.x < pool.x + pool.width && p.y > pool.y && p.y < pool.y + pool.height,
    };

    const sprite = fakeSprite(120, pool.y + pool.height / 2);
    const agent = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['red-fox'], {
      roamBounds: ROAM, animations: CLIPS, waterSources: [water],
      feet: { width: 26, height: 12 }, random: () => 0.5,
    });
    for (let now = 0; now <= 400_000; now += 100) {
      agent.update(now, 100);
      if (!agent.drinkContactPoint()) continue;
      for (let held = now + 100; held <= now + 1_000; held += 100) agent.update(held, 100);
      break;
    }

    const insideBounds =
      sprite.x >= bank.x && sprite.x <= bank.x + bank.width &&
      sprite.y >= bank.y && sprite.y <= bank.y + bank.height;
    expect(insideBounds).toBe(true);
    expect(water.contains({ x: sprite.x, y: sprite.y })).toBe(false);
    // Approaching from the west, it must look EAST at the water.
    expect(sprite.anims.currentAnim?.key).toBe('drink-right');
  });
});
