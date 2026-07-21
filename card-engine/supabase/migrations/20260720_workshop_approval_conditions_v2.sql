-- Approval quality gate v2 — image proof is CONDITIONAL.
--
-- Supersedes 20260720_workshop_approval_conditions. A non-admin director may
-- move a proposal to `awaiting_approval` only when it carries a per-layer
-- change summary. A passing before/after regen is required ONLY when the
-- proposal changes the portrait (payload.affectsImage = true) — lore-only
-- proposals need no image (and spend no Leonardo credits). Admins bypass.

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
        status <> 'shipped'
        and (
          status <> 'awaiting_approval'
          or (
            -- always: a non-empty per-layer summary
            jsonb_typeof(payload -> 'layerChanges') = 'array'
            and jsonb_array_length(coalesce(payload -> 'layerChanges', '[]'::jsonb)) > 0
            -- image proof only when the proposal changes the portrait
            and (
              coalesce((payload ->> 'affectsImage')::boolean, false) = false
              or payload -> 'verify' ->> 'verdict' = 'pass'
            )
          )
        )
      )
    )
  );
