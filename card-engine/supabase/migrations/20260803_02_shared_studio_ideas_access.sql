-- Studio Wiki partner access
-- Raheem (admin) and Tori (lore_director) share notebook visibility.
-- Authorship remains immutable: each partner updates only their own notes.
--
-- MUST run after 20260803_01_studio_card_review_and_ideas.sql — it replaces the
-- admin-only policies that migration creates. Both files were originally named
-- `20260803_*`, where `shared_studio_ideas_access` sorts BEFORE
-- `studio_card_review_and_ideas`; a fresh replay would have run this first, made
-- these DROPs no-ops, and left the admin-only policies in place — silently
-- locking Tori out of the shared notebook. Hence the explicit _01/_02 sequence.

drop policy if exists "studio ideas: own admin read" on public.studio_ideas;
drop policy if exists "studio ideas: own admin insert" on public.studio_ideas;
drop policy if exists "studio ideas: own admin update" on public.studio_ideas;

create policy "studio ideas: studio partners read"
  on public.studio_ideas for select
  using (public.is_lore_director());

create policy "studio ideas: owner partner insert"
  on public.studio_ideas for insert
  with check (owner_id = auth.uid() and public.is_lore_director());

create policy "studio ideas: owner partner update"
  on public.studio_ideas for update
  using (owner_id = auth.uid() and public.is_lore_director())
  with check (owner_id = auth.uid() and public.is_lore_director());

