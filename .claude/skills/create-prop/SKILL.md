---
name: create-prop
description: Generate a single object or scenery prop — a horse at a stall, a cart, a brazier, a market crate, an interactive fixture — through sprite-lab with the object validator, cheapest-attempt-first ordering, and a hard attempt cap before falling back to static. Use when a scene needs a discrete thing rather than a character or a full plate. Do NOT use for a character, NPC or boss (that's create-character-sprite / create-boss), a full painted environment (that's create-arena), or an object that is really part of the plate's painting (leave it in the plate).
---

# Skill: create-prop

A prop is the cheapest asset in the pipeline and the easiest to overspend on, because it
looks trivial. The discipline is entirely about **attempt budgets** and **knowing when to
ship static**.

Read [HARNESS_INDEX.md](../../../HARNESS_INDEX.md) first.

---

## Step 0 — First, decide it should be a prop at all

Three options, in ascending cost:

1. **Paint it into the plate.** Free. Correct for anything that never moves and is never
   walked behind. Default to this.
2. **Cut it out of the plate** as an occluder via `lib/slice_occluders.py`. Also free, and
   style match is exact **by construction** — the standing rule for scenery layers, and the
   same reason `finish_arena.py` cuts its canopy from the plate itself.
3. **Generate it as a sprite.** Only when it must animate, must be repositionable, or must
   be reused across several scenes.

**Only continue if the answer is 3.** Consult `environment-art-director` if unsure.

---

## Step 1 — Intake

1. **What is it, in one sentence, including its view angle?** Top-down and side views are not
   interchangeable and a side-view prop will not sit on a top-down plate.
2. **Does it animate?** Most props do not. Static is a legitimate, and often correct, answer.
3. **Is it scenery or an interaction?** The horse gets a collider so the player walks around
   him, but **no proximity ribbon and no Tab entry** — he is not an interaction. Say which,
   explicitly.
4. **Is anything attached to it?** Bake attachments into the same sprite so they can never
   drift out of alignment — the horse's hay pile is part of the horse for exactly that reason.
5. **Will it be reused?** If yes, prefer a version not welded to its context (an idle that
   works in a stable, a road *or* an inn yard beats one that only works beside a hay pile).

---

## Step 2 — Config

`card-engine/scripts/sprite-lab/configs/prop-<slug>.json`. Copy `prop-horse.json`.

| Field | Note |
|---|---|
| `pipeline` | `v3` |
| `identity.description` | Include the view angle in the sentence itself |
| `identity.avoid` | Name what must not appear — "no rider, no saddle, no cart, no armour, no person" |
| `style.templateId` | For quadrupeds: `horse`, `bear`, `cat`, `dog`, `lion`. Picks the skeleton. |
| `style.view` | `high top-down` / `low top-down` — must match the plate's camera |
| `seed` | **Always explicit.** Without it the prop cannot be rebuilt. |
| `directions` | **Only the directions actually used.** The horse faces the stalls, so `east` only — 1 generation per attempt instead of 4. |
| `notes` | Write the probe reasoning and the attempt order here, before generating |

**Animation templates are per body template.** `breathing-idle` is humanoid-only and 422s on
`horse`. Check the template's own set first — the horse's list is recorded in
`prop-horse.json`'s notes.

**M5.7 applies to any prop with a figure on or near it.**

---

## Step 3 — Declare the probe, the attempt order, and the cap

This is the step that makes a prop cheap. Write it into `notes` **before** generating:

> **PROBE.** A top-down grazing quadruped with hay baked into the same sprite is unproven.
> Risks: hay detached or mis-scaled; a side view that will not sit on a top-down plate.
> Attempt order: `rest-idle`, then `idle-shaking-head` (a bigger, more legible motion at
> 84px than a jaw), then `eat-end` as the head-down fallback.
> **THREE ATTEMPTS TOTAL, then ship static permanently.**

Order attempts **cheapest and most standard first**. `eating` stalled server-side twice
("Generation stalled and was automatically failed", progress running backwards
0.4 → 0.05 → 0.18, nothing charged) — the API splitting eat-start / eating / eat-end is the
tell that "eating" is the long looping middle, and a watchdog timeout is what that failure
signature looks like. An idle is shorter and more standard.

Prefer **legibility at the prop's real on-screen size**. A jaw moving at 84px is invisible; a
head shake is not.

**The cap is real.** When it is hit, ship static and move on. A static prop in the scene beats
a perfect one that never lands.

---

## Step 4 — Generate and validate

```bash
cd card-engine
node scripts/sprite-lab/sprite-lab.mjs gen prop-<slug>
python3 scripts/sprite-lab/lib/validate_object.py scripts/sprite-lab/out/prop-<slug>
```

`validate_object.py` is the object gate — not `validate.py`, which is the walker gate. The
clipped-horse known-bad fixture exists because this check caught it.

If the prop must match a scene's palette or lighting, run `lib/palette_ref.py`,
`lib/harmonize.py` or `lib/relight.py` rather than re-rolling.

---

## Step 5 — Review by watching

For an animated prop, use the clip sheet — same rule as bosses. **Stills cannot catch drift.**

```bash
node scripts/sprite-lab/boss-sheet.mjs scripts/sprite-lab/out/prop-<slug>
```

Then composite it onto its real plate with `lib/compose_sample.py` and look at it **at game
scale**, not zoomed. Publish as an Artifact — images, never markup.

---

## Step 6 — Place it

Follow `place-character-in-scene` for collider and anchoring rules:

- **Collider is feet-anchored**, traced onto the plate
- Scenery props get a collider and nothing else — no proximity ribbon, no Tab entry
- Run `lib/check_reachability.py` after adding any collider; a prop can silently seal a route

---

## Step 7 — Append to the playbooks

`PIXELLAB_PLAYBOOK.md` — attempts used, which template worked, and **whether the probe risk
actually materialised**. (For the horse it did not: the hay came through attached in the
rotation, so no separate hay object was needed. That negative result is worth recording.)

Add the config to `HARNESS_INDEX.md`'s table. If the prop failed in a new way, propose a
known-bad fixture.
