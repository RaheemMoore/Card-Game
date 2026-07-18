import { describe, it, expect } from 'vitest';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';
import { normalizeCandidate } from './candidateNormalizer';
import { detectDuplicate, overlapScore, signatureOf } from './duplicateDetector';
import type { AbilityCandidate } from '../../types/abilities';

const emberCleaveCandidate: AbilityCandidate = {
  displayName: 'Ember Cleave',
  familyIds: ['martial', 'fire'],
  rarity: 'uncommon',
  role: 'damage',
  tags: ['sweep', 'burn', 'martial'],
  descriptionShort: 'A sweeping strike that leaves the target burning.',
  slotType: 'signature',
  resourceType: 'mana',
  resourceCost: 3,
  cooldownRounds: 1,
  targetRule: { type: 'single_enemy' },
  effects: [
    { type: 'direct_damage', amount: 18, damageType: 'physical', scaling: { stat: 'atk', coefficient: 0.5 } },
    { type: 'damage_over_time', statusId: 'burn', amountPerTick: 4, duration: 3 },
  ],
  triggers: [{ type: 'on_use' }],
};

// Library entry for Ember Cleave, in the same shape signatureOf() expects.
const emberCleaveLib = { def: SEED_ABILITIES[0].definition, version: SEED_ABILITIES[0].version };
const aegisWardLib = { def: SEED_ABILITIES[1].definition, version: SEED_ABILITIES[1].version };
const soulDrainLib = { def: SEED_ABILITIES[3].definition, version: SEED_ABILITIES[3].version };

describe('signatureOf', () => {
  it('is identical for two candidates with the same normalized shape', () => {
    const a = normalizeCandidate(emberCleaveCandidate);
    const b = normalizeCandidate({ ...emberCleaveCandidate, displayName: 'Fiery Slash' });
    expect(signatureOf(a.definition, a.version)).toBe(signatureOf(b.definition, b.version));
  });

  it('differs when the target type changes', () => {
    const a = normalizeCandidate(emberCleaveCandidate);
    const b = normalizeCandidate({ ...emberCleaveCandidate, targetRule: { type: 'all_enemies' } });
    expect(signatureOf(a.definition, a.version)).not.toBe(signatureOf(b.definition, b.version));
  });

  it('differs when an effect type is swapped', () => {
    const a = normalizeCandidate(emberCleaveCandidate);
    const b = normalizeCandidate({
      ...emberCleaveCandidate,
      effects: [{ type: 'healing', amount: 10 }],
    });
    expect(signatureOf(a.definition, a.version)).not.toBe(signatureOf(b.definition, b.version));
  });
});

describe('overlapScore', () => {
  it('scores near-maximum when candidate matches an existing library entry exactly', () => {
    // Categories neither entry populates (e.g. conditions on Ember Cleave)
    // contribute 0, so the max is the weighted sum of the categories both
    // sides do use. Exact-match detection uses signatureOf() — this score is
    // just admin context.
    const cand = normalizeCandidate(emberCleaveCandidate);
    const score = overlapScore({ def: cand.definition, version: cand.version }, emberCleaveLib);
    expect(score).toBeGreaterThan(0.8);
  });

  it('scores lower for a totally different ability', () => {
    const cand = normalizeCandidate(emberCleaveCandidate);
    const score = overlapScore({ def: cand.definition, version: cand.version }, aegisWardLib);
    expect(score).toBeLessThan(0.3);
  });
});

describe('detectDuplicate', () => {
  it('flags a cosmetic rename as exact_match against the existing library entry', () => {
    const cand = normalizeCandidate({ ...emberCleaveCandidate, displayName: 'Blazing Slash' });
    const result = detectDuplicate(
      { def: cand.definition, version: cand.version },
      [emberCleaveLib, aegisWardLib, soulDrainLib],
    );
    expect(result.kind).toBe('exact_match');
    if (result.kind === 'exact_match') {
      expect(result.abilityId).toBe(emberCleaveLib.def.id);
    }
  });

  it('returns novel when nothing in the library is close', () => {
    const cand = normalizeCandidate({
      displayName: 'Void Bolt',
      familyIds: ['necromancy'],
      rarity: 'rare',
      role: 'damage',
      tags: ['shadow', 'void'],
      descriptionShort: 'A silent void bolt strikes at range.',
      slotType: 'signature',
      resourceType: 'mana',
      resourceCost: 4,
      cooldownRounds: 3,
      targetRule: { type: 'random_enemy' },
      effects: [
        { type: 'multi_hit', hitCount: 3, amountPerHit: 6 },
        { type: 'ultimate_charge_gain', amount: 4 },
      ],
      triggers: [{ type: 'below_health_threshold', percent: 0.4 }],
    });
    const result = detectDuplicate(
      { def: cand.definition, version: cand.version },
      [emberCleaveLib, aegisWardLib, soulDrainLib],
    );
    expect(result.kind).toBe('novel');
  });

  it('flags high_similarity when effects match but target rule differs', () => {
    const cand = normalizeCandidate({
      ...emberCleaveCandidate,
      displayName: 'Ember Sweep',
      targetRule: { type: 'all_enemies' },
    });
    const result = detectDuplicate(
      { def: cand.definition, version: cand.version },
      [emberCleaveLib, aegisWardLib, soulDrainLib],
    );
    expect(result.kind).toBe('high_similarity');
    if (result.kind === 'high_similarity') {
      expect(result.abilityId).toBe(emberCleaveLib.def.id);
      expect(result.overlap).toBeGreaterThan(0.6);
    }
  });

  it('ignores merged/deprecated entries when matching', () => {
    const deprecatedLib = {
      def: { ...emberCleaveLib.def, status: 'deprecated' as const },
      version: emberCleaveLib.version,
    };
    const cand = normalizeCandidate(emberCleaveCandidate);
    const result = detectDuplicate(
      { def: cand.definition, version: cand.version },
      [deprecatedLib],
    );
    expect(result.kind).toBe('novel');
  });
});
