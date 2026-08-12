-- The Lore Desk moves into the admin app, and questions come out of the lore
-- (Raheem, 2026-08-11).
--
-- Two changes landed together in the app:
--
--   1. Tori's desk left the studio wiki and became /admin/lore-desk — its own
--      page below the Workshop. Same data, same jsonb rows; only the surface
--      moved.
--
--   2. Bespoke selection questions. After the lore is written, Claude drafts
--      questions FROM it; the lore director edits, marks which answers are
--      true of the character, and approves each one. Approved questions live
--      in data->'generatedQuestions' and carry an ordinary answerBindings
--      entry keyed on the question's id.
--
-- This migration tightens Tori's half of the gate to match: confirming now
-- also requires at least THREE approved generated questions, each with a
-- claimed option in answerBindings.
--
-- ⚠ PAIRED with loreProblems() in
-- card-engine/src/services/workshop/loreReadiness.ts (and the
-- MIN_APPROVED_GENERATED_QUESTIONS constant in types/curatedCard.ts). The
-- confirm button and this gate must never disagree — change them together.
-- Supersedes the 20260811 version of curated_character_lore_is_ready; every
-- prior predicate is kept verbatim.

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
        -- Bespoke questions (2026-08-11): at least three approved, each with
        -- at least one answer claimed as true of this character.
        and (
          select count(*)
          from jsonb_array_elements(coalesce(c.data -> 'generatedQuestions', '[]'::jsonb)) q
          where q ->> 'status' = 'approved'
            and exists (
              select 1
              from jsonb_array_elements(coalesce(c.data -> 'answerBindings', '[]'::jsonb)) b
              where b ->> 'questionId' = q ->> 'id'
                and jsonb_array_length(coalesce(b -> 'optionIds', '[]'::jsonb)) > 0
            )
        ) >= 3
      from public.curated_characters c
      where c.id = p_character_id
    ),
    false
  );
$$;

-- Grants unchanged from 20260811, restated because create or replace keeps
-- them anyway and a reader should not have to check.
revoke execute on function public.curated_character_lore_is_ready(text) from public;
revoke execute on function public.curated_character_lore_is_ready(text) from anon;
grant  execute on function public.curated_character_lore_is_ready(text) to authenticated;

-- curated_character_is_ready() and the curated_variants "director write"
-- policy both call this function, so the permanence gate tightens
-- automatically. No other objects change.
