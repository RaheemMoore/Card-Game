-- Phase 0: append-only telemetry for every external provider call
-- (Anthropic Messages, Leonardo generations, Leonardo init-image upload,
-- future Admin/Cost probes). Feeds the ops dashboard's provider modules.
--
-- Writes come from server endpoints using SUPABASE_SERVICE_ROLE_KEY, which
-- bypasses RLS. Reads are admin-only via is_admin() from
-- 20260717_phase2b_role_column_and_admin_rls.sql.

create table if not exists public.api_usage_events (
  id                     uuid primary key default gen_random_uuid(),
  provider               text not null check (provider in ('anthropic', 'leonardo')),
  operation              text not null,
  game_action            text,
  user_id                uuid,
  card_id                text,
  test_run_id            uuid,
  provider_request_id    text,
  provider_generation_id text,
  model                  text,
  input_units            integer,
  output_units           integer,
  unit_type              text,
  cost_amount            numeric(12, 6),
  cost_currency          text,
  cost_source            text check (cost_source in ('provider', 'calculated', 'manual_reconciliation')),
  status                 text not null check (status in ('success', 'error', 'timeout')),
  error_code             text,
  started_at             timestamptz not null,
  completed_at           timestamptz not null,
  duration_ms            integer not null,
  metadata               jsonb,
  created_at             timestamptz not null default now()
);

create index if not exists api_usage_events_provider_started
  on public.api_usage_events (provider, started_at desc);

create index if not exists api_usage_events_game_action_started
  on public.api_usage_events (game_action, started_at desc)
  where game_action is not null;

create index if not exists api_usage_events_test_run
  on public.api_usage_events (test_run_id)
  where test_run_id is not null;

create index if not exists api_usage_events_user
  on public.api_usage_events (user_id, started_at desc)
  where user_id is not null;

alter table public.api_usage_events enable row level security;

-- Admins can read all rows. No client-side writes are permitted at all;
-- inserts happen server-side via service_role.
create policy "api_usage_events: admin read"
  on public.api_usage_events
  for select
  to authenticated
  using (public.is_admin());
