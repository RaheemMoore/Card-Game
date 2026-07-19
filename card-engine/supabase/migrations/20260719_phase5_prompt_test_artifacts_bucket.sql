-- Phase 5: private storage bucket for Prompt Lab image artifacts.
-- Layout: prompt-test-artifacts/{archetype}/{batch_id}/{tier}/{run_id}/output.webp
--
-- Writes happen server-side via SUPABASE_SERVICE_ROLE_KEY (bucket is
-- otherwise closed to clients). Reads are admin-only through signed
-- URLs minted by the API layer — no direct public access.

insert into storage.buckets (id, name, public)
values ('prompt-test-artifacts', 'prompt-test-artifacts', false)
on conflict (id) do nothing;

-- Object-level RLS: admins can SELECT/DELETE. Writes are performed with
-- the service role so no INSERT policy is required.
create policy "prompt-test-artifacts: admin select"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'prompt-test-artifacts' and public.is_admin());

create policy "prompt-test-artifacts: admin delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'prompt-test-artifacts' and public.is_admin());
