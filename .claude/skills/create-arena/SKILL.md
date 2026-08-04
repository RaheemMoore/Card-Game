---
name: create-arena
description: Produce a new battle arena or environment plate end to end — brief intake, bg-harness config with a written failure record, gated generation, deterministic finishing via finish_arena.py, manifest registration, and in-game verification against the HUD/party/platform composition contract. Use whenever a new fight location, tower floor, castle plate or forge background is needed, or when an existing plate is being re-rolled. Do NOT use for card portrait backgrounds (that's art-pipeline), for tracing an existing plate into a walkable scene (that's trace-environment), or for the boss who fights there (that's create-boss).
---

# Skill: create-arena


> **Studio V2 contracts:** Before any paid call, follow [PAID_OPERATION_POLICY.md](../../studio/PAID_OPERATION_POLICY.md). Final acceptance uses [EVIDENCE_VERDICT_CONTRACT.md](../../studio/EVIDENCE_VERDICT_CONTRACT.md). Group expected provider calls into one approved batch with a stop limit; recovery, download, sheet, validation, and local finishing steps are not new paid approval events.

An arena is not a picture, it is a **stage with contracts**. The HUD sits on it, the party
stands on it, the boss's platform is drawn in code on top of it, and its colours are
reserved against the VFX that will fire over it. Get the picture right and the contracts
wrong and the plate is unusable at any level of beauty.

Read [HARNESS_INDEX.md](../../../HARNESS_INDEX.md) first. Everything below already exists.

---

## Step 0 — Consult, before any spend

Invoke **`environment-art-director`** via the `consult-specialist` six-field prompt. If the
location carries lore weight (a homeland, a faction seat, a tower floor tied to an
archetype), also invoke **`lore-fantasy-director`**. Both are advisory; Raheem approves.

Bring back a ranked recommendation with estimated generation count, not an option tree.

---

## Step 1 — Intake (conversational, not a document)

Raheem prefers inline interview. Get:

1. **Whose ground is this?** Arenas belong to a boss or a floor. That ownership drives everything.
2. **What is the one-line read?** "An overgrown forest colosseum, ruined and half-swallowed, his pink bloom polluting everything." If it takes a paragraph, it is not settled.
3. **What VFX colours are reserved?** List the boss's action colours. Those must be dormant in the plate.
4. **Frontal stage or top-down map?** Frontal → Phoenix. Top-down → Lucid Origin. Do not mix within a set.
5. **Is Raheem painting it himself?** He sometimes generates the plate in Leonardo/Gemini directly. If so, skip to Step 4 and write him an `ARENA_HANDOFF_<slug>.md` instead (template: `ARENA_HANDOFF_still-season.md`).

---

## Step 2 — Write the config

`card-engine/scripts/bg-harness/configs/arena-<slug>.json`. Copy the shape of
`arena-still-season.json`.

**The `_readme` block is the deliverable, not decoration.** It records what each rejected
round died of. That file is why round 5 worked, and it is the most reusable artifact this
pipeline produces. Write it as you go, not afterward.

Required fields:

| Field | Value / note |
|---|---|
| `model` | `phoenix` (frontal) or `lucid-origin` (top-down). Never switch mid-set. |
| `width` / `height` | `1360 × 768` for arenas. Fixed. |
| `alchemy` | `false` |
| `presetStyle` | `"NONE"` — omitting it applies a cinematic default that pulls toward smooth matte painting |
| `styleHeader` | Shared across every image in the set. Carries the pixel-art register and the "depth from flat overlapping layers, no vanishing point" clause. |
| `negative` | ≤1000 chars, hard cap enforced at submit |
| `anchors` | One per tonal family |
| `states` | Each with `family`, `line`, and `isAnchor` where it reuses the anchor free |
| `styleRefFile` | **Usually absent.** Referencing a shipped stone arena onto a green brief imported its lava-web floor wholesale even at Low. |

**Prompt cap 1500 chars.** `harness.mjs` checks locally; verify it still does before a batch.

### The two prompt rules that cost the most

**Name the object, never negate an absence.** "No sky" fails — it asks for nothing in the
highest-attention region of the frame. Name what occupies it: *the tiers rise to the top
edge of the frame; the canopy hangs dark across the top.*

**Read the prompt back as one sentence and find what cancels.** "Densest and most rotten"
plus "flat, unbroken and uncluttered" describing the same region made the model move the
rot to the perimeter — the opposite of the brief. Do this pass out loud before submitting.

### The composition contract — non-negotiable

| Region | Requirement |
|---|---|
| Top-left ~372×196, top-right ~320px | Dark, low detail — HUD panels |
| Centre-middle | Open, uncluttered — boss + `BossPlatform` |
| Lower third | Flat, low contrast — the party reads against it |
| Bottom ~8.5rem | Discarded — under the command shelf |
| All edges 4–5% | Clear — the plate is `cover`-cropped |

**No raised dais** — `BossPlatform.tsx` draws it in code. **Nobody in frame**, and never
describe the space by its occupants ("a floor where three figures can stand" painted three
tiny fighters on it once).

---

## Step 3 — Generate, gated

```bash
cd card-engine
node scripts/bg-harness/harness.mjs gen arena-<slug> <anchorStateId>   # ONE image first
```

**Look at it before releasing the rest.** Then:

```bash
node scripts/bg-harness/harness.mjs gen arena-<slug>      # fills gaps only, re-runs are cheap
node scripts/bg-harness/harness.mjs sheet arena-<slug>    # HTML review gallery
```

**Show Raheem the images, never the markup** — publish the sheet as an Artifact or read the
PNGs inline. He cannot read HTML.

Failed rounds stay on disk under `out/arena-<slug>/r<N>-rejected/`. They are evidence.

---

## Step 4 — Finish deterministically

Framing problems are solved in code, not by re-rolling.

```bash
python3 scripts/bg-harness/lib/finish_arena.py <in.png> <out.png> [--cut N] [--no-canopy] [--scale 4]
```

Seven passes: crop sky → re-composite canopy cut *from the plate itself* → warm the grade →
darken the HUD corners → damp the blight to dormant → flatten the lower third → pixelize.
Free and re-runnable, and it does not re-roll the look.

**Ask "can a code layer do this?" before approving another paid round.** Suspended leaves
failed 6/6 in generation and ship as 20–40 fixed sprites at zero velocity — strictly
better, since everything else on screen moves and they conspicuously will not.

---

## Step 5 — Register (the step that gets missed)

1. `card-engine/public/assets/combat/arenas/<slug>/base.png`
2. `src/data/combat/arenaManifest.ts` — new entry with `id`, `path`, measured `dimensions`,
   `approvalStatus: 'candidate'`, `promptVersion`, and `notes` recording model, seed, what
   was rejected, and that it contains no dais.
3. Bind the arena to its boss/encounter.
4. Keep losing candidates on disk and say so in `notes`.

**`approvalStatus` starts at `candidate`.** Only Raheem moves it to `approved`.

---

## Step 6 — Verify in game, not in the gallery

Start the dev server via `preview_start` (never Bash), open the battle, and check:

- HUD panels legible against the upper corners
- Party sprites read against the lower third
- `BossPlatform` sits convincingly — no floating feet
- Fire the boss's signature attack: **does its colour still read as an event**, or has it
  merged into the plate?
- Resize to iPhone portrait — the plate is `cover`-cropped and edges are trimmed

Screenshot and show Raheem.

---

## Step 7 — Append to the playbooks

- `LEONARDO_PLAYBOOK.md` — what worked, what it cost, how many rounds
- Update `HARNESS_INDEX.md`'s config table with the new arena
- If Raheem painted the plate, keep the `ARENA_HANDOFF_<slug>.md` — it is the contract for
  the next one

**Append whether it worked or not.** The failures are worth more than the successes.

---

## Reuse review

Before finishing, ask: did anything in this run get solved by hand that should be a library
script or a new `finish_*.py` pass? If yes, raise it — Raheem approves before it is built.
