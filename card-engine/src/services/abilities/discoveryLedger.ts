import type { AbilityStore } from '../persistence/AbilityStore';
import { getDiscoveryRewardForRarity } from '../../data/economy/rewardCatalog';
import * as wallet from '../economy/walletService';

/**
 * Discovery reward wiring — routes the "player just discovered a new
 * ability" event through the existing wallet + ledger so idempotency +
 * audit live in one place.
 *
 * Rules (per Master Plan §19 + spec §6.1):
 *   - Reward fires ONCE per (playerId, abilityId). Enforced by the
 *     discovery record's `rewardGranted` flag.
 *   - When the catalog value is 0 (pre-approval placeholder), the
 *     discovery record still updates but no ledger transaction is written.
 *   - When the value is positive, walletService.grantReward creates a
 *     committed reward transaction and its id is FK-linked back onto
 *     the discovery row via rewardTransactionId.
 *
 * Callers (CardForge, tierUp, later admin promote-experimental flow)
 * invoke this AFTER proposalService returns {kind: 'attached',
 * firstDiscoveryForPlayer: true}. It's safe to call at any other time —
 * the idempotency guard makes it a no-op.
 */

export interface GrantedItem {
  currency: 'premium' | 'gameplay';
  amount: number;
  transactionId: string;
}

export type DiscoveryRewardOutcome =
  | { kind: 'granted'; items: GrantedItem[] }
  | { kind: 'already_granted' }
  | { kind: 'no_discovery_record' }
  | { kind: 'zero_value_placeholder'; rewardId: string }
  | { kind: 'no_reward_for_rarity'; rarity: string };

export function grantDiscoveryReward(
  store: AbilityStore,
  abilityId: string,
): DiscoveryRewardOutcome {
  const disc = store.getDiscovery(abilityId);
  if (!disc) return { kind: 'no_discovery_record' };
  if (disc.rewardGranted) return { kind: 'already_granted' };

  const def = store.getDefinition(abilityId);
  if (!def) return { kind: 'no_discovery_record' };

  const reward = getDiscoveryRewardForRarity(def.rarity);
  if (!reward) return { kind: 'no_reward_for_rarity', rarity: def.rarity };

  // Only fire transactions for positive-amount items. Zero-value items get
  // skipped silently — this lets us mix a rewarded currency + a paused one
  // without changing the discovery event.
  const payable = reward.guaranteed.filter((item) => item.amount > 0);
  if (payable.length === 0) {
    // All-zero reward = pre-approval placeholder. Record the discovery
    // event but don't mark rewardGranted so a later value bump can retry.
    store.saveDiscovery({ ...disc, rewardGranted: false });
    return { kind: 'zero_value_placeholder', rewardId: reward.rewardId };
  }

  const items: GrantedItem[] = payable.map((item) => {
    const txn = wallet.grantReward({
      currency: item.currency,
      amount: item.amount,
      rewardId: reward.rewardId,
      metadata: {
        abilityId,
        abilityRarity: def.rarity,
        firstDiscoveredGlobally: disc.firstDiscoveredGlobally,
      },
    });
    return { currency: item.currency, amount: item.amount, transactionId: txn.transactionId };
  });

  // Discovery record carries the FIRST reward txn id as the primary link.
  // Additional txns are still queryable from the ledger via
  // rewardId + metadata.abilityId — no schema change needed.
  store.saveDiscovery({
    ...disc,
    rewardGranted: true,
    rewardTransactionId: items[0].transactionId,
  });

  return { kind: 'granted', items };
}
