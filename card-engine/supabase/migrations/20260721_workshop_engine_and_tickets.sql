-- Workshop engine-first reshape + ticket numbers (2026-07-21).
--
-- Card generation is now a two-engine architecture (Lore Engine = the Claude
-- call; Image Engine = the deterministic portrait assembler). Proposals become
-- engine-first, and each gets a human-readable, ServiceNow-style ticket so it
-- can be referenced out loud once they pile up.
--
--   * `engine`        — 'image' | 'lore', stored (NOT derived from `layer`,
--                        which stays as an internal coarse A/B/C/D tag).
--   * `ticket_number` — 'IMG#####' / 'LOR#####', server-assigned + immutable.
--                        Two INDEPENDENT per-engine sequences. NULLABLE: legacy
--                        rows keep `id` as their handle and are NOT retro-
--                        numbered (keeps the sequences clean, no collisions).
--
-- Ticket assignment is atomic via a SECURITY DEFINER RPC that nextval's the
-- sequence matching the engine — Postgres sequences are transactional, so
-- concurrent filings never collide (no advisory locks needed).

-- ── 0. Widen failure_type for the Lore engine ───────────────────────────
-- The original five failure types are all image/portrait-leaning. Lore-engine
-- proposals need their own (canon drift, weak pillar options, off tone/motifs).
alter table public.archetype_proposals
  drop constraint if exists archetype_proposals_failure_type_check;
alter table public.archetype_proposals
  add constraint archetype_proposals_failure_type_check
  check (failure_type in (
    -- image-engine (original five)
    'not_same_character',
    'wrong_archetype_vibe',
    'evolution_wrong',
    'lore_portrait_misaligned',
    'off_brand',
    -- lore-engine (new)
    'lore_off_canon',
    'pillar_options_weak',
    'tone_or_motifs_off'
  ));

-- ── 1. Per-engine ticket sequences ──────────────────────────────────────
create sequence if not exists public.archetype_ticket_img_seq;
create sequence if not exists public.archetype_ticket_lor_seq;

-- ── 2. New columns (nullable first, so the backfill can run) ─────────────
alter table public.archetype_proposals
  add column if not exists engine text,
  add column if not exists ticket_number text;

-- ── 3. Backfill engine on legacy rows from the coarse layer tag ──────────
-- A (Canon) / C (Story Pillars & Elements) are lore-authored → 'lore';
-- B (Rank & Stat Visuals) / D (Meta-Prompt & Escalation) are art → 'image'.
-- ticket_number is deliberately left NULL on legacy rows (see header).
update public.archetype_proposals
  set engine = case when layer in ('A', 'C') then 'lore' else 'image' end
  where engine is null;

-- ── 4. Lock down engine: NOT NULL + domain check ─────────────────────────
alter table public.archetype_proposals
  alter column engine set not null;
alter table public.archetype_proposals
  add constraint archetype_proposals_engine_check
  check (engine in ('image', 'lore'));

-- ticket_number stays nullable; enforce uniqueness among the rows that have one.
create unique index if not exists archetype_proposals_ticket_number_key
  on public.archetype_proposals (ticket_number)
  where ticket_number is not null;

create index if not exists archetype_proposals_engine_idx
  on public.archetype_proposals (engine);

-- ── 5. Immutability: ticket_number + engine never change after insert ────
create or replace function public.archetype_proposals_guard_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.ticket_number is distinct from old.ticket_number then
    raise exception 'ticket_number is immutable';
  end if;
  if new.engine is distinct from old.engine then
    raise exception 'engine is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists archetype_proposals_immutable on public.archetype_proposals;
create trigger archetype_proposals_immutable
  before update on public.archetype_proposals
  for each row execute function public.archetype_proposals_guard_immutable();

-- ── 6. Atomic create RPC — assigns the ticket server-side ────────────────
-- Replaces the client-side .insert() in adminService.createArchetypeProposal.
-- SECURITY DEFINER so it can read the sequences + stamp submitted_by, guarded
-- by is_lore_director() to mirror the "director insert" RLS policy. New rows
-- are always 'submitted', so the non-admin no-shipped rule is satisfied by
-- construction.
create or replace function public.create_archetype_proposal(
  p_archetype text,
  p_engine text,
  p_layer text,
  p_failure_type text,
  p_card_id text,
  p_payload jsonb
)
returns public.archetype_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq_val bigint;
  v_ticket text;
  v_row public.archetype_proposals;
begin
  if not public.is_lore_director() then
    raise exception 'not authorized to file proposals';
  end if;
  if p_engine not in ('image', 'lore') then
    raise exception 'invalid engine %', p_engine;
  end if;

  -- Bump the sequence matching the engine and format the display ticket.
  if p_engine = 'image' then
    v_seq_val := nextval('public.archetype_ticket_img_seq');
    v_ticket := 'IMG' || lpad(v_seq_val::text, 5, '0');
  else
    v_seq_val := nextval('public.archetype_ticket_lor_seq');
    v_ticket := 'LOR' || lpad(v_seq_val::text, 5, '0');
  end if;

  insert into public.archetype_proposals (
    archetype, engine, layer, failure_type, status,
    submitted_by, card_id, payload, ticket_number
  ) values (
    p_archetype, p_engine, p_layer, p_failure_type, 'submitted',
    auth.uid(), p_card_id, p_payload, v_ticket
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_archetype_proposal(text, text, text, text, text, jsonb) from public;
grant execute on function public.create_archetype_proposal(text, text, text, text, text, jsonb) to authenticated;
