import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { WildlifeAgent } from './WildlifeAgent';
import { WILDLIFE_SPECIES } from './profiles';
import type { WildlifeAnimationSet, WildlifeBounds, WildlifePoint } from './types';

/**
 * A fish is the inverse of every other animal, and these are the checks that say
 * so. Water is solid to a fox and land is solid to a fish; a fox roams to dry
 * points and a fish to wet ones; a fox stuck in the pond walks out and a fish
 * stranded on the grass swims back.
 *
 * The last check is the one that matters most: adding a habitat must not change
 * what a land animal does. One flag read three ways is only worth it if the
 * default side of it is genuinely untouched.
 */

const facings = (n: string) => ({ down: `${n}-down`, up: `${n}-up`, left: `${n}-left`, right: `${n}-right` });
const CLIPS: WildlifeAnimationSet = {
  move: facings('swim'), signature: facings('swim'), observe: facings('swim'), idle: facings('swim'),
};

/** The pond as placed in the lab: water inset inside the sprite's box. */
const POOL: WildlifeBounds = { x: 378, y: 201, width: 364, height: 265 };
const BANK: WildlifeBounds = { x: 348, y: 171, width: 424, height: 325 };
const inPool = (p: WildlifePoint) =>
  p.x > POOL.x && p.x < POOL.x + POOL.width && p.y > POOL.y && p.y < POOL.y + POOL.height;
const WATER = { bounds: BANK, contains: inPool };

/**
 * `body` is the sprite's size ON SCREEN, and it matters: submersion is judged
 * against the body rather than the origin point, so a fixture with no size would
 * report every animal as fully submerged the moment its feet got wet — which is
 * precisely the bug this models.
 */
function fakeSprite(x: number, y: number, body = { width: 102, height: 70 }) {
  const sprite = {
    x, y,
    scaleX: 1,
    scaleY: 1,
    displayWidth: body.width,
    displayHeight: body.height,
    setScale(sx: number, sy?: number) { sprite.scaleX = sx; sprite.scaleY = sy ?? sx; return sprite; },
    anims: { currentAnim: null as { key: string } | null, stop() {} },
    depthSet: 0,
    /** null = no tint. The amphibious look is applied and cleared as it crosses. */
    tint: null as number | null,
    alpha: 1,
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

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

/** A fish's territory is its pond, exactly as `readSceneWildlife` assigns it. */
function makeFish(at: WildlifePoint) {
  const sprite = fakeSprite(at.x, at.y, { width: 36, height: 36 });
  const agent = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['pond-fish'], {
    roamBounds: BANK,
    animations: CLIPS,
    waterSources: [WATER],
    feet: { width: 18, height: 10 },
    random: seeded(4242),
  });
  return { agent, sprite };
}

const middle = { x: POOL.x + POOL.width / 2, y: POOL.y + POOL.height / 2 };

describe('a fish stays in its pond', () => {
  it('never leaves the water, over three minutes of swimming', () => {
    const { agent, sprite } = makeFish(middle);
    for (let now = 0; now <= 180_000; now += 100) {
      agent.update(now, 100);
      expect(inPool({ x: sprite.x, y: sprite.y })).toBe(true);
    }
  });

  it('actually swims about rather than sitting still', () => {
    const { agent, sprite } = makeFish(middle);
    let travelled = 0;
    for (let now = 0; now <= 120_000; now += 100) {
      const before = { x: sprite.x, y: sprite.y };
      agent.update(now, 100);
      travelled += Math.hypot(sprite.x - before.x, sprite.y - before.y);
    }
    // At 26px/s a fish that is genuinely roaming covers a lot of pond. Confined to
    // a shape it cannot leave, a broken one collapses toward zero.
    expect(travelled).toBeGreaterThan(800);
  });

  it('swims back if it somehow ends up on the grass', () => {
    // The mirror of a fox walking out of the pond. Neither side of the waterline
    // may be a state a creature cannot leave.
    const onLand = { x: 120, y: 330 };
    const { agent, sprite } = makeFish(onLand);
    expect(inPool({ x: sprite.x, y: sprite.y })).toBe(false);

    let backAt: number | null = null;
    for (let now = 0; now <= 60_000; now += 100) {
      agent.update(now, 100);
      if (inPool({ x: sprite.x, y: sprite.y })) { backAt = now; break; }
      }
    expect(backAt).not.toBeNull();
  });

  it('does not drink, and is never offered water to drink', () => {
    const { agent } = makeFish(middle);
    expect(agent.hasWater()).toBe(false);
    expect(WILDLIFE_SPECIES['pond-fish'].routines.some((r) => r.activity === 'drink')).toBe(false);
  });
});

describe('adding a habitat left the land animals alone', () => {
  it('still keeps a fox OUT of the same pond', () => {
    const sprite = fakeSprite(120, 330, { width: 120, height: 76 });
    const agent = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['red-fox'], {
      roamBounds: { x: 55, y: 165, width: 690, height: 330 },
      animations: { ...CLIPS, drink: facings('drink') },
      waterSources: [WATER],
      feet: { width: 26, height: 12 },
      random: seeded(4242),
    });
    for (let now = 0; now <= 120_000; now += 100) {
      agent.update(now, 100);
      expect(inPool({ x: sprite.x, y: sprite.y })).toBe(false);
    }
  });

  it('keeps each species on the side of the waterline it belongs to', () => {
    // Land is the DEFAULT — a profile that says nothing gets the old behaviour.
    for (const id of ['red-fox', 'forest-rabbit'] as const) {
      expect(WILDLIFE_SPECIES[id].habitat ?? 'land').toBe('land');
    }
    expect(WILDLIFE_SPECIES['pond-fish'].habitat).toBe('water');
    expect(WILDLIFE_SPECIES['glowcap-tortoise'].habitat).toBe('amphibious');
  });
});

describe('a fish draws under the water, not on it', () => {
  it('sorts into the submerged band instead of by its own Y', () => {
    // A land animal's depth IS its Y — hundreds. A fish sorting that way would
    // draw on top of the ripples it is meant to be swimming beneath, so it gets a
    // small fixed depth just above the pond instead.
    const { agent, sprite } = makeFish(middle);
    agent.update(0, 100);
    const depth = (sprite as unknown as { depthSet?: number }).depthSet;
    expect(depth).toBeDefined();
    expect(depth!).toBeLessThan(12);      // below WATER_LAYER.surface
    expect(depth!).toBeGreaterThan(0);    // above the pond at 0
    expect(depth!).toBeLessThan(sprite.y / 10);
  });

  it('still sorts a land animal by its feet', () => {
    const sprite = fakeSprite(120, 330, { width: 120, height: 76 });
    const agent = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['red-fox'], {
      roamBounds: { x: 55, y: 165, width: 690, height: 330 },
      animations: { ...CLIPS, drink: facings('drink') },
      waterSources: [WATER],
      feet: { width: 26, height: 12 },
      random: seeded(1),
    });
    agent.update(0, 100);
    const depth = (sprite as unknown as { depthSet?: number }).depthSet;
    expect(depth).toBe(sprite.y);
  });
});

/**
 * The tortoise is the first animal on BOTH sides of the waterline. Amphibious is
 * not a third set of rules — it is the absence of the boundary — so what these
 * check is that it genuinely crosses, and that it looks right on each side.
 */
/**
 * The same four-point body test the agent uses, so the tests judge submersion the
 * way the game does — on the body, never on the single origin point under its feet.
 */
function bodyState(sprite: {
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
}): 'in' | 'out' | 'crossing' {
  const hw = sprite.displayWidth * 0.5;
  const h = sprite.displayHeight;
  const points = [
    { x: sprite.x, y: sprite.y },
    { x: sprite.x - hw * 0.6, y: sprite.y - h * 0.35 },
    { x: sprite.x + hw * 0.6, y: sprite.y - h * 0.35 },
    { x: sprite.x, y: sprite.y - h * 0.7 },
  ];
  const wet = points.filter(inPool).length;
  return wet === points.length ? 'in' : wet === 0 ? 'out' : 'crossing';
}

describe('the tortoise goes in and out of the water', () => {
  function makeTortoise(at: WildlifePoint, seed = 77) {
    const sprite = fakeSprite(at.x, at.y, { width: 102, height: 70 });
    const agent = new WildlifeAgent(
      sprite as unknown as Phaser.GameObjects.Sprite,
      WILDLIFE_SPECIES['glowcap-tortoise'],
      {
        roamBounds: { x: 55, y: 165, width: 690, height: 330 },
        animations: {
          move: facings('toddle'), signature: facings('toddle'),
          observe: facings('toddle'), idle: facings('toddle'), swim: facings('float'),
        },
        waterSources: [WATER],
        feet: { width: 24, height: 12 },
        random: seeded(seed),
      },
    );
    return { agent, sprite };
  }

  it('gets into the pond of its own accord, with no swim routine', () => {
    // It has no "go swimming" activity. Ordinary roaming picks a spot in the water
    // because nothing forbids it, which is a better reason to be swimming.
    const { agent, sprite } = makeTortoise({ x: 200, y: 330 });
    let wetFrames = 0;
    for (let now = 0; now <= 400_000; now += 100) {
      agent.update(now, 100);
      if (inPool({ x: sprite.x, y: sprite.y })) wetFrames += 1;
    }
    expect(wetFrames).toBeGreaterThan(0);
  });

  it('comes back out again rather than living there', () => {
    const middleOfPond = { x: POOL.x + POOL.width / 2, y: POOL.y + POOL.height / 2 };
    const { agent, sprite } = makeTortoise(middleOfPond);
    let dryFrames = 0;
    for (let now = 0; now <= 400_000; now += 100) {
      agent.update(now, 100);
      if (!inPool({ x: sprite.x, y: sprite.y })) dryFrames += 1;
    }
    expect(dryFrames).toBeGreaterThan(0);
  });

  /**
   * Run the clock and hand back only the frames worth judging.
   *
   * Submersion is decided on the BODY, not the origin — asserting against the
   * origin is what these tests did first, and it is the bug Raheem reported:
   * "half the body is outside of the water and it is still covered in the blue."
   *
   * Frames mid-crossing are skipped, and so are the first 700ms after a change,
   * because the look eases in over ~420ms rather than snapping.
   */
  function settledFrames(
    agent: WildlifeAgent,
    sprite: ReturnType<typeof fakeSprite>,
    visit: (state: 'in' | 'out') => void,
    ms = 400_000,
  ) {
    let state = bodyState(sprite);
    let heldFor = 0;
    for (let now = 0; now <= ms; now += 100) {
      agent.update(now, 100);
      const next = bodyState(sprite);
      heldFor = next === state ? heldFor + 100 : 0;
      state = next;
      if (state !== 'crossing' && heldFor >= 700) visit(state);
    }
  }

  it('floats only when all of it is in, and walks only when all of it is out', () => {
    const { agent, sprite } = makeTortoise({ x: 200, y: 330 });
    const seen = new Set<string>();
    settledFrames(agent, sprite, (state) => {
      const clip = (sprite.anims.currentAnim?.key ?? '').split('-')[0];
      if (clip) seen.add(`${state}:${clip}`);
    });
    expect([...seen]).toContain('in:float');
    expect([...seen]).toContain('out:toddle');
    // Never the wrong way round once it has settled.
    expect([...seen]).not.toContain('out:float');
    expect([...seen]).not.toContain('in:toddle');
  });

  it('is tinted and shrunken only once the whole body is under', () => {
    const { agent, sprite } = makeTortoise({ x: 200, y: 330 });
    let sawIn = false;
    let sawOut = false;
    settledFrames(agent, sprite, (state) => {
      if (state === 'in') {
        sawIn = true;
        expect(sprite.tint).not.toBeNull();
        // Smaller, because the water is deep and it is further away.
        expect(sprite.scaleX).toBeLessThan(1);
      } else {
        sawOut = true;
        expect(sprite.tint).toBeNull();
        expect(sprite.scaleX).toBeCloseTo(1, 2);
      }
    });
    expect(sawIn && sawOut).toBe(true);
  });

  it('sorts under the surface while afloat and by its feet on land', () => {
    const { agent, sprite } = makeTortoise({ x: 200, y: 330 });
    settledFrames(agent, sprite, (state) => {
      const depth = (sprite as unknown as { depthSet: number }).depthSet;
      if (state === 'in') expect(depth).toBeLessThan(12);
      else expect(depth).toBe(sprite.y);
    });
  });

  it('keeps drifting once it is in, rather than swimming on the spot', () => {
    // Raheem, 2026-08-10: "when it gets into the water it's just swimming in place.
    // It doesn't move anymore." The float clip plays whenever it is wet, moving or
    // not, so a stationary tortoise reads as paddling and going nowhere.
    const { agent, sprite } = makeTortoise({ x: 200, y: 330 });
    agent.goSwimming(0);

    let worstStill = 0;
    let still = 0;
    let framesAfloat = 0;
    for (let now = 100; now <= 120_000; now += 100) {
      const before = { x: sprite.x, y: sprite.y };
      agent.update(now, 100);
      if (bodyState(sprite) !== 'in') { still = 0; continue; }
      framesAfloat += 1;
      const moved = Math.hypot(sprite.x - before.x, sprite.y - before.y);
      still = moved < 0.01 ? still + 1 : 0;
      worstStill = Math.max(worstStill, still);
    }
    expect(framesAfloat).toBeGreaterThan(50);
    // Resting on the water is fine and the float clip is honest for it — a
    // floating animal is always gently moving. The bug was ~20s (200 frames) of
    // paddling at nothing after the forced routine parked it. 10s is comfortably
    // between the two.
    expect(worstStill).toBeLessThan(100);
  });

  it('gets out again after a while, and stays out for a spell', () => {
    // Raheem, 2026-08-10: "make sure the tortoise will also get out of the water
    // once they swim around for a while... they don't just need to continuously
    // bounce around." Drifting-on-arrival, left to itself, keeps handing it another
    // spot in the pond, so without a limit it stays in for minutes at a time.
    //
    // SEVERAL SEEDS ON PURPOSE. With one, this passed even with the limit disabled
    // — that run simply happened to wander out on its own. Measured across seeds,
    // the longest swim is 23-37s with the limit and 61-136s without, so the bound
    // below separates them.
    for (const seed of [7, 31, 99]) {
      const { agent, sprite } = makeTortoise({ x: 200, y: 330 }, seed);
      agent.goSwimming(0);

      const swims: number[] = [];
      const dries: number[] = [];
      let run = 0;
      let wasIn = false;
      for (let now = 100; now <= 600_000; now += 100) {
        agent.update(now, 100);
        const isIn = bodyState(sprite) === 'in';
        if (isIn === wasIn) { run += 100; continue; }
        (wasIn ? swims : dries).push(run);
        wasIn = isIn;
        run = 100;
      }

      // It cycles rather than swimming once and settling.
      expect(swims.length).toBeGreaterThanOrEqual(2);
      // Every swim ends. The span is 12-30s, plus however long the climb out takes.
      expect(Math.max(...swims)).toBeLessThan(50_000);
      // And it spends real time walking about between them.
      expect(Math.max(...dries)).toBeGreaterThan(10_000);
      // Randomised per swim, not a metronome.
      expect(new Set(swims).size).toBeGreaterThan(1);
    }
  });

  it('never parks half in and half out', () => {
    // The shoreline is somewhere it crosses, not somewhere it stops. A tortoise
    // straddling the bank was the most visible part of the complaint.
    const { agent, sprite } = makeTortoise({ x: 200, y: 330 });
    let longestStraddle = 0;
    let run = 0;
    for (let now = 0; now <= 400_000; now += 100) {
      agent.update(now, 100);
      run = bodyState(sprite) === 'crossing' ? run + 1 : 0;
      longestStraddle = Math.max(longestStraddle, run);
    }
    // Crossing a 102px-wide body over the line at 20px/s takes ~5s; parking there
    // would run to the length of a whole routine and beyond.
    expect(longestStraddle).toBeLessThan(90);
  });
});

describe('the go-swimming trigger', () => {
  function tortoiseOnLand() {
    const sprite = fakeSprite(200, 330, { width: 102, height: 70 });
    const agent = new WildlifeAgent(
      sprite as unknown as Phaser.GameObjects.Sprite,
      WILDLIFE_SPECIES['glowcap-tortoise'],
      {
        roamBounds: { x: 55, y: 165, width: 690, height: 330 },
        animations: {
          move: facings('toddle'), signature: facings('toddle'),
          observe: facings('toddle'), idle: facings('toddle'), swim: facings('float'),
        },
        waterSources: [WATER],
        feet: { width: 24, height: 12 },
        random: seeded(9),
      },
    );
    return { agent, sprite };
  }

  it('puts the tortoise in the pond promptly when asked', () => {
    const { agent, sprite } = tortoiseOnLand();
    expect(inPool({ x: sprite.x, y: sprite.y })).toBe(false);
    expect(agent.goSwimming(0)).toBe(true);

    let arrivedAt: number | null = null;
    for (let now = 100; now <= 60_000; now += 100) {
      agent.update(now, 100);
      if (inPool({ x: sprite.x, y: sprite.y })) { arrivedAt = now; break; }
    }
    // A tortoise walks at 20px/s and starts ~180px away, so this is a real bound
    // rather than "eventually" — waiting is the thing the trigger exists to avoid.
    expect(arrivedAt).not.toBeNull();
    expect(arrivedAt!).toBeLessThan(30_000);
  });

  it('says no for an animal that cannot swim', () => {
    const sprite = fakeSprite(120, 330, { width: 120, height: 76 });
    const fox = new WildlifeAgent(sprite as unknown as Phaser.GameObjects.Sprite, WILDLIFE_SPECIES['red-fox'], {
      roamBounds: { x: 55, y: 165, width: 690, height: 330 },
      animations: { ...CLIPS, drink: facings('drink') },
      waterSources: [WATER],
      feet: { width: 26, height: 12 },
      random: seeded(9),
    });
    // Returning false is what lets the lab say "nothing here swims" instead of
    // looking like the key did nothing.
    expect(fox.goSwimming(0)).toBe(false);
  });
});
