import { describe, expect, it } from 'vitest';
import {
  FORGE_CRYSTALS,
  crystalBloomAlpha,
  crystalExcitementTarget,
  crystalGlintInterval,
  crystalMotesMuted,
} from './crystalTuning';

/**
 * These assert the MOTION BUDGET, not the look. The budget is binding
 * (card-engine-courtyard-life-plan.md): low amplitude, periods >= 2s, nothing
 * that competes with the player. The look is Raheem's gate and no test replaces
 * watching it in the scene.
 */
describe('forge counter crystals', () => {
  it('places three gems inside the counter art', () => {
    // art-counter (Figma 18:2) is drawn at 1:1 from x 894, y 357, 214x110.
    expect(FORGE_CRYSTALS).toHaveLength(3);
    for (const crystal of FORGE_CRYSTALS) {
      expect(crystal.x).toBeGreaterThanOrEqual(894);
      expect(crystal.x).toBeLessThanOrEqual(894 + 214);
      expect(crystal.y).toBeGreaterThanOrEqual(357);
      expect(crystal.y).toBeLessThanOrEqual(357 + 110);
    }
  });

  it('gives each gem its own colour so the cluster does not read as one lamp', () => {
    const colours = new Set(FORGE_CRYSTALS.map((crystal) => crystal.color));
    expect(colours.size).toBe(3);
  });

  describe('proximity ramp', () => {
    it('rests at zero when the hero is across the courtyard', () => {
      expect(crystalExcitementTarget(260)).toBe(0);
      expect(crystalExcitementTarget(900)).toBe(0);
    });

    it('reaches full excitement at the counter', () => {
      expect(crystalExcitementTarget(80)).toBe(1);
      expect(crystalExcitementTarget(0)).toBe(1);
    });

    it('ramps monotonically in between, never inverting', () => {
      let previous = crystalExcitementTarget(80);
      for (let distance = 85; distance <= 260; distance += 5) {
        const current = crystalExcitementTarget(distance);
        expect(current).toBeLessThanOrEqual(previous);
        previous = current;
      }
      expect(crystalExcitementTarget(170)).toBeCloseTo(0.5, 2);
    });
  });

  describe('bloom stays inside the low-amplitude budget', () => {
    it('never goes fully transparent, so a gem is always lit', () => {
      for (const excitement of [0, 0.5, 1]) {
        expect(crystalBloomAlpha(excitement, 0)).toBeGreaterThan(0.05);
      }
    });

    it('never approaches opaque, which would blow out the painted art', () => {
      expect(crystalBloomAlpha(1, 1)).toBeLessThan(0.45);
    });

    it('is brighter at the counter than at rest', () => {
      expect(crystalBloomAlpha(1, 0.5)).toBeGreaterThan(crystalBloomAlpha(0, 0.5));
    });

    it('swings by less than a quarter alpha across a full pulse', () => {
      const swing = crystalBloomAlpha(1, 1) - crystalBloomAlpha(1, 0);
      expect(swing).toBeLessThan(0.25);
    });
  });

  describe('glint cadence', () => {
    it('is rare at rest and frequent at the counter', () => {
      expect(crystalGlintInterval(0)).toBe(4200);
      expect(crystalGlintInterval(1)).toBe(1600);
    });

    it('never fires faster than once a second, which would read as a strobe', () => {
      for (let excitement = 0; excitement <= 1; excitement += 0.05) {
        expect(crystalGlintInterval(excitement)).toBeGreaterThan(1000);
      }
    });
  });

  describe('mote mute', () => {
    it('mutes the drifting motes once the hero is close', () => {
      expect(crystalMotesMuted(79)).toBe(true);
      expect(crystalMotesMuted(0)).toBe(true);
    });

    it('leaves them running at conversational distance and beyond', () => {
      expect(crystalMotesMuted(80)).toBe(false);
      expect(crystalMotesMuted(400)).toBe(false);
    });

    it('mutes motes exactly where the bloom ramp tops out, so the two agree', () => {
      // If these ever diverge, the gems would be at full brightness while motes
      // still drift across the hero — the noise case the budget exists to stop.
      expect(crystalMotesMuted(79)).toBe(true);
      expect(crystalExcitementTarget(79)).toBe(1);
    });
  });
});
