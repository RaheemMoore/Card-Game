

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
