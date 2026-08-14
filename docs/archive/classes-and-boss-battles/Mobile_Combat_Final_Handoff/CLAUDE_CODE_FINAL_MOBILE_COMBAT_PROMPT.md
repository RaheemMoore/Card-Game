# Complete the Final Mobile Combat Assignment

The mobile combat visual direction is approved.

Work through the entire assignment and present the completed mobile implementation visually when finished.

## Files to read

Read:

1. `Mobile_Combat_Final_Implementation_Plan.md`
2. `Mobile_Combat_Approved_Reference.png`
3. Current Combat Experience documents
4. Current Combat Frame System in Figma
5. Current Ability System Figma
6. Current live battle implementation

Do not use an outdated ZIP as implementation truth.

## Canonical visual target

Use `Mobile_Combat_Approved_Reference.png` as the primary composition reference.

The target is a modern portrait card-battler layout with:

- Compact Boss Header
- Intent panel
- Large boss Arena
- Three visible hero cards
- Selected center hero emphasis
- Three ability cards for selected hero
- Focus, Inspect, and End Party Turn
- Compact resource row
- Collapsible Combat Journal

Our cards and existing Combat Frame System must remain visually superior to the generic reference style.

## Figma access

Use any Figma assets needed from the project.

### Combat Frame System

Main page:

https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=14-2

Implementation board:

https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=22-36

Components:

- Boss HUD  
  https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=15-2

- Intent Panel  
  https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=16-18

- Combat Journal  
  https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=17-18

- Battle Command Shelf  
  https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=18-20

- Ability Slot variants  
  https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=19-54

- Utility Tray  
  https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=20-36

- Turn Badge  
  https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf?node-id=20-47

### Combat Experience

https://www.figma.com/design/9IIvc01ts7LZJ0RaCMGanf

### Ability System

https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5

Inspect exact Figma nodes using design context.

Claude is authorized to export individual Figma assets where necessary.

Do not rasterize the full UI into one image.

## Work mode

Do not stop after a planning report.

Inspect the current live repository, then complete the full mobile assignment through implementation, QA, and visual presentation.

Pause only for:

- A genuine product conflict
- Missing credentials
- A destructive migration requiring approval
- A required paid external action

Otherwise continue automatically through all phases.

## Preserve

Do not rewrite:

- Deterministic combat reducer
- Presentation queue
- Three-hero party runtime
- Ability definitions
- CardRenderer
- Boss balance
- Rewards
- Asset manifests
- Desktop combat composition
- Tablet combat composition

Reuse shared battle behavior and build a dedicated mobile presentation layer.

## Required mobile structure

```text
MobileCombatViewport
├── MobileBossHeader
├── MobileIntentPanel
├── MobileArenaStage
├── MobilePartyCardTray
├── MobileSelectedHeroNameplate
├── MobileAbilityRow
├── MobileActionControls
├── MobileResourceRow
└── MobileCombatJournal
```

## Required behavior

### Boss Header

Show:

- Boss name
- Level
- Category
- HP
- Rage
- Resistance/status icons
- Turn counter

### Intent

Show:

- Attack
- Target
- Exact projected damage

### Arena

- Boss and environment dominate the upper screen.
- Boss remains grounded.
- Damage and effects appear in the Arena.
- No giant panel surrounds the Arena.

### Party Cards

- Three exact live CardRenderer instances.
- Party order never changes.
- Selected hero is larger and raised.
- Side heroes are smaller and lower.
- Controlled overlap is allowed.
- Side cards remain tappable.
- Defeated cards remain visible.

### Abilities

- Hidden when no hero is selected.
- Appear only for selected hero.
- Three fixed slots: Core, Signature, Ultimate.
- Use canonical ability art and Figma Ability Slot states.
- Do not regenerate ability art.

### Actions

- Focus
- Inspect
- End Party Turn
- Auto only if already supported

End Party Turn must show queued command count.

### Resources

- Compact row
- Reuse existing Mana, Tech, Ultimate, and Rage language
- Avoid unnecessary duplication

### Combat Journal

- Collapsed by default
- Active event always visible
- Expandable bottom drawer
- No desktop right rail on phone

### Decision Mode

- Cards and abilities emphasized

### Playback Mode

- Ability controls collapse
- Cards lower slightly
- Arena and boss gain emphasis
- Active Journal event remains
- Input locks until Your Turn

## Implementation phases

Complete:

- M0 current-state inspection
- M1 portrait shell
- M2 card tray
- M3 abilities and actions
- M4 Journal drawer
- M5 Decision/Playback modes
- M6 visual polish
- M7 QA and visual presentation

Continue automatically unless blocked by a real decision.

## Required phone tests

Test at least:

- 360 × 800
- 390 × 844
- 430 × 932

Respect safe areas.

No horizontal scroll.

Do not regress desktop or tablet.

## Required final proof

Do not ask for approval until you provide:

1. Small-phone screenshot
2. Standard-phone screenshot
3. Large-phone screenshot
4. Decision Mode screenshot
5. Playback Mode screenshot
6. Expanded Journal screenshot
7. Side-by-side comparison against `Mobile_Combat_Approved_Reference.png`
8. Desktop regression screenshot
9. Tablet regression screenshot
10. Test results
11. Production build result
12. Files changed
13. Figma nodes used
14. Exported Figma assets
15. Remaining intentional differences

The assignment is complete only when the mobile combat experience is implemented and presented visually.
