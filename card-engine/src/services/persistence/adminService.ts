import type { Card } from '../../types/card';
import type { CurrencyId, EconomyTransaction } from '../../types/economy';
import { getSupabaseClient } from './supabaseClient';

// All admin RPCs are guarded by is_admin() server-side. Non-admin
// sessions get empty results or exceptions from Supabase directly.

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  role: 'user' | 'admin';
  is_anonymous: boolean;
  card_count: number;
  txn_count: number;
  premium_balance: number;
  gameplay_balance: number;
  last_activity: string;
  created_at: string;
}

export interface SystemStats {
  total_users: number;
  total_admins: number;
  total_cards: number;
  total_txns: number;
  aggregate_premium: number;
  aggregate_gameplay: number;
}

function client() {
  const c = getSupabaseClient();
  if (!c) throw new Error('Supabase not configured.');
  return c;
}

function toNumber(v: unknown): number {
  return typeof v === 'string' ? Number(v) : (v as number);
}

export async function listUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await client().rpc('list_users_for_admin');
  if (error) throw error;
  return (data ?? []).map((r: AdminUserRow) => ({
    ...r,
    card_count: toNumber(r.card_count),
    txn_count: toNumber(r.txn_count),
    premium_balance: toNumber(r.premium_balance),
    gameplay_balance: toNumber(r.gameplay_balance),
  }));
}

export async function getSystemStats(): Promise<SystemStats | null> {
  const { data, error } = await client().rpc('get_system_stats');
  if (error) throw error;
  if (!data) return null;
  const s = data as Record<string, unknown>;
  return {
    total_users: toNumber(s.total_users),
    total_admins: toNumber(s.total_admins),
    total_cards: toNumber(s.total_cards),
    total_txns: toNumber(s.total_txns),
    aggregate_premium: toNumber(s.aggregate_premium),
    aggregate_gameplay: toNumber(s.aggregate_gameplay),
  };
}

export async function grantAdminAdjustment(input: {
  userId: string;
  currency: CurrencyId;
  amount: number;
  reason: string;
}): Promise<{ transaction_id: string; balance_after: number; sequence: number }> {
  const { data, error } = await client().rpc('grant_admin_adjustment', {
    target_user_id: input.userId,
    target_currency: input.currency,
    target_amount: input.amount,
    target_reason: input.reason,
  });
  if (error) throw error;
  return data as { transaction_id: string; balance_after: number; sequence: number };
}

// The three below rely on the widened RLS policies (owner OR admin)
// rather than SECURITY DEFINER RPCs — the admin's authenticated JWT
// carries enough authority to read/write these tables directly.

export async function listUserCards(userId: string): Promise<Card[]> {
  const { data, error } = await client()
    .from('cards')
    .select('data')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => (row as { data: Card }).data);
}

export async function listUserLedger(userId: string): Promise<EconomyTransaction[]> {
  const { data, error } = await client()
    .from('economy_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('sequence', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      transactionId: row.transaction_id as string,
      currency: row.currency as EconomyTransaction['currency'],
      amount: toNumber(row.amount),
      type: row.type as EconomyTransaction['type'],
      status: row.status as EconomyTransaction['status'],
      actionId: (row.action_id as string) ?? undefined,
      cardId: (row.card_id as string) ?? undefined,
      rewardId: (row.reward_id as string) ?? undefined,
      balanceBefore: toNumber(row.balance_before),
      balanceAfter: toNumber(row.balance_after),
      sequence: toNumber(row.sequence),
      createdAt: row.created_at as string,
      completedAt: (row.completed_at as string) ?? undefined,
      metadata: row.metadata as EconomyTransaction['metadata'],
    };
  });
}

export async function deleteUserCard(cardId: string): Promise<void> {
  const { error } = await client().from('cards').delete().eq('card_id', cardId);
  if (error) throw error;
}
