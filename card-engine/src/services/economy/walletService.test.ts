import { describe, it, expect, beforeEach } from 'vitest';
import * as wallet from './walletService';
import * as ledger from './transactionLedger';
import { InMemoryLedgerStore } from './transactionLedger';
import { DEMO_STARTING_BALANCES } from '../../data/economy/assumptions';

beforeEach(() => {
  ledger.setStore(new InMemoryLedgerStore());
});

describe('initialize', () => {
  it('seeds demo balances on a fresh ledger', () => {
    wallet.initialize();
    expect(wallet.getBalance('premium')).toBe(DEMO_STARTING_BALANCES.premium);
    expect(wallet.getBalance('gameplay')).toBe(DEMO_STARTING_BALANCES.gameplay);
  });

  it('is idempotent (a second call does not re-seed)', () => {
    wallet.initialize();
    wallet.initialize();
    expect(wallet.getBalance('premium')).toBe(DEMO_STARTING_BALANCES.premium);
  });
});

describe('reserve → commit', () => {
  it('reserves reduce visible balance immediately', () => {
    wallet.initialize();
    const before = wallet.getBalance('premium');
    wallet.reserve({ currency: 'premium', amount: 20, actionId: 'forge_card' });
    expect(wallet.getBalance('premium')).toBe(before - 20);
  });

  it('commit finalizes without further balance movement', () => {
    wallet.initialize();
    const before = wallet.getBalance('premium');
    const txn = wallet.reserve({ currency: 'premium', amount: 20 });
    wallet.commit(txn.transactionId);
    expect(wallet.getBalance('premium')).toBe(before - 20);
  });

  it('committed transactions cannot be committed again', () => {
    wallet.initialize();
    const txn = wallet.reserve({ currency: 'premium', amount: 20 });
    wallet.commit(txn.transactionId);
    expect(() => wallet.commit(txn.transactionId)).toThrow(wallet.TransactionStateError);
  });
});

describe('reserve → refund', () => {
  it('restores the reserved amount', () => {
    wallet.initialize();
    const before = wallet.getBalance('premium');
    const txn = wallet.reserve({ currency: 'premium', amount: 20 });
    wallet.refund(txn.transactionId, 'leonardo_failed');
    expect(wallet.getBalance('premium')).toBe(before);
  });

  it('appends a paired refund transaction for audit', () => {
    wallet.initialize();
    const txn = wallet.reserve({ currency: 'premium', amount: 20 });
    const refundTxn = wallet.refund(txn.transactionId, 'leonardo_failed');
    expect(refundTxn.type).toBe('refund');
    expect(refundTxn.metadata?.originalTransactionId).toBe(txn.transactionId);
    expect(refundTxn.metadata?.reason).toBe('leonardo_failed');
  });
});

describe('insufficient funds', () => {
  it('rejects reservations larger than the balance', () => {
    wallet.initialize();
    const balance = wallet.getBalance('premium');
    expect(() =>
      wallet.reserve({ currency: 'premium', amount: balance + 1 }),
    ).toThrow(wallet.InsufficientFundsError);
  });

  it('back-to-back reserves cannot overspend', () => {
    wallet.initialize();
    const balance = wallet.getBalance('premium');
    // First reserve consumes all funds
    wallet.reserve({ currency: 'premium', amount: balance });
    // Second must fail because pending reduces available balance
    expect(() =>
      wallet.reserve({ currency: 'premium', amount: 1 }),
    ).toThrow(wallet.InsufficientFundsError);
  });
});

describe('grantReward', () => {
  it('increases the balance and records the rewardId', () => {
    wallet.initialize();
    const before = wallet.getBalance('gameplay');
    const txn = wallet.grantReward({
      currency: 'gameplay',
      amount: 100,
      rewardId: 'test_reward_v1',
    });
    expect(wallet.getBalance('gameplay')).toBe(before + 100);
    expect(txn.rewardId).toBe('test_reward_v1');
    expect(txn.status).toBe('committed');
  });
});

describe('auditBalance', () => {
  it('returns null when derived balance matches ledger sum', () => {
    wallet.initialize();
    wallet.reserve({ currency: 'premium', amount: 20 });
    expect(wallet.auditBalance('premium')).toBeNull();
  });
});

describe('input validation', () => {
  it('rejects non-positive reserve amounts', () => {
    wallet.initialize();
    expect(() => wallet.reserve({ currency: 'premium', amount: 0 })).toThrow();
    expect(() => wallet.reserve({ currency: 'premium', amount: -5 })).toThrow();
  });

  it('rejects non-positive reward amounts', () => {
    expect(() =>
      wallet.grantReward({ currency: 'gameplay', amount: 0, rewardId: 'x' }),
    ).toThrow();
  });

  it('throws when committing an unknown transaction', () => {
    expect(() => wallet.commit('does_not_exist')).toThrow(wallet.TransactionNotFoundError);
  });
});
