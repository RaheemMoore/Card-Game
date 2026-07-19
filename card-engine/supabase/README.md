# Supabase — Card Engine

Source-of-truth SQL for the schema applied to project `ofrcpmiytqgziozsourn`
(project name: **Card-Game**, region us-west-2). Migrations here are applied via
the Supabase MCP tools; the files exist so the schema is version-controlled and
reviewable in diffs.

## Migrations

Applied in order:

1. `20260717_phase2_persistence_core_tables.sql` — profiles, cards, economy_transactions + RLS + indexes.
2. `20260717_phase2_portraits_storage_bucket.sql` — private `portraits` bucket + per-user-path RLS on `storage.objects`.
3. `20260717_phase2b_role_column_and_admin_rls.sql` — `profiles.role` (`user`/`admin`) + `is_admin()` SECURITY DEFINER helper + widened owner-or-admin RLS on core tables.
4. `20260717_phase2b_admin_rpcs.sql` — admin RPCs (`list_users_for_admin`, `get_system_stats`, `grant_admin_adjustment`).
5. `20260718_phase3_ability_tables.sql` — ability definitions, versions, canonical_art_assets, discoveries + library-read RLS.
6. `20260718_phase3b_boss_tables.sql` — boss definitions + versions.
7. `20260719_phase0_api_usage_events.sql` — append-only telemetry for every external provider call. Admin-only SELECT via `is_admin()`; inserts go through `SUPABASE_SERVICE_ROLE_KEY` from server endpoints only.

## One manual step required

Anonymous sign-in is a **project-level auth setting** (not SQL). Enable it in
the Supabase dashboard before the app can boot against this project:

- Dashboard → Authentication → Providers → **Anonymous Sign-Ins** → toggle on.

Without this, `supabase.auth.signInAnonymously()` returns an error and the app
falls back to legacy localStorage-only mode with a warning.

## Server-side env vars (Vercel Functions)

The `card-engine/api/**` handlers require these env vars, set server-side only
(never with the `VITE_` prefix, which would bake them into the client bundle):

- `ANTHROPIC_API_KEY` — Messages key used by `/api/anthropic-messages`.
- `ANTHROPIC_ADMIN_API_KEY` — Admin key used by `/api/anthropic-admin-usage`. Optional; on plans without Admin API access the endpoint reports every probe as 401 and the ops dashboard shows Anthropic balance as `Live balance unavailable`.
- `LEONARDO_API_KEY` — used by `/api/leonardo`, `/api/s3-upload`, `/api/leonardo-account`.
- `SUPABASE_SERVICE_ROLE_KEY` — used by `_lib/auth.ts` for the `is_admin()` role lookup (bypasses RLS) and by `_lib/recordApiUsage.ts` for `api_usage_events` inserts.

Falls back to `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` for the Supabase URL + anon key if the un-prefixed variants aren't present.

## Local dev without Supabase

If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is unset in `card-engine/.env`,
the app runs on the legacy localStorage path (pre-Phase-2 behavior). Useful for
offline dev and for demo builds you don't want writing to the shared project.
