import type { Card, ArchetypeName } from '../../types/card';
import type { CurrencyId, EconomyTransaction } from '../../types/economy';
import type {
  ArchetypeProposal,
  ArchetypeProposalPayload,
  ProposalFailureType,
  ProposalLayer,
  ProposalStatus,
} from '../../types/archetypeProposal';
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

// Phase 3 — cross-user card listing for /admin/cards.

export interface AdminCardListEntry {
  card_id: string;
  user_id: string;
  user_email: string | null;
  archetype: string;
  card_name: string | null;
  name_and_title: string | null;
  portrait_url: string | null;
  created_at: string;
  total_count: number;
}

export interface AdminCardListResult {
  entries: AdminCardListEntry[];
  totalCount: number;
}

export async function listAllCards(input: {
  search?: string;
  archetype?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminCardListResult> {
  const { data, error } = await client().rpc('list_cards_for_admin', {
    search_query: input.search?.trim() || null,
    archetype_filter: input.archetype ?? null,
    limit_count: input.limit ?? 50,
    offset_count: input.offset ?? 0,
  });
  if (error) throw error;
  const rows = (data ?? []) as AdminCardListEntry[];
  return {
    entries: rows.map((r) => ({ ...r, total_count: toNumber(r.total_count) })),
    totalCount: rows.length > 0 ? toNumber(rows[0].total_count) : 0,
  };
}

// Fetches the full Card blob for one card. Widened admin RLS on the
// cards table lets an admin SELECT any user's card directly.
export async function getCardForAdmin(cardId: string): Promise<Card | null> {
  const { data, error } = await client()
    .from('cards')
    .select('data')
    .eq('card_id', cardId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (data as { data: Card }).data;
}

// ─── Archetype Workshop proposals ─────────────────────────────────────
// Guarded by RLS policy `archetype_proposals: admin only` — non-admin
// callers get empty results or PostgREST errors from Supabase directly.

interface ProposalRow {
  id: string;
  archetype: string;
  layer: ProposalLayer;
  failure_type: ProposalFailureType;
  status: ProposalStatus;
  submitted_by: string | null;
  card_id: string | null;
  payload: ArchetypeProposalPayload;
  commit_sha: string | null;
  decided_reason: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProposal(r: ProposalRow): ArchetypeProposal {
  return {
    id: r.id,
    archetype: r.archetype as ArchetypeName,
    layer: r.layer,
    failureType: r.failure_type,
    status: r.status,
    submittedBy: r.submitted_by,
    cardId: r.card_id,
    payload: r.payload,
    commitSha: r.commit_sha,
    decidedReason: r.decided_reason,
    decidedAt: r.decided_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Lightweight list — every column EXCEPT `payload`. Also drops legacy
 * `cardLineage.tiers.*.portraitUrl` fields from old rows (pre-P1) so
 * they don't bloat the list even for historical records. Reviewers
 * expand a row → we fetch the full payload via `getArchetypeProposalPayload`.
 * This keeps the list at ~few KB per row instead of ~1MB+.
 */
export async function listArchetypeProposals(opts?: {
  archetype?: ArchetypeName;
  status?: ProposalStatus;
  limit?: number;
}): Promise<ArchetypeProposal[]> {
  let q = client()
    .from('archetype_proposals')
    .select('id, archetype, layer, failure_type, status, submitted_by, card_id, commit_sha, decided_reason, decided_at, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (opts?.archetype) q = q.eq('archetype', opts.archetype);
  if (opts?.status) q = q.eq('status', opts.status);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  // The list omits payload; every field except payload comes from the query.
  return (data ?? []).map((r) => {
    const row = r as Omit<ProposalRow, 'payload'>;
    return {
      id: row.id,
      archetype: row.archetype as ArchetypeName,
      layer: row.layer,
      failureType: row.failure_type,
      status: row.status,
      submittedBy: row.submitted_by,
      cardId: row.card_id,
      // Placeholder payload for list rows; call getArchetypeProposalPayload
      // to hydrate. Reviewers get a proposal shape without the full blob.
      payload: null as unknown as ArchetypeProposalPayload,
      commitSha: row.commit_sha,
      decidedReason: row.decided_reason,
      decidedAt: row.decided_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

/**
 * Fetches the full payload for a single proposal. Called on-demand when
 * a reviewer expands a row in the workshop. Kept separate so the list
 * query stays cheap.
 */
export async function getArchetypeProposalPayload(id: string): Promise<ArchetypeProposalPayload | null> {
  const { data, error } = await client()
    .from('archetype_proposals')
    .select('payload')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (data as { payload: ArchetypeProposalPayload }).payload;
}

export async function createArchetypeProposal(input: {
  archetype: ArchetypeName;
  layer: ProposalLayer;
  failureType: ProposalFailureType;
  cardId?: string | null;
  payload: ArchetypeProposalPayload;
  status?: ProposalStatus;
}): Promise<ArchetypeProposal> {
  const supabase = client();
  const { data: session } = await supabase.auth.getUser();
  const uid = session?.user?.id ?? null;
  const { data, error } = await supabase
    .from('archetype_proposals')
    .insert({
      archetype: input.archetype,
      layer: input.layer,
      failure_type: input.failureType,
      status: input.status ?? 'submitted',
      submitted_by: uid,
      card_id: input.cardId ?? null,
      payload: input.payload,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToProposal(data as ProposalRow);
}

export async function updateArchetypeProposalStatus(
  id: string,
  patch: { status: ProposalStatus; commitSha?: string; decidedReason?: string },
): Promise<ArchetypeProposal> {
  const decided = patch.status === 'shipped' || patch.status === 'rejected';
  const { data, error } = await client()
    .from('archetype_proposals')
    .update({
      status: patch.status,
      commit_sha: patch.commitSha ?? null,
      decided_reason: patch.decidedReason ?? null,
      decided_at: decided ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return rowToProposal(data as ProposalRow);
}
