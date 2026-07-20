-- Phase 3c: Archetype Workshop proposals.
-- Structured lore/art change proposals submitted from /admin/archetype-workshop.
-- Each row is a triage form + snapshot of the archetype's Layer state at
-- submission time, so we can always compare "what was true when we filed this"
-- against later canon. Payload is jsonb because the form shape may evolve.
--
-- RLS: admin-only for both read and write. Studio artifact — no reason to
-- expose to regular users.

create table public.archetype_proposals (
  id uuid primary key default gen_random_uuid(),
  archetype text not null,
  layer text not null check (layer in ('A', 'B', 'C', 'D')),
  failure_type text not null check (failure_type in (
    'not_same_character',
    'wrong_archetype_vibe',
    'evolution_wrong',
    'lore_portrait_misaligned',
    'off_brand'
  )),
  status text not null default 'submitted' check (status in (
    'draft',
    'submitted',
    'awaiting_claude',
    'shipped',
    'rejected'
  )),
  submitted_by uuid references auth.users(id) on delete set null,
  card_id text references public.cards(card_id) on delete set null,
  payload jsonb not null,
  commit_sha text,
  decided_reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index archetype_proposals_archetype_idx on public.archetype_proposals(archetype);
create index archetype_proposals_status_idx on public.archetype_proposals(status);
create index archetype_proposals_created_at_idx on public.archetype_proposals(created_at desc);

create trigger archetype_proposals_set_updated_at
before update on public.archetype_proposals
for each row execute function public.set_updated_at();

alter table public.archetype_proposals enable row level security;

create policy "archetype_proposals: admin only"
  on public.archetype_proposals for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
