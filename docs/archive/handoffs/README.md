# Archived handoffs — DO NOT USE AS SOURCE OF TRUTH

Session-handoff bundles, one-off playtest scripts, and implementation plans whose work has shipped. They describe the project as it was on the date each was written and are known to contradict the current codebase. Do not cite them when making design decisions.

Archived 2026-08-13 during the repo cleanup. Nothing here had a single inbound reference from code, CLAUDE.md, or any live doc.

## What lives here

### `HANDOFF_WILDLIFE_TO_CLAUDE_CODE.md`
Wildlife-system handoff. Superseded by the shipped wildlife code under `card-engine/src/pages/castle/wildlife/` (which carries its own README).

### `HANDOFF_courtyard-floor-and-fountain.md`
A dated single-session starter ("start a fresh session with this file", 2026-08-04). The courtyard work it describes has since been overtaken by CourtyardV3.

### `OVERWORLD_COMBAT_PHASE0_REVIEW.md`
Phase-0 review of overworld combat. Cites `HANDOFF_CARD_COMBAT_AND_COURTYARD_TO_CLAUDE_CODE.md`, which no longer exists anywhere in the repo — the reference was already dangling when this was archived. Current combat truth is `card-engine/src/pages/castle/combat/` plus [card-engine-boss-battle-spec.md](../../../card-engine-boss-battle-spec.md).

### `COMBAT_SLICE_PLAYTEST.md`
A one-off manual playtest script (2026-08-13). Kept for the scenario list; it is not a living test.

### `Claude_Code_Admin_Operations_Dashboard_Plan.md`
The admin dashboard implementation plan. **Phases 0–7 are complete and shipped** — CLAUDE.md records the outcome. Kept for the reasoning behind the phase ordering and the server-proxy security model.

### `halo-stone-castle-kit-2026-08-05-bundle/`
The castle art-kit delivery bundle plus its zip. 28 of its 30 assets were absorbed into `card-engine/public/assets/kits/halo-stone-castle/`; the two exceptions under `archive/proofs/` are rejected originals ("needs-adjustment") that exist only here, which is why the bundle was archived rather than deleted.

### `classes-and-boss-battles/` (sibling folder, `../classes-and-boss-battles/`)
Two nested handoff bundles — `Combat_Overhaul_Current_Handoff/` and `Mobile_Combat_Final_Handoff/` — plus `CLAUDE_STAGE_0_HANDOFF.md`. ~9,300 lines, zero inbound references, superseded by the shipped boss/combat specs. One of its own subfolders was already named `06_Historical_Context`.

## Where to look instead

| Topic | Canonical doc |
|---|---|
| Everything | [CLAUDE.md](../../../CLAUDE.md) |
| Current status / open threads | [PRODUCTION.md](../../../PRODUCTION.md) |
| Combat + bosses | [card-engine-boss-battle-spec.md](../../../card-engine-boss-battle-spec.md) |
| Abilities | [card-engine-ability-system-spec.md](../../../card-engine-ability-system-spec.md) |
| Harnesses and readouts | [HARNESS_INDEX.md](../../../HARNESS_INDEX.md) |
