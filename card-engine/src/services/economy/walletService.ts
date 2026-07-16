import type {
  CurrencyId,
  EconomyTransaction,
  TransactionStatus,
  TransactionType,
  Wallet,
} from '../../types/economy';
import { DEMO_SEED_REASON, DEMO_STARTING_BALANCES } from '../../data/economy/assumptions';
import * as ledger from './transactionLedger';

export class InsufficientFundsError extends Error {
  constructor(
    public readonly currency: CurrencyId,
    public readonly required: number,
    public readonly available: number,
  ) {
    super(
      `Insufficient ${currency} funds: need ${required}, have ${available}.`,
    );
    this.name = 'InsufficientFundsError';
  }
}

export class TransactionNotFoundError extends Error {
  constructor(public readonly transactionId: string) {
    super(`Transaction ${transactionId} not found.`);
    this.name = 'TransactionNotFoundError';
  }
}

export class TransactionStateError extends Error {
  constructor(
    public readonly transactionId: string,
    public readonly currentStatus: TransactionStatus,
    public readonly attemptedTransition: string,
  ) {
    super(
      `Cannot ${attemptedTransition} transaction ${transactionId}: current status is ${currentStatus}.`,
    );
    this.name = 'TransactionStateError';
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify(): void {
  for (const fn of listeners) fn();
}

function newTxnId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `txn_${crypto.randomUUID()}`;
  }
  return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Balance = sum of `amount` for all transactions in {pending, committed}.
// Reservations (pending, negative amount) reduce apparent balance so a rapid
// second reserve can't overspend the wallet.
export function getBalance(currency: CurrencyId): number {
  let sum = 0;
  for (const t of ledger.all()) {
    if (t.currency !== currency) continue;
    if (t.status === 'pending' || t.status === 'committed') {
      sum += t.amount;
    }
  }
  return sum;
}

export function getWallet(): Wallet {
  return {
    premium: getBalance('premium'),
    gameplay: getBalance('gameplay'),
    updatedAt: nowIso(),
  };
}

// Seed demo balances if the ledger has never been populated. Idempotent —
// subsequent calls after seeding do nothing.
export function initialize(): void {
  if (!ledger.isEmpty()) return;

  const at = nowIso();
  for (const currency of ['premium', 'gameplay'] as const) {
    const amount = DEMO_STARTING_BALANCES[currency];
    if (amount <= 0) continue;
    const txn: EconomyTransaction = {
      transactionId: newTxnId(),
      currency,
      amount,
      type: 'admin_adjustment',
      status: 'committed',
      balanceBefore: 0,
      balanceAfter: amount,
      createdAt: at,
      completedAt: at,
      metadata: { reason: DEMO_SEED_REASON },
    };
    ledger.append(txn);
  }
  notify();
}

export interface ReserveInput {
  currency: CurrencyId;
  amount: number;
  actionId?: string;
  cardId?: string;
  type?: TransactionType;
  metadata?: EconomyTransaction['metadata'];
}

export function reserve(input: ReserveInput): EconomyTransaction {
  if (input.amount <= 0) {
    throw new Error(`reserve() amount must be positive; got ${input.amount}.`);
  }
  const available = getBalance(input.currency);
  if (available < input.amount) {
    throw new InsufficientFundsError(input.currency, input.amount, available);
  }
  const balanceBefore = available;
  const at = nowIso();
  const txn: EconomyTransaction = {
    transactionId: newTxnId(),
    currency: input.currency,
    amount: -input.amount,
    type: input.type ?? 'spend',
    actionId: input.actionId,
    cardId: input.cardId,
    status: 'pending',
    balanceBefore,
    balanceAfter: balanceBefore - input.amount,
    createdAt: at,
    metadata: input.metadata,
  };
  ledger.append(txn);
  notify();
  return txn;
}

export function commit(transactionId: string): EconomyTransaction {
  const txn = ledger.byId(transactionId);
  if (!txn) throw new TransactionNotFoundError(transactionId);
  if (txn.status !== 'pending') {
    throw new TransactionStateError(transactionId, txn.status, 'commit');
  }
  const updated = ledger.updateStatus(transactionId, {
    status: 'committed',
    completedAt: nowIso(),
  });
  notify();
  return updated!;
}

export function refund(transactionId: string, reason: string): EconomyTransaction {
  const txn = ledger.byId(transactionId);
  if (!txn) throw new TransactionNotFoundError(transactionId);
  if (txn.status !== 'pending' && txn.status !== 'committed') {
    throw new TransactionStateError(transactionId, txn.status, 'refund');
  }
  const at = nowIso();
  // Mark the original as refunded so it no longer counts toward balance...
  ledger.updateStatus(transactionId, {
    status: 'refunded',
    completedAt: at,
    metadata: { refundReason: reason },
  });
  // ...and append a paired refund record for audit clarity.
  const refundTxn: EconomyTransaction = {
    transactionId: newTxnId(),
    currency: txn.currency,
    amount: 0,
    type: 'refund',
    actionId: txn.actionId,
    cardId: txn.cardId,
    status: 'committed',
    balanceBefore: getBalance(txn.currency),
    balanceAfter: getBalance(txn.currency),
    createdAt: at,
    completedAt: at,
    metadata: {
      originalTransactionId: transactionId,
      reason,
    },
  };
  ledger.append(refundTxn);
  notify();
  return refundTxn;
}

export interface GrantRewardInput {
  currency: CurrencyId;
  amount: number;
  rewardId: string;
  metadata?: EconomyTransaction['metadata'];
}

export function grantReward(input: GrantRewardInput): EconomyTransaction {
  if (input.amount <= 0) {
    throw new Error(`grantReward() amount must be positive; got ${input.amount}.`);
  }
  const balanceBefore = getBalance(input.currency);
  const at = nowIso();
  const txn: EconomyTransaction = {
    transactionId: newTxnId(),
    currency: input.currency,
    amount: input.amount,
    type: 'reward',
    rewardId: input.rewardId,
    status: 'committed',
    balanceBefore,
    balanceAfter: balanceBefore + input.amount,
    createdAt: at,
    completedAt: at,
    metadata: input.metadata,
  };
  ledger.append(txn);
  notify();
  return txn;
}

// Dev-only. Wipes the ledger and reseeds demo balances. Never call from
// production paths.
export function resetForDev(): void {
  ledger.resetForDev();
  initialize();
  notify();
}

// Sanity check: sum of all committed activity vs. current derived balance.
// Returns null if consistent, or the two values if a drift is detected.
export function auditBalance(currency: CurrencyId): null | { derived: number; ledgerSum: number } {
  const derived = getBalance(currency);
  const ledgerSum = ledger
    .all()
    .filter((t) => t.currency === currency && (t.status === 'pending' || t.status === 'committed'))
    .reduce((s, t) => s + t.amount, 0);
  return derived === ledgerSum ? null : { derived, ledgerSum };
}
