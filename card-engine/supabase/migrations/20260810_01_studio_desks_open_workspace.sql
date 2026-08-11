-- Studio Wiki desks: one open two-person workspace
--
-- Raheem, 2026-08-10: "We're the only two getting in there, and we should see each
-- other's desk. There should be no differentiation."
--
-- MUST run after 20260803_02_shared_studio_ideas_access.sql. The date prefix keeps
-- that ordering; see that file's header for why the _01/_02 sequence is load-bearing.
--
-- What changes, and why the shape moves:
--
-- The Wiki no longer signs partners in with a Supabase account. It sits behind one
-- shared studio passphrase, checked server-side, and every desk read and write goes
-- through the `/api/desk` serverless function using the service-role key. There is
-- therefore no `auth.uid()` on a desk request, which is why authorship moves from
-- `owner_id` (a real FK to an account) to `author` (a plain 'raheem' | 'tori' label).
--
-- `owner_id` is kept, and made nullable, so no existing row loses its provenance.

-- ---------------------------------------------------------------------------
-- 1. studio_ideas becomes a two-desk, taggable, pinnable shared notebook
-- ---------------------------------------------------------------------------

alter table public.studio_ideas
  alter column owner_id drop not null,
  add column if not exists desk text not null default 'raheem',
  add column if not exists author text not null default 'raheem',
  add column if not exists pinned boolean not null default false,
  add column if not exists tags text[] not null default '{}',
  add column if not exists needs_call_from text;

-- Backfill authorship from the account that wrote each existing note. The studio is
-- two people with two roles, so the role IS the identity: admin is Raheem, and
-- lore_director is Tori. Notes land on their author's own desk.
update public.studio_ideas as idea
set author = case when profile.role = 'lore_director' then 'tori' else 'raheem' end,
    desk = case when profile.role = 'lore_director' then 'tori' else 'raheem' end
from public.profiles as profile
where profile.user_id = idea.owner_id;

alter table public.studio_ideas
  add constraint studio_ideas_desk_known check (desk in ('raheem', 'tori')),
  add constraint studio_ideas_author_known check (author in ('raheem', 'tori')),
  add constraint studio_ideas_needs_call_known
    check (needs_call_from is null or needs_call_from in ('raheem', 'tori')),
  add constraint studio_ideas_tag_count check (cardinality(tags) <= 12);

create index if not exists studio_ideas_desk_pinned_idx
  on public.studio_ideas(desk, pinned desc, created_at desc);

-- Deletion is now allowed. v1 withheld it to prevent accidental permanent loss, but
-- a notebook you cannot prune stops being a place you want to write. The UI confirms
-- before deleting; this policy is what lets the account-authenticated path keep parity
-- with the passphrase path.
drop policy if exists "studio ideas: partner delete" on public.studio_ideas;
create policy "studio ideas: partner delete"
  on public.studio_ideas for delete
  using (public.is_lore_director());

-- ---------------------------------------------------------------------------
-- 2. Replies — what turns a note into a conversation
-- ---------------------------------------------------------------------------

create table if not exists public.studio_idea_replies (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.studio_ideas(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_idea_replies_author_known check (author in ('raheem', 'tori')),
  constraint studio_idea_replies_body_nonempty check (length(trim(body)) > 0),
  constraint studio_idea_replies_body_length check (length(body) <= 20000)
);

create index if not exists studio_idea_replies_idea_created_idx
  on public.studio_idea_replies(idea_id, created_at);

drop trigger if exists studio_idea_replies_set_updated_at on public.studio_idea_replies;
create trigger studio_idea_replies_set_updated_at
before update on public.studio_idea_replies
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Read stamps — two rows, ever, backing the unread count
-- ---------------------------------------------------------------------------

create table if not exists public.studio_desk_reads (
  person text primary key,
  last_seen_at timestamptz not null default now(),
  constraint studio_desk_reads_person_known check (person in ('raheem', 'tori'))
);

insert into public.studio_desk_reads (person, last_seen_at)
values ('raheem', now()), ('tori', now())
on conflict (person) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Both new tables are server-only
-- ---------------------------------------------------------------------------
--
-- RLS is enabled with NO permissive policies, so anon and authenticated get nothing
-- at all. The `/api/desk` function reaches them with the service-role key, which
-- bypasses RLS — that function's passphrase check is the real gate, and this is what
-- guarantees there is no second, unguarded door straight into the browser.

alter table public.studio_idea_replies enable row level security;
alter table public.studio_desk_reads enable row level security;

revoke all on public.studio_idea_replies from anon, authenticated;
revoke all on public.studio_desk_reads from anon, authenticated;
