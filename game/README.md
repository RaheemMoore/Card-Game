# The Game deployment

This directory is not the game. It is the **deployment wrapper** for the game —
a Vercel project's root, holding a single `vercel.json`. The game itself is
`card-engine/`, same as it always was.

**This deployment runs zero serverless functions and holds zero provider
secrets.** That is the point of it.

Live: https://card-game-game.vercel.app

## Why this exists

One repository ships three products, and until 2026-08-12 two of them shared a
single Vercel deployment:

| Product | Vercel root directory | Functions | What it is |
|---|---|---|---|
| **Game** | `game/` (this dir) | **0** | What a player buys. Eventually a Steam download. |
| **Studio** | `card-engine/` | 9 | `/admin` — Workshop, Lore Desk, Abilities, Costs. Where content gets made. |
| **Wiki** | repo root | 1 | `studio-wiki/` — the production record. |

The Game and the Studio being one deployment cost real time. Vercel's Hobby plan
caps a deployment at 12 functions, and exceeding it fails the DEPLOY *after* a
completely successful build — which reads as an infrastructure fault rather than
a quota, and cost an afternoon on 2026-08-10. Every one of those functions is
studio tooling. Splitting means studio work can never again break the game's
deploy, and the game carries no provider keys at all.

## What the game ships

`npm run build:game --prefix ../card-engine` runs `vite build --mode game`, and
`card-engine/vite.config.ts` turns two flags off for that mode:

- `VITE_ADMIN_ROUTES=false` — the whole `/admin` tree leaves the bundle.
- `VITE_DEV_ROUTES=false` — the `/dev/*` review harnesses leave with it.

Both flags live in committed config rather than in Vercel's dashboard, so a
deploy whose environment was never configured cannot silently ship the studio
inside the player's download. `/admin` here is not a 403 — the routes do not
exist, and the app's catch-all sends the URL to `/`.

## Why there are no functions (and what that costs today)

There were three, briefly, as re-export shims pointing at `card-engine/api/`.
**They did not work, and the reason is worth keeping.** Vercel's "include files
outside the root directory" setting covers the *build step* only; the serverless
function bundler does not carry files from outside a project's root directory.
So the build went green, the site deployed, and every function crashed on
invocation with `FUNCTION_INVOCATION_FAILED` — the exact class of failure this
split was meant to end. The Wiki's root `api/card-reviews.ts` shim looks like the
same pattern but is not: it reaches *down* into `studio-wiki/`, which is inside
its project root.

Rather than duplicate the auth check and spend gate into a second copy that would
quietly drift, the shims were dropped (Raheem, 2026-08-12). This matches where
the project was already heading: *"the released game needs zero functions — it
ships the curated roster and nothing that spends money."*

**What that costs right now:** the Forge, tier-up and portrait regeneration call
Claude and Leonardo live, so on this deployment they will fail — `/api/*` returns
404 (the SPA rewrite deliberately excludes `api/`, so a stray call gets an honest
404 rather than HTML that would surface as a JSON parse error). Character
creation happens on the **Studio** deployment, which is where content is made
anyway. When the curated roster lands, the game reads a shipped roster and this
gap closes for good.

## Environment variables

Only two, and both are public by design — they ship inside the browser bundle:

| Variable | Why |
|---|---|
| `VITE_SUPABASE_URL` | cards, wallet, auth |
| `VITE_SUPABASE_ANON_KEY` | same; RLS is what protects the data |

**Deliberately NOT set here:** `ANTHROPIC_API_KEY`, `LEONARDO_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`. With no functions to read them they would be dead
weight, and a secret sitting unused in a deployment is a secret that can still
leak. They belong to the Studio project alone.
