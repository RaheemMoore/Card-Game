-- Phase 5: Prompt Accuracy Lab schema. Three admin-only tables that
-- persist every test run's exact inputs, provenance, generated image
-- reference, and structured human judgment. Retained after image
-- expiration so the textual record survives (plan §7 30-day rule).
--
-- Batches group related runs. Runs are the atomic tier attempt; a
-- Foundation → Forged → Ascendant chain is three linked runs
-- (parent_run_id → previous tier). Judgments are separate rows so
-- multiple reviewers can score the same run over time.

create table if not exists public.prompt_test_batches (
  id             uuid primary key default gen_random_uuid(),
  owner_user_id  uuid not null references auth.users(id) on delete cascade,
  archetype      text not null,
  intent         text,
  status         text not null default 'active' check (status in ('active', 'complete', 'cancelled')),
  planned_calls  int,
  planned_cost_usd numeric(12, 6),
  actual_cost_usd  numeric(12, 6) default 0,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz,
  metadata       jsonb
);

create index if not exists prompt_test_batches_owner_created
  on public.prompt_test_batches (owner_user_id, created_at desc);
create index if not exists prompt_test_batches_archetype
  on public.prompt_test_batches (archetype);

alter table public.prompt_test_batches enable row level security;

create policy "prompt_test_batches: admin read/write"
  on public.prompt_test_batches
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


create table if not exists public.prompt_test_runs (
  id                    uuid primary key default gen_random_uuid(),
  batch_id              uuid not null references public.prompt_test_batches(id) on delete cascade,
  parent_run_id         uuid references public.prompt_test_runs(id) on delete set null,
  archetype             text not null,
  tier                  text not null check (tier in ('Foundation', 'Forged', 'Ascendant')),
  status                text not null check (status in ('running', 'success', 'error', 'image_expired')),
  -- production input snapshot (element, story-pillar answers, existing name, stats, etc.)
  input_snapshot        jsonb not null,
  -- Claude side
  claude_model          text,
  claude_prompt         text,
  claude_response       jsonb,
  claude_input_tokens   int,
  claude_output_tokens  int,
  claude_cost_usd       numeric(12, 6),
  -- Leonardo side
  leonardo_model        text,
  leonardo_prompt       text,
  leonardo_negative_prompt text,
  leonardo_settings     jsonb,
  leonardo_generation_id text,
  leonardo_cost_usd     numeric(12, 6),
  -- Storage refs (nullable when image_expired)
  output_object_path    text,
  thumb_object_path     text,
  -- Result/error
  error_message         text,
  duration_ms           int,
  started_at            timestamptz not null default now(),
  completed_at          timestamptz,
  -- Retention
  image_expires_at      timestamptz,
  metadata              jsonb
);

create index if not exists prompt_test_runs_batch
  on public.prompt_test_runs (batch_id, started_at desc);
create index if not exists prompt_test_runs_archetype_tier
  on public.prompt_test_runs (archetype, tier, started_at desc);
create index if not exists prompt_test_runs_image_expires
  on public.prompt_test_runs (image_expires_at)
  where image_expires_at is not null and status != 'image_expired';

alter table public.prompt_test_runs enable row level security;

create policy "prompt_test_runs: admin read/write"
  on public.prompt_test_runs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


create table if not exists public.prompt_test_judgments (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null references public.prompt_test_runs(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete cascade,
  -- 1-5 rubric scores (nullable → not judged on this axis)
  overall_rating          smallint check (overall_rating between 1 and 5),
  archetype_fidelity      smallint check (archetype_fidelity between 1 and 5),
  tier_fidelity           smallint check (tier_fidelity between 1 and 5),
  identity_continuity     smallint check (identity_continuity between 1 and 5),
  prompt_to_image         smallint check (prompt_to_image between 1 and 5),
  body_representation     smallint check (body_representation between 1 and 5),
  skin_accuracy           smallint check (skin_accuracy between 1 and 5),
  hair_accuracy           smallint check (hair_accuracy between 1 and 5),
  clothing_accuracy       smallint check (clothing_accuracy between 1 and 5),
  pose_composition        smallint check (pose_composition between 1 and 5),
  anatomy_artifacts       smallint check (anatomy_artifacts between 1 and 5),
  lore_detail_accuracy    smallint check (lore_detail_accuracy between 1 and 5),
  safety_false_positive   smallint check (safety_false_positive between 1 and 5),
  -- Categorical
  issue_tags     text[] default '{}',
  notes          text,
  disposition    text not null check (disposition in (
    'keep_success',
    'regenerate_same_prompt',
    'archetype_prompt_change_candidate',
    'global_prompt_change_candidate',
    'model_settings_investigation',
    'reject_unusable'
  )),
  submitted_at   timestamptz not null default now()
);

create index if not exists prompt_test_judgments_run
  on public.prompt_test_judgments (run_id, submitted_at desc);
create index if not exists prompt_test_judgments_disposition
  on public.prompt_test_judgments (disposition, submitted_at desc);

alter table public.prompt_test_judgments enable row level security;

create policy "prompt_test_judgments: admin read/write"
  on public.prompt_test_judgments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
