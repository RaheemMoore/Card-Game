# Claude Stage 0 Handoff — Ability-First Boss Battle

**Status:** Ready for repository analysis. Do not fully implement yet.

## Required Documents

Read these in this order after inspecting the live repository and its canonical studio instructions:

1. `Card_Game_Ability_First_Boss_Battle_Master_Plan.md`
2. `Ability_First_Boss_Battle_Art_Asset_Production_Plan.md`
3. `Ability_Tile_Art_Direction_Spec.md`

Also read the current project files that govern studio operation, including:

- `CLAUDE.md`
- `STUDIO_CHARTER.md`
- `WORKFLOW.md`
- Relevant agents and skills
- Current ability, power, archetype, economy, authentication, storage, and UI files

## Source-of-Truth Order

1. Live repository / latest implementation snapshot
2. Figma for interface design
3. The three planning documents
4. Previous conversations and assumptions

When sources disagree, report the conflict. Do not silently choose a convenient interpretation.

## First Task: Stage 0 Only

1. Inspect the current repository.
2. Explain how abilities currently work.
3. Identify all ability-related models, types, services, prompts, components, storage locations, and generation steps.
4. Identify how card rank, archetype, lore, Mana, Tech, ATK, and DEF currently interact.
5. Compare the implementation with all three documents and the relevant Figma components.
6. Identify what can be preserved, what must change, and what is already implemented.
7. Identify migration risks, stale assumptions, duplicate systems, and architectural conflicts.
8. Identify relevant agents and skills.
9. Recommend repeatable workflows that deserve a skill only when justified.
10. Produce a repository-specific roadmap for Ability System phases A0 through A9.
11. Provide a file-by-file proposed sequence.
12. Separate required decisions from implementation details.
13. Stop for Raheem approval.

## Prohibited During Stage 0

- Do not implement the Boss Battle System.
- Do not fully implement the Ability System.
- Do not change economy values.
- Do not lock benchmark gameplay numbers from Figma into runtime data.
- Do not recreate the approved Figma system as one-off UI.
- Do not call Leonardo or another paid image API.
- Do not create a second ability schema for combat.
- Do not alter approved visual benchmark assets.
- Do not reveal undiscovered Codex details.
- Do not make unapproved product decisions.

## Approved Visual Foundations

Figma file:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5`

Approved systems:

- Command Strip — 3 tiers × 5 standard states
- Exceptional state overlays — 7 states
- Detail Card — Core, Signature, Ultimate
- Relic Presentation — Discovery, Evolution, Ultimate
- Resource Badge — Mana/Tech × Combat/Compact × Ready/Insufficient
- Optional Relic resource accent

Approved benchmarks:

- Ember Cleave — Benchmark 01
- Aegis Ward — Benchmark 02

Figma benchmark values are layout examples, not approved mechanics.

## Required Completion Report

Return:

1. Current implementation summary
2. Conflicts and stale documentation
3. Architecture recommendations
4. Data-model proposal direction
5. Migration risks
6. Relevant agents and skills
7. File-by-file Stage A0–A9 roadmap
8. Approval questions for Raheem
9. Explicit disagreements with the plans, with reasoning
10. Confirmation that no implementation was performed
