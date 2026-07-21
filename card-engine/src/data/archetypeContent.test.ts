import { describe, it, expect } from 'vitest';
import { getWeaponPool, getWeaponDescriptor } from './archetypeWeapons';
import { getEnvironmentPool, getEnvironmentDescriptor } from './archetypeEnvironments';
import { getPosePool } from './archetypePoses';
import { getGenderWeights, pickSexFromWeights } from './archetypeGenderWeights';
import { getCompanionPool, companionPresence, companionAppears } from './archetypeCompanions';
import type { Rank } from '../types/card';

const RANKS: Rank[] = ['Foundation', 'Forged', 'Ascendant'];

describe('archetypeWeapons — 3-tier evolution, same family', () => {
  it('every Necromancer weapon has a DISTINCT descriptor per rank that keeps its name', () => {
    const pool = getWeaponPool('Necromancer');
    expect(pool.length).toBeGreaterThanOrEqual(5);
    for (const w of pool) {
      const [f, fg, a] = RANKS.map((r) => getWeaponDescriptor('Necromancer', w.id, r));
      expect(new Set([f, fg, a]).size).toBe(3); // evolves — never identical across ranks
      for (const d of [f, fg, a]) expect(d).toContain(w.name); // same weapon family
    }
  });
});

describe('archetypeEnvironments — locked family, escalating scale', () => {
  it('every Necromancer environment family has a DISTINCT setting per rank', () => {
    const pool = getEnvironmentPool('Necromancer');
    expect(pool.length).toBeGreaterThanOrEqual(5);
    for (const e of pool) {
      const [f, fg, a] = RANKS.map((r) => getEnvironmentDescriptor('Necromancer', e.id, r));
      expect(new Set([f, fg, a]).size).toBe(3);
    }
  });
});

describe('archetypePoses — a tier-up can never reuse the previous tier pose', () => {
  it('Necromancer pose pools are disjoint across ranks', () => {
    const foundation = new Set(getPosePool('Necromancer', 'Foundation'));
    const forged = new Set(getPosePool('Necromancer', 'Forged'));
    const ascendant = new Set(getPosePool('Necromancer', 'Ascendant'));
    expect(foundation.size).toBeGreaterThan(0);
    for (const p of forged) expect(foundation.has(p)).toBe(false);
    for (const p of ascendant) {
      expect(foundation.has(p)).toBe(false);
      expect(forged.has(p)).toBe(false);
    }
  });
});

describe('archetypeCompanions — rank-scaled presence + variety', () => {
  it('only the five companion archetypes have a pool', () => {
    for (const a of ['Necromancer', 'Beastmaster', 'Vampire', 'Mech Pilot', 'Android'] as const) {
      expect(getCompanionPool(a).length).toBeGreaterThanOrEqual(4);
    }
    for (const a of ['Barbarian', 'Monk', 'Druid', 'Lycanthrope', 'Seraph', 'Human'] as const) {
      expect(getCompanionPool(a).length).toBe(0);
    }
  });

  it('Necromancer servants scale none → few → legion', () => {
    const d = getCompanionPool('Necromancer')[0].descriptor;
    expect(companionPresence('Necromancer', 'Foundation', d)).toBe(''); // restraint
    expect(companionPresence('Necromancer', 'Forged', d)).toContain('a few');
    expect(companionPresence('Necromancer', 'Ascendant', d)).toContain('legion');
  });

  it('Beastmaster bonded beast is present from Foundation (lifelong partner)', () => {
    const d = getCompanionPool('Beastmaster')[0].descriptor;
    expect(companionPresence('Beastmaster', 'Foundation', d)).not.toBe('');
  });

  it('companion appearance is a 50/50 chance (Beastmaster always, non-companion archetypes never)', () => {
    expect(companionAppears('Necromancer', 0.2)).toBe(true);
    expect(companionAppears('Necromancer', 0.8)).toBe(false);
    expect(companionAppears('Beastmaster', 0.99)).toBe(true); // bonded beast always
    expect(companionAppears('Barbarian', 0.1)).toBe(false); // no pool
  });
});

describe('archetypeGenderWeights — deterministic weighted roll', () => {
  it('defaults to 50/50 and overrides Necromancer to 70/30 male', () => {
    expect(getGenderWeights('Barbarian')).toEqual({ male: 0.5, female: 0.5 });
    expect(getGenderWeights('Necromancer')).toEqual({ male: 0.7, female: 0.3 });
  });

  it('lands within tolerance of the Necromancer target over many rolls', () => {
    const n = 4000;
    let male = 0;
    for (let i = 0; i < n; i++) {
      if (pickSexFromWeights(getGenderWeights('Necromancer'), Math.random()) === 'male') male++;
    }
    expect(male / n).toBeGreaterThan(0.66);
    expect(male / n).toBeLessThan(0.74);
  });
});
