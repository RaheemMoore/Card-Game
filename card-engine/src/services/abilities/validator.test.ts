import { describe, it, expect } from 'vitest';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';
import { validateAbilityVersion } from './validator';

describe('ability validator — seed abilities', () => {
  for (const seed of SEED_ABILITIES) {
    it(`${seed.definition.slug} (${seed.version.slotType}, ${seed.definition.rarity}) passes validation`, () => {
      const result = validateAbilityVersion(seed.version, seed.definition);
      if (!result.ok) {
        // Surface every error at once instead of aborting on the first.
        throw new Error(
          `${seed.definition.slug} failed validation (budget=${result.powerBudgetScore}):\n` +
            result.errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n'),
        );
      }
      expect(result.ok).toBe(true);
    });
  }
});

describe('ability validator — rejects malformed candidates', () => {
  const base = SEED_ABILITIES[0];

  it('rejects an unknown effect type', () => {
    const bad = structuredClone(base);
    (bad.version.effects[0] as { type: string }).type = 'not_a_real_effect';
    const result = validateAbilityVersion(bad.version, bad.definition);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.message.includes('unknown effect type'))).toBe(true);
    }
  });

  it('rejects a slug that is not kebab-case', () => {
    const bad = structuredClone(base);
    bad.definition.slug = 'Ember Cleave';
    const result = validateAbilityVersion(bad.version, bad.definition);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === 'definition.slug')).toBe(true);
    }
  });

  it('rejects resourceType "none" with a nonzero cost', () => {
    const bad = structuredClone(base);
    bad.version.resourceType = 'none';
    bad.version.resourceCost = 2;
    const result = validateAbilityVersion(bad.version, bad.definition);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === 'version.resourceCost')).toBe(true);
    }
  });

  it('rejects a status reference to an unknown status', () => {
    const bad = structuredClone(base);
    // Ember Cleave has a damage_over_time referencing 'burn'; swap it.
    for (const eff of bad.version.effects) {
      if (eff.type === 'damage_over_time') {
        eff.statusId = 'not_a_status';
      }
    }
    const result = validateAbilityVersion(bad.version, bad.definition);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.message.includes('unknown status'))).toBe(true);
    }
  });
});
