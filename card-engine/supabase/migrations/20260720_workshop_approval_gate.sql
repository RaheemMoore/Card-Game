-- Workshop approval gate. Two changes:
--   1. Adds `awaiting_approval` status — the state a proposal sits in after
--      Tori + Claude finish working it, waiting on Raheem's final call.
--   2. Widens archetype_proposals RLS so a lore_director can read and work
--      proposals, but can NEVER set status = 'shipped'. Only an admin ships.
--      Admin retains full access.

-- 1. Extend the status check constraint.
alter table public.archetype_proposals
  drop constraint if exists archetype_proposals_status_check;
alter table public.archetype_proposals
  add constraint archetype_proposals_status_check
  check (status in (
    'draft',
    'submitted',
    'awaiting_claude',
    'awaiting_approval',
    'shipped',
    'rejected'
  ));

-- 2. Replace the admin-only policy with role-aware policies.
drop policy if exists "archetype_proposals: admin only" on public.archetype_proposals;

-- Read: any lore director (admin OR lore_director) sees all proposals.
create policy "archetype_proposals: director read"
  on public.archetype_proposals for select
  to authenticated
  using (public.is_lore_director());

-- Insert: directors may file. Non-admins cannot create a row already
-- marked shipped.
create policy "archetype_proposals: director insert"
  on public.archetype_proposals for insert
  to authenticated
  with check (
    public.is_lore_director()
    and (public.is_admin() or status <> 'shipped')
  );

-- Update: directors may work a proposal. The ship gate lives in WITH
-- CHECK — a non-admin update that lands the row on 'shipped' is rejected.
create policy "archetype_proposals: director update"
  on public.archetype_proposals for update
  to authenticated
  using (public.is_lore_director())
  with check (
    public.is_lore_director()
    and (public.is_admin() or status <> 'shipped')
  );

-- Delete: admin only.
create policy "archetype_proposals: admin delete"
  on public.archetype_proposals for delete
  to authenticated
  using (public.is_admin());
