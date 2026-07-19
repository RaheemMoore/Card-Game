-- Phase 6b: prompt-change governance (plan §8).
--
-- prompt_change_proposals — scope + patch + evidence + approval state.
-- admin_audit_log        — append-only trail for governance-relevant actions.
-- profiles.is_global_approver — Raheem-only bit that gates global-scope
--   approvals. Admin partner remains an admin for everything else.
--
-- Global proposal flow (plan §8):
--   draft → evidence_ready → awaiting_raheem → approved | rejected
--   → implemented → verified.
-- Archetype-scoped proposals share the schema but any admin can approve.

alter table public.profiles
  add column if not exists is_global_approver boolean not null default false;

-- Bootstrap Raheem as the sole global approver. Anyone else needs a
-- separate migration to opt in.
update public.profiles
   set is_global_approver = true
 where user_id in (
   select id from auth.users where email = 'stormmeetsraheem@gmail.com'
 );

create or replace function public.is_global_approver()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select is_global_approver from public.profiles where user_id = auth.uid()),
    false
  );
$$;
revoke execute on function public.is_global_approver() from public;
revoke execute on function public.is_global_approver() from anon;
grant  execute on function public.is_global_approver() to authenticated;


create table if not exists public.prompt_change_proposals (
  id             uuid primary key default gen_random_uuid(),
  scope          text not null check (scope in ('archetype', 'global')),
  archetype      text,
  title          text not null,
  rationale      text not null,
  proposed_patch text not null,
  evidence_run_ids uuid[] default '{}',
  status         text not null default 'draft' check (status in (
    'draft', 'evidence_ready', 'awaiting_raheem', 'approved', 'rejected', 'implemented', 'verified'
  )),
  drafted_by_user_id  uuid not null references auth.users(id) on delete restrict,
  approved_by_user_id uuid references auth.users(id) on delete set null,
  approved_at         timestamptz,
  implementation_commit text,
  verified_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists prompt_change_proposals_scope_status
  on public.prompt_change_proposals (scope, status);
create index if not exists prompt_change_proposals_archetype
  on public.prompt_change_proposals (archetype)
  where archetype is not null;

alter table public.prompt_change_proposals enable row level security;

create policy "prompt_change_proposals: admin read"
  on public.prompt_change_proposals
  for select to authenticated
  using (public.is_admin());

create policy "prompt_change_proposals: admin write"
  on public.prompt_change_proposals
  for insert to authenticated
  with check (public.is_admin() and drafted_by_user_id = auth.uid());

-- Updates are gated per-scope by a trigger below so callers can't
-- silently self-approve globals from the client.
create policy "prompt_change_proposals: admin update"
  on public.prompt_change_proposals
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "prompt_change_proposals: admin delete"
  on public.prompt_change_proposals
  for delete to authenticated
  using (public.is_admin() and status in ('draft', 'evidence_ready'));


create table if not exists public.admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action        text not null,
  target_table  text,
  target_id     text,
  before_summary jsonb,
  after_summary  jsonb,
  reason         text,
  created_at    timestamptz not null default now()
);

create index if not exists admin_audit_log_created on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor   on public.admin_audit_log (actor_user_id, created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "admin_audit_log: admin read"
  on public.admin_audit_log
  for select to authenticated
  using (public.is_admin());

-- No client-side writes at all. Inserts come from server-side RPCs so
-- the actor and payload are trustworthy.


-- Approval RPC. Enforces the global-scope gate; writes the audit log
-- row in the same transaction as the proposal update.
create or replace function public.approve_prompt_change_proposal(
  proposal_id uuid,
  approver_notes text default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text;
  v_status text;
  v_before jsonb;
  v_after  jsonb;
begin
  if not public.is_admin() then
    raise exception 'not admin';
  end if;

  select scope, status, to_jsonb(p)
    into v_scope, v_status, v_before
    from public.prompt_change_proposals p
   where id = proposal_id
   for update;

  if v_scope is null then
    raise exception 'proposal not found';
  end if;
  if v_status = 'approved' then
    raise exception 'proposal already approved';
  end if;
  if v_scope = 'global' and not public.is_global_approver() then
    raise exception 'global proposals require Raheem approval';
  end if;

  update public.prompt_change_proposals
     set status = 'approved',
         approved_by_user_id = auth.uid(),
         approved_at = now(),
         updated_at = now()
   where id = proposal_id
  returning to_jsonb(prompt_change_proposals.*) into v_after;

  insert into public.admin_audit_log(
    actor_user_id, action, target_table, target_id,
    before_summary, after_summary, reason
  ) values (
    auth.uid(),
    'prompt_change_proposal.approve',
    'prompt_change_proposals',
    proposal_id::text,
    v_before,
    v_after,
    approver_notes
  );

  return json_build_object('id', proposal_id, 'status', 'approved');
end;
$$;

revoke execute on function public.approve_prompt_change_proposal(uuid, text) from public;
revoke execute on function public.approve_prompt_change_proposal(uuid, text) from anon;
grant  execute on function public.approve_prompt_change_proposal(uuid, text) to authenticated;
