# Studio desks — what's left, and what needs Tori in the room

**Opened 2026-08-11.** Raheem meets Tori 2026-08-12. This list exists because the desk
work landed in one session but several of its decisions are genuinely two-person
decisions, and "we'll sort it when we meet" is exactly the kind of thing that quietly
becomes never. Tick items off here; delete the file when it is empty.

Context for the whole list: [studio-wiki/README.md](README.md) §Access model.

---

## A. Before the meeting — blocking production

| # | What | Owner | State |
|---|---|---|---|
| A1 | Run the desk migration + passphrase seed in the Supabase SQL editor. One paste. Claude is blocked from writing to Supabase by an environment permission and cannot do this itself. | Raheem | **BLOCKING** |
| A2 | Merge the desk PR to `main`. Held deliberately until A1 lands — deploying the new code against an unmigrated database would replace a working (if annoying) signed-in desk with a broken one. | Claude, once A1 is done | Waiting on A1 |
| A3 | Verify the live desks end to end on `card-engine-studio-wiki.vercel.app` after the deploy. | Claude | Waiting on A2 |

Nothing else is blocking. `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` are **already set** on the studio-wiki Vercel project —
confirmed because `/api/card-reviews` answers 401 (auth check) rather than 500 (not
configured). No new environment variable is needed: the passphrase lives in the
`studio_access` table as an scrypt hash, precisely so no dashboard trip is required.

## B. At the meeting — needs Tori

| # | What | Why it needs her |
|---|---|---|
| B1 | **Hand her the passphrase**, in person or by a channel she already trusts. Then use the desk toolbar's **"Change passphrase"** to set one you both chose — the generated one is a bootstrap, not a decision. | It is a shared secret; she should have had a say in it and should not receive it second-hand. |
| B2 | **Walk her desk with her.** Does she want her PRODUCTION.md lore projection where it is (collapsed, below the notebook), or above it? Does the notebook belong on her desk at all, or is her real surface the lore queue? | This is the question the old page answered by guessing, and guessing is what made it a document she could not write on. |
| B3 | **The lore editor design pass.** `src/LoreDesk.tsx` says in its own header that it is provisional and must not be treated as finished — Raheem: *"we'll go design the editor and review it in her workspace and make sure she has all the tools she needs there."* This meeting is the first chance to ground that in her actual use rather than guesses. | She is the only person who knows what is missing. |
| B4 | **Should tags be a fixed vocabulary?** Right now any word can become a tag. Free tags rot into near-duplicates (`lore`, `lore-review`, `Lore`) once two people use them. | Cheap to constrain now, expensive after fifty notes. |
| B5 | **Does she want notification of a "needs your call" flag** outside the wiki — or is opening the desk enough? | Adding a notification path is a real decision; adding it on a hunch is how inboxes get noisy. |

## C. After the meeting — deferred on purpose

| # | What | Why it was deferred |
|---|---|---|
| C1 | **Vercel Deployment Protection** on the studio-wiki project. The passphrase is a real, server-enforced gate on desk *data*, but only a soft gate on the reference pages, whose text is compiled into the JS bundle at build time. Real protection for those is an edge setting, not a code change. | Needs the Vercel dashboard and possibly a plan tier; not a code problem. |
| C2 | **The Cards review room** (`/characters/cards`) still asks for a Supabase account. Its verdicts write `card_review_decisions.reviewer_id`, a real FK to `profiles`; a shared passphrase would erase who recorded what. | Genuine trade-off between convenience and provenance. Raheem's call, ideally with Tori's view on whether she cares who X'd a card. |
| C3 | **Writing lore** in the lore queue still needs an account for the same reason (`confirmCharacterLore` records an author). Reading it already needs no sign-in. | Same trade-off as C2; decide the two together. |
| C4 | **Pre-existing:** `MarkdownBody` emits React duplicate-key warnings on every `PRODUCTION.md`-backed page (`/work/advice` shows it too). Not caused by the desk work. | Cosmetic, unrelated, worth a separate small fix. |
| C5 | **Pre-existing:** `assetManifest.test.ts` fails on `main` — it lists `assets/combat/heroes/archetypes`, which does not exist in `card-engine/public`. | Unrelated to the desks; either the folder or the manifest entry is wrong. |

---

## What already works, so nobody re-litigates it

- `/work/raheem` and `/work/tori` are the **same component with a different prop**. There is
  no code path where one desk can do something the other cannot.
- Either person can read, write, edit, tag, pin, reply to and **delete** anything on either
  desk. Names record authorship; they never gate access.
- Unread counts only count the *other* person's writing, and clear on "mark seen".
- The gate is server-enforced: no cookie, a wrong phrase, or a tampered cookie all return
  401 and no data.
