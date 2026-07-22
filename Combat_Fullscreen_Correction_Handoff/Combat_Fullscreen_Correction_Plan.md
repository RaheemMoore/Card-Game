# Combat Full-Screen Correction Handoff

**Status:** Mandatory visual correction before approval  
**Purpose:** Explain why the current implementation is not acceptable, define the intended experience, and give Claude Code a concrete plan to fix the battle shell without rewriting completed combat systems.

---

# 1. Product intent

The battle must feel like **starting a game inside the game**.

When active combat begins:

- The normal application page disappears.
- The battle owns the entire viewport.
- The Arena is the screen.
- The boss stands directly inside the Arena.
- The hero cards are physically part of the battlefield foreground.
- The Ability Bar and End Turn controls are docked into the combat frame.
- The Combat Journal is a dedicated right-side rail on desktop.
- The experience should feel like a compact fantasy RPG/card battle, not a web dashboard.

This is the core goal.

The current implementation does not achieve it.

---

# 2. Why the current result is not approved

The current implementation still reads as a normal website page containing several translucent cards and panels.

Specific problems:

## 2.1 The battle is not full screen

Current behavior:

- Standard application background remains visible.
- The battle is constrained inside a centered max-width layout.
- Large margins surround the content.
- The page still feels scrollable.
- The encounter feels embedded inside the website.

Required behavior:

- Active combat must occupy `100vw` and `100dvh`.
- The normal app shell must not remain visible.
- Standard page padding and max-width containers must be removed.
- Desktop combat must fit the viewport without normal document scrolling.

## 2.2 The Arena is treated like wallpaper

Current behavior:

- The environment sits behind a translucent content card.
- The actual fight happens inside another rectangle.

Required behavior:

- The Arena itself is the primary container.
- Boss, cards, sprites, feedback, abilities, and HUD must be layered directly into the Arena.
- There must not be a giant framed panel between the player and the environment.

## 2.3 Layout zones became visible dashboard boxes

The Arena, Hero Command Area, and Ability area were meant to be invisible structural zones.

Current behavior:

- Each region has its own large bordered/translucent rectangle.
- The screen looks like a dashboard.

Required behavior:

- Keep the zones in layout code.
- Remove visible large panel chrome.
- Use spacing, anchoring, and layering instead of boxing every region.

## 2.4 The boss is trapped inside the HUD

Current behavior:

- The boss is presented mainly as a small image inside the upper boss panel.
- There is no large central combat presence.

Required behavior:

- Boss HUD remains in the upper-left.
- The actual boss Combat Sprite must be a separate large stage element.
- The boss must occupy the upper-middle of the Arena.
- The boss must face the player.
- Attack, hit, Rage/phase, celebration, and defeat effects apply to the stage sprite.

## 2.5 The cards are not really on the battlefield

Current behavior:

- Cards appear as three isolated dashboard units.
- Large stat bars below each card create separate widgets.
- The cards float in the middle of a web layout.

Required behavior:

- Cards are anchored to the bottom foreground of the Arena.
- Their lower edge should align with the battlefield command area.
- Unselected cards remain partially lowered.
- The selected card rises vertically.
- Cards retain fixed horizontal lanes.
- Hero Combat Sprites peek from behind the card tops.
- The cards should visually feel like the player's party/hand standing inside the battlefield.

## 2.6 The Ability Bar is wrong

Current behavior:

- One oversized ability card appears as a large centered panel.
- It reads like an article or detail panel.

Required behavior:

- Three fixed compact slots:
  - Core
  - Signature
  - Ultimate
- Use the approved Ability Command Strip direction.
- The strip is docked below the hero cards and above End Turn.
- One available ability must not cause the entire bar to expand into a giant card.

## 2.7 The desktop Combat Journal is missing from the approved composition

Required desktop composition:

```text
Full-height battle scene | Full-height Combat Journal rail
```

The Journal must be:

- Persistent
- On the right side
- Clearly separated from the Arena
- Synchronized with combat playback
- Visible throughout active combat

## 2.8 The screen lacks depth

The approved experience requires layers:

1. Far environment
2. Midground structures
3. Boss ground/shadow
4. Boss Combat Sprite
5. Floating effects
6. Hero Combat Sprites
7. Hero cards
8. Ability Command Strip
9. Bottom controls
10. Combat Journal rail

The current implementation mainly has:

- Background
- Transparent rectangles
- Cards

That is why it still feels like a web page.

---

# 3. Approved desktop composition

The desktop battle must use a two-part full-screen shell.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                            FULL VIEWPORT COMBAT                            │
├───────────────────────────────────────────────────┬────────────────────────┤
│                                                   │                        │
│  Boss HUD                                         │                        │
│                                                   │                        │
│                    LARGE BOSS                     │      COMBAT JOURNAL    │
│                                                   │                        │
│                                                   │                        │
│     Hero Sprite     Hero Sprite     Hero Sprite   │                        │
│      Hero Card       Hero Card       Hero Card    │                        │
│                                                   │                        │
│   Core          Signature          Ultimate       │                        │
│                                                   │                        │
│  Menu / Info                 END TURN             │                        │
│                                                   │                        │
└───────────────────────────────────────────────────┴────────────────────────┘
```

Important:

- The entire left side is one continuous Arena.
- The hero cards are part of that Arena.
- The Ability Bar is part of that Arena.
- The bottom controls are part of that Arena.
- The right rail is the only large separate column.

---

# 4. Required component structure

Recommended DOM/component structure:

```text
CombatViewport
├── CombatScene
│   ├── ArenaBackground
│   ├── ArenaAtmosphere
│   ├── BossHUDOverlay
│   ├── BossStage
│   │   ├── BossShadow
│   │   ├── BossCombatSprite
│   │   ├── BossEffects
│   │   └── FloatingFeedback
│   ├── HeroForeground
│   │   ├── HeroLane1
│   │   ├── HeroLane2
│   │   └── HeroLane3
│   ├── AbilityCommandStrip
│   ├── BattleControls
│   └── TurnCue
└── CombatJournalRail
```

Do not wrap `CombatScene`, `HeroForeground`, or `AbilityCommandStrip` inside giant card-like containers.

---

# 5. Exact full-screen behavior

During active combat:

- `position: fixed` or equivalent full-viewport shell is acceptable.
- Width: `100vw`.
- Height: `100dvh`.
- Overflow: hidden on desktop.
- Remove normal page container width restrictions.
- Remove standard app header/navigation.
- Remove ordinary background.
- Remove page-level top/bottom padding.
- Prevent the standard route shell from reappearing behind the combat scene.
- The Leave action becomes a small battle control, not page navigation.
- Round/turn information belongs inside the combat frame.

The pre-combat selection and boss reveal may still use normal application pages.

The full-screen shell begins only after the player chooses Fight and enters active combat.

---

# 6. Arena rules

The Arena is the primary visual surface.

## 6.1 Environment

- Fill the entire left combat region.
- Preserve readable dark values behind the HUD.
- Preserve a clear central boss stage.
- Preserve lower foreground for hero cards.
- Do not blur or dim the Arena so heavily that it becomes wallpaper.
- Atmosphere may use mist, ash, embers, or subtle lighting.

## 6.2 Boss

- Separate from the HUD.
- Large enough to dominate the upper combat scene.
- Centered horizontally in the left battle region.
- Grounded with shadow or contact effect.
- Flying bosses use the same anchor but hover.
- No boss card during active combat.

## 6.3 Hero cards

- Bottom anchored.
- Three fixed lanes.
- No visible lane borders.
- Exact existing `CardRenderer`.
- Idle cards partially lowered.
- Selected card fully visible.
- Vertical movement only.
- No horizontal rearranging.
- Card remains larger and more important than its sprite.

## 6.4 Hero Combat Sprites

- Peek from behind card top edges.
- Remain visually attached to cards.
- Move vertically with cards.
- Always face the boss.
- Simple idle, hit, defeat, and celebration states are enough.

---

# 7. HUD and feedback direction

## Boss HUD

Location:

- Upper-left of the Arena
- Floating overlay
- Compact
- Not a giant card panel

Content:

- Boss name
- HP
- Statuses
- Rage/phase
- Target
- Exact projected damage

The boss portrait inside the HUD is optional.

## Floating damage

- Appears above the affected target.
- Never covers the target.
- Moves upward.
- Fades quickly.
- Disappears before the next major beat.

## Your Turn

- Brief centered cue.
- Appears after boss playback.
- Input unlocks only after the cue.

---

# 8. Ability Command Strip

Three permanent positions:

```text
Core | Signature | Ultimate
```

Rules:

- Compact horizontal tiles.
- Docked beneath the hero-card foreground.
- Selected hero determines content.
- Ultimate has restrained premium emphasis.
- Disabled/cooldown states remain readable.
- Full descriptions appear in detail interaction, not permanently.
- The strip must never become one oversized center card.

---

# 9. Combat Journal rail

Desktop:

- Right-side fixed rail.
- Full viewport height or nearly full height.
- Active event emphasized.
- Completed history remains visible.
- No giant translucent page panel around it.
- It should feel like part of the game frame.

Mobile:

- Moves below Arena, cards, abilities, and controls.
- Does not remain squeezed into a tiny right column.

---

# 10. Responsive behavior

## Desktop

- Full-screen two-column composition.
- No normal vertical page scroll.
- Arena + Journal fit the viewport.

## Tablet

- May reduce Journal width.
- Cards may scale down proportionally.
- Three lanes remain stable.
- Must still feel like full-screen combat.

## Mobile

Stack:

1. Arena
2. Hero cards
3. Ability Command Strip
4. End Turn and controls
5. Combat Journal

Mobile should still feel like combat mode, not a return to the standard app page.

---

# 11. What to preserve

Do not rewrite:

- Deterministic combat reducer
- Presentation queue
- Three-hero mechanics
- Current ability data
- CardRenderer
- Boss balance
- Rewards
- Event model
- Asset manifests
- Leonardo-generated assets already approved

This correction is primarily:

- Full-screen route shell
- Component composition
- CSS/layout
- Layering
- Positioning
- Responsive behavior
- Visual hierarchy

---

# 12. What must be removed or redesigned

Remove or redesign:

- Centered max-width battle wrapper
- Visible ordinary page background during combat
- Giant translucent Arena panel
- Giant translucent Hero Command panel
- Giant translucent Ability panel
- Card-specific stat dashboard blocks
- Boss-as-HUD-thumbnail-only presentation
- Oversized single ability detail card as the command bar
- Missing desktop Journal rail
- Page-like Leave/Round placement
- Excessive outer margins

---

# 13. Correction implementation plan

## Phase V1 — Full-screen combat shell

1. Create a dedicated active-combat viewport component.
2. Bypass or hide the normal app shell.
3. Occupy `100vw × 100dvh`.
4. Lock desktop document overflow.
5. Create left Arena region and right Journal rail.
6. Verify no max-width wrapper remains.
7. Capture screenshot.

### Gate

Do not proceed until the screen clearly reads as full-screen combat.

---

## Phase V2 — Continuous Arena composition

1. Make the Arena background fill the left region.
2. Remove the large translucent Arena panel.
3. Place Boss HUD as overlay.
4. Place boss stage independently.
5. Place boss sprite at Arena center.
6. Add ground/shadow.
7. Place turn cue and floating-feedback layer.
8. Capture screenshot.

### Gate

The boss must visibly stand in the Arena.

---

## Phase V3 — Hero cards on the battlefield

1. Move Hero Lanes into the lower Arena foreground.
2. Remove visible lane panels.
3. Anchor cards to the lower edge.
4. Apply idle and selected vertical positions.
5. Place hero sprites behind card tops.
6. Integrate compact per-lane health/resource/status treatment.
7. Capture screenshot.

### Gate

The cards must look like part of the battlefield, not separate widgets.

---

## Phase V4 — Ability and control docking

1. Restore three fixed ability slots.
2. Use approved Command Strip styling.
3. Dock beneath hero cards.
4. Dock End Turn below or within the command frame.
5. Remove giant ability-detail panel from primary layout.
6. Capture screenshot.

### Gate

The lower screen must read as one command interface.

---

## Phase V5 — Combat Journal rail

1. Restore persistent right-side Journal.
2. Make it full-height.
3. Emphasize active event.
4. Keep history visible.
5. Verify playback synchronization.
6. Capture screenshot.

### Gate

Desktop must match the approved wide composition.

---

## Phase V6 — Responsive correction

1. Confirm desktop.
2. Confirm tablet.
3. Build mobile stack.
4. Confirm full-screen combat mode remains.
5. Confirm cards stay readable.
6. Confirm Journal appears below.
7. Capture screenshots.

---

## Phase V7 — Visual comparison and polish

1. Place the implementation screenshot beside the approved reference.
2. Compare:
   - Viewport ownership
   - Arena continuity
   - Boss scale
   - Card position
   - Hero sprite position
   - Ability-strip structure
   - Journal rail
   - Visible box count
   - Visual depth
   - Overall game-mode feeling
3. List every major remaining difference.
4. Fix high-impact differences.
5. Repeat comparison.

Do not approve based only on functional completion.

---

# 14. Hard acceptance criteria

The correction is not complete unless all are true:

- [ ] Active combat owns the full viewport.
- [ ] Normal app shell is hidden.
- [ ] No centered max-width page wrapper remains.
- [ ] Arena fills the left combat region.
- [ ] Boss is a large independent Arena element.
- [ ] Boss HUD is a compact upper-left overlay.
- [ ] Three exact cards are anchored in the Arena foreground.
- [ ] Cards are not separate dashboard widgets.
- [ ] Hero sprites peek behind cards.
- [ ] Idle cards are partially lowered.
- [ ] Selected card rises vertically.
- [ ] Three fixed ability slots are visible.
- [ ] End Turn is docked into the combat interface.
- [ ] Desktop Journal rail is persistent on the right.
- [ ] Floating damage appears above targets.
- [ ] The battle resembles a small game launched inside the card game.
- [ ] Desktop screenshot is reviewed beside the approved reference.
- [ ] Mobile screenshot is reviewed.
- [ ] No completed combat systems were unnecessarily rewritten.

---

# 15. Claude Code prompt

Paste the following prompt into Claude Code.

```markdown
# Mandatory Final Visual Correction — Full-Screen Combat Mode

I am not approving the current Combat Overhaul visual result.

The underlying combat work may be correct, but the active battle still looks like a standard website dashboard composed of translucent rectangular panels. This is not the approved product direction.

The intended experience is:

> Starting a small fantasy card/RPG game inside the larger card game.

When active combat starts, the battle must own the full viewport. The Arena is the screen. The boss, hero cards, hero sprites, abilities, controls, feedback, and Journal all belong directly inside that combat composition.

Read:

- `Combat_Fullscreen_Correction_Plan.md`
- The approved combat-direction image
- The existing Combat Experience Wiki
- The current Figma combat file

Do not inspect an outdated ZIP. Work from the current live repository and the current implemented state.

## First task

Before changing code, inspect the current active-combat component tree and report:

1. Which component applies the centered max-width wrapper.
2. Which component keeps the standard app shell/background visible.
3. Which components render the giant Arena, Hero, and Ability panels.
4. Where the boss stage sprite is rendered.
5. Why the desktop Combat Journal rail is missing.
6. How the cards are currently positioned.
7. Which completed systems can remain untouched.

Then implement the correction plan below.

## Required structure

```text
CombatViewport
├── CombatScene
│   ├── ArenaBackground
│   ├── ArenaAtmosphere
│   ├── BossHUDOverlay
│   ├── BossStage
│   ├── HeroForeground
│   ├── AbilityCommandStrip
│   ├── BattleControls
│   └── TurnCue
└── CombatJournalRail
```

## Full-screen requirement

During active combat:

- Occupy `100vw` and `100dvh`.
- Hide the normal application shell.
- Remove ordinary page padding and max-width constraints.
- Prevent normal desktop document scrolling.
- The Arena fills the left-side combat region.
- The Combat Journal fills the right-side rail.

Pre-combat selection may remain in the normal app shell.

## Arena requirement

The Arena is one continuous visual scene.

Do not place it inside a giant translucent bordered panel.

Layer directly into it:

1. Background
2. Atmosphere
3. Boss shadow
4. Boss Combat Sprite
5. Combat feedback
6. Hero Combat Sprites
7. Hero cards
8. Ability Command Strip
9. Battle controls

## Boss requirement

- Keep Boss HUD in the Arena upper-left.
- Render the actual boss as a separate large stage sprite.
- Place it in the upper-middle Arena.
- Do not use the HUD image as the primary boss.
- Apply attack, hit, Rage/phase, celebration, and defeat presentation to the stage sprite.

## Hero-card requirement

- Use exact existing `CardRenderer`.
- Place three cards in the lower Arena foreground.
- Remove visible Hero Lane panels.
- Remove large stat-dashboard blocks.
- Keep lanes structurally stable but visually invisible.
- Idle cards remain partially lowered.
- Selected card rises vertically.
- Combat Sprites peek behind card tops.
- Cards must feel physically inside the battlefield.

## Ability requirement

- Three compact fixed slots:
  - Core
  - Signature
  - Ultimate
- Use the approved Ability Command Strip patterns.
- Dock under the cards.
- Do not use one giant ability-detail card as the primary command bar.
- Keep End Turn inside the lower combat frame.

## Combat Journal requirement

Desktop:

- Persistent right-side rail.
- Full-height or nearly full-height.
- Active event emphasized.
- Completed history visible.
- Synchronized with the presentation queue.

Mobile:

- Move below the battle content.

## Preserve

Do not rewrite:

- Deterministic reducer
- Presentation queue
- Three-hero runtime
- CardRenderer
- Ability definitions
- Boss balance
- Rewards
- Asset manifests

This is a shell, layout, layering, and responsive visual correction.

## Required implementation phases

1. Full-screen shell
2. Continuous Arena
3. Large boss stage sprite
4. Cards in Arena foreground
5. Hero sprites behind cards
6. Compact Ability Command Strip
7. Persistent Journal rail
8. Mobile stack
9. Side-by-side visual comparison
10. Final correction pass

## Visual-review gate

Before completion:

1. Capture a desktop screenshot.
2. Place it beside the approved combat-direction reference.
3. Compare:
   - Full-screen use
   - Arena continuity
   - Boss scale
   - Card anchoring
   - Hero sprite placement
   - Ability strip
   - Journal rail
   - Number of visible boxes
   - Overall immersion
4. Report every remaining major difference.
5. Fix the high-impact differences.
6. Provide a mobile screenshot.

Do not mark this task complete because all information is present.

The result must visibly read as:

> A full-screen fantasy battle game using the player's exact cards.

## Completion report

Return:

1. Files changed
2. Components restructured
3. CSS/layout changes
4. Completed systems preserved
5. Desktop screenshot
6. Mobile screenshot
7. Side-by-side visual difference report
8. Remaining intentional differences
9. Confirmation that normal app shell is hidden during active combat
10. Confirmation that cards are now inside the Arena foreground

Stop if a proposed change would require rewriting combat mechanics.
```

---

# 16. Final reminder

This correction is not optional polish.

The current implementation is functionally organized but visually communicates the wrong product.

The final approved experience must feel like the browser has transformed into the battle itself.
