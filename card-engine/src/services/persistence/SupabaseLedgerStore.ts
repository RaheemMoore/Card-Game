import type { EconomyTransaction } from '../../types/economy';
import type { LedgerStore } from '../economy/transactionLedger';
import { getSupabaseClient, getCurrentUserId } from './supabaseClient';
import { enqueue, registerHandler } from './SyncQueue';

// Wire shape: snake_case columns matching the economy_transactions table.
interface TxnRow {
  transaction_id: string;
  user_id: string;
  currency: string;
  amount: number;
  type: string;
  status: string;
  action_id: string | null;
  card_id: string | null;
  reward_id: string | null;
  balance_before: number;
  balance_after: number;
  sequence: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

function toRow(t: EconomyTransaction, userId: string): TxnRow {
  return {
    transaction_id: t.transactionId,
    user_id: userId,
    currency: t.currency,
    amount: t.amount,
    type: t.type,
    status: t.status,
    action_id: t.actionId ?? null,
    card_id: t.cardId ?? null,
    reward_id: t.rewardId ?? null,
    balance_before: t.balanceBefore,
    balance_after: t.balanceAfter,
    sequence: t.sequence,
    metadata: t.metadata ?? null,
    created_at: t.createdAt,
    completed_at: t.completedAt ?? null,
  };
}

function fromRow(r: TxnRow): EconomyTransaction {
  return {
    transactionId: r.transaction_id,
    currency: r.currency as EconomyTransaction['currency'],
    amount: Number(r.amount),
    type: r.type as EconomyTransaction['type'],
    status: r.status as EconomyTransaction['status'],
    actionId: r.action_id ?? undefined,
    cardId: r.card_id ?? undefined,
    rewardId: r.reward_id ?? undefined,
    balanceBefore: Number(r.balance_before),
    balanceAfter: Number(r.balance_after),
    sequence: Number(r.sequence),
    createdAt: r.created_at,
    completedAt: r.completed_at ?? undefined,
    metadata: r.metadata as EconomyTransaction['metadata'],
  };
}

// Signatures that change trigger an upsert. Everything about a transaction
// that can mutate over its lifetime (status, completedAt, metadata) is
// included; balances are also included because refund() rewrites them.
function signature(t: EconomyTransaction): string {
  return JSON.stringify({
    s: t.status,
    c: t.completedAt ?? '',
    m: t.metadata ?? {},
    ba: t.balanceAfter,
  });
}

// SupabaseLedgerStore keeps the whole ledger as a JSON string in memory
// (so read()/write() stays compatible with the existing LedgerStore
// contract) and diffs each write against the previous cached version to
// enqueue per-transaction upserts. Whole-blob syncing would be wasteful.
export class SupabaseLedgerStore implements LedgerStore {
  private cache: string | null = null;
  private lastByIdSignature = new Map<string, string>();

  constructor() {
    registerHandler('txn_upsert', async (payload) => {
      const client = getSupabaseClient();
      if (!client) throw new Error('Supabase client not available.');
      const row = payload as TxnRow;
      const { error } = await client
        .from('economy_transactions')
        .upsert(row, { onConflict: 'transaction_id' });
      if (error) throw error;
    });
  }

  read(): string | null {
    return this.cache;
  }

  write(value: string): void {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('SupabaseLedgerStore.write called before session ready.');

    let parsed: EconomyTransaction[];
    try {
      parsed = JSON.parse(value) as EconomyTransaction[];
      if (!Array.isArray(parsed)) parsed = [];
    } catch {
      parsed = [];
    }

    // Diff against last-seen state and enqueue only the changed rows.
    for (const t of parsed) {
      const sig = signature(t);
      const prev = this.lastByIdSignature.get(t.transactionId);
      if (prev === sig) continue;
      this.lastByIdSignature.set(t.transactionId, sig);
      void enqueue({
        id: `txn:${t.transactionId}:${sig.length}`,
        kind: 'txn_upsert',
        payload: toRow(t, userId),
      });
    }

    this.cache = value;
  }

  remove(): void {
    this.cache = null;
    this.lastByIdSignature.clear();
    // Intentional: this is only called by resetForDev(). Real remote
    // deletes would need a bulk-delete op; not wiring one until a real
    // use case appears.
  }

  // Pull all transactions for the current user into the JSON cache.
  // Sequences establish authoritative order; created_at is the secondary
  // sort so two devices writing at the same tick converge cleanly.
  async hydrate(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available for hydrate.');
    const userId = getCurrentUserId();
    if (!userId) throw new Error('hydrate called before session ready.');

    const { data, error } = await client
      .from('economy_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('sequence', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;

    const rows = (data ?? []) as TxnRow[];
    const txns = rows.map(fromRow);
    this.cache = JSON.stringify(txns);
    // Seed the signature map so the first local write after hydrate only
    // enqueues genuinely-changed rows.
    this.lastByIdSignature.clear();
    for (const t of txns) this.lastByIdSignature.set(t.transactionId, signature(t));
  }
}
