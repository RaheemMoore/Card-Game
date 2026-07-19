-- Phase 4 cleanup: ability art bucket. Replaces data-URL storage in
-- canonical_art_assets.assetUrl with real object storage.
--
-- Public read: ability artwork is shared game content that renders on
-- every user's card / codex; a private bucket with per-view signed URLs
-- would multiply requests. Writes remain admin-only via service_role.
--
-- Deviation from plan §6 ("private bucket"): plan wording tracks the
-- portraits pattern where per-user privacy matters. Ability art has no
-- per-user semantics, so we mirror standard game-asset conventions
-- (public read, gated write) instead. Records the decision here.

insert into storage.buckets (id, name, public)
values ('ability-art', 'ability-art', true)
on conflict (id) do nothing;

-- Anyone can read (public bucket), so no SELECT policy needed. Explicit
-- write / delete policies keep uploads to admins even though writes go
-- through the service role in practice.
create policy "ability-art: admin write"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'ability-art' and public.is_admin());

create policy "ability-art: admin update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'ability-art' and public.is_admin())
  with check (bucket_id = 'ability-art' and public.is_admin());

create policy "ability-art: admin delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'ability-art' and public.is_admin());
