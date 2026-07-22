# Claude Code Master Prompt — Rebaseline and Begin the Combat Overhaul

The Card Game has changed significantly since the original Ability-First Boss Battle plan was written.

I am providing a new handoff package. Treat the latest live repository as implementation truth. Do not execute the old A0–A9 and B0–B7 plan as though those systems do not exist.

## Handoff package location

Copy this package into the live repository at:

`Classes and Boss Battles/Combat Overhaul Current Handoff/`

Read these files in order:

1. `01_Current_State/Current_Project_Audit.md`
2. `02_Canonical_Plans/Combat_Overhaul_Rebaseline_Plan.md`
3. `02_Canonical_Plans/Combat_Art_Acquisition_and_Integration_Plan.md`
4. `02_Canonical_Plans/Combat_Experience_Wiki_Current.md`
5. Current root `card-engine-boss-battle-spec.md`
6. Current root `card-engine-ability-system-spec.md`
7. Historical Master Plan only for context

## Canonical Figma sources

### Combat Experience

`https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf`

### Ability System

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5`

### Hero Combat Sprite source

`https://www.figma.com/design/voPWJtCJFCl3sik8s5ABkc/16-Vector-Pixel-Fantasy-Characters-%E2%80%93-Fully-Scalable-SVG-RPG-Asset-Pack--Community-`

Figma is the interface-design authority. Do not recreate the approved cards.

## First inspect the live repository

At minimum inspect:

- `CLAUDE.md`
- `STUDIO_CHARTER.md`
- `WORKFLOW.md`
- `card-engine/package.json`
- `card-engine/src/pages/Battle.tsx`
- `card-engine/src/components/CardRenderer.tsx`
- `card-engine/src/types/combat.ts`
- `card-engine/src/types/bosses.ts`
- `card-engine/src/types/abilities.ts`
- `card-engine/src/services/combat/reducer.ts`
- `card-engine/src/services/combat/useBattle.ts`
- `card-engine/src/services/combat/harness.ts`
- All combat tests
- Boss registry and seeds
- Ability registry and canonical-art pipeline
- Wallet and transaction-ledger services
- Supabase boss and ability migrations
- Current public asset conventions
- Relevant agents and skills

## Known current facts to verify

The reviewed snapshot already had:

- Ability System A0–A9
- Boss Battle B0–B7
- 156 passing tests
- Successful production build
- One active Emberborn Wraith boss
- One-hero functional battle
- Deterministic reducer and snapshots
- A 140 ms automatic phase delay
- CSS placeholder boss art
- Generic hero panel instead of CardRenderer
- Immediate debug-style event log
- No functional three-card party
- No real Arena asset
- No real boss Combat Sprite

Verify these against the live workspace and report anything newer.

## Stage C0 task

Perform C0 only first.

Return:

1. Current implementation summary
2. What changed since the supplied audit
3. Preserve/change/remove/defer matrix
4. Conflicts between repository, Figma, and documents
5. Three-card party design recommendation
6. Exact player-turn command model recommendation
7. 50% mechanical phase versus 25% Rage recommendation
8. Run Gold cost integration point, without inventing the value
9. Presentation adapter and queue architecture
10. File-by-file C1–C9 roadmap
11. Test plan
12. Art and asset-manifest plan
13. Leonardo prompts and expected call count
14. Documentation updates
15. Approval questions

## Mandatory architecture rule

Do not rewrite the deterministic reducer to add animation timing.

The correct direction is:

```text
Reducer events
→ presentation adapter
→ playback queue
→ visible state and synchronized Journal
```

## Mandatory final program outcome

The full approved program must end with a working route that visibly contains:

- A real Forbidden Mountain Passage Arena
- A real Emberborn Wraith combat asset
- Three exact live hero cards
- Three reusable hero Combat Sprites
- Boss HUD
- Ability Bar
- Combat Journal
- Floating damage
- Readable boss turns
- Mobile layout

Do not consider a CSS gradient boss or empty background a completed visual slice.

## Art source rules

- Hero cards: existing live `CardRenderer`
- Hero sprites: individual approved exports from the provided Figma pack
- Arena: Leonardo after prompt approval
- Boss card: Leonardo after prompt approval
- Boss Combat Sprite: separate Leonardo generation after prompt approval
- Effects: code-first SVG/CSS unless a real art gap remains
- Ability art: reuse existing canonical ability assets

No paid image generation during C0.

## Guardrails

Do not:

- Redesign cards
- Hardcode the three sample card images
- Import the entire sprite pack as one massive SVG
- Add live AI calls to combat
- Invent Gold cost
- Change balance to support three heroes without simulator evidence
- Delete legacy boss versions
- Break immutable snapshots
- Add animation timers to pure combat code
- Silently reconcile stale documents
- Implement all phases before C0 approval

Stop after the C0 report.
