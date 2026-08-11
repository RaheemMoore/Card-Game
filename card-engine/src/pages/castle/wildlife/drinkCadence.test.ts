import { describe, expect, it } from 'vitest';
import { WildlifeBrain } from './WildlifeBrain';
import { WILDLIFE_SPECIES } from './profiles';
import type { WildlifeSpeciesId } from './types';

/**
 * How OFTEN an animal drinks, guarded as a number.
 *
 * This exists because the first version was written by feel and measured
 * afterwards at a drink every 20 seconds — an animal that lives at the pond, not
 * one that gets thirsty. Raheem asked for "every once in a while", which is a
 * cadence, and a cadence can only be tuned against a measurement.
 *
 * The spread matters as much as the median. Thirst is supposed to be the thing
 * that decides, with the cooldown only stopping back-to-back drinks — so if the
 * interval ever goes nearly constant, the need has become decorative and the
 * cooldown is running the show. An earlier tuning pass did exactly that (110s
 * every time, ±3s) and looked like a metronome.
 */
function cadence(species: WildlifeSpeciesId, runs = 40, ms = 600_000) {
  const gaps: number[] = [];
  for (let run = 0; run < runs; run++) {
    let seed = run * 9301 + 49297;
    const rng = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const brain = new WildlifeBrain(WILDLIFE_SPECIES[species], rng);
    let last: number | null = null;
    let previous = '';
    for (let now = 0; now <= ms; now += 100) {
      const decision = brain.decide({ now, waterAvailable: true });
      if (decision.activity === 'drink' && previous !== 'drink') {
        if (last !== null) gaps.push(now - last);
        last = now;
      }
      previous = decision.activity;
    }
  }
  gaps.sort((a, b) => a - b);
  return {
    median: gaps[Math.floor(gaps.length / 2)] / 1000,
    min: gaps[0] / 1000,
    max: gaps[gaps.length - 1] / 1000,
    count: gaps.length,
  };
}

describe('how often they drink', () => {
  it('gives the fox an occasional drink, not a habit', () => {
    const { median, count } = cadence('red-fox');
    expect(count).toBeGreaterThan(50);
    // Under ~45s it reads as living at the pond; over ~3min you never see it.
    expect(median).toBeGreaterThan(45);
    expect(median).toBeLessThan(180);
  });

  it('lets thirst set the interval, not the cooldown', () => {
    const { min, max } = cadence('red-fox');
    // A need-driven interval varies a lot. A cooldown-driven one is a metronome.
    expect(max / min).toBeGreaterThan(1.8);
  });

  it('has the rabbit drinking more often than the fox', () => {
    // Smaller animal, shorter drink, tighter nerves — it visits more.
    expect(cadence('forest-rabbit').median).toBeLessThan(cadence('red-fox').median);
  });

  it('never lets the tortoise drink at all', () => {
    expect(cadence('glowcap-tortoise').count).toBe(0);
  });
});
