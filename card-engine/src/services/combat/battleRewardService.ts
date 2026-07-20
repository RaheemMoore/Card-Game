import * as wallet from '../economy/walletService';
import * as ledger from '../economy/transactionLedger';
import { getBossReward } from '../../data/economy/rewardCatalog';

/**
 * Battle reward wiring. Idempotency lives in the ledger — every grant
 * carries `metadata.battleId`, and we scan for existing transactions with
 * the same battleId before firing new ones.
 *
 * First-clear vs repeat is decided by scanning the ledger for any prior
 * `rewardId = boss_${bossId}_first_clear` transaction. If none exists,
 * this attempt is the first clear and gets the bonus tier; otherwise it
 * gets the repeat tier.
 *
 * Defeat and abandon grant nothing at B5.
 */

export interface GrantedItem {
  currency: 'premium' | 'gameplay';
  amount: number;
  transactionId: string;
}

export type BattleRewardOutcome =
  | { kind: 'granted'; tier: 'first_clear' | 'repeat'; items: GrantedItem[] }
  | { kind: 'already_granted'; tier: 'first_clear' | 'repeat'; items: GrantedItem[] }
  | { kind: 'no_reward'; reason: 'defeat' | 'abandoned' | 'unknown_boss' | 'zero_value' };

export interface GrantBattleRewardInput {
  battleId: string;
  bossId: string;
  outcome: 'victory' | 'defeat' | 'abandoned';
  roundsElapsed: number;
  /**
   * Ledger transactionId of the Gold entry cost paid to start this battle.
   * When present, it's mirrored into every reward row's metadata so
   * analytics can join entry → reward 1:1. Optional — historical battles
   * pre-C8 have no entry cost.
   */
  entryTxnId?: string;
}

/**
 * Idempotent. Safe to call multiple times for the same battleId — subsequent
 * calls return `already_granted` with the same items.
 */
export function grantBattleReward(input: GrantBattleRewardInput): BattleRewardOutcome {
  if (input.outcome === 'defeat') return { kind: 'no_reward', reason: 'defeat' };
  if (input.outcome === 'abandoned') return { kind: 'no_reward', reason: 'abandoned' };

  // Idempotency check: any existing txns for this battleId? If so, return them.
  const existing = ledger.all().filter(
    (t) => t.metadata && (t.metadata as Record<string, unknown>).battleId === input.battleId,
  );
  if (existing.length > 0) {
    const firstClear = existing.some(
      (t) => t.rewardId === `boss_${input.bossId}_first_clear`,
    );
    return {
      kind: 'already_granted',
      tier: firstClear ? 'first_clear' : 'repeat',
      items: existing.map((t) => ({
        currency: t.currency,
        amount: t.amount,
        transactionId: t.transactionId,
      })),
    };
  }

  // Decide first-clear vs repeat by scanning history.
  const priorFirstClear = ledger.all().some(
    (t) => t.rewardId === `boss_${input.bossId}_first_clear`,
  );
  const tier: 'first_clear' | 'repeat' = priorFirstClear ? 'repeat' : 'first_clear';

  const reward = getBossReward(input.bossId, tier);
  if (!reward) return { kind: 'no_reward', reason: 'unknown_boss' };

  const payable = reward.guaranteed.filter((item) => item.amount > 0);
  if (payable.length === 0) return { kind: 'no_reward', reason: 'zero_value' };

  const items: GrantedItem[] = payable.map((item) => {
    const txn = wallet.grantReward({
      currency: item.currency,
      amount: item.amount,
      rewardId: reward.rewardId,
      metadata: {
        battleId: input.battleId,
        bossId: input.bossId,
        roundsElapsed: input.roundsElapsed,
        tier,
        ...(input.entryTxnId ? { entryTxnId: input.entryTxnId } : {}),
      },
    });
    return { currency: item.currency, amount: item.amount, transactionId: txn.transactionId };
  });

  return { kind: 'granted', tier, items };
}
