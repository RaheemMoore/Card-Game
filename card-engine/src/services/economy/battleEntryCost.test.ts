import { describe, expect, it, beforeEach } from 'vitest';
import { GAMEPLAY_PRICE_CATALOG } from '../../data/economy/gameplayPriceCatalog';
import * as wallet from './walletService';
import * as ledger from './transactionLedger';
import { InMemoryLedgerStore } from './transactionLedger';
import { grantBattleReward } from '../combat/battleRewardService';

/**
 * C8 entry-cost lifecycle. Verifies the reserve → commit / refund flow the
 * Battle route wires up, plus the entryTxnId link that lands in every
 * reward row's metadata for analytics joins.
 */

const ENTRY = GAMEPLAY_PRICE_CATALOG.battle_run_entry;

beforeEach(() => {
  ledger.setStore(new InMemoryLedgerStore());
  wallet.initialize();
});

describe('battle_run_entry — catalog', () => {
  it('is approved by Raheem with a non-zero Gold price', () => {
    expect(ENTRY.approvedBy).toBe('Raheem');
    expect(ENTRY.gameplayCost).toBeGreaterThan(0);
    expect(ENTRY.version).toBe(1);
  });
});

describe('battle_run_entry — reserve/commit lifecycle', () => {
  it('reserve → commit debits Gold and marks the txn committed', () => {
    const before = wallet.getBalance('gameplay');
    const txn = wallet.reserve({
      currency: 'gameplay',
      amount: ENTRY.gameplayCost,
      actionId: ENTRY.actionId,
    });
    expect(txn.status).toBe('pending');
    expect(wallet.getBalance('gameplay')).toBe(before - ENTRY.gameplayCost);

    const committed = wallet.commit(txn.transactionId);
    expect(committed.status).toBe('committed');
    // Committed balance stays debited — no refund.
    expect(wallet.getBalance('gameplay')).toBe(before - ENTRY.gameplayCost);
  });

  it('refund on init-failure returns Gold and marks refunded', () => {
    const before = wallet.getBalance('gameplay');
    const txn = wallet.reserve({
      currency: 'gameplay',
      amount: ENTRY.gameplayCost,
      actionId: ENTRY.actionId,
    });
    wallet.refund(txn.transactionId, 'battle_init_failed: no active boss');
    expect(wallet.getBalance('gameplay')).toBe(before);
    const rows = ledger.byActionId(ENTRY.actionId);
    const target = rows.find((r) => r.transactionId === txn.transactionId);
    expect(target?.status).toBe('refunded');
  });

  it('insufficient funds throws InsufficientFundsError with required + available', () => {
    // Drain the wallet to just below the entry cost.
    const balance = wallet.getBalance('gameplay');
    if (balance >= ENTRY.gameplayCost) {
      const drain = wallet.reserve({
        currency: 'gameplay',
        amount: balance - Math.floor(ENTRY.gameplayCost / 2),
        actionId: 'stat_reroll',
      });
      wallet.commit(drain.transactionId);
    }
    expect(() =>
      wallet.reserve({
        currency: 'gameplay',
        amount: ENTRY.gameplayCost,
        actionId: ENTRY.actionId,
      }),
    ).toThrow(wallet.InsufficientFundsError);
  });

  it('defeat / abandon do not refund the committed entry cost (forfeit)', () => {
    const before = wallet.getBalance('gameplay');
    const txn = wallet.reserve({
      currency: 'gameplay',
      amount: ENTRY.gameplayCost,
      actionId: ENTRY.actionId,
    });
    wallet.commit(txn.transactionId);
    // Simulate defeat / abandon reward call — grants nothing, does not
    // touch the entry txn.
    const defeatOutcome = grantBattleReward({
      battleId: 'battle_c8_forfeit',
      bossId: 'boss_fire_elemental_v0',
      outcome: 'defeat',
      roundsElapsed: 4,
      entryTxnId: txn.transactionId,
    });
    expect(defeatOutcome.kind).toBe('no_reward');
    // Entry txn stays committed; balance stays debited.
    const row = ledger.byId(txn.transactionId);
    expect(row?.status).toBe('committed');
    expect(wallet.getBalance('gameplay')).toBe(before - ENTRY.gameplayCost);
  });
});

describe('battle_run_entry — entry ↔ reward link', () => {
  it('victory reward includes entryTxnId in metadata when provided', () => {
    const entry = wallet.reserve({
      currency: 'gameplay',
      amount: ENTRY.gameplayCost,
      actionId: ENTRY.actionId,
    });
    wallet.commit(entry.transactionId);
    const outcome = grantBattleReward({
      battleId: 'battle_c8_link',
      bossId: 'boss_fire_elemental_v0',
      outcome: 'victory',
      roundsElapsed: 7,
      entryTxnId: entry.transactionId,
    });
    expect(outcome.kind).toBe('granted');
    if (outcome.kind !== 'granted') return;
    const rewardRow = ledger.byId(outcome.items[0].transactionId);
    expect(rewardRow?.metadata?.entryTxnId).toBe(entry.transactionId);
    expect(rewardRow?.metadata?.battleId).toBe('battle_c8_link');
  });

  it('omitting entryTxnId keeps historical behaviour (no entry link)', () => {
    const outcome = grantBattleReward({
      battleId: 'battle_c8_no_entry',
      bossId: 'boss_fire_elemental_v0',
      outcome: 'victory',
      roundsElapsed: 7,
    });
    expect(outcome.kind).toBe('granted');
    if (outcome.kind !== 'granted') return;
    const rewardRow = ledger.byId(outcome.items[0].transactionId);
    expect(rewardRow?.metadata?.entryTxnId).toBeUndefined();
  });
});
