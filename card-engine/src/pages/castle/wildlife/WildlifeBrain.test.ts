import { describe, expect, it } from 'vitest';
import { WildlifeBrain } from './WildlifeBrain';
import { WILDLIFE_SPECIES } from './profiles';

function sequence(...values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('WildlifeBrain', () => {
  it('keeps an activity until its chosen duration ends', () => {
    const brain = new WildlifeBrain(WILDLIFE_SPECIES['red-fox'], sequence(0, 0));
    const first = brain.decide({ now: 0 });
    expect(brain.decide({ now: first.endsAt - 1 })).toBe(first);
  });

  it('does not immediately repeat its previous routine', () => {
    const brain = new WildlifeBrain(WILDLIFE_SPECIES['red-fox'], sequence(0.5));
    const first = brain.decide({ now: 0 });
    const second = brain.decide({ now: first.endsAt + 1 });
    expect(second.activity).not.toBe(first.activity);
  });

  it('interrupts an ordinary routine when a fox is approached closely', () => {
    const brain = new WildlifeBrain(WILDLIFE_SPECIES['red-fox'], sequence(0, 0));
    expect(brain.decide({ now: 0 }).reason).toBe('routine');
    expect(brain.decide({ now: 100, playerDistance: 20 })).toMatchObject({
      activity: 'flee',
      reason: 'player-nearby',
    });
  });

  it('makes the tortoise observe instead of sprinting away', () => {
    const brain = new WildlifeBrain(WILDLIFE_SPECIES['glowcap-tortoise'], sequence(0, 0));
    expect(brain.decide({ now: 0, playerDistance: 20 })).toMatchObject({
      activity: 'observe',
      reason: 'player-nearby',
    });
  });

  it('keeps reacting while the player remains close', () => {
    const brain = new WildlifeBrain(WILDLIFE_SPECIES['forest-rabbit'], sequence(0));
    const first = brain.decide({ now: 0, playerDistance: 20 });
    const renewed = brain.decide({ now: first.endsAt + 1, playerDistance: 20 });
    expect(renewed.activity).toBe('flee');
    expect(renewed.startedAt).toBe(first.endsAt + 1);
  });

  it('changes internal needs while an activity runs', () => {
    const brain = new WildlifeBrain(WILDLIFE_SPECIES['red-fox'], sequence(0.5));
    brain.decide({ now: 0 });
    const before = brain.snapshot().needs;
    brain.decide({ now: 2_000 });
    const after = brain.snapshot().needs;
    expect(after).not.toEqual(before);
    expect(after.energy).toBeGreaterThanOrEqual(0);
    expect(after.energy).toBeLessThanOrEqual(1);
  });
});
