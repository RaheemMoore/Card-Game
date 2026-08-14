# Current Project Audit — Combat Overhaul Rebaseline

**Snapshot reviewed:** `Card Game(2).zip`  
**Repository commit:** `625b6a3`  
**Date reviewed:** 2026-07-19  
**Purpose:** Replace the obsolete pre-implementation assumptions in the earlier combat handoff with a repository-grounded starting point.

---

## 1. Executive summary

The game is no longer waiting for the Ability System or the first Boss Battle vertical slice.

The latest snapshot already contains:

- Ability System phases A0–A9
- Boss Battle phases B0–B7
- Supabase persistence, authentication, admin roles, and moderation
- A typed ability catalog and validator
- Permanent ability definitions and versions
- Ability discovery rewards
- Codex pages
- Canonical ability-art pipeline
- Boss definitions and versioned balance data
- A deterministic combat reducer
- Seeded RNG
- Immutable ability and boss snapshots
- A 5,000-run combat harness
- Battle rewards
- A playable `/battle` route
- A one-hero encounter UI
- A placeholder boss portrait
- A 140 ms automatic phase-advance loop
- Basic hit shake and reduced-motion handling

Therefore, Claude must **not** follow the old plan as though A0–A9 and B0–B7 are unimplemented.

The new project is a **rebaseline and overhaul**:

1. Preserve working combat and ability architecture.
2. Replace the presentation layer.
3. Extend solo combat into the newly approved three-card party experience.
4. Add a presentation-event adapter and paced playback queue.
5. Add actual Arena and boss assets.
6. Keep the exact existing card renderer as the hero visual.
7. Integrate reusable Combat Sprites.
8. Reconcile stale documentation.

---

## 2. Verified technology and project structure

### Application

- React 19
- Vite 8
- TypeScript 6
- Tailwind CSS v4 using `@theme` in `src/index.css`
- React Router v7
- Supabase JS
- IndexedDB support
- Vitest

### Current build verification

After reinstalling dependencies from the lock file:

- **156 tests passed across 19 test files**
- `npm run build` succeeded
- Vite reports a large main bundle warning at roughly 740 kB minified

The snapshot's bundled `node_modules` was platform-incompatible. A clean `npm ci` resolved it. Claude should not treat the initial native-binding error as a repository defect.

---

## 3. Current Ability System

The current repository already contains:

- `src/types/abilities.ts`
- Effect, target, trigger, condition, status, family, and power-budget catalogs
- Seed abilities
- Candidate normalization
- Duplicate detection
- Proposal validation
- Moderation
- Discovery ledger
- Legacy backfill
- Canonical art pipeline
- Ability persistence stores
- Codex UI
- Ability administration
- Supabase ability tables and policies

### Canonical art behavior

`canonicalArtPipeline.ts` currently supports:

- Offline placeholder SVG art
- Leonardo-generated canonical ability art
- Asset replacement history
- Per-family approval expectations
- Existing Vercel Leonardo proxy infrastructure

The overhaul should reuse this architectural pattern for boss and Arena assets rather than inventing unrelated asset handling.

---

## 4. Current Boss System

The repository currently has one active seed boss:

### Emberborn Wraith

- ID: `boss_fire_elemental_v0`
- Two phases
- Active version: v2
- Max HP: 340
- Fire resistance
- Holy and Nature weakness
- Phase one actions:
  - Ember Slash
  - Flame Burst
- Phase two actions:
  - Infernal Lance
  - Execution Pyre
- `artAssetIds` is currently empty

The current boss art shown in the game is not a real boss asset. It is a CSS radial gradient, elemental glyph, and label.

---

## 5. Current combat architecture

### What is strong and must be preserved

- Pure reducer
- Seeded random stream
- Immutable battle snapshots
- Ability-version snapshots
- Boss-version snapshots
- Event log as combat truth
- Explicit turn phases
- Headless simulator
- Balance locks
- Idempotent battle rewards
- Reward transaction integration

### Current runtime flow

`useBattle.ts` automatically advances every non-player phase after:

```ts
const PHASE_DELAY_MS = 140
```

This is the direct cause of the presentation problem:

- Intent appears briefly
- Resolver advances
- Damage and other events land
- Log updates immediately
- Control returns before the player can parse the sequence

The reducer is not the problem. The hook currently couples reducer advancement to visual pacing.

### Current party reality

Although battle types use arrays and claim party readiness, the live implementation is functionally solo:

- `UseBattleInput` accepts one card
- `Battle.tsx` selects one card
- `useBattle()` builds one HeroSnapshot
- `EncounterScreen` reads `state.heroes[0]`
- Player actions do not contain an acting hero ID
- The reducer uses the first living hero
- Boss intent targets the first living hero
- Area attack intent is not yet a true three-target presentation/mechanical flow

The approved visual direction now calls for **three fixed Hero Lanes**. That is not a CSS-only change. It requires a controlled party-runtime extension.

---

## 6. Current battle UI

`src/pages/Battle.tsx` currently contains:

- Hero picker
- Boss picker
- Enter Battle button
- One stacked BossPanel
- One stacked HeroPanel
- ActionBar
- EventLog
- Reward modal

### Current boss visual

- 148 × 148 panel
- CSS radial-gradient placeholder
- Elemental glyph
- Bob animation
- Hit shake

### Current hero visual

The current battle does **not** use `CardRenderer`.

It displays stats and bars in a generic panel.

The overhaul must replace that generic hero panel with the exact existing card renderer.

### Current action UI

- Ability buttons generated from snapshot abilities
- Guard
- Focus
- Inspect
- Direct click immediately submits the action
- No queued multi-hero command selection
- No dedicated End Turn commit step

### Current log

- Last eight reducer events
- Debug-oriented actor IDs
- Immediately reflects resolved events
- Not synchronized to visible animation

---

## 7. Current card system relevant to combat

`CardRenderer.tsx` is the canonical hero-card visual implementation.

Important facts:

- Exact Figma-matched positioning already exists
- Portrait, border, badges, name, title, ATK/DEF, resource, and power/toughness are already implemented
- Full and thumbnail variants exist
- The new combat layout should instantiate or extend this component
- It must not create a duplicate battle-only card design

The three reference cards in this handoff are visual examples only.

Production must use:

- Live player cards
- Existing card data
- Existing `CardRenderer`
- Existing border and portrait assets

---

## 8. Documentation conflicts that Claude must resolve

### Conflict A — Phase status

`CLAUDE.md` correctly says Stage A and B are complete.

`card-engine-ability-system-spec.md` still identifies itself as an A1 draft.

Earlier handoff documents still tell Claude to plan A0–A9.

**Resolution:** Archive or mark the earlier Stage 0 handoff obsolete. Update the ability spec status without rewriting its binding technical content.

### Conflict B — Boss visual direction

The current boss spec says:

- Hand-illustrated 2D fantasy boss
- No pixel art

The later approved Combat Experience direction says:

- Boss card before combat
- Reusable pixel-style Combat Sprite during combat
- Fixed Arena
- Cards remain primary hero visuals

**Resolution:** The newer approved Combat Experience direction supersedes the old boss-art paragraph. Update the boss spec revision history and visual section.

### Conflict C — Party size

The old Master Plan targeted one hero first and two heroes later.

The newly approved combat composition uses three fixed Hero Lanes.

**Resolution:** Three heroes is now the target party for this overhaul. Do not pretend the old two-hero plan is still authoritative.

### Conflict D — Rage threshold

The visual workshop approved a 25% Rage presentation.

The current Emberborn Wraith mechanically changes phase at 50% HP.

**Resolution:** Do not silently change combat balance. Separate:
- Existing mechanical phase transition at 50%
- Optional visual Rage treatment at the approved threshold

Claude must present options:
1. Rename the existing 50% phase transition and add a visual Rage state at 25%.
2. Move mechanical Rage to 25% and rebalance the boss.
3. Keep 50% mechanical phase and label it as Enraged, revising the wiki.

This requires Raheem approval.

### Conflict E — Run cost

The workshop approved running at a Gold cost.

The current Battle Result type includes `abandoned`, but the battle UI has no pre-battle Run transaction.

**Resolution:** Integrate through the existing wallet/ledger service. Do not invent the cost.

---

## 9. Immediate opportunities

### Presentation queue

The existing event stream is already suitable for an adapter. No combat rewrite is required.

### Boss asset model

`BossDefinition.artAssetIds` already exists. It can be expanded through a typed boss-art manifest or persisted asset records.

### Arena assets

The project already has public asset conventions and Leonardo proxy infrastructure.

### Three-card visual foundation

`CardRenderer` already makes exact-card reuse possible.

### Responsive layout

Tailwind v4 and existing mobile patterns are available. The Figma desktop and mobile frames can map into reusable components.

---

## 10. Architectural concerns

1. The reducer assumes one player action before the boss turn.
2. PlayerAction lacks `actorId`.
3. Multi-hero target rules are not fully exercised.
4. Boss area attacks currently resolve as one target in the reducer.
5. Balance tests are based on one hero.
6. Reward values are calibrated for solo combat.
7. Current battle data is ephemeral.
8. Bundle size already triggers a warning.
9. Art URLs stored as data URLs may increase storage and bundle pressure.
10. The current boss asset field is only a string ID list with no complete runtime catalog.

These concerns are manageable, but Claude must plan them explicitly.

---

## 11. Recommended rebaseline

Retire the old “implement A0–A9, then B0–B7” execution sequence.

Use the following new program:

- **C0 — Repository rebaseline and documentation sync**
- **C1 — Presentation adapter and playback queue**
- **C2 — New responsive battle shell using the current solo runtime**
- **C3 — Three-card party runtime**
- **C4 — Hero Lanes and exact card integration**
- **C5 — Boss and Arena asset system**
- **C6 — First production Arena and Emberborn Wraith asset**
- **C7 — Attack, feedback, Rage, victory, and defeat presentation**
- **C8 — Fight/Run encounter framing**
- **C9 — Balance, accessibility, performance, and release verification**

The details are defined in `Combat_Overhaul_Rebaseline_Plan.md`.
