-- Phase 2 persistence: profiles, cards, economy_transactions.
-- Card blobs live in jsonb; only columns needed for filter/sort are promoted.
-- Balance is derived from the ledger — no wallets table.

-- Trigger helper used by every updated_at column below.
-- search_path is locked to satisfy advisor 0011.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- profiles: 1:1 with auth.users. migrated_at pairs with the localStorage
-- sentinel so migration is only ever run once per identity.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  migrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: owner all"
  on public.profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- cards: whole Card TS interface in `data` jsonb.
-- portrait_url promoted so the collection grid can render without pulling the blob.
create table public.cards (
  card_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  archetype text not null,
  portrait_url text,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cards_user_id_idx on public.cards(user_id);
create index cards_user_archetype_idx on public.cards(user_id, archetype);
create index cards_user_created_idx on public.cards(user_id, created_at desc);

create trigger cards_set_updated_at
before update on public.cards
for each row execute function public.set_updated_at();

alter table public.cards enable row level security;

create policy "cards: owner all"
  on public.cards
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- economy_transactions: normalized so governance §13 audit can run SQL over
-- amount/type/status. transaction_id is client-generated => idempotent upsert.
-- `sequence` is a monotonic client-assigned int so multi-device rehydrate can
-- deterministically order writes that share a createdAt millisecond.
create table public.economy_transactions (
  transaction_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null check (currency in ('premium', 'gameplay')),
  amount numeric not null,
  type text not null check (type in ('purchase', 'reward', 'spend', 'refund', 'admin_adjustment', 'migration')),
  status text not null check (status in ('pending', 'committed', 'refunded', 'failed', 'cancelled')),
  action_id text,
  card_id text,
  reward_id text,
  balance_before numeric not null,
  balance_after numeric not null,
  sequence bigint not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index economy_txns_user_id_idx on public.economy_transactions(user_id);
create index economy_txns_user_seq_idx on public.economy_transactions(user_id, sequence);
create index economy_txns_user_status_idx on public.economy_transactions(user_id, status);
create index economy_txns_user_currency_idx on public.economy_transactions(user_id, currency);

alter table public.economy_transactions enable row level security;

create policy "economy_transactions: owner all"
  on public.economy_transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
