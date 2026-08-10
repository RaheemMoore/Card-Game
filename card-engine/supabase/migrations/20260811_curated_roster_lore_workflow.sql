-- The lore belongs to Tori (Raheem, 2026-08-10).
--
-- Raheem spoke to the lore director and settled that Tori owns the lore for
-- every card before it becomes permanent. That changes the shape of the tool:
-- the lore stage LEAVES the Workshop and becomes a proposal sent to her desk in
-- the studio wiki. Nothing becomes permanent without passing through her.
--
--   WORKSHOP                 STUDIO WIKI                WORKSHOP
--   bench → intake →         Tori's desk:               review space:
--   read the art →           lore + claim grid          images + her lore
--   propose         ──────► confirm  ──────────────►   approve → permanent
--                                    ◄── send back ───  (with a note)
--
-- Two consequences for the schema:
--
--   1. `status` on curated_characters stops being a vague draft/review flag and
--      becomes the actual workflow state machine, with a hand-off state
--      (awaiting_lore) and a hand-back state (lore_ready).
--
--   2. The permanence gate now has TWO halves with different owners. The
--      Workshop half (images, identity sheet) and the Tori half (lore,
--      bindings, tiebreaker, confirmation). A variant may only go permanent
--      when both have passed AND a human approved it in the review space.
--
-- 20260810_curated_roster is already applied. Both tables are empty, so the
-- check constraints are rewritten rather than migrated.

-- ---------------------------------------------------------------------------
-- 1. Character status — the workflow.
--
--   draft         being set up in the Workshop
--   seeded        bench candidate chosen; the three rank images are being made
--                 OUTSIDE the app
--   awaiting_lore proposal sent; sitting on Tori's desk
--   lore_ready    Tori confirmed; sitting in the review queue
--   approved      passed final review; its variants may now be published
--   retired       pulled from the roster
--
-- `in_review` from the first migration is dropped — the review queue is exactly
-- the set of characters at `lore_ready`, so a separate value said nothing.
-- ---------------------------------------------------------------------------

alter table public.curated_characters
  drop constraint if exists curated_characters_status_check;

alter table public.curated_characters
  add constraint curated_characters_status_check
  check (status in ('draft', 'seeded', 'awaiting_lore', 'lore_ready', 'approved', 'retired'));

-- ---------------------------------------------------------------------------
-- 2. Variant status — the publication. Separate lifecycle from the workflow
--    above: the character moves through review once, then each of its element
--    variants is published on its own schedule (a Monk has 8 and must not wait
--    for all of them). `in_review` belonged to the character, not here.
-- ---------------------------------------------------------------------------

alter table public.curated_variants
  drop constraint if exists curated_variants_status_check;

alter table public.curated_variants
  add constraint curated_variants_status_check
  check (status in ('draft', 'permanent', 'hidden'));

-- ---------------------------------------------------------------------------
-- 3. Tori's half of the gate.
--
-- Split out as its own function rather than folded into the big one so her desk
-- can call it directly to enable or disable its Confirm button — the same
-- predicate, so the button and the gate can never disagree.
-- ---------------------------------------------------------------------------

create or replace function public.curated_character_lore_is_ready(p_character_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select
        nullif(trim(c.display_name), '') is not null
        and nullif(trim(c.data ->> 'coreLore'), '') is not null
        and nullif(trim(c.data -> 'lore' ->> 'cardName'), '') is not null
        and nullif(trim(c.data -> 'lore' ->> 'nameAndTitle'), '') is not null
        -- A paragraph for every rank. A card with no Ascendant lore is not done.
        and nullif(trim(c.data -> 'lore' -> 'rankLore' ->> 'Foundation'), '') is not null
        and nullif(trim(c.data -> 'lore' -> 'rankLore' ->> 'Forged'), '') is not null
        and nullif(trim(c.data -> 'lore' -> 'rankLore' ->> 'Ascendant'), '') is not null
        and jsonb_typeof(c.data -> 'answerBindings') = 'array'
        and jsonb_array_length(c.data -> 'answerBindings') > 0
        and nullif(trim(c.data -> 'visualTiebreaker' ->> 'optionId'), '') is not null
        and c.data ->> 'loreConfirmedAt' is not null
      from public.curated_characters c
      where c.id = p_character_id
    ),
    false
  );
$$;

revoke execute on function public.curated_character_lore_is_ready(text) from public;
revoke execute on function public.curated_character_lore_is_ready(text) from anon;
grant  execute on function public.curated_character_lore_is_ready(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. The whole character-side gate: the Workshop's half, Tori's half, and the
--    human decision in the review space.
--
-- Replaces the version in 20260810_curated_roster, which predated the lore
-- hand-off and checked only the Workshop's fields.
--
-- HONEST SCOPE, unchanged and worth repeating: this SQL is the BACKSTOP. It
-- verifies what the database can see on its own. It CANNOT verify the coverage
-- rules across an archetype or per-question binding completeness — both of
-- which need game data the database does not have. Those live in services/workshop/permanenceGate.ts and
-- the two must be changed together. The TS gate is what an operator sees; this
-- is what stops a direct PostgREST call from skipping the UI.
-- ---------------------------------------------------------------------------

create or replace function public.curated_character_is_ready(p_character_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select
        -- The Workshop's half: the art was read and a human accepted it.
        --
        -- Stats are deliberately NOT checked (Raheem, 2026-08-10): a curated
        -- character is an identity, not a statline. Players roll their own
        -- inside the archetype's bias tiers and level them through play.
        c.data ->> 'identityAcceptedAt' is not null
        -- The human decision. A character sitting at lore_ready has Tori's work
        -- but nobody's judgment yet, and judgment is the point of the filter.
        and c.status = 'approved'
      from public.curated_characters c
      where c.id = p_character_id
    ),
    false
  )
  -- Tori's half.
  and public.curated_character_lore_is_ready(p_character_id);
$$;

revoke execute on function public.curated_character_is_ready(text) from public;
revoke execute on function public.curated_character_is_ready(text) from anon;
grant  execute on function public.curated_character_is_ready(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Repoint the variant write policy. Same shape as before — the gate applies
--    only to the transition INTO 'permanent', so ordinary draft edits stay
--    cheap, and admins bypass exactly as they do everywhere else.
-- ---------------------------------------------------------------------------

drop policy if exists "curated_variants: director write" on public.curated_variants;

create policy "curated_variants: director write"
  on public.curated_variants for all
  to authenticated
  using (public.is_lore_director())
  with check (
    public.is_lore_director()
    and (
      public.is_admin()
      or status <> 'permanent'
      or (
        public.curated_variant_art_is_complete(data)
        and nullif(trim(data -> 'signOff' ->> 'by'), '') is not null
        and nullif(trim(data -> 'signOff' ->> 'note'), '') is not null
        and public.curated_character_is_ready(character_id)
      )
    )
  );
