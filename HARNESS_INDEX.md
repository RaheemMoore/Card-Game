# Harness & Readout Index

> **For current status, open threads and what to work on next, see [PRODUCTION.md](PRODUCTION.md).**
> This file is the tool catalogue only.

**What this is:** the catalogue of every reusable tool this studio has built for making
art, checking art, and understanding the game. Nothing here is one-off. If you are about
to generate an arena, a boss, a prop, or a scene — or you want to *see* how something is
behaving — the tool already exists and is listed below.

## RULE ZERO — never show work in chat. Show it in a harness.

### Rule Zero (b) — present art as a SPRITE SHEET

**Standing rule (Raheem, 2026-08-04):** *"Present data to me as spritesheets. Spritesheets are
the way that most people who develop games view things, and that makes it clearer to know which
angle you can put in and what other animations and angles you have."*

Any object with more than one frame gets a sprite sheet, laid out the way game developers
actually read one:

- **Rows are the subject** (an object, or one of its animations). **Columns are frames** — the
  eight facings, or the frames of a clip.
- **One uniform cell for the whole sheet.** Variable-size cells are why a board reads as a pile
  of pictures instead of a sheet.
- **Row label on the left**, vertically centred. Column headers across the top.
- **Frames bottom-centred in their cell**, so every subject shares a floor line and heights
  compare honestly.
- **It lives beside the thing it belongs to** — in the Courtyard V2 Figma file the sheet sits
  directly below the plate, so the map and its parts are read together.
- **Animations extend it downward**: each new clip is another labelled row under that object.

Live example: `SPRITE SHEET — courtyard objects` in `MpUs9WJKMvwTtpH9Akz4Rm`, node `78:2`.



**Standing rule (Raheem, 2026-08-04), and it applies to every discipline, not just art:**

> *"I wanna see it in a harness. How can I hate looking at it in the chat? Harness every time.
> Write it down somewhere. We always use a harness. We have multiple harnesses. Make another
> harness if you need one."*

Pasting an image into chat is **not** a deliverable. A harness is: a page he can open, scroll,
compare against what shipped, come back to tomorrow, and judge from. Chat images are a
convenience on top of a harness, never a replacement for one.

- **If a harness exists for the job, use it.** The catalogue is below — read it first.
- **If none fits, build one.** That is explicitly sanctioned. A new harness is cheaper than a
  decision made from a bad look at the work.
- **Keep it current.** Everything generated gets registered in its harness *before* it is
  shown, so the harness is never behind the conversation.
- **Give him a way in.** A local file he has to hunt for is a weak harness. Publish it as an
  Artifact URL, serve it from the dev server, or both.

*Why this is Rule Zero: assets were generated, judged and discussed for a whole session
through one-off chat screenshots, while `HARNESS_INDEX.md` advertised a review harness that
had never actually been committed. The work looked fine in a strip and the questions that
mattered — does it sit at the right scale, does it read against the paving, does it match what
already shipped — could not be asked.*

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

> ⚠️ **Audit, 2026-08-04 — most of the table below is not in the repository.** Only
> `finish_arena.py`, `pixelize.py`, `cutout.py`, `nobg.sh`, `process_plume.py`, `leo.sh` and
> `trace_guide.py` actually exist in `bg-harness/lib/`. Checked against every branch:
> `placement_brief.py`, `zone_mock.py`, `area_mock.py`, `cut_flat_background.py`,
> `trim_forge.py`, `compose_from_figma.py`, `cap_run.py` and `lay_flat.py` have **never been
> committed anywhere**. `review_sheet.py` did not exist either and was rebuilt on 2026-08-04
> at `sprite-lab/lib/review_sheet.py`.
>
> These entries are kept, not deleted — several describe standing rules of Raheem's that still
> govern how the work is done, and the descriptions are worth more than the blank line that
> would replace them. But **do not plan around any of them being runnable.** This drift is why
> a review harness was not offered before generating the tower batch: the index named one and
> the index was wrong.

**Post-processing library** (`bg-harness/lib/`) — deterministic, free, re-runnable:

| Script | Job |
|---|---|
| `finish_arena.py` | The full arena finishing chain: crop sky → re-composite canopy → warm grade → darken HUD corners → damp blight → flatten lower third → pixelize |
| `pixelize.py` | Deterministic pixel grid (the thing that makes plates look like one game) |
| `cutout.py` / `nobg.sh` | Matte a subject off its background |
| `process_plume.py` | Seat + white-fog an element plume for the forge scene |
| `placement_brief.py` | **Placement-first.** Reads Raheem's Figma `place-*` footprint marks and derives each object's size and REQUIRED FACING from where it sits — against a wall means square-on, open floor means free-standing. Built because the forge came back catty-corner twice while the angle was being written from a description instead of read off a position. |
| `zone_mock.py` / `area_mock.py` | Render traced areas on a plate and place objects in them at true world scale, with welded cast shadows — judge a room before buying it |
| `review_sheet.py` | **Lives at `sprite-lab/lib/review_sheet.py`, not here.** The asset review harness: one self-contained page showing every generated asset composited on the real plate at true game scale, feet-anchored, with its provenance, cost and verdict. See §2. |
| `cut_flat_background.py` | Flood-fill a flat background off a generated sprite from the frame edge (PixelLab's `no_background` is a request, not a guarantee) |
| `trim_forge.py` | Trim an approved asset down to the part that belongs, by measured crop rather than a re-roll |
| `compose_from_figma.py` | **Composition is Raheem's, arithmetic is mine.** Bakes a multi-piece object from the arrangement he makes on the Figma composition bench — his positions, his scales, and a hand-drawn ground line used as a per-column CUT PROFILE rather than a level. Standing rule (Raheem, 2026-08-01): *"let's do this process in the future for all our objects... whenever we have confusion, remember that I can do this faster and a little bit clearer than you can."* |
| `cap_run.py` | **End caps.** Weld a cap onto both ends of a trimmed asset so its cut edges read as deliberate. Aligns on the ground line, overlaps rather than abuts (a butt join leaves a seam that reads as the cut), mirrors one asset for both ends, and bakes the result to one PNG so the seam is solved offline instead of every frame |
| `lay_flat.py` — `lay_symmetric()` | **The standard ground-plane warp.** Symmetric trapezoid, no sideways lean, gentle top-down recession only. Default for ANY floor-plane asset placed among square-on furniture; the organic hand-trace path is for when the object itself is turned to match a wall |
| `lay_flat.py` | ✅ **BUILT 2026-08-04 at `sprite-lab/lib/lay_flat.py`.** Map a flat-drawn texture (a rug, a floor patch) into the plate's raised three-quarter ground plane via a true 8-coefficient perspective solve — an affine shear cannot shorten the far edge, so it produces a rug that leans instead of lies. `lay_symmetric()` is the default: symmetric trapezoid, no sideways lean, gentle recession only. Usage: `lay_flat.py <in> <out> <width> <height> [taper]`, taper 0.86 matches the courtyard's existing rugs. |
| `palette_swatch.py` | Build the forced-palette PNG for `create_image_pixflux`'s `color_image_base64`, from a plate's own quantised colours plus a bounded accent ramp |
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
| **Courtyard asset review** | `python3 scripts/sprite-lab/lib/review_sheet.py build` | Does this object belong in the castle? Every generated asset composited on the REAL plate at true game scale, feet-anchored, against the wall it is meant for — plus its cost, endpoint and verdict. Built 2026-08-04 because judging a sprite on a checkerboard is how you approve the wrong scale or the wrong angle. **Standing rule (Raheem, 2026-08-04): one item at a time — an item is drafted, judged here, and only once APPROVED do we spend 25 generations on its other seven faces.** Record verdicts with `review_sheet.py decide <id> approved\|rejected "why"`; register new art with `review_sheet.py add <id> <png> wall=back\|left\|right\|floor`. |
| **Boss readout** | `/dev/boss-readout` | Does the fight *measure* right — damage, beats, telegraphs? |
| **Sprite preview** | `/dev/sprite-preview` | Does the sprite mount right on the stage? |
| **Ability Theater** | `/dev/ability-theater` | Does an ability *perform* right — form, material, staging, legibility? Replays canned event logs through the real compiler and renderers, so there is no battle, no RNG, and the same scenario looks identical every time. **Hide colour** is the control that matters: it greys the stage so the Bible's "recognisable without colour" rule can be tested rather than asserted. Also: three lashes side by side on one path (the form-reuse proof), step-by-stage freeze, motion full/subtle/off, desktop/tablet, simulate-missing-assets, and a coverage panel showing how many materials are authored vs family defaults. |
| **Decision Lab** | `/dev/decision-lab` | Can the player *understand* why an action matters — the companion question to Ability Theater's "how does it perform?" Loads the three approved Debt-Bearer pilots (`Interest Accrues`, `First Notice`, `The Whole Ledger`) from frozen fixtures built by actually running the real reducer with the balance suite's scripted filler to the documented moment — never hand-authored. Shows the current threat's exact objective (interrupt vs. charge kept structurally separate, never one bar), every ability's tactical label + exact projected effect (via a reducer dry-run, never a copied formula) + honest relationship notes to that threat, the shared confirmation policy, and receipts compiled only from events that actually resolved. Also: desktop/tablet toggle, reduced-motion toggle, exact/conditional/unknown confidence display, and a visible missing-rule fallback state. Cross-linked with Ability Theater rather than merged into it. |
| **Battle volley + lockout scenarios** | `/battle?studioScenario=battle-party-volley-impact` or `battle-wait-only-lockout` | Does the combined system work in the authentic fight rather than a reconstructed mockup? DEV-only `window.__CARD_ENGINE_BATTLE_STUDIO__` observes the real picker, controls, reducer, presentation queue, and performance renderers while the browser drives them. The volley scenario asserts three simultaneous boss impacts from three casters at distinct normalized points. The lockout scenario asserts a real planning state with no usable ability, Strike/Guard disabled, Wait enabled, and Release still gated. A hidden sanitized transport at `#card-engine-battle-studio-result` supports browser worlds that cannot read page globals. Both bridge and transport must be absent from production bundles. |
| **Ability seed** | `/dev/abilities` | Ability catalogue state |
| **Battle seed** | `/dev/seed-battle` | Jump straight into a fight |
| **Courtyard sample** | `/dev/courtyard-sample` | Castle scene composition |
| **Courtyard V2 forge preview** | `/dev/courtyard-v2-preview` | DEV-only walk-through of the pending V2 forge quadrant: Figma-derived colliders/occlusion, chibi movement, heel dust, forge atmosphere, named aisle checks, and reduced-motion behavior. It does not replace `/castle` and is excluded from production builds. |
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

## Phaser runtime and visual evidence

**Status:** implemented and locally verified for the courtyard on 2026-08-03.

| Capability | Purpose |
|---|---|
| `.claude/studio/PHASER_RUNTIME_BRIDGE_SPEC.md` | Versioned, dev-only `window.__CARD_ENGINE_STUDIO__` contract. Scenes expose safe snapshots and bounded scenario actions instead of tests poking private fields. |
| `phaser-runtime-director` | Read-only advice for Scene ownership, lifecycle, camera, physics, coordinate contracts, observation, and Phaser Editor decisions. |
| `build-phaser-feature` | Approved implementation workflow: define scenario first, preserve React/Phaser lifecycle, implement, then verify. |
| `visual-playtest` | Runtime snapshot + console + screenshot/video; returns PASS / FAIL / HUMAN REVIEW. |

Current scenario set: `courtyard-direction-validation`, `courtyard-collision-and-occlusion`, and `courtyard-reduced-motion-walk`. Development automation can run one through `/castle?studioScenario=<name>&studioRun=<unique-nonce>` and read the sanitized `#card-engine-studio-result` output. Unknown scenarios fail without moving the player. Tower scenarios are future work; Forge Strike is not a Phaser scene and its shipping workflow is retired.

## 5. Playbooks — the memory layer

| File | Contents |
|---|---|
| `LEONARDO_PLAYBOOK.md` | What worked, what it cost, per Leonardo run |
| `PIXELLAB_PLAYBOOK.md` | Same, for sprites |
| `PIXELLAB_CAPABILITIES.md` | The map of what PixelLab can do vs what we call — ~40 endpoints available, 6 used. Read before assuming a thing must be hand-built or bought from Leonardo. |
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

The first portable layer remains the deterministic machinery: `scripts/bg-harness`, `scripts/sprite-lab`, validators, fixtures, and playbooks. Studio V2 adds a second portable layer only after it survives real Card Engine production: project-neutral contracts, routing, permissions/hooks, and selected agents/skills become Studio Core or Phaser/provider packs. Card Engine canon, economy, archetypes, and project-specific registrations stay in the Card Engine project pack.

The portability rule is therefore **extract after proof, not before**. The architecture map and registry classify each capability so future packaging does not drag Card Engine lore into another game.
fixtures. Extract those into a standalone plugin **after arena #3**, when the shape has
stopped moving. Extracting earlier freezes an interface still being learned.
