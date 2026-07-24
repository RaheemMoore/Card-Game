-- Drop the hard FK from player_ability_discoveries.reward_transaction_id into
-- economy_transactions.
--
-- Why: discoveries and economy transactions sync through two independent
-- write-through queues (SupabaseAbilityStore vs SupabaseLedgerStore). The
-- reward_transaction_id link is advisory only — the reward is always
-- recoverable from the ledger via reward_id + metadata.abilityId (see
-- services/abilities/discoveryLedger.ts). Enforcing it as a FK meant any
-- divergence between the two queues (a discovery upsert delivered before, or
-- without, its reward transaction) failed permanently, exhausted the
-- SyncQueue's retries, and locked that user's header to "Sync error".
--
-- The column stays as a plain audit pointer; only the constraint is removed.
alter table public.player_ability_discoveries
  drop constraint if exists player_ability_discoveries_reward_transaction_id_fkey;
