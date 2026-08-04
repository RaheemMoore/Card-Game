-- Studio Wiki partner access
-- Raheem (admin) and Tori (lore_director) share notebook visibility.
-- Authorship remains immutable: each partner updates only their own notes.

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

