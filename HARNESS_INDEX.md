# Harness & Readout Index

> **For current status, open threads and what to work on next, see [PRODUCTION.md](PRODUCTION.md).**
> This file is the tool catalogue only.

**What this is:** the catalogue of every reusable tool this studio has built for making
art, checking art, and understanding the game. Nothing here is one-off. If you are about
to generate an arena, a boss, a prop, or a scene — or you want to *see* how something is
behaving — the tool already exists and is listed below.

**Standing rule (Raheem, 2026-07-31):** every harness and readout we build stays usable
and gets **offered by name** at the start of any work it covers. If I am helping with a
boss, an arena, a sprite or a balance question and I do not name the relevant tool from
this file before starting, that is a miss. When a new harness or readout is built, it is
added here in the same commit.

---

## 1. Generation harnesses

### `card-engine/scripts/bg-harness/harness.mjs` — environments & 2D plates
Leonardo (Phoenix / Lucid Origin). One JSON config per subject in `configs/`.

```bash
node scripts/bg-harness/harness.mjs gen <config> [stateId]   # generate (skips what exists)
node scripts/bg-harness/harness.mjs sheet <config>           # HTML review gallery
```

| Config | What it made | Model |
|---|---|---|
| `arena-still-season.json` | Still Season colosseum (tower floor 2) | Phoenix |
| `arena-debt-bearer.json` | Barbarian moot ground | Phoenix |
| `tower.json` | Tower floor discs, rings, pedestals | Lucid Origin |
| `courtyard.json` / `courtyard-v2.json` | Castle courtyard plate | Lucid Origin |
| `druid.json` | Druid forge scene layers | Phoenix |
| `bosses.json` | Boss concept exploration | Phoenix |

Re-running `gen` is cheap — it skips anything already in the manifest and only fills gaps.

**Post-processing library** (`bg-harness/lib/`) — deterministic, free, re-runnable:

| Script | Job |
|---|---|
| `finish_arena.py` | The full arena finishing chain: crop sky → re-composite canopy → warm grade → darken HUD corners → damp blight → flatten lower third → pixelize |
| `pixelize.py` | Deterministic pixel grid (the thing that makes plates look like one game) |
| `cutout.py` / `nobg.sh` | Matte a subject off its background |
| `process_plume.py` | Seat + white-fog an element plume for the forge scene |
| `leo.sh` | Raw Leonardo call |

### `card-engine/scripts/sprite-lab/sprite-lab.mjs` — characters, bosses, props
PixelLab. One JSON config per subject in `configs/`.

| Config | Subject | Pipeline |
|---|---|---|
| `boss-still-season.json` | The Still Season (seated boss) | v3 |
| `boss-debt-bearer.json` | The Debt-Bearer | v3 |
| `hero-cardwright.json` / `hero-chibi.json` | Combat heroes | v3 |
| `keeper-archivist.json` / `keeper-dwarf.json` | Castle NPCs | v3 |
| `prop-horse.json` | Grazing horse (scenery prop) | v3, `templateId: horse` |
| `scene-courtyard-pixel.json` | Courtyard scene pass | — |

**Library** (`sprite-lab/lib/`):

| Script | Job |
|---|---|
| `pack.py` / `pack_row.py` | Pack a walker set into sheets |
| `pack_boss_clips.py` | Pack boss clips to a shared union frame box + ground line |
| `validate.py` / `validate_object.py` | The quality gate |
| `harmonize.py` / `relight.py` / `palette_ref.py` / `style_ref.py` | Match a sprite to the set |
| `slice_plate.py` / `slice_occluders.py` | Cut a painted plate into layers |
| `check_reachability.py` | Prove a traced walkable region is actually walkable |
| `import_traces.py` | Pull Figma collider traces into the scene |
| `compose_sample.py` / `resample.py` | Composites and rescales |

---

## 2. Review readouts

These are how a human decides. **Every one of them is offered, not requested.**

| Readout | Command / route | Answers |
|---|---|---|
| **Boss clip sheet** | `node scripts/sprite-lab/boss-sheet.mjs <packed_dir>` | Do the clips *play* right? Plays PACKED strips at real fps, self-contained HTML. Built because stills cannot catch the shrinking hero, the backwards facing, the costume drift — and three automated motion checks reported "frozen" on working animation. |
| **Plate gallery** | `node scripts/bg-harness/harness.mjs sheet <config>` | Which candidate plate wins? |
| **Boss readout** | `/dev/boss-readout` | Does the fight *measure* right — damage, beats, telegraphs? |
| **Sprite preview** | `/dev/sprite-preview` | Does the sprite mount right on the stage? |
| **Ability seed** | `/dev/abilities` | Ability catalogue state |
| **Battle seed** | `/dev/seed-battle` | Jump straight into a fight |
| **Courtyard sample** | `/dev/courtyard-sample` | Castle scene composition |
| **Validator regression** | `scripts/sprite-lab/test-validator.sh` | Does the quality gate still catch the known-bad fixtures? |

**Known-good / known-bad fixtures** live at `sprite-lab/fixtures/` — the drifting
archivist, the clipped horse, the bad cardwright, the good dwarf loop. These exist so the
validator can never silently stop working.

---

## 3. Skills that drive the harnesses

| Skill | Covers |
|---|---|
| `create-arena` | A new fighting arena / battle location, end to end |
| `create-boss` | A new boss: sprite → clips → moveset → signature layers → readout |
| `create-prop` | A single object or scenery prop |
| `create-character-sprite` | A walkable/animated character |
| `place-character-in-scene` | Phaser wiring, colliders, feet anchoring |
| `trace-environment` | Turn a plate into a walkable scene |
| `art-pipeline` | Card portrait art (Leonardo, in-app) |
| `design-archetype-emblem` | Selection-tile emblems |

## 4. Agents that advise before you spend money

| Agent | Owns |
|---|---|
| `environment-art-director` | Places and props: arenas, plates, scenery, composition contracts |
| `art-prompt-director` | Characters and portraits: card art, emblems, Character Reference |
| `pixel-sprite-director` | Sprite mechanics: gen mode, direction mapping, packing, validator |

Split is by **subject**, not by tool — a character failure (identity drift) and a place
failure (perspective, seams, HUD collision) have nothing in common, and both Leonardo and
PixelLab are used across all three.

---

## 5. Playbooks — the memory layer

| File | Contents |
|---|---|
| `LEONARDO_PLAYBOOK.md` | What worked, what it cost, per Leonardo run |
| `PIXELLAB_PLAYBOOK.md` | Same, for sprites |
| `scripts/bg-harness/FORGE_MANIFEST.md` | Forge scene layer model + Figma nodes |
| `scripts/bg-harness/ARENA_HANDOFF_*.md` | Per-arena composition contract given to whoever paints the plate |

**Append after every run.** These files are the reason the configs read like case law
instead of prompts — the `arena-still-season.json` `_readme` alone documents four rejected
rounds and exactly what each one died of. That is the most valuable artifact in the repo.

---

## 6. Registration points — where generated art gets wired in

The most common way work is "done" but invisible is a missed registration.

| Asset | Register in |
|---|---|
| Arena plate | `src/data/combat/arenaManifest.ts` + `public/assets/combat/arenas/<slug>/base.png` |
| Boss sprite clips | `src/data/combat/bossSpriteManifest.ts` + `public/assets/combat/bosses/<slug>/` |
| Boss signature layers | `src/data/combat/bossSignatureManifest.ts` (+ a component under `pages/battle/`) |
| Boss stats / moveset | `src/services/bosses/registry.ts` + seed |
| Hero sprite | `src/data/combat/heroSpriteManifest.ts` |
| Castle prop | Phaser scene under `src/pages/castle/courtyard/` |

---

## 7. Building for reuse across future games

The portable layer is **not** the agents or the skills — those encode this game's canon.
It is `scripts/bg-harness` + `scripts/sprite-lab` + the two playbooks + the validator
fixtures. Extract those into a standalone plugin **after arena #3**, when the shape has
stopped moving. Extracting earlier freezes an interface still being learned.
