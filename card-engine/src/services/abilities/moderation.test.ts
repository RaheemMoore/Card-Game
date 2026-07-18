import { describe, it, expect } from 'vitest';
import { InMemoryAbilityStore } from '../persistence/AbilityStore';
import { seedAbilityLibrary } from './seed';
import { proposeAbility } from './proposalService';
import {
  approveAbility,
  rejectAbility,
  mergeAbility,
  computeAnalytics,
  listReviewQueue,
} from './moderation';
import type { AbilityCandidate } from '../../types/abilities';

const now = '2026-07-18T12:00:00.000Z';

async function storeWithProposed(): Promise<InMemoryAbilityStore> {
  const store = new InMemoryAbilityStore();
  await seedAbilityLibrary(store);
  const cand: AbilityCandidate = {
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
  proposeAbility(store, { candidate: cand, userId: 'user_test' });
  return store;
}

describe('approveAbility', () => {
  it('promotes a proposed ability to approved (both def + current version)', async () => {
    const store = await storeWithProposed();
    const proposed = listReviewQueue(store)[0];
    expect(proposed.status).toBe('proposed');

    const result = await approveAbility(store, proposed.id, now);
    expect(result.kind).toBe('ok');
    expect(store.getDefinition(proposed.id)?.status).toBe('approved');
    expect(store.getCurrentVersion(proposed.id)?.status).toBe('approved');
    expect(store.getCurrentVersion(proposed.id)?.publishedAt).toBe(now);
  });

  it('no-ops on an already-approved ability', async () => {
    const store = await storeWithProposed();
    const result = await approveAbility(store, 'ability_ember_cleave');
    expect(result.kind).toBe('no_op');
  });

  it('rejects approval on a merged identity', async () => {
    const store = await storeWithProposed();
    const proposed = listReviewQueue(store)[0];
    await mergeAbility(store, proposed.id, 'ability_ember_cleave');

    const result = await approveAbility(store, proposed.id);
    expect(result.kind).toBe('invalid');
  });
});

describe('rejectAbility', () => {
  it('marks def + current version as deprecated', async () => {
    const store = await storeWithProposed();
    const proposed = listReviewQueue(store)[0];
    const result = await rejectAbility(store, proposed.id, 'redundant mechanic', now);
    expect(result.kind).toBe('ok');
    expect(store.getDefinition(proposed.id)?.status).toBe('deprecated');
    expect(store.getCurrentVersion(proposed.id)?.status).toBe('deprecated');
    expect(store.getCurrentVersion(proposed.id)?.deprecatedAt).toBe(now);
    expect(store.getDefinition(proposed.id)?.descriptionLong).toContain('[deprecated');
  });

  it('is idempotent on already-deprecated', async () => {
    const store = await storeWithProposed();
    const proposed = listReviewQueue(store)[0];
    await rejectAbility(store, proposed.id);
    const second = await rejectAbility(store, proposed.id);
    expect(second.kind).toBe('no_op');
  });
});

describe('mergeAbility', () => {
  it('marks source merged and links mergedIntoAbilityId', async () => {
    const store = await storeWithProposed();
    const proposed = listReviewQueue(store)[0];
    const result = await mergeAbility(store, proposed.id, 'ability_ember_cleave', now);
    expect(result.kind).toBe('ok');
    const src = store.getDefinition(proposed.id);
    expect(src?.status).toBe('merged');
    expect(src?.mergedIntoAbilityId).toBe('ability_ember_cleave');
    // Target unchanged.
    expect(store.getDefinition('ability_ember_cleave')?.status).toBe('approved');
  });

  it('rejects self-merge', async () => {
    const store = await storeWithProposed();
    const result = await mergeAbility(store, 'ability_ember_cleave', 'ability_ember_cleave');
    expect(result.kind).toBe('invalid');
  });

  it('rejects merging into a non-approved target', async () => {
    const store = await storeWithProposed();
    const proposed = listReviewQueue(store)[0];
    const other = store.getAllDefinitions().find((d) => d.id !== proposed.id && d.status === 'proposed');
    if (!other) {
      // Only one proposed in this seed; craft a synthetic one for the assertion.
      await store.saveDefinition({ ...proposed, id: 'ability_synth', slug: 'synth', updatedAt: now });
      const result = await mergeAbility(store, 'ability_synth', proposed.id);
      expect(result.kind).toBe('invalid');
      return;
    }
    const result = await mergeAbility(store, proposed.id, other.id);
    expect(result.kind).toBe('invalid');
  });
});

describe('computeAnalytics', () => {
  it('counts by status + families', async () => {
    const store = await storeWithProposed();
    const analytics = computeAnalytics(store);
    expect(analytics.totalDefinitions).toBe(6); // 5 seeds + 1 proposed
    expect(analytics.approvedCount).toBe(5);
    expect(analytics.proposedCount).toBe(1);
    expect(analytics.perFamily.find((f) => f.familyId === 'martial')?.approved).toBe(1);
  });
});

describe('listReviewQueue', () => {
  it('lists only proposed + experimental, sorted by createdAt', async () => {
    const store = await storeWithProposed();
    const queue = listReviewQueue(store);
    expect(queue.length).toBe(1);
    expect(queue[0].status).toBe('proposed');
  });
});
