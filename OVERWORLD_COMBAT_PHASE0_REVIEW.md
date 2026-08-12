# Overworld Card Combat — Phase 0 review note

**Date:** 2026-08-12
**Branch:** `overworld-card-combat` (worktree at `.claude/worktrees/overworld-card-combat`)
**Reviews:** `HANDOFF_CARD_COMBAT_AND_COURTYARD_TO_CLAUDE_CODE.md`

Phase 0 of the approved plan: reconcile the handoff against the live repository, protect
user-owned work, and correct the plan before any gameplay code is written. This note is the
deliverable. It records what the handoff got wrong, what that changes, and what Phase 1
actually is.

---

## 1. What the handoff claims, and what is true

| Handoff claim | Verdict | Evidence |
|---|---|---|
| A Codex task registered `hero-card-slam` in the asset pack and passed 7 tests | **False** | No `card-slam` in `asset-pack.json`, in `build-asset-pack.mjs`'s `SHEETS`, or in `assetPack.test.ts`. The art was on disk since 2026-08-07; nothing loaded it. Now registered — see §3. |
| `/castle` still loads CourtyardV2 | True | `CastleV2.tsx:94,104,109`; `DEFAULT_SCENE = 'CourtyardV2'` at `courtyardRuntime.ts:56`. |
| PRODUCTION.md says `castle-grand-redesign` is unpushed | True, now fixed | It merged 2026-08-11 as PR #37 (`74887fb`). Four separate statements were stale. |
| Live worktree dirty over CourtyardV3 | True, now committed | Wall/building blocker resegmentation. Committed untouched as `4434f7b`. |
| Four scene registries, easy to miss one | True | `EXPLORABLE_SCENES`, `YSORT_SCENES`, `ALWAYS_LOADED` (courtyardRuntime.ts) + `SCENE_BEHAVIORS` (`sceneBehaviors/index.ts:25`), which says in a comment: "A SCENE MISSING FROM THIS TABLE IS SILENT". |
| Hero contract 36×71, 4×7, height 100, feet 34×20 | True | `src/data/castle/heroSprite.ts`. |
| No combat/aim/projectile code exists | True | The seam is greenfield. |

## 2. The biggest correction: there is no void bug, and the debug overlays are not shipped

The handoff's §5.2 treats "dark or unfinished void beyond the composed environment" as the
strongest prototype signal, and Phase 1 is built around removing developer overlays from the
player view. Measured against the running scene, **both premises are wrong.**

Runtime readout from `/dev/scene?start=CourtyardV3`:

```
tilemap           2560 x 1920 px  (80 x 60 tiles @ 32px)
camera bounds     0,0,2560,1920   — exactly the tilemap
ground layer      4800 tiles, 0 empty (0.0% holes)
zoom              1.5
blockers          41 polygons, 1 zone, none visible
elevation         2 plates, no unlandable warnings
doors             forge, collection
objects y-sorted  119
player spawn      1280, 960 (map centre)
```

**The dev route's parameter is `?start=`, not `?scene=`.** An earlier draft of this note
reported 40 colliders and 236 sorted objects, which are **CourtyardV2's** numbers: given
a parameter it does not read, the route silently falls back to `DEFAULT_SCENE`, and V2
has the same 2560x1920 tilemap, so the mistake did not look like one. The figures above
are re-measured against the real V3 and match the "119 y-sorted · 41 blockers · 2 level
plates" burned into the gameplay recording — which independently confirms the recording
is of V3.

- **The world is fully bounded and fully tiled.** The camera cannot scroll outside the map, and
  there is not one missing ground tile. The player cannot reach void, which is a Phase 1
  acceptance criterion already satisfied.
- **The authoring shelf cannot be seen.** `L9_SHELF_offmap` (8 kit parts) sits at x≈2947–3643 and
  `L10_VOID_library` at x≈−1033 — both outside camera bounds.
- **The overlays are already suppressed.** `courtyardRuntime.ts:395-425` force-hides colliders,
  wildlife roam areas, doors and elevation plates unless `?colliders=show`, `?wildlife=show`,
  `?doors=show`, `?levels=show`; markers likewise at line 453. Raheem's latest Editor pass left
  `L14_COLLIDERS` and `ROAM_pondside` visible in the `.scene` file, and the runtime overrides
  both. The clean/authoring split the handoff asks Phase 1 to build **already exists.**
- **The scene name, movement instructions and "119 y-sorted · 41 blockers · 2 level plates" are
  the `/dev/scene` page**, which is gated behind `DEV_ROUTES` and stripped from production
  builds entirely. They were never going to reach a player. The recording is of a developer
  tool doing its job, not of the game leaking debug state.

What the recording actually shows is under-decorated map edge — real ground, real bounds,
too little on it. That is composition work (handoff Phase 8), not a bug, and it should not be
paid for out of the combat budget.

**Consequence: Phase 1 as written is nearly a no-op.** Its one genuine gap is different and
bigger than the handoff frames it: *CourtyardV3 has no player-facing route at all.* The only
way to reach it is a dev-only URL. That is the V2→V3 production switch, which the handoff
defers to §12.2/Phase 8.

## 3. What landed in Phase 0

Four commits on `overworld-card-combat`, branched from `main`:

| Commit | What |
|---|---|
| `4434f7b` | Raheem's courtyard collider resegmentation, committed verbatim |
| `369ee68` | `hero-card-slam` registered; new `src/data/castle/cardSlamSprite.ts` contract; pack-check LF fix |
| `0c32b72` | Stale `cobalt` assertion in the ability-art test corrected to the palette the pipeline writes |
| `da5a72a` | PRODUCTION.md drift: PR #37, Q13, branch table, dual-session note |

Two of these were pre-existing defects that made the plan's own verification gate unusable:

- **The suite was one test red on a clean checkout.** `canonicalArtPipeline.test.ts` demanded
  `cobalt` in the Tech ability prompt; the palette had been reworded to `circuit-cyan and
  hologram-teal` and the assertion never moved. The test's actual subject — that Tech does not
  inherit warm-ember language — still passes.
- **`npm run assets:pack:check` reported a clean tree as stale.** Git checks the generated packs
  out with CRLF, the generator writes LF, and the check byte-compares. Zero content drift;
  pure line endings. Pinned to LF in `.gitattributes` so the check can gate something.

`hero-card-slam` is registered as its own 84×84 spritesheet rather than joining the hero's
36×71 grid — one grid cannot describe both, and the wrong one still renders something. The
per-frame durations (280ms open, 15×90ms, 700ms palm-down hold; 2330ms total) live in code
beside the frames, with a test tying them back to the twin PixelLab wrote, so a regeneration
that changes timing fails loudly instead of quietly animating to the old values.

**Gate status on this branch:** `tsc -b` + `vite build` clean, 881/881 tests pass, asset pack
up to date, asset lint OK.

## 4. Revised phase plan

Phase order and the §14 definition of success are unchanged. Phase 1 is rewritten; everything
downstream keeps its dependency order.

**Phase 1 — give CourtyardV3 a player-facing route** (was: strip debug overlays)
The clean/authoring split exists; the route does not. Point the castle shell at V3 behind an
explicit readiness gate rather than deferring the switch to Phase 8, because every later phase
needs somewhere real to test. Minimum gate: valid world/camera bounds (met), collision and
elevation, depth/occlusion, doors, wildlife stability, asset loading, regression suite. Keep
V2 operational and reachable until the gate passes. Do not rename scene files — it breaks
Phaser Editor save/preview.

**Phase 2 — registry consolidation, then the input and combat-state seam**
Consolidate the four scene registries into one declarative manifest with an invariant test
before adding per-scene combat behavior, since combat is exactly the fifth thing that would
silently miss one. Then input-intent, aim resolution, and the player action state machine as
pure modules. State advances on time, never on animation callbacks.

**Phases 3–5 — unchanged.** One-card blast; four-card hand; knockdown, scatter and recovery,
completing the §14 loop.

**Phases 6–8 — sketch only, re-planned after 5 lands.** Phase 8 keeps the environment cohesion
pass, and now owns the map-edge decoration that §5.2 misdiagnosed as void.

## 5. Risks

- **Two sessions share this repository.** The admin/Lore-Desk session works `prompt-lab-replay`
  in the main checkout; this work is isolated in a worktree on its own branch. During Phase 0
  that session committed 14 commits to the shared branch, and the harness's `preview_start`
  resolves `launch.json` from the *main* checkout, so it starts their server, not this one.
  Run this branch's dev server explicitly on port 5190; do not use `preview_start {name}` here.
- **`4434f7b` exists on both branches.** The collider commit was made on `prompt-lab-replay`
  before the worktree existed and cherry-picked here. Content is identical, so whichever merges
  first makes the other a no-op. Flagged rather than rewritten — resetting a branch another
  session is actively committing to is not worth the risk.
- **The card slam is south-facing only, by design.** Do not commission the other three
  directions until placement and timing are approved in play (Phase 7).
- **Do not couple the turn-based reducer** (`src/services/combat/`) to overworld action. Reuse
  card identity and element data only.
- **Do not edit `CourtyardV3.js/.scene` from this worktree.** Phaser Editor is bound to the main
  checkout; scene edits belong there, and the Editor clobbers the files if the scene is open.
