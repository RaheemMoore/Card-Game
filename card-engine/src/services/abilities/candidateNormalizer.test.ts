import { describe, it, expect } from 'vitest';
import type { AbilityCandidate } from '../../types/abilities';
import { normalizeCandidate, slugify, slugToAbilityId } from './candidateNormalizer';

function makeCandidate(overrides: Partial<AbilityCandidate> = {}): AbilityCandidate {
  return {
    displayName: 'Ember Cleave',
    familyIds: ['martial', 'fire'],
    rarity: 'uncommon',
    role: 'damage',
    tags: ['sweep', 'burn'],
    descriptionShort: 'A wide ember-wreathed cleave.',
    slotType: 'signature',
    resourceType: 'mana',
    resourceCost: 3,
    targetRule: { type: 'single_enemy' },
    effects: [{ type: 'direct_damage', amount: 18 }],
    ...overrides,
  };
}

describe('slugify', () => {
  it('lowercases + hyphenates + trims', () => {
    expect(slugify('Ember Cleave')).toBe('ember-cleave');
    expect(slugify("Aegis Ward's Guard!")).toBe('aegis-ward-s-guard');
    expect(slugify('  Trailing Space  ')).toBe('trailing-space');
  });
});

describe('slugToAbilityId', () => {
  it('maps hyphens to underscores + prefixes', () => {
    expect(slugToAbilityId('ember-cleave')).toBe('ability_ember_cleave');
  });
});

describe('normalizeCandidate', () => {
  it('splits into a paired definition + version', () => {
    const now = '2026-07-18T00:00:00.000Z';
    const { definition, version } = normalizeCandidate(makeCandidate(), { now });

    expect(definition.id).toBe('ability_ember_cleave');
    expect(definition.slug).toBe('ember-cleave');
    expect(definition.currentVersionId).toBe('ability_ember_cleave_v1');
    expect(definition.status).toBe('proposed');
    expect(definition.createdAt).toBe(now);

    expect(version.id).toBe('ability_ember_cleave_v1');
    expect(version.abilityId).toBe('ability_ember_cleave');
    expect(version.versionNumber).toBe(1);
    expect(version.status).toBe('draft');
    expect(version.effects).toHaveLength(1);
  });

  it('preserves an explicit slug over displayName', () => {
    const { definition } = normalizeCandidate(makeCandidate({ slug: 'flame-slash' }));
    expect(definition.slug).toBe('flame-slash');
    expect(definition.id).toBe('ability_flame_slash');
  });
});
