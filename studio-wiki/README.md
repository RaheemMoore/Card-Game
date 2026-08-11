# Card Engine Studio Wiki

The repository-backed visual and production Wiki for Card Engine. It is an independent
React/Vite application that deploys separately from the playable game while sharing the same
canonical documents and optimized web assets.

## Local development

```powershell
cd studio-wiki
npm install
npm run dev
```

## Content model

- `PRODUCTION.md` is imported at build time through the content adapter in `vite.config.ts`.
- Web-sized game assets are reused from `card-engine/public/assets` without duplication.
- Full-resolution originals can remain in future OpenNest storage; the Wiki is their catalog,
  not their only storage location.
- Missing or uncommitted media must use an honest pending state rather than substitute art.

## Deployment boundary

Deploy this directory as its own Vercel project and URL. `vercel.json` preserves direct links
to Wiki sections. Deployment and access protection require Raheem's separate approval.

## Access model

As of 2026-08-10 the desks no longer ask anyone to sign in with a Card Engine account.
Raheem, 2026-08-10: *"We're the only two getting in there, and we should see each other's
desk. There should be no differentiation."*

One shared passphrase opens the Wiki, and inside it the two desks are the same surface —
`/work/raheem` and `/work/tori` are literally the same component with a different prop.
The `raheem` / `tori` label is authorship so a note is readable months later; it never
decides what anyone may edit.

### Required environment variables

Copy `.env.example` to `.env.local` for local development, and set the same names on the
studio-wiki Vercel project. **None of these may be `VITE_`-prefixed** — Vite inlines
`VITE_*` into the browser bundle.

| Variable | Purpose |
|---|---|
| `STUDIO_PASSPHRASE` | The shared passphrase. |
| `STUDIO_COOKIE_SECRET` | Signs the unlock cookie. Rotating it signs both devices out. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | How `/api/desk` reaches the desk tables. |

`npm run dev` serves the `api/` folder through a dev-only Vite middleware, so the desks work
locally without `vercel dev`.

### What the passphrase does and does not protect

It is a **real, server-enforced gate on desk data.** `studio_idea_replies` and
`studio_desk_reads` have RLS enabled with no permissive policies, so `/api/desk` and its
service-role key are the only way in, and that function rejects any request without a valid
signed cookie.

It is **only a soft gate on the static Wiki pages.** Their content is compiled into the JS
bundle at build time, so a client-side gate hides them rather than withholding them. Truly
protecting the reference pages needs Vercel Deployment Protection at the edge — a dashboard
setting, not something this codebase can do.

One deliberate exception: if the desk service is misconfigured the gate offers a way through
with the desks marked unavailable. Bricking the whole Wiki over a missing environment
variable is a worse failure than the one the gate exists to prevent.

### Still account-based, on purpose

The **Cards** review room (`/characters/cards`) and the **write** side of Tori's lore desk
still use Supabase accounts. Both write a real `reviewer_id` / author foreign key to
`profiles`, and moving them behind a shared passphrase would erase who did what. Reading
Tori's lore queue already needs no sign-in.
