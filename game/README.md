# The Game deployment

This directory is not the game. It is the **deployment wrapper** for the game —
a Vercel project's root, holding a `vercel.json` and the three serverless
functions the game actually needs. The game itself is `card-engine/`, same as it
always was.

## Why this exists

One repository ships three products, and until 2026-08-12 two of them shared a
single Vercel deployment:

| Product | Vercel root directory | Functions | What it is |
|---|---|---|---|
| **Game** | `game/` (this dir) | 3 | What a player buys. Eventually a Steam download. |
| **Studio** | `card-engine/` | 9 | `/admin` — Workshop, Lore Desk, Abilities, Costs. Where content gets made. |
| **Wiki** | repo root | 1 | `studio-wiki/` — the production record. |

The Game and the Studio being one deployment cost real time. Vercel's Hobby plan
caps a deployment at 12 functions, and exceeding it fails the DEPLOY *after* a
completely successful build — which reads as an infrastructure fault rather than
a quota, and cost an afternoon on 2026-08-10. Every one of those functions is
studio tooling; the game needed three of them. Splitting means studio work can
never again break the game's deploy, the game stops requiring the studio's
provider secrets, and the eventual offline build has somewhere to grow from.

## What the game ships

`npm run build:game --prefix ../card-engine` runs `vite build --mode game`, and
`card-engine/vite.config.ts` turns two flags off for that mode:

- `VITE_ADMIN_ROUTES=false` — the whole `/admin` tree leaves the bundle.
- `VITE_DEV_ROUTES=false` — the `/dev/*` review harnesses leave with it.

Both flags live in committed config rather than in Vercel's dashboard, so a
deploy whose environment was never configured cannot silently ship the studio
inside the player's download. `/admin` on this deployment is not a 403 — the
routes do not exist, and the app's catch-all sends the URL to `/`.

## The three functions, and why they are shims

`api/*.ts` here re-export from `card-engine/api/`. The implementations stay
shared on purpose: the JWT check, the spend gate and the `api_usage_events` row
are what stand between a stranger and a provider bill, and a forked second copy
is how one of them quietly stops matching the other. Same pattern as the Wiki's
root `api/card-reviews.ts`.

They exist because the forge still generates a character live — Claude writes the
card, Leonardo paints it. **When the curated roster lands, the game needs zero
functions**, this directory keeps only its `vercel.json`, and what remains is a
static bundle ready to be wrapped for Steam.

## Environment variables

Set on the Vercel project for this root directory:

| Variable | Why |
|---|---|
| `ANTHROPIC_API_KEY` | server-side, for `/api/anthropic-messages` |
| `LEONARDO_API_KEY` | server-side, for `/api/leonardo` |
| `VITE_SUPABASE_URL` | client — cards, wallet, auth |
| `VITE_SUPABASE_ANON_KEY` | client |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side; the spend gate reads usage with it |

Deliberately NOT set here: anything the admin surface alone uses. If a new
variable is only read by `/admin`, it belongs to the Studio project.
