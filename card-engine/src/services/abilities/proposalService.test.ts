import { describe, it, expect } from 'vitest';
import type { AbilityCandidate } from '../../types/abilities';
import { InMemoryAbilityStore } from '../persistence/AbilityStore';
import { seedAbilityLibrary } from './seed';
import { proposeAbility } from './proposalService';

const USER = 'user_test';

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
      expect(outcome.abilityId).toBe('ability_ember_cleave');
      expect(outcome.wasExactMatch).toBe(true);
      expect(outcome.firstDiscoveryForPlayer).toBe(true);
    }

    const disc = store.getDiscovery('ability_ember_cleave');
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
    expect(store.getDiscovery('ability_ember_cleave')?.timesSeen).toBe(2);
  });

  it('queues a novel candidate as proposed without attaching to the caller', async () => {
    const store = await seededStore();
    // Distinct family + effect set from every seed → novel and in-band.
    const novel: AbilityCandidate = {
      displayName: 'Marking Strike',
      familyIds: ['martial'],
      rarity: 'uncommon',
      role: 'damage',
      tags: ['mark', 'expose'],
      descriptionShort: 'Strike a foe and leave them exposed for allies.',
      slotType: 'signature',
      resourceType: 'mana',
      resourceCost: 2,
      cooldownRounds: 1,
      targetRule: { type: 'single_enemy' },
      effects: [
        { type: 'direct_damage', amount: 15, damageType: 'physical' },
        { type: 'apply_status', status: { statusId: 'mark', duration: 2 } },
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
    expect(store.getDiscovery('ability_marking_strike')).toBeUndefined();
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
      expect(outcome.similarityNote?.nearestAbilityId).toBe('ability_ember_cleave');
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
    expect(store.getAllDefinitions().length).toBe(5);
  });
});
