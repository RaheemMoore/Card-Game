# Supabase — Card Engine

Source-of-truth SQL for the schema applied to project `ofrcpmiytqgziozsourn`
(project name: **Card-Game**, region us-west-2). Migrations here are applied via
the Supabase MCP tools; the files exist so the schema is version-controlled and
reviewable in diffs.

## Migrations

Applied in order:

1. `20260717_phase2_persistence_core_tables.sql` — profiles, cards, economy_transactions + RLS + indexes.
2. `20260717_phase2_portraits_storage_bucket.sql` — private `portraits` bucket + per-user-path RLS on `storage.objects`.

## One manual step required

Anonymous sign-in is a **project-level auth setting** (not SQL). Enable it in
the Supabase dashboard before the app can boot against this project:

- Dashboard → Authentication → Providers → **Anonymous Sign-Ins** → toggle on.

Without this, `supabase.auth.signInAnonymously()` returns an error and the app
falls back to legacy localStorage-only mode with a warning.

## Local dev without Supabase

If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is unset in `card-engine/.env`,
the app runs on the legacy localStorage path (pre-Phase-2 behavior). Useful for
offline dev and for demo builds you don't want writing to the shared project.
