import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { WildlifeAgent } from './WildlifeAgent';
import { WILDLIFE_SPECIES } from './profiles';
import type { WildlifeBounds, WildlifePoint } from './types';

/**
 * The rabbit, held to everything the fox taught us.
 *
 * Written BEFORE its drink clip was generated, on purpose. Every one of these
 * behaviours lives in the shared `WildlifeAgent` — the facing taken from the water
 * contact point, the foot-box that keeps paws dry, the walk clip that requires a
 * destination, the re-target when blocked. If they are shared then the rabbit
 * already has them and the only thing missing is artwork; if any of these fail,
 * the fox was fixed in a place that did not generalise, and that is worth knowing
 * before spending a single generation.
 */

const facings = (n: string) => ({ down: `${n}-down`, up: `${n}-up`, left: `${n}-left`, right: `${n}-right` });
const CLIPS = {
  move: facings('hop'), signature: facings('nibble'), observe: facings('watch'),
  idle: facings('idle'), drink: facings('drink'),
};

const POOL: WildlifeBounds = { x: 446, y: 266, width: 146, height: 136 };
const BANK: WildlifeBounds = { x: 416, y: 236, width: 206, height: 196 };
const ROAM: WildlifeBounds = { x: 55, y: 165, width: 690, height: 330 };
const inPool = (p: WildlifePoint) =>
  p.x > POOL.x && p.x < POOL.x + POOL.width && p.y > POOL.y && p.y < POOL.y + POOL.height;
const WATER = { bounds: BANK, contains: inPool };

function fakeSprite(x: number, y: number) {
  const sprite = {
    x, y, scaleX: 1, scaleY: 1, displayWidth: 59, displayHeight: 48,
    anims: { currentAnim: null as { key: string } | null, stop() {} },
    depthSet: 0, tint: null as number | null, alpha: 1,
    setScale(a: number, b?: number) { sprite.scaleX = a; sprite.scaleY = b ?? a; return sprite; },
    setTint(t: number) { sprite.tint = t; return sprite; },
    clearTint() { sprite.tint = null; return sprite; },
    setAlpha(a: number) { sprite.alpha = a; return sprite; },
    setOrigin: () => sprite,
    setDepth(d: number) { sprite.depthSet = d; return sprite; },
    setPosition(nx: number, ny: number) { sprite.x = nx; sprite.y = ny; },
    play(key: string) { sprite.anims.currentAnim = { key }; },
  };
  return sprite;
}
const seeded = (seed: number) => { let s = seed; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };

function rabbitAt(x: number, y: number, seed = 5) {
  const sprite = fakeSprite(x, y);
  const agent = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['forest-rabbit'], {
    roamBounds: ROAM, animations: CLIPS, waterSources: [WATER],
    feet: { width: 16, height: 10 }, random: seeded(seed),
  });
  return { agent, sprite };
}

/**
 * Run until it is actually drinking, then settle briefly.
 *
 * BRIEFLY is load-bearing: a rabbit's drink lasts 1.5-2.6s against the fox's
 * 2.6-4.4s, and a one-second settle copied from the fox's test ran clean past the
 * end of the routine and caught it idling. The facing is set on the first frame
 * after arrival, so a few frames is all that is needed.
 */
function untilDrinking(agent: WildlifeAgent) {
  for (let now = 0; now <= 400_000; now += 100) {
    agent.update(now, 100);
    if (!agent.drinkContactPoint()) continue;
    for (let held = now + 100; held <= now + 300; held += 100) agent.update(held, 100);
    return agent.drinkContactPoint();
  }
  return null;
}

/** Which of the four clips a direction vector should pick. */
function expectedFacing(from: WildlifePoint, to: WildlifePoint) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'down' : 'up';
}

describe('the rabbit inherited what the fox was taught', () => {
  it('faces the water from whichever side it ends up on', () => {
    // Stated this way rather than "start it west, expect right" because a rabbit
    // roams a lot and will not reliably approach from the side you placed it. The
    // requirement was never about a chosen side — it is that the facing agrees with
    // where the water actually is, which is exactly what this checks.
    let drinksSeen = 0;
    const facingsUsed = new Set<string>();
    for (const seed of [3, 11, 29, 47, 64, 82]) {
      const { agent, sprite } = rabbitAt(150, 330, seed);
      const contact = untilDrinking(agent);
      if (!contact) continue;
      drinksSeen += 1;
      const want = expectedFacing({ x: sprite.x, y: sprite.y }, contact);
      facingsUsed.add(want);
      expect(sprite.anims.currentAnim?.key).toBe(`drink-${want}`);
    }
    expect(drinksSeen).toBeGreaterThan(3);
    // And it is genuinely using more than one facing across those approaches.
    expect(facingsUsed.size).toBeGreaterThan(1);
  });

  it('keeps every paw out of the water', () => {
    const { agent, sprite } = rabbitAt(150, 330);
    for (let now = 0; now <= 200_000; now += 100) {
      agent.update(now, 100);
      expect(inPool({ x: sprite.x, y: sprite.y })).toBe(false);
    }
  });

  it('does not hop on the spot after drinking', () => {
    const { agent, sprite } = rabbitAt(150, 330);
    let worstStill = 0;
    let still = 0;
    for (let now = 0; now <= 300_000; now += 100) {
      const before = { x: sprite.x, y: sprite.y };
      agent.update(now, 100);
      const moved = Math.hypot(sprite.x - before.x, sprite.y - before.y);
      const key = sprite.anims.currentAnim?.key ?? '';
      still = key.startsWith('hop-') && moved < 0.01 ? still + 1 : 0;
      worstStill = Math.max(worstStill, still);
    }
    expect(worstStill).toBeLessThan(5);
  });

  it('turns away and goes somewhere else once it has drunk', () => {
    // "It should turn around and go away or go in a different direction."
    const { agent, sprite } = rabbitAt(150, 330);
    expect(untilDrinking(agent)).not.toBeNull();
    const atWater = { x: sprite.x, y: sprite.y };
    let wentAway = false;
    for (let now = 0; now <= 60_000; now += 100) {
      agent.update(400_000 + now, 100);
      if (Math.hypot(sprite.x - atWater.x, sprite.y - atWater.y) > 80) { wentAway = true; break; }
    }
    expect(wentAway).toBe(true);
  });

  it('drinks at all, on the same thirst cycle as the fox', () => {
    const { agent } = rabbitAt(150, 330);
    expect(agent.hasWater()).toBe(true);
    expect(WILDLIFE_SPECIES['forest-rabbit'].routines.some((r) => r.activity === 'drink')).toBe(true);
  });
});
