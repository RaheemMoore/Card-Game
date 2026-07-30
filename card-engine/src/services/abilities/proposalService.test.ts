import { describe, it, expect } from 'vitest';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';
import type { AbilityCandidate } from '../../types/abilities';
import { InMemoryAbilityStore } from '../persistence/AbilityStore';
import { seedAbilityLibrary } from './seed';
import { proposeAbility } from './proposalService';

const USER = 'user_test';

/**
 * Mirrors a REAL roster ability field-for-field, so the exact-match path has
 * something in the seeded library to collide with. Derived rather than
 * hand-copied — the previous hand-written copy silently stopped matching the
 * moment the roster changed, and every "exact match" test quietly became a
 * "novel candidate" test that still passed for the wrong reason.
 */
const collide = SEED_ABILITIES.find((a) => a.definition.id === 'ability_oathbreakers_answer')!;
const emberCleaveCandidate: AbilityCandidate = {
  displayName: collide.definition.displayName,
  familyIds: [...collide.definition.familyIds],
  rarity: collide.definition.rarity,
  role: collide.definition.role,
  tags: [...collide.definition.tags],
  descriptionShort: collide.definition.descriptionShort,
  slotType: collide.version.slotType,
  resourceType: collide.version.resourceType,
  resourceCost: collide.version.resourceCost,
  cooldownRounds: collide.version.cooldownRounds,
  targetRule: collide.version.targetRule,
  effects: collide.version.effects,
  triggers: collide.version.triggers,
};

async function seededStore(): Promise<InMemoryAbilityStore> {
  const store = new InMemoryAbilityStore();
  await seedAbilityLibrary(store);
  return store;
}

describe('proposeAbility', () => {
  it('auto-attaches on exact-normalized-match to an existing library entry', async () => {
    const store = await seededStore();
    // Rename Ember Cleave; effects+targets+family stay identical → exact match.
    const cand: AbilityCandidate = { ...emberCleaveCandidate, displayName: 'Fiery Slash' };
    const outcome = proposeAbility(store, { candidate: cand, userId: USER });

    expect(outcome.kind).toBe('attached');
    if (outcome.kind === 'attached') {
      expect(outcome.abilityId).toBe('ability_oathbreakers_answer');
      expect(outcome.wasExactMatch).toBe(true);
      expect(outcome.firstDiscoveryForPlayer).toBe(true);
    }

    const disc = store.getDiscovery('ability_oathbreakers_answer');
    expect(disc).toBeTruthy();
    expect(disc?.playerId).toBe(USER);
    expect(disc?.timesSeen).toBe(1);
  });

  it('bumps timesSeen instead of double-crediting on a second exact-match', async () => {
    const store = await seededStore();
    proposeAbility(store, { candidate: emberCleaveCandidate, userId: USER });
    const second = proposeAbility(store, {
      candidate: { ...emberCleaveCandidate, displayName: 'Burning Slash' },
      userId: USER,
    });

    expect(second.kind).toBe('attached');
    if (second.kind === 'attached') {
      expect(second.firstDiscoveryForPlayer).toBe(false);
    }
    expect(store.getDiscovery('ability_oathbreakers_answer')?.timesSeen).toBe(2);
  });

  it('queues a novel candidate as proposed without attaching to the caller', async () => {
    const store = await seededStore();
    // Genuinely novel against the CURRENT roster. The previous fixture here
    // (martial + direct_damage + apply_status) scored high_similarity against
    // Inherited Guard once the new roster landed — same family, same effect
    // types — so it was queueing WITH a similarity note and failing. Uses the
    // necromancy family, which nothing in the roster touches yet, and an
    // effect set no authored ability shares.
    const novel: AbilityCandidate = {
      displayName: 'Borrowed Vitality',
      familyIds: ['necromancy'],
      rarity: 'uncommon',
      role: 'support',
      tags: ['sustain', 'borrowed'],
      descriptionShort: 'Take what is owed and hand it to someone still standing.',
      slotType: 'signature',
      resourceType: 'mana',
      resourceCost: 2,
      cooldownRounds: 1,
      targetRule: { type: 'single_ally' },
      effects: [
        { type: 'healing', amount: 20 },
        { type: 'shielding', amount: 12, duration: 2 },
        { type: 'resource_gain', resource: 'mana', amount: 2 },
      ],
      triggers: [{ type: 'on_use' }],
    };
    const outcome = proposeAbility(store, { candidate: novel, userId: USER });

    expect(outcome.kind).toBe('queued');
    if (outcome.kind === 'queued') {
      expect(outcome.experimental).toBe(false);
      expect(outcome.similarityNote).toBeUndefined();
      const inLibrary = store.getDefinition(outcome.abilityId);
      expect(inLibrary?.status).toBe('proposed');
    }
    expect(store.getDiscovery('ability_borrowed_vitality')).toBeUndefined();
  });

  it('queues with a similarityNote when close to an existing identity', async () => {
    const store = await seededStore();
    // Ember Cleave shape but target changed to all_enemies + rarity bumped
    // to rare so the AoE-scaled power budget lands in a valid band.
    const cand: AbilityCandidate = {
      ...emberCleaveCandidate,
      displayName: 'Ember Sweep',
      rarity: 'rare',
      targetRule: { type: 'all_enemies' },
    };
    const outcome = proposeAbility(store, { candidate: cand, userId: USER });

    expect(outcome.kind).toBe('queued');
    if (outcome.kind === 'queued') {
      expect(outcome.similarityNote?.nearestAbilityId).toBe('ability_oathbreakers_answer');
      expect(outcome.similarityNote?.overlap).toBeGreaterThan(0.6);
    }
  });

  it('quarantines a candidate that uses an unknown primitive as experimental', async () => {
    const store = await seededStore();
    const cand = {
      ...emberCleaveCandidate,
      effects: [{ type: 'time_reversal', amount: 100 }],
    } as unknown as AbilityCandidate;

    const outcome = proposeAbility(store, { candidate: cand, userId: USER });
    expect(outcome.kind).toBe('queued');
    if (outcome.kind === 'queued') {
      expect(outcome.experimental).toBe(true);
      expect(store.getDefinition(outcome.abilityId)?.status).toBe('experimental');
      expect(store.getVersion(outcome.abilityVersionId)?.status).toBe('experimental');
    }
    expect(store.getDiscovery(outcome.kind === 'queued' ? outcome.abilityId : '')).toBeUndefined();
  });

  it('rejects a validation failure without touching the library', async () => {
    const store = await seededStore();
    const bad = {
      ...emberCleaveCandidate,
      // Invalid rarity band vs power budget: legendary slotted at a very low
      // power budget. But easier: use resource "none" with nonzero cost.
      resourceType: 'none' as const,
      resourceCost: 4,
    };
    const outcome = proposeAbility(store, { candidate: bad, userId: USER });

    expect(outcome.kind).toBe('rejected');
    if (outcome.kind === 'rejected') {
      expect(outcome.errors.length).toBeGreaterThan(0);
    }
    // Library shouldn't have grown.
    expect(store.getAllDefinitions().length).toBe(SEED_ABILITIES.length);
  });
});
