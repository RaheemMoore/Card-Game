import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAbilityStore } from '../persistence/AbilityStore';
import { seedAbilityLibrary } from './seed';
import { grantDiscoveryReward } from './discoveryLedger';
import { REWARD_CATALOG } from '../../data/economy/rewardCatalog';
import * as wallet from '../economy/walletService';
import * as ledger from '../economy/transactionLedger';
import { InMemoryLedgerStore } from '../economy/transactionLedger';

const USER = 'user_test_a6';

async function seededStore(): Promise<InMemoryAbilityStore> {
  const store = new InMemoryAbilityStore();
  await seedAbilityLibrary(store);
  return store;
}

function discovery(abilityId: string, playerId: string) {
  return {
    playerId,
    abilityId,
    discoveredAt: '2026-07-18T00:00:00.000Z',
    firstDiscoveredGlobally: true,
    timesSeen: 1,
    timesOwnedOnCards: 0,
    rewardGranted: false,
  };
}

describe('grantDiscoveryReward', () => {
  beforeEach(() => {
    ledger.setStore(new InMemoryLedgerStore());
    wallet.initialize();
  });

  it('returns no_discovery_record when the player has never seen the ability', async () => {
    const store = await seededStore();
    const result = grantDiscoveryReward(store, 'ability_ember_cleave');
    expect(result.kind).toBe('no_discovery_record');
  });

  it('grants BOTH gold + crystals per rarity ladder (uncommon = 100g + 30c)', async () => {
    const store = await seededStore();
    store.saveDiscovery(discovery('ability_ember_cleave', USER));

    const goldBefore = wallet.getBalance('gameplay');
    const crystalsBefore = wallet.getBalance('premium');

    const result = grantDiscoveryReward(store, 'ability_ember_cleave');
    expect(result.kind).toBe('granted');
    if (result.kind === 'granted') {
      expect(result.items).toHaveLength(2);
      const gold = result.items.find((i) => i.currency === 'gameplay');
      const crystals = result.items.find((i) => i.currency === 'premium');
      expect(gold?.amount).toBe(100);
      expect(crystals?.amount).toBe(30);
    }

    expect(wallet.getBalance('gameplay')).toBe(goldBefore + 100);
    expect(wallet.getBalance('premium')).toBe(crystalsBefore + 30);

    const disc = store.getDiscovery('ability_ember_cleave');
    expect(disc?.rewardGranted).toBe(true);
    expect(disc?.rewardTransactionId).toBeTruthy();
  });

  it('is idempotent — a second call after grant is a no-op', async () => {
    const store = await seededStore();
    store.saveDiscovery(discovery('ability_thornbite', USER));
    grantDiscoveryReward(store, 'ability_thornbite');
    const goldAfterFirst = wallet.getBalance('gameplay');
    const crystalsAfterFirst = wallet.getBalance('premium');

    const second = grantDiscoveryReward(store, 'ability_thornbite');
    expect(second.kind).toBe('already_granted');
    expect(wallet.getBalance('gameplay')).toBe(goldAfterFirst);
    expect(wallet.getBalance('premium')).toBe(crystalsAfterFirst);
  });

  it('skips wallet entirely when all guaranteed items are zero-amount', async () => {
    const store = await seededStore();
    // Temporarily zero out the common reward.
    const rewardDef = REWARD_CATALOG.ability_discovery_common;
    const originalAmounts = rewardDef.guaranteed.map((g) => g.amount);
    rewardDef.guaranteed.forEach((g) => (g.amount = 0));
    try {
      store.saveDiscovery(discovery('ability_thornbite', USER));
      const goldBefore = wallet.getBalance('gameplay');
      const crystalsBefore = wallet.getBalance('premium');

      const result = grantDiscoveryReward(store, 'ability_thornbite');
      expect(result.kind).toBe('zero_value_placeholder');
      expect(wallet.getBalance('gameplay')).toBe(goldBefore);
      expect(wallet.getBalance('premium')).toBe(crystalsBefore);
      // rewardGranted stays false so a future value bump can retry.
      expect(store.getDiscovery('ability_thornbite')?.rewardGranted).toBe(false);
    } finally {
      rewardDef.guaranteed.forEach((g, i) => (g.amount = originalAmounts[i]));
    }
  });
});

describe('reward catalog governance', () => {
  const APPROVED = {
    common:    { gold:  50, crystals:  20 },
    uncommon:  { gold: 100, crystals:  30 },
    rare:      { gold: 150, crystals:  50 },
    legendary: { gold: 300, crystals:  80 },
    mythic:    { gold: 600, crystals: 150 },
  };

  it('discovery reward ladder matches Raheem-approved values (2026-07-18)', () => {
    // Guardrail: any value change here needs a new Raheem approval per §13.
    // If the values change, update APPROVED above in the SAME commit that
    // changes REWARD_CATALOG and cite the new approval date.
    for (const rarity of ['common', 'uncommon', 'rare', 'legendary', 'mythic'] as const) {
      const reward = REWARD_CATALOG[`ability_discovery_${rarity}`];
      expect(reward, `reward for ${rarity}`).toBeTruthy();
      expect(reward.mode).toBe('milestone');
      expect(reward.limits?.firstClearOnly).toBe(true);
      const gold = reward.guaranteed.find((g) => g.currency === 'gameplay');
      const crystals = reward.guaranteed.find((g) => g.currency === 'premium');
      expect(gold?.amount, `gold for ${rarity}`).toBe(APPROVED[rarity].gold);
      expect(crystals?.amount, `crystals for ${rarity}`).toBe(APPROVED[rarity].crystals);
    }
  });
});
