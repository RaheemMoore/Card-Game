-- Portraits bucket: private, per-user path prefix. Every card portrait moves
-- here during Phase 2 migration; new Leonardo generations upload here too.
-- Objects are keyed as `{user_id}/{card_id}/{rank}.{ext}` so RLS can gate on
-- the first path segment matching auth.uid().

insert into storage.buckets (id, name, public)
values ('portraits', 'portraits', false)
on conflict (id) do nothing;

-- Storage policies live on storage.objects; the bucket_id and first path
-- segment give us the ownership check.

create policy "portraits: owner select"
  on storage.objects for select
  using (
    bucket_id = 'portraits'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "portraits: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'portraits'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "portraits: owner update"
  on storage.objects for update
  using (
    bucket_id = 'portraits'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'portraits'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "portraits: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'portraits'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
