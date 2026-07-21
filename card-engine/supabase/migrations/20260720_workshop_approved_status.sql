-- Phase B: guarded approve → merge. Adds the `approved` status that sits
-- between `awaiting_approval` and `shipped`:
--   awaiting_approval --(admin Approve)--> approved --(admin Merge & ship)--> shipped
-- Approve records Raheem's decision; the actual PR merge + `shipped` happens
-- later via the admin-ship-proposal endpoint (service role), so a director can
-- never reach `approved` or `shipped`.

alter table public.archetype_proposals
  drop constraint if exists archetype_proposals_status_check;
alter table public.archetype_proposals
  add constraint archetype_proposals_status_check
  check (status in (
    'draft',
    'submitted',
    'awaiting_claude',
    'awaiting_approval',
    'approved',
    'shipped',
    'rejected'
  ));

-- Re-assert the director-update gate, now also forbidding non-admins from
-- setting `approved` (previously only `shipped` was named). Keeps the v2
-- evidence conditions for landing on awaiting_approval.
drop policy if exists "archetype_proposals: director update" on public.archetype_proposals;

create policy "archetype_proposals: director update"
  on public.archetype_proposals for update
  to authenticated
  using (public.is_lore_director())
  with check (
    public.is_lore_director()
    and (
      public.is_admin()
      or (
        status not in ('approved', 'shipped')
        and (
          status <> 'awaiting_approval'
          or (
            jsonb_typeof(payload -> 'layerChanges') = 'array'
            and jsonb_array_length(coalesce(payload -> 'layerChanges', '[]'::jsonb)) > 0
            and (
              coalesce((payload ->> 'affectsImage')::boolean, false) = false
              or payload -> 'verify' ->> 'verdict' = 'pass'
            )
          )
        )
      )
    )
  );
