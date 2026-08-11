import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { WildlifeAgent } from './WildlifeAgent';
import { WILDLIFE_SPECIES } from './profiles';
import type { WildlifeAnimationSet, WildlifeBounds, WildlifePoint } from './types';

/**
 * Animals must not run on the spot, and must never be trapped.
 *
 * Raheem, 2026-08-10: "After drinking it just keeps walking toward the water or
 * getting stuck on objects. Moving its legs but not going anywhere."
 *
 * Every check here is written against the SYMPTOM — a walking clip playing while
 * the animal does not move — rather than against the internals that cause it, so
 * it keeps its meaning if the pathing is rewritten later.
 *
 * The pond deliberately covers half the territory, exactly as it now does in the
 * Wildlife Lab. That is what turned three latent defects into a visible one.
 */

const facings = (n: string) => ({ down: `${n}-down`, up: `${n}-up`, left: `${n}-left`, right: `${n}-right` });
const CLIPS: WildlifeAnimationSet = {
  move: facings('move'), signature: facings('sniff'), observe: facings('watch'),
  idle: facings('idle'), drink: facings('drink'),
};

const ROAM: WildlifeBounds = { x: 55, y: 165, width: 690, height: 330 };
/** The water itself — the pond as placed in the lab, spanning half the roam box. */
const POOL: WildlifeBounds = { x: 378, y: 201, width: 364, height: 265 };
/** The sprite's box, which includes its earth bank, so the water is inset. */
const BANK: WildlifeBounds = { x: 348, y: 171, width: 424, height: 325 };

const inPool = (p: WildlifePoint) =>
  p.x > POOL.x && p.x < POOL.x + POOL.width && p.y > POOL.y && p.y < POOL.y + POOL.height;
const WATER = { bounds: BANK, contains: inPool };

function fakeSprite(x: number, y: number) {
  const sprite = {
    x, y,
    anims: { currentAnim: null as { key: string } | null, stop() {} },
    setOrigin: () => sprite, setDepth: () => sprite,
    setPosition(nx: number, ny: number) { sprite.x = nx; sprite.y = ny; },
    play(key: string) { sprite.anims.currentAnim = { key }; },
  };
  return sprite;
}

/** Deterministic but varied — a fixed 0.5 would send it to the same spot forever. */
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function makeFox(
  at: WildlifePoint,
  options: { water?: typeof WATER[]; wall?: (c: WildlifePoint, p: WildlifePoint) => WildlifePoint } = {},
) {
  const sprite = fakeSprite(at.x, at.y);
  const agent = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['red-fox'], {
    roamBounds: ROAM,
    animations: CLIPS,
    waterSources: options.water ?? [WATER],
    moveResolver: options.wall,
    feet: { width: 26, height: 12 },
    random: seeded(12345),
  });
  return { agent, sprite };
}

/** Run the clock, watching for a walk clip playing while nothing moves. */
function walkOnTheSpot(agent: WildlifeAgent, sprite: ReturnType<typeof fakeSprite>, ms: number) {
  let worst = 0;
  let run = 0;
  let travelled = 0;
  for (let now = 0; now <= ms; now += 100) {
    const before = { x: sprite.x, y: sprite.y };
    agent.update(now, 100);
    const moved = Math.hypot(sprite.x - before.x, sprite.y - before.y);
    travelled += moved;
    const key = sprite.anims.currentAnim?.key ?? '';
    if (key.startsWith('move-') && moved < 0.01) {
      run += 1;
      worst = Math.max(worst, run);
    } else {
      run = 0;
    }
  }
  return { worstStuckFrames: worst, travelled };
}

describe('an animal never runs on the spot', () => {
  it('does not play a walking clip while standing still', () => {
    const { agent, sprite } = makeFox({ x: 120, y: 330 });
    const { worstStuckFrames } = walkOnTheSpot(agent, sprite, 180_000);
    // One or two frames is the honest cost of noticing an obstacle. Half a second
    // of walking against nothing is the bug.
    expect(worstStuckFrames).toBeLessThan(5);
  });

  it('actually gets somewhere over three minutes', () => {
    const { agent, sprite } = makeFox({ x: 120, y: 330 });
    const { travelled } = walkOnTheSpot(agent, sprite, 180_000);
    // A fox roams at 48px/s. Even mostly resting it should cover a lot of ground;
    // stuck against the pond it collapses toward zero.
    expect(travelled).toBeGreaterThan(2_000);
  });

  it('keeps moving even when something blocks one direction', () => {
    // A wall down the middle, which it will meet constantly while roaming.
    const wall = (c: WildlifePoint, p: WildlifePoint) => (p.x > 300 ? c : p);
    const { agent, sprite } = makeFox({ x: 120, y: 330 }, { water: [], wall });
    const { worstStuckFrames, travelled } = walkOnTheSpot(agent, sprite, 120_000);
    expect(worstStuckFrames).toBeLessThan(5);
    expect(travelled).toBeGreaterThan(1_000);
  });
});

describe('an animal is never trapped', () => {
  it('gets out of water it somehow ended up in', () => {
    // Nothing should put it here — but if anything ever does, every candidate move
    // is also in water, so without an escape hatch it is stuck forever with its
    // legs going. That is a deadlock, not a slowdown.
    const middle = { x: POOL.x + POOL.width / 2, y: POOL.y + POOL.height / 2 };
    const { agent, sprite } = makeFox(middle);
    expect(inPool({ x: sprite.x, y: sprite.y })).toBe(true);

    let escapedAt: number | null = null;
    for (let now = 0; now <= 60_000; now += 100) {
      agent.update(now, 100);
      if (!inPool({ x: sprite.x, y: sprite.y })) { escapedAt = now; break; }
    }
    // It has to WALK out, so this is a real bound rather than "eventually": from
    // the middle of a 364px pool at 48px/s the nearest bank is ~2.8s away. Before
    // the escape hatch it never got out at all; with only the hatch and no
    // override it took 7.7s, waiting for the brain to choose roaming.
    expect(escapedAt).not.toBeNull();
    expect(escapedAt!).toBeLessThan(6_000);
  });
});
