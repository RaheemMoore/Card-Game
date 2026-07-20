-- Approval quality gate (server-enforced).
--
-- A non-admin director may only move a proposal to `awaiting_approval` when it
-- carries proof of a working change:
--   1. payload.verify.verdict = 'pass'   (a passing before/after regen), AND
--   2. payload.layerChanges is a non-empty array (a per-layer change summary).
-- Admins bypass (they can park anything). Enforced in WITH CHECK so a bare
-- status flip that skips the evidence is rejected at the database, not just the
-- client. Replaces the director-update policy from 20260720_workshop_approval_gate.

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
        -- non-admins: never ship, and only reach awaiting_approval with evidence
        status <> 'shipped'
        and (
          status <> 'awaiting_approval'
          or (
            payload -> 'verify' ->> 'verdict' = 'pass'
            and jsonb_typeof(payload -> 'layerChanges') = 'array'
            and jsonb_array_length(coalesce(payload -> 'layerChanges', '[]'::jsonb)) > 0
          )
        )
      )
    )
  );
