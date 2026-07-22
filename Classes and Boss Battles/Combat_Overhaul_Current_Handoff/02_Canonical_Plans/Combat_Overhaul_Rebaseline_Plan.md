# Combat Overhaul Rebaseline Plan

**Status:** Current implementation plan  
**Supersedes:** Earlier pre-A0 and pre-B0 execution assumptions  
**Canonical implementation:** Latest live repository  
**Canonical interface design:** Figma  
**Required visible outcome:** A functional base Arena containing a real background, a real Emberborn Wraith combat asset, exact live hero cards, paced combat, and a readable Combat Journal.

---

# 1. Product outcome

The overhaul is complete only when the user can:

1. Enter the Battle feature.
2. View the premium boss card before active combat.
3. Select three eligible live hero cards.
4. Choose Fight or Run.
5. Enter a fixed-camera 2D Arena.
6. See a real Arena background.
7. See an Emberborn Wraith combat asset instead of the CSS placeholder.
8. See the exact selected player cards in three stable Hero Lanes.
9. Select each living hero and queue or perform an action according to the approved turn model.
10. End the player turn.
11. Watch boss intent, anticipation, attack, impact, reactions, floating values, and log playback at readable speed.
12. See boss and hero statuses.
13. See defeat, Rage/phase, victory, and reward presentation.
14. Use the same experience on mobile in a stacked layout.

This is not merely a mockup. The final base slice must run in the application.

---

# 2. Non-negotiable design rules

- Existing cards are reused exactly.
- `CardRenderer` is the hero visual authority.
- No new battle-only card frame.
- Boss card appears before combat, never during active combat.
- Active boss uses a separate Combat Sprite/art asset.
- Camera remains fixed.
- Desktop uses a dedicated Combat Journal column.
- Mobile places the Journal below battle content.
- Three stable invisible Hero Lanes.
- Cards move vertically only.
- Idle cards are partially lowered.
- Selected card is fully visible.
- Sprite and card rise together.
- Damage appears above the target and fades.
- Heavy attacks take longer.
- Area attacks resolve lane by lane visually.
- Ultimates center the selected card.
- Defeated cards remain visible.
- No battle-speed controls in v1.
- No live AI calls during battle.
- No placeholder may silently become canonical.

---

# 3. Source-of-truth order

1. Latest live repository
2. Combat Experience Figma
3. This rebaseline plan
4. Updated Combat Experience Wiki
5. Current binding combat and ability specs
6. Earlier Master Plan as historical architecture context
7. Old Stage 0 handoff

When implementation and a document disagree, Claude must report it.

---

# 4. Current-state preservation list

Preserve:

- Ability definitions and versions
- Ability snapshots
- Boss definitions and versions
- Deterministic reducer model
- Seeded RNG
- Combat harness
- Battle event log
- Reward idempotency
- Supabase stores
- Wallet transaction ledger
- Ability art pipeline pattern
- `CardRenderer`
- Existing Tailwind theme
- Existing routes and auth gates
- Existing admin and moderation conventions

Refactor only where needed.

---

# 5. New program phases

## C0 — Rebaseline and documentation synchronization

### Goals

- Inspect the live repository, not the old snapshot assumptions.
- Produce a conflict matrix.
- Update phase statuses.
- Mark the old Stage 0 handoff obsolete.
- Amend the boss visual-direction spec.
- Record three heroes as the new target party.
- Decide the 50% phase versus 25% Rage conflict.
- Decide the player-turn command model.
- Decide the Run Gold cost.
- Confirm Figma access.
- Confirm Leonardo access without spending credits.

### Required player-turn decision

The approved visual interaction implies selecting hero abilities and then pressing End Turn.

Recommended runtime model:

- Each living hero may choose one command per round.
- Commands remain editable until End Turn.
- End Turn commits all queued hero commands.
- Commands resolve lane 1 → lane 2 → lane 3, skipping defeated heroes.
- Boss then resolves one intent.
- Utility actions are hero-specific.
- A hero may be left on Guard by default only if explicitly approved.

Claude must not assume this model silently. It should present this recommendation and alternatives during C0.

### Gate

Stop for approval after the C0 report.

---

## C1 — Presentation adapter and playback queue

### Purpose

Fix the current 140 ms “log zips by” problem before adding visual complexity.

### Deliverables

- `PresentationBeat` types
- Event-to-presentation adapter
- Playback queue hook/service
- Central timing configuration
- Current-beat state
- Consumed-event tracking
- Input lock
- Clean cancellation
- Reduced-motion timings
- Synchronized Journal model
- Unit tests

### Architecture

```text
Reducer events
    ↓
Presentation adapter
    ↓
Presentation beats
    ↓
Playback queue
    ↓
Visible state + Journal
```

The reducer remains pure.

### Initial timing targets

- Intent reveal: 800 ms
- Normal wind-up: 400 ms
- Heavy wind-up: 900 ms
- Impact/reaction: 500 ms
- Floating feedback: 800 ms
- Turn handoff: 500 ms
- Phase/Rage beat: 1.5–2 s
- Ultimate: 3–5 s

These are tunable configuration values.

### Gate

The current one-hero battle must already feel readable before proceeding.

---

## C2 — Responsive battle shell

Build the new shell with the current solo runtime first.

### Desktop

- Main battle column
- Arena
- Equal-height Hero Command Area
- Ability Bar
- Controls
- Dedicated Journal column

### Mobile

- Arena
- Hero Command Area
- Ability Bar
- Controls
- Journal

### Deliverables

Reusable components:

- `BattleShell`
- `Arena`
- `BossHUD`
- `BossIntent`
- `CombatJournal`
- `HeroCommandArea`
- `HeroLane`
- `AbilityBar`
- `BattleControls`
- `FloatingFeedback`
- `TurnCue`
- `BattleResultOverlay`

Use current assets/placeholders during this phase.

---

## C3 — Three-card party runtime

This is the largest mechanical extension.

### Data changes

Recommended:

```ts
interface UseBattleInput {
  heroCards: Card[]
  bossId: string
  seed: number
}

type PlayerCommand =
  | { actorId: string; kind: 'ability'; abilityDefinitionId: string; targetActorIds: string[] }
  | { actorId: string; kind: 'guard' }
  | { actorId: string; kind: 'focus' }
  | { actorId: string; kind: 'inspect' }
```

Add a queued command state outside the reducer until End Turn, or add explicit command-selection events if replay requires them.

### Required mechanics

- Exactly three party slots in UI
- Allow fewer only if product rules approve it
- One command per living hero
- Explicit acting hero
- Boss target selection among living heroes
- True area attacks target all living heroes
- Defeated hero skips command
- Party wipe remains defeat
- Ability targeting validates against party state
- Battle snapshot contains all selected heroes
- Rewards remain once per battle

### Tests

- Three snapshots
- Stable command order
- Actor ownership
- Defeated hero skip
- Area attack all living heroes
- Single-target boss target
- Party wipe
- Deterministic replay
- Existing solo fixtures remain usable for low-level tests

### Balance warning

All existing balance locks are solo.

Do not reuse solo boss numbers as approved three-hero balance.

Add separate three-hero balance fixtures before changing seed data.

---

## C4 — Exact cards and Hero Lanes

### Card integration

Use live `CardRenderer`.

Do not:

- Convert the three sample cards into hardcoded battle assets
- Recreate the card in CSS
- Crop away required information permanently
- Create different card proportions

### Lane states

- Idle
- Selected
- Command chosen
- Acting
- Hit
- Defeated
- Victorious
- Disabled

### Behavior

- Lane boundaries remain invisible.
- Cards keep fixed horizontal order.
- Selected lane rises vertically.
- Unselected cards reveal approximately 70%.
- Selected card reveals 100%.
- Statuses remain outside artwork.
- Combat Sprite peeks behind the top edge.
- Card remains more prominent than sprite.

### Hero HUD

Do not duplicate the existing generic HeroPanel.

Health, resource, Ultimate, and statuses should be associated with each lane without covering the card.

Figma decides exact arrangement.

---

## C5 — Boss and Arena asset system

### New asset responsibilities

#### Boss card art

Premium pre-combat introduction.

May reuse an approved boss portrait generated through Leonardo.

#### Boss Combat Sprite

Separate active-combat asset.

Supports:

- Idle
- Attack
- Hit
- Phase/Rage
- Kill celebration
- Defeated

Initial states may reuse one base image with CSS transforms and effects.

#### Arena background

A 16:9 environment built for the combat composition.

#### Hero Combat Sprites

Reusable archetype-based sprites.

### Typed manifests

Create:

- Boss-art manifest
- Arena manifest
- Combat Sprite manifest
- Effect/projectile manifest

Record:

- ID
- Path
- Type
- State
- Approval status
- Source
- Figma node
- Prompt version
- License
- Replacement history

### Storage

Recommended public prototype paths:

```text
public/assets/combat/
├── arenas/
│   └── forbidden-mountain-passage/
├── bosses/
│   └── emberborn-wraith/
├── heroes/
│   └── archetypes/
├── effects/
├── projectiles/
└── placeholders/
```

Production persistence may later move canonical assets to Supabase Storage.

---

## C6 — First production visual slice

### Required assets

1. Forbidden Mountain Passage Arena
2. Emberborn Wraith Combat Sprite
3. Emberborn Wraith boss-card portrait if no approved portrait exists
4. Three representative Hero Combat Sprites
5. Existing live player cards
6. One fire projectile
7. One impact effect
8. Core status icons

### Required result

A desktop and mobile battle that visibly contains:

- Arena background
- Real Emberborn Wraith asset
- Exact hero cards
- Hero Combat Sprites
- Boss HUD
- Journal
- Ability Bar
- End Turn
- Floating damage
- Your Turn
- One Rage/phase presentation

This is the visual proof milestone the user requested.

---

## C7 — Presentation behaviors

Add:

- Melee lunge
- Projectile travel
- Area sequence
- Heavy anticipation
- Hit recoil
- Floating values
- Phase/Rage transition
- Boss kill celebration
- Hero defeat
- Hero victory
- Ultimate card-centered sequence
- Victory and defeat overlays

Use CSS transforms and reusable effects before requesting more art.

---

## C8 — Encounter framing

### Pre-combat

- Boss card reveal
- Boss details
- Hero Selection
- Fight
- Run

### Run

- Shows approved Gold cost
- Requires confirmation
- Uses wallet transaction service
- Idempotent
- No reward
- No card loss
- No premium-currency cost

### Transition

- Secret passage or portal into protected/forbidden space
- Fixed visual transition
- No dynamic camera system required

---

## C9 — Release hardening

### Verification

- Full test suite
- Build
- Mobile viewport review
- Keyboard/controller navigation
- Reduced motion
- Screen-reader labels
- Color-independent states
- Asset loading failures
- Offline behavior where relevant
- Supabase fallback
- Reward idempotency
- Run transaction idempotency
- Three-hero balance sweep
- Performance
- Bundle splitting if necessary

### Documentation

Update:

- `CLAUDE.md`
- `WORKFLOW.md`
- `STUDIO_CHARTER.md` only if governance changes
- Boss battle spec
- Ability spec status
- Combat Experience Wiki
- Asset manifests
- Relevant skill indexes

---

# 6. Required visual acceptance criteria

The overhaul cannot be marked complete while any of these remain false:

- [ ] The boss is not a gradient/glyph placeholder.
- [ ] The Arena uses an approved environment asset.
- [ ] The exact live card renderer is visible.
- [ ] Three stable lanes are visible.
- [ ] Boss intent is readable.
- [ ] The Journal does not dump events instantly.
- [ ] A heavy attack visibly takes longer.
- [ ] Damage floats above the target.
- [ ] The boss reacts to being hit.
- [ ] The boss has a phase/Rage presentation.
- [ ] Mobile layout stacks correctly.
- [ ] No boss card appears during combat.
- [ ] Final assets are tracked in manifests.
- [ ] Placeholder assets are clearly marked.
- [ ] The full test suite passes.
- [ ] Production build passes.

---

# 7. Non-goals

Do not bundle into this overhaul:

- PvP
- Trading
- Real-money payment rails
- Unique hero sprite per generated card
- Full skeletal animation
- Unique animation for every ability
- Dynamic camera
- Battle-speed controls
- Procedural Arena generation
- Live image generation during battle
- A full boss roster
- An Arena collection economy
- Music marketplace
- Weather collection

The architecture may leave room for them.

---

# 8. Completion reporting

After every phase, Claude reports:

1. Files created
2. Files modified
3. Tests
4. Build result
5. Figma nodes referenced
6. Assets used
7. Placeholders remaining
8. Documentation updated
9. Risks
10. Approval needed
