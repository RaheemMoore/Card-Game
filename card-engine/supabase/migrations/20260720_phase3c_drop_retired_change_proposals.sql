-- Phase 3c retirement: drop the phase6b prompt_change_proposals + audit
-- system now that the Archetype Workshop (20260720_phase3c_archetype_proposals)
-- replaces it.
--
-- Snapshot at drop time (verified via MCP just before this migration):
--   - prompt_change_proposals: 1 row (created 2026-07-20 00:49:37, a test row)
--   - admin_audit_log:         0 rows
-- Both are safe to drop.
--
-- No code references remain — AdminChangeProposals.tsx was deleted, the
-- Prompt Lab "propose change" form now links into /admin/workshop, and
-- the retention-sweep TODO was cleaned up.

drop function if exists public.approve_prompt_change_proposal(uuid, text);
drop function if exists public.approve_prompt_change_proposal(uuid);
drop table if exists public.prompt_change_proposals cascade;
drop table if exists public.admin_audit_log cascade;

drop function if exists public.is_global_approver();
alter table public.profiles drop column if exists is_global_approver;
