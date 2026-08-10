import { describe, expect, it } from 'vitest';
import { WildlifeBrain } from './WildlifeBrain';
import { WILDLIFE_SPECIES } from './profiles';
import { distanceToBounds, nearestPointIn } from './movement';
import type { WildlifeDecision } from './types';

/**
 * Drinking, proven without a browser.
 *
 * The behaviour that matters is a decision, and decisions are pure — so the rule
 * "put a pond down and they know what to do" can be tested exactly rather than
 * eyeballed in a scene. What these cannot show is whether it LOOKS right; that is
 * what the lab is for.
 */

const steady = (value: number) => () => value;

/** Run the brain forward until it picks something new, collecting what it picked. */
function runFor(
  brain: WildlifeBrain,
  ms: number,
  stimulus: { waterAvailable?: boolean } = {},
  stepMs = 250,
): WildlifeDecision[] {
  const seen: WildlifeDecision[] = [];
  let last: WildlifeDecision | null = null;
  for (let now = 0; now <= ms; now += stepMs) {
    const decision = brain.decide({ now, ...stimulus });
    if (decision !== last) seen.push(decision);
    last = decision;
  }
  return seen;
}

describe('thirst', () => {
  it('rises as time passes', () => {
    const brain = new WildlifeBrain(WILDLIFE_SPECIES['red-fox'], steady(0.5));
    const before = brain.snapshot().needs.thirst;
    runFor(brain, 20_000, { waterAvailable: false });
    expect(brain.snapshot().needs.thirst).toBeGreaterThan(before);
  });

  it('rises faster while fleeing than while resting', () => {
    const exerted = new WildlifeBrain(WILDLIFE_SPECIES['red-fox'], steady(0.5));
    const rested = new WildlifeBrain(WILDLIFE_SPECIES['red-fox'], steady(0.5));
    for (let now = 0; now <= 8_000; now += 250) {
      exerted.decide({ now, playerDistance: 10, waterAvailable: false });
      rested.decide({ now, waterAvailable: false });
    }
    expect(exerted.snapshot().needs.thirst).toBeGreaterThan(rested.snapshot().needs.thirst);
  });
});

describe('deciding to drink', () => {
  it('never drinks when there is no water in reach', () => {
    const brain = new WildlifeBrain(WILDLIFE_SPECIES['red-fox'], steady(0.5));
    const chosen = runFor(brain, 120_000, { waterAvailable: false });
    expect(chosen.map((d) => d.activity)).not.toContain('drink');
    // And it is still living a full life, not stalled waiting for a pond.
    expect(new Set(chosen.map((d) => d.activity)).size).toBeGreaterThan(1);
  });

  it('goes for a drink once thirsty and water exists', () => {
    const brain = new WildlifeBrain(WILDLIFE_SPECIES['red-fox'], steady(0.5));
    const chosen = runFor(brain, 120_000, { waterAvailable: true });
    expect(chosen.map((d) => d.activity)).toContain('drink');
  });

  it('slakes thirst by drinking', () => {
    const brain = new WildlifeBrain(WILDLIFE_SPECIES['forest-rabbit'], steady(0.5));
    let sawDrink = false;
    for (let now = 0; now <= 200_000; now += 250) {
      const decision = brain.decide({ now, waterAvailable: true });
      if (decision.activity === 'drink') {
        sawDrink = true;
        expect(brain.snapshot().needs.thirst).toBeLessThan(0.2);
        break;
      }
    }
    expect(sawDrink).toBe(true);
  });

  it('leaves the tortoise dry — it has no drink routine at all', () => {
    const brain = new WildlifeBrain(WILDLIFE_SPECIES['glowcap-tortoise'], steady(0.5));
    const chosen = runFor(brain, 200_000, { waterAvailable: true });
    expect(chosen.map((d) => d.activity)).not.toContain('drink');
  });

  it('still runs from the player rather than finishing its drink', () => {
    const brain = new WildlifeBrain(WILDLIFE_SPECIES['red-fox'], steady(0.5));
    let now = 0;
    for (; now <= 200_000; now += 250) {
      if (brain.decide({ now, waterAvailable: true }).activity === 'drink') break;
    }
    expect(brain.decide({ now: now + 250, waterAvailable: true, playerDistance: 20 }))
      .toMatchObject({ activity: 'flee', reason: 'player-nearby' });
  });
});

describe('finding the water', () => {
  const pond = { x: 200, y: 100, width: 120, height: 90 };

  it('walks to the near shore, not across to the far one', () => {
    // Standing to the WEST: the point it heads for must be on the west edge.
    expect(nearestPointIn(pond, { x: 40, y: 140 })).toEqual({ x: 200, y: 140 });
    // Standing to the EAST: the east edge.
    expect(nearestPointIn(pond, { x: 900, y: 140 })).toEqual({ x: 320, y: 140 });
  });

  it('leaves an animal already at the water where it stands', () => {
    const onTheBank = { x: 260, y: 150 };
    expect(nearestPointIn(pond, onTheBank)).toEqual(onTheBank);
    expect(distanceToBounds(pond, onTheBank)).toBe(0);
  });

  it('measures the gap from outside', () => {
    expect(distanceToBounds(pond, { x: 200, y: 60 })).toBe(40);
  });
});
