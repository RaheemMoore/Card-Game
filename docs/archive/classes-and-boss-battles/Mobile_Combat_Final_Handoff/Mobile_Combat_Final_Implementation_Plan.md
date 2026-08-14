# Mobile Combat Experience — Final Implementation Plan

**Status:** Approved for full implementation  
**Canonical visual reference:** `Mobile_Combat_Approved_Reference.png`  
**Canonical orientation:** Portrait  
**Purpose:** Build the complete mobile combat experience without regressing desktop or tablet  
**Completion standard:** The assignment is not complete until Claude presents the finished mobile UI visually.

---

# 1. Final product goal

The mobile battle must feel like a modern portrait card-battler while preserving the project’s stronger fantasy cards, Combat Frame System, boss presentation, deterministic combat runtime, and three-hero party.

The approved reference establishes the target composition:

1. Compact Boss Header
2. Intent panel
3. Boss Arena
4. Three hero cards
5. Selected-hero ability row
6. Action controls and End Party Turn
7. Resource row
8. Collapsed Combat Journal

The mobile UI is not a compressed desktop layout.

It is a dedicated portrait combat mode built from the same battle state, card renderer, assets, presentation queue, and design system.

---

# 2. Visual authority

Use these sources in order:

1. `Mobile_Combat_Approved_Reference.png`
2. Mobile Combat Final Plan
3. Combat Frame System in Figma
4. Existing Combat Experience Figma
5. Existing Ability System Figma
6. Current live repository implementation

The reference image defines composition and visual hierarchy.

Figma defines reusable component geometry, borders, materials, states, and exact assets.

The live repository defines actual behavior and data.

---

# 3. Canonical Figma sources

## Combat Frame System

Main page:

`https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=14-2`

Implementation board:

`https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=22-36`

Components:

- Boss HUD  
  `https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=15-2`

- Intent Panel  
  `https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=16-18`

- Combat Journal  
  `https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=17-18`

- Battle Command Shelf  
  `https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=18-20`

- Ability Slot variants  
  `https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=19-54`

- Utility Tray  
  `https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=20-36`

- Turn Badge  
  `https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=20-47`

## Combat Experience

`https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf`

## Ability System

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5`

Claude may use any Figma asset needed from these files.

Claude should inspect exact nodes using Figma design context instead of visually guessing values.

---

# 4. Final mobile layout

```text
MobileCombatViewport
├── BossHeader
├── BossIntent
├── ArenaStage
├── PartyCardTray
├── SelectedHeroNameplate
├── AbilityRow
├── ActionControls
├── ResourceRow
└── CombatJournalCollapsed
```

All sections belong to one continuous portrait combat scene.

The Arena remains unframed.

HUD, intent, abilities, actions, resources, and Journal use the shared Combat Frame System.

---

# 5. Boss Header

Show:

- Boss name
- Level
- Boss category
- Turn counter
- HP bar
- Current HP / maximum HP
- Rage percentage
- Resistance and status icons

Reference behavior:

```text
EMBERBORN WRAITH                         LV.50
BOSS • TEACH                            TURN 1
████████████████████████        340 / 340 HP
RAGE 25%                         FIRE  ARMOR  RAGE
```

Requirements:

- Boss Header remains compact.
- No large boss portrait inside the header.
- Boss name must remain the strongest text.
- Use Boss HUD and Turn Badge assets from Figma.
- Respect phone safe areas.
- The header must not push the Arena too far down.

---

# 6. Intent Panel

Show:

- Intent label
- Attack name
- Target
- Exact projected damage
- Attack-type icon

Example:

```text
INTENT
EMBER SLASH
Target: GRYNDAK
40
```

Requirements:

- Use the Figma Intent Panel.
- Keep the text concise.
- Optional flavor text belongs in a detail drawer, not the main layout.
- Intent must remain readable in Decision Mode.
- During Playback Mode, it may transition to the active combat event.

---

# 7. Arena Stage

The boss and environment are the visual focus.

Contains:

- Arena background
- Boss ground/contact point
- Boss Combat Sprite
- Boss effects
- Hero Combat Sprites when appropriate
- Floating damage
- Targeting feedback
- Your Turn cue

Requirements:

- Boss remains centered and visually dominant.
- Boss occupies the upper-middle of the screen.
- The environment supports the boss identity.
- Do not show hero cards in the upper boss stage.
- Do not place a giant translucent panel around the Arena.
- Preserve a clear ground plane.
- During Playback Mode, the Arena gains vertical emphasis.

---

# 8. Party Card Tray

The approved mobile reference uses three visible cards.

Rules:

- Three fixed party lanes.
- Party order never changes.
- Center-selected card is larger and raised.
- Side cards are smaller and lower.
- Controlled overlap is allowed.
- Side cards remain tappable.
- Exact live `CardRenderer` is required.
- Hero card name, frame, portrait, title, stats, and resources must remain internally consistent.
- Selected card receives restrained glow.
- Defeated cards remain visible and desaturated.

Recommended initial composition:

```text
Seojin              Gryndak              Ashvara
smaller             selected             smaller
lower               raised               lower
```

The exact selected hero may differ at runtime.

The layout must work for any selected lane without mutating party order.

---

# 9. Selected Hero Nameplate

Place a compact nameplate between the Party Card Tray and Ability Row.

Show:

- Selected hero name
- Optional archetype or command state
- Optional queued-command marker

Example:

```text
GRYNDAK
```

Use the Combat Frame material language.

Do not show the nameplate if no hero is selected.

---

# 10. Ability Row

Abilities appear only for the selected hero.

Use three fixed slots:

- Core
- Signature
- Ultimate

Each slot shows:

- Ability art or icon
- Name
- Category
- Cost
- Short combat description
- Cooldown/readiness
- Disabled state

Requirements:

- Use Ability Slot variants from the Combat Frame System.
- Use canonical ability art from the current Ability System.
- Do not generate new ability art.
- Do not show another hero’s abilities.
- Empty or locked positions retain a framed disabled state.
- Selected ability receives stronger glow.
- Long descriptions may use a secondary details interaction.

---

# 11. Action Controls

Show:

- Focus
- Inspect
- End Party Turn
- Auto only if Auto already exists and is supported

Requirements:

- End Party Turn is primary.
- Show queued command count:

```text
END PARTY TURN
(2 / 3)
```

- Use the Battle Command Shelf and Utility Tray assets from Figma.
- Buttons must fit safe touch sizes.
- Do not invent unsupported controls.
- Leave belongs in a confirmation flow, not as an accidental tap target.

---

# 12. Resource Row

Show only resources meaningful to active combat.

Potential content:

- Mana or Tech
- Ultimate charge
- Turn energy or action count
- Rage where appropriate

Requirements:

- Reuse existing resource colors and badge system.
- Do not introduce a second incompatible color language.
- Keep it compact.
- Do not repeat information already clearly visible on cards unless it is needed for decision-making.

---

# 13. Combat Journal

Default state is collapsed.

Collapsed example:

```text
COMBAT JOURNAL                            ▲
Emberborn Wraith intends Ember Slash on Gryndak for 40 damage.
```

Expanded state:

- Opens as a bottom drawer.
- Shows active event and history.
- Uses the Figma Combat Journal frame.
- Does not replace the entire Arena.
- Remains synchronized with the presentation queue.
- Supports close, swipe, keyboard, and screen readers.

---

# 14. Decision Mode

Decision Mode emphasizes cards and commands.

Visible:

- Boss Header
- Intent
- Arena
- Party Card Tray
- Selected hero nameplate
- Ability Row
- Action controls
- Resource row
- Collapsed Journal

Flow:

1. Tap hero.
2. Card raises.
3. Hero nameplate and abilities appear.
4. Select ability.
5. Target if required.
6. Queue command.
7. Select next hero.
8. End Party Turn.

---

# 15. Playback Mode

Playback Mode emphasizes the Arena.

Behavior:

- Ability Row collapses or dims.
- Action controls disable or hide.
- Cards lower slightly.
- Arena receives more height.
- Boss and impact animations become dominant.
- Active Journal event remains visible.
- Input stays locked.
- `YOUR TURN` appears before returning to Decision Mode.

The mobile layout must visibly change between Decision and Playback modes.

---

# 16. Responsive phone targets

Test at minimum:

- Small phone portrait
- Standard phone portrait
- Large phone portrait

Suggested viewport examples:

- 360 × 800
- 390 × 844
- 430 × 932

Requirements:

- No horizontal scrolling.
- No normal document scrolling during active combat unless deliberately required by the expanded Journal.
- Respect top and bottom safe areas.
- Do not hide key controls under browser UI.
- Keep side cards tappable.

---

# 17. Orientation

- Portrait is canonical for phones.
- Phone landscape is not a primary v1 layout.
- Tablet uses the existing tablet layout.
- If a narrow landscape phone cannot satisfy minimum space requirements, request portrait orientation.

---

# 18. Required implementation phases

Claude should work through the assignment completely.

## M0 — Current-state inspection

- Inspect live repository.
- Identify current mobile rendering.
- Identify shared battle logic.
- Identify breakpoints.
- Identify safe-area handling.
- Identify Figma assets and components to reuse.

Claude may report findings, but should continue automatically unless it finds a true product conflict.

## M1 — Portrait combat shell

- Full-screen mobile route/shell
- Boss Header
- Turn Badge
- Intent
- Arena
- Collapsed Journal

## M2 — Party Card Tray

- Three card lanes
- Selected and unselected states
- Card overlap
- Exact CardRenderer
- Hero sprite relationship
- Defeated state

## M3 — Ability and command UI

- Selected hero nameplate
- Three ability slots
- Focus/Inspect
- End Party Turn count
- Resource row
- Hidden abilities without selection

## M4 — Journal drawer

- Collapsed row
- Expanded drawer
- Active event
- History
- Accessibility

## M5 — Decision and Playback modes

- Command collapse
- Arena expansion
- Input locking
- Card lowering
- Turn cue
- Playback synchronization

## M6 — Visual polish

- Figma frame fidelity
- Typography
- Spacing
- Safe areas
- Contrast
- Animation timing
- Card readability
- Boss prominence

## M7 — Verification and presentation

- Full relevant test suite
- Production build
- Small-phone screenshot
- Standard-phone screenshot
- Large-phone screenshot
- Decision Mode screenshot
- Playback Mode screenshot
- Expanded Journal screenshot
- Side-by-side comparison with approved reference
- Desktop and tablet regression screenshots

Claude should not stop after planning.

Claude should complete M0 through M7 unless blocked by a genuine product decision or missing credentials.

---

# 19. Use of Figma assets

Claude is authorized to use any needed Figma assets from:

- Combat Frame System
- Combat Experience
- Ability System
- Existing card-design sources

Preferred order:

1. Reuse existing production component or asset.
2. Implement exact Figma geometry using reusable CSS/SVG.
3. Export an individual Figma asset when code reconstruction is impractical.
4. Never rasterize the entire UI as one image.
5. Never create one-off border systems outside the Combat Frame family.

Track exported assets and their Figma source nodes.

---

# 20. Preserve completed systems

Do not rewrite:

- Deterministic combat reducer
- Presentation queue
- Three-hero party runtime
- Boss balance
- Ability definitions
- CardRenderer
- Reward logic
- Asset manifests
- Desktop combat layout
- Tablet combat layout

Create mobile presentation components around shared behavior.

---

# 21. Hard acceptance criteria

The mobile assignment is not complete until all are true:

- [ ] Mobile combat owns the full portrait viewport.
- [ ] Boss Header matches the approved hierarchy.
- [ ] Boss level, HP, Rage, statuses, and turn are visible.
- [ ] Intent shows target and exact projected damage.
- [ ] Boss and environment dominate the upper screen.
- [ ] Three exact live hero cards are visible.
- [ ] Selected hero card is raised and emphasized.
- [ ] Side cards remain tappable.
- [ ] Party order does not mutate.
- [ ] Abilities appear only for selected hero.
- [ ] Core, Signature, and Ultimate use fixed positions.
- [ ] End Party Turn displays queued count.
- [ ] Resources are compact and readable.
- [ ] Journal is collapsed by default and expandable.
- [ ] Decision Mode and Playback Mode are visibly different.
- [ ] Safe areas are respected.
- [ ] Small, standard, and large phone screenshots exist.
- [ ] Expanded Journal screenshot exists.
- [ ] Desktop and tablet remain unchanged.
- [ ] Final implementation is compared visually to the approved reference.
- [ ] Claude presents the completed work visually before asking for approval.

---

# 22. Required final presentation

Claude’s final response must include:

1. Summary of completed mobile work
2. Files created and modified
3. Reused Figma components and node links
4. Exported Figma assets and paths
5. Small-phone screenshot
6. Standard-phone screenshot
7. Large-phone screenshot
8. Decision Mode screenshot
9. Playback Mode screenshot
10. Expanded Journal screenshot
11. Side-by-side comparison with approved reference
12. Desktop regression screenshot
13. Tablet regression screenshot
14. Test results
15. Production build result
16. Remaining intentional differences
17. Any future polish recommendations

Claude should not request visual approval before these materials are available.
