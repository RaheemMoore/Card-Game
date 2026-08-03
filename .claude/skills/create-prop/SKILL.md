---
name: create-prop
description: Generate a single object or scenery prop — a horse at a stall, a cart, a brazier, a market crate, an interactive fixture — through sprite-lab with the object validator, cheapest-attempt-first ordering, and a hard attempt cap before falling back to static. Use when a scene needs a discrete thing rather than a character or a full plate. Do NOT use for a character, NPC or boss (that's create-character-sprite / create-boss), a full painted environment (that's create-arena), or an object that is really part of the plate's painting (leave it in the plate).
---

# Skill: create-prop


> **Studio V2 contracts:** Before any paid call, follow [PAID_OPERATION_POLICY.md](../../studio/PAID_OPERATION_POLICY.md). Final acceptance uses [EVIDENCE_VERDICT_CONTRACT.md](../../studio/EVIDENCE_VERDICT_CONTRACT.md). Group expected provider calls into one approved batch with a stop limit; recovery, download, sheet, validation, and local finishing steps are not new paid approval events.

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

## Step 1b — Prefer objects with LOW DIRECTIONAL REQUIREMENT

Raheem, after six generations lost to a card rack that would not sit against a wall:
*"If we're having trouble with directions, maybe we should lean toward objects that have
less requirement for a directional input. Like the bench — after you took the back off,
the non-requirement direction makes it very useful. Maybe a really nice lamp in that
corner, maybe a really nice chest. Something that doesn't need a specific direction."*

This is the cheapest quality lever in the whole prop pipeline, and it is a DESIGN choice
made before any generation is spent.

**An object's directional requirement is how much its appearance depends on which way it
faces.** It is not about symmetry for its own sake — it is about how many distinct
generations the object will eventually cost.

| Requirement | Examples | Cost |
|---|---|---|
| **None** — reads the same from any angle | barrel, chest, brazier, planter, lamp post, rug, crate, well, **backless bench** | One generation, placed anywhere, reused across every area |
| **Low** — a clear top but no front | round table, fountain, cauldron, stack of crates | One generation, minor placement care |
| **High** — mandatory front face | bookshelf, display rack, cabinet, stall, workbench, anything with a facade | One generation PER ORIENTATION, and each is a fight |

**The bench is the worked example.** As a park bench with a backrest it has a mandatory
front, and three separate prompt attempts failed to produce a convincing rear view against
a very strong front-view prior. Deleting the backrest removed the requirement entirely:
the backless version reads correctly from every direction, so it is one asset reused
everywhere instead of a front variant and a back variant kept in sync. **Changing the
object beat fighting the prior**, and the result was more useful than what was asked for.

**When a high-requirement object is genuinely needed**, the lever is "perfectly symmetrical
left to right" in the prompt — see Step 3. Never state an angle in degrees; text-to-image
cannot parse it and will fall back on its own default three-quarter pose.

**When it is not needed, substitute.** A corner that fought a bookshelf for six
generations is better served by a chest or a lamp, which will land first try.

## Step 4b — If you trimmed it, cap it. If you're guessing, let Raheem place it.

Two rules that came out of the courtyard forge and now apply to every prop.

**A trimmed asset needs end caps.** Trimming an approved generation is correct — free,
and it protects a result from a re-roll that might lose its axis or palette. But a cut
edge reads as a mistake rather than a boundary. `lib/cap_run.py` welds a cap onto both
ends: ground-line aligned, overlapping rather than abutting, one asset mirrored for both
sides, baked to a single PNG. The shared cap library lives in `configs/endcaps.json`.

Two things that keep caps reusable: swatch the cap's forced palette **from the body it
caps, not from the scene** (a plate-derived swatch made the first one olive-gold because
the plate is mostly paving), and generate it tall — a cap shorter than the edge it covers
has achieved nothing.

**Raheem places finished art. You do not.** The moment a piece is finished, upload it into
the plate frame in Figma as an `art-<id>` layer and stop. He drags it where it belongs and
says so; read the node back and use that rect verbatim. Two rules learned the hard way:

- **Never touch a node while he is positioning it.** Resizing `art-forge` mid-adjustment
  once wiped work he had just done. Read-only until he says he is finished.
- **A FIT fill letterboxes.** The node's frame is not the art rect — derive the visible
  rect from the source aspect, or the sprite ships stretched. `art-forge`'s frame was
  272x240 while the drawn art was 272x196.

**Stop guessing arrangements. Put the pieces in Figma.** Position, scale and how pieces
sit together are judgements, and Raheem makes them faster and more clearly than a
description can. Upload the real sprites at native size to the composition bench, let him
slot them, then bake with `lib/compose_from_figma.py`. His ground line is a per-column
CUT PROFILE, not a level — it can sit high under one piece and dip under another, which
is how depth gets expressed.

The same principle upstream: `lib/placement_brief.py` derives an object's size and
required facing from where its footprint mark sits, so the angle is read off a position
rather than written from a description. That fix exists because the forge came back on
the wrong axis twice.

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
