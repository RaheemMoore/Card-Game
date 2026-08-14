# Combat Experience Wiki — Current Rebaseline

> This edition is paired with the current implementation audit. The original visual decisions remain approved, but implementation assumptions have changed.

## Current corrections

- Ability System A0–A9 is already implemented.
- Boss Battle B0–B7 is already implemented.
- The current live UI is solo, stacked, and placeholder-based.
- Three Hero Lanes require a real party-runtime extension.
- The current 140 ms phase advancement must be replaced by a presentation queue.
- The current boss is a CSS placeholder.
- The current Arena is the global app background rather than a dedicated battle environment.
- The exact `CardRenderer` must replace the generic battle HeroPanel.
- The old no-pixel-art boss statement is superseded by the approved Combat Sprite direction.
- The 50% mechanical phase versus 25% Rage question requires explicit resolution before rebalance.

The canonical execution sequence is now defined by `Combat_Overhaul_Rebaseline_Plan.md`.

---

# Combat Experience Wiki

**Status:** Canonical visual and interaction direction — ready for visual prototyping  
**Updated:** 2026-07-18  
**Scope:** Boss-battle presentation, pacing, responsive layout, combat sprites, Arena staging, Hero Lanes, feedback, and art-production requirements  
**Companion documents:**  
- `Card_Game_Ability_First_Boss_Battle_Master_Plan.md` — gameplay and architecture  
- `card-engine-boss-battle-spec.md` — deterministic combat contract  
- `Ability_First_Boss_Battle_Art_Asset_Production_Plan.md` — broader visual-production roadmap  
- `Ability_Tile_Art_Direction_Spec.md` — ability-tile system  

---

## 1. Source-of-truth relationship

This wiki governs **what combat looks like, feels like, and communicates**.

It does not replace:

- The deterministic combat runtime
- Ability definitions
- Boss balance
- Reward values
- Economy rules
- Card-forging systems

When implementation and this wiki disagree:

1. Preserve the deterministic runtime and battle records.
2. Change the presentation layer unless a gameplay conflict is explicitly approved.
3. Treat Figma as the canonical design source once the approved battle frames exist.
4. Keep placeholder artwork clearly labeled until Raheem approves canonical assets.

---

## 2. Current implementation findings

The current battle page is a one-hero vertical slice with:

- Hero selection
- Boss selection
- Boss art placeholder
- Hero panel
- Action bar
- Intent display
- Event log
- Reward modal

The current runtime auto-advances non-interactive phases through short scheduled delays. Combat events are resolved correctly, but the presentation largely follows the reducer immediately. This causes:

- Boss turns to feel too fast
- Several log entries to appear before the player can process them
- Little distinction between anticipation, impact, reaction, and recovery
- The interface to feel like a stacked prototype instead of a separate battle mode

### Required architectural correction

Combat resolution and visual playback must become separate layers.

```text
Combat reducer resolves deterministic events
        ↓
Presentation adapter converts events into visual beats
        ↓
Presentation queue plays one beat at a time
        ↓
Combat log updates in sync with the active beat
        ↓
“Your Turn” appears
        ↓
Player input unlocks
```

The presentation queue must never alter battle outcomes or become the source of combat truth.

---

# 3. Combat design principles

## Principle 1 — The card is the hero

The collectible card remains the primary representation of each hero.

Combat sprites:

- Give life and personality to cards
- Clarify which card is acting
- React to damage, victory, and defeat
- Never replace the card as the hero’s main visual identity

The card must remain visually larger, richer, and more important than its sprite.

## Principle 2 — The Arena exists to showcase the boss

The Arena frames the boss through:

- Scale
- Negative space
- Background contrast
- Grounding
- Controlled effects
- Fixed camera composition

The environment supports the boss but does not compete with the boss or hero cards.

## Principle 3 — Combat feedback never obscures artwork

Damage, healing, status notifications, projectiles, overlays, and effects must not cover:

- Hero-card portraits
- Important card information
- Boss face or silhouette
- Boss HUD
- Ability-selection controls

Feedback appears adjacent to its target, then clears quickly.

## Principle 4 — Readability before spectacle

At all times, the player should understand:

- Whose turn it is
- Which hero is selected
- What the boss intends
- Who is targeted
- Projected damage
- What action just occurred
- What changed because of it

## Principle 5 — Small animation, strong personality

The first version does not require full sprite sheets or complex animation.

Personality comes from:

- Anticipation
- Timing
- Recoil
- Small positional movement
- Pauses
- Sound
- Hit reactions
- Rage posture
- Celebration

## Principle 6 — One major visual event at a time

During normal combat, the presentation system should generally limit the screen to:

- One major animation
- One primary floating value
- One synchronized log update
- One status change

Area attacks may affect multiple lanes, but impacts resolve sequentially.

## Principle 7 — Fixed camera, stable battlefield

The camera remains fixed.

No normal-combat:

- Zooming
- Panning
- Rotating
- Following projectiles
- Dynamic reframing

Ultimates may darken or emphasize the fixed frame, but should not require camera movement.

---

# 4. Battle journey

## 4.1 Encounter discovery

Boss encounters are reached through protected or forbidden spaces, such as:

- Secret passages
- Sealed vaults
- Hidden temple doors
- Ancient gates
- Portals into forbidden areas
- Portals into protected sanctums

The boss is already inside its domain. The player enters the boss’s space.

## 4.2 Boss introduction

Before combat:

1. Reveal the premium boss card.
2. Present boss name, lore, difficulty, and encounter context.
3. Allow the player to inspect the boss card.
4. Proceed to Hero Selection.

The boss card is not shown during active combat.

## 4.3 Hero Selection

The player selects up to three eligible hero cards for the party.

The selection stage should prioritize:

- Full premium card artwork
- Card name
- Archetype
- Rank
- Core combat information
- Ability readiness

## 4.4 Fight or Run

The player receives two explicit choices:

- **Fight**
- **Run**

Running:

- Costs gold
- Gives no combat reward
- Does not destroy cards
- Does not permanently damage heroes
- Does not cost premium currency
- Uses a predictable displayed amount
- Must require confirmation before payment

The exact gold cost remains an economy decision and should not be hardcoded by the visual implementation.

## 4.5 Arena transition

Approved transition language:

- A secret passage opens
- A sealed entrance unlocks
- A portal opens into a forbidden or protected Arena

The transition moves from premium card presentation into a small 2D combat world.

## 4.6 Active battle

The boss card disappears.

The active combat view contains:

- Arena
- Pixel-style boss Combat Sprite
- Boss HUD
- Three Hero Lanes
- Hero cards
- Hero Combat Sprites
- Ability controls
- Combat log
- Battle controls

## 4.7 Victory

1. Boss reaches zero HP.
2. Boss performs defeat reaction.
3. Hero sprites celebrate.
4. Hero cards rise fully.
5. Victory result appears.
6. Rewards are shown.
7. The experience returns to premium card presentation.

## 4.8 Defeat

1. Final hero is defeated.
2. Boss celebrates.
3. Defeated hero cards remain visible.
4. Result panel appears.
5. Retry, leave, or other approved options are offered.

---

# 5. Desktop layout

## 5.1 Primary structure

Desktop uses two main columns:

- **Main Battle Column**
- **Combat Log Column**

The Main Battle Column contains two equal-height regions:

- **Zone 2 — Arena**
- **Zone 5 — Hero Command Area**

A compact control region sits below.

```text
┌────────────────────────────────────────────┬──────────────────────┐
│ ZONE 2 — ARENA                             │ ZONE 3 — COMBAT LOG  │
│                                            │                      │
│ Boss HUD at upper-left                     │ Current event        │
│                                            │ Event history        │
│                  Boss Sprite               │                      │
│                                            │                      │
├────────────────────────────────────────────┤                      │
│ ZONE 5 — HERO COMMAND AREA                 │                      │
│                                            │                      │
│ Hero Lane 1   Hero Lane 2   Hero Lane 3    │                      │
│                                            │                      │
│ Sprite + Card + Status per lane            │                      │
├────────────────────────────────────────────┼──────────────────────┤
│ ZONE 6 — CONTROLS                          │                      │
└────────────────────────────────────────────┴──────────────────────┘
```

## 5.2 Zone 2 — Arena

Contains:

- Boss HUD in top-left
- Boss Combat Sprite
- Arena background
- Boss shadow or grounding element
- Summon positions
- Projectiles
- Hit effects
- Ultimate effects
- Floating feedback
- Rage transition
- Boss statuses

The Boss HUD is part of Zone 2. There is no separate left-side boss-information column.

## 5.3 Zone 3 — Combat Log

Desktop-only side column.

Contains:

- Current synchronized event
- Completed event history
- Round separators
- Turn-change cues
- Damage and mitigation summaries
- Status application and expiration
- Boss phase or Rage announcements

The log must remain readable without reducing Arena width excessively.

## 5.4 Zone 5 — Hero Command Area

Zone 5 matches Zone 2 in height.

It contains three invisible Hero Lanes.

The lanes have no visible borders, panels, or separators. They are created through spacing and alignment only.

## 5.5 Zone 6 — Controls

Contains:

- End Turn
- Exit or battle menu access
- Other approved universal controls

No speed controls in the first version.

---

# 6. Mobile layout

Mobile stacks the experience vertically:

1. Zone 2 — Arena
2. Zone 5 — Hero Command Area
3. Zone 6 — Controls
4. Zone 3 — Combat Log

The combat log moves below the full battle interface.

Mobile principles:

- Preserve card prominence
- Avoid squeezing three full cards into unreadable widths
- Allow controlled card scaling or horizontal composition only after Figma testing
- Maintain three stable hero positions
- Never convert the Hero Lanes into a free-scrolling card hand without approval
- Keep boss HUD pinned to the Arena’s upper-left
- Keep the boss centered within the available Arena stage

The approved mobile layout requires visual prototyping before final breakpoint rules are locked.

---

# 7. Hero Lanes

## 7.1 Purpose

Hero Lanes are layout structures, not visible UI panels.

Each lane owns:

- One Hero Combat Sprite
- One hero card
- Hero status icons
- Selection state
- Defeated state
- Future revival state
- Future temporary companion or summon marker
- Ability or resource emphasis tied to that hero

## 7.2 Card-first hierarchy

Within every Hero Lane:

1. Hero card
2. Selected-card state
3. Combat Sprite
4. Status effects
5. Secondary feedback

The card remains the main focus.

## 7.3 Default card position

Unselected hero cards remain partially lowered so the Arena has breathing room.

Target presentation:

- Approximately 60–75% of an unselected card remains visible
- Exact visibility must be established in Figma
- No final dimensions should be estimated in implementation
- The card stays readable enough to identify art, name, and key state

## 7.4 Selected state

When selected:

- Card and Combat Sprite rise together
- Card becomes fully visible
- Movement is vertical only
- Previous selected lane lowers as the new lane rises
- The selected lane may receive restrained emphasis
- No lane border appears
- No horizontal reordering occurs

## 7.5 Sprite relationship to card

The Combat Sprite stands behind the top edge of the card and peeks over it.

Rules:

- The sprite visually emerges from the card
- It overlaps the card only slightly
- It must not block the character portrait
- Sprite and card move as one selection unit
- The card remains visually larger than the sprite

## 7.6 Idle behavior

A restrained two-frame idle is sufficient:

- Small breathing motion
- Small bob
- Archetype-specific pose variation
- Always facing the boss

Idle movement must not become visually noisy across three lanes.

## 7.7 Defeated state

When defeated:

1. Hero sprite reacts.
2. Damage feedback appears above the lane.
3. Sprite collapses, disappears, or changes to a defeated pose.
4. Card lowers.
5. Card becomes moderately desaturated.
6. Defeated marker appears outside the artwork.
7. Lane remains in place.

The component must support future revival even if revival is not initially implemented.

## 7.8 Celebration

After victory:

- Hero sprites perform a simple celebration
- Cards rise fully
- Celebration remains short and synchronized
- The cards reclaim the strongest visual emphasis

---

# 8. Hero Combat Sprite system

## 8.1 Asset strategy

Do not generate a unique sprite for every generated card.

Create a curated sprite library selected by:

- Archetype
- Approved base body or silhouette variant
- Color profile
- Optional controlled accent palette

## 8.2 First-pass assignment

A generated hero receives:

1. Archetype sprite family
2. One compatible saved base sprite
3. Controlled recoloring based on card visual data where feasible
4. A fallback canonical archetype palette when recoloring data is unavailable

## 8.3 Safe recolor regions

Recommended recolorable areas:

- Clothing accent
- Armor accent
- Hair
- Cape or cloth
- Energy detail
- Small trim elements

Avoid first-version recoloring of:

- Every individual pixel
- Skin tone through unsafe blanket color replacement
- Complex face details
- Lighting and shadow ramps
- Entire silhouette

Skin tone and body representation should be handled through approved sprite variants, not a crude global tint.

## 8.4 Required hero sprite states

Initial library target:

- Idle
- Selected or ready
- Hit
- Defeated
- Celebrate
- Ultimate pose

These may be one- or two-frame states rather than full animations.

---

# 9. Arena and boss staging

## 9.1 Fixed stage

Every Arena uses a stable invisible ground and anchor system.

The boss stays within Zone 2.

Flying bosses:

- Use the same horizontal anchor
- Hover above the shared ground reference
- Cast a shadow or use another grounding cue
- Do not change the layout’s gameplay position

## 9.2 Boss size classes

Approved classes:

- **Tiny**
- **Medium**
- **Huge**

Size may influence:

- Power budget
- Ability identity
- Mobility
- Multi-hit behavior
- Summoning
- Area attacks
- Stagger or Break resistance
- Visual stage occupancy

Suggested visual targets for Figma exploration:

- Tiny: roughly one-quarter of the usable Arena focus area
- Medium: roughly two-fifths
- Huge: roughly two-thirds

These are composition targets, not implementation measurements.

## 9.3 Boss orientation

The boss faces the player.

The player should feel that the boss is looking directly toward the party and the viewer.

## 9.4 Boss entrance

The boss is already present.

The player enters the boss’s domain.

No entrance animation is required.

## 9.5 Boss reactions

Required boss behaviors:

- Idle
- Hit reaction
- Standard attack motion
- Rage posture
- Celebration after defeating a hero card
- Defeat reaction

## 9.6 Rage

At 25% HP:

1. Current presentation beat finishes.
2. Input remains locked.
3. Brief pause.
4. Boss changes posture, palette accent, or effect state.
5. `RAGE` is announced.
6. Boss abilities or behavior may change.
7. Normal turn order continues.

Rage does not consume the boss’s turn.

## 9.7 Summon anchors

Reserve future summon positions near the boss:

- One offset to the boss’s left
- One offset to the boss’s right

Summons must not push the boss out of its canonical anchor.

---

# 10. Boss HUD and intent

## 10.1 HUD placement

The HUD is pinned to the Arena’s upper-left.

Required content:

- Boss name
- HP bar
- Boss status effects
- Rage state when active
- Intent target
- Projected damage

Do not add a separate desktop boss-information column.

## 10.2 Intent visibility

For now, show:

- Target
- Exact projected damage

Examples:

```text
TARGET
Hero 2

DAMAGE
38
```

```text
TARGET
All Heroes

DAMAGE
24 each
```

Do not reveal by default:

- Hidden status effects
- Attack formula
- Priority
- Future intent chain
- Internal conditions
- Resistance calculations

## 10.3 Boss statuses

Boss status icons appear near the HUD, not over the sprite.

Each icon must support:

- Name tooltip or detail access
- Duration
- Stack count when relevant
- Clear beneficial or harmful distinction

---

# 11. Attack presentation language

## 11.1 General sequence

```text
Intent
→ anticipation
→ attack motion
→ impact
→ target reaction
→ floating feedback
→ synchronized log result
→ recovery
→ next presentation beat
```

## 11.2 Melee attacks

- Boss shifts or lunges forward inside the Arena
- Boss never overlaps hero cards
- Attack stops before Zone 5
- Impact appears above the targeted Hero Lane
- Boss returns to its anchor

## 11.3 Ranged attacks

- Boss performs a small attack or cast motion
- Projectile originates near the boss
- Projectile crosses from Zone 2 toward Zone 5
- Projectile terminates above the target card
- Projectile never obscures card artwork
- Target reacts
- Projectile clears immediately after impact

## 11.4 Magic attacks

Use the ranged framework unless the effect is self-centered or Arena-wide.

Magic identity comes from configurable:

- Projectile shape
- Symbol
- Trail
- Impact
- Sound
- Color token

## 11.5 Area attacks

Area attacks resolve lane by lane:

1. Shared warning
2. Lane 1 impact
3. Lane 2 impact
4. Lane 3 impact
5. Combined log summary

Short spacing separates impacts while preserving momentum.

## 11.6 Heavy attacks

Heavy attacks use:

- Longer anticipation
- Stronger boss posture change
- More pronounced impact
- Longer recovery
- Clearer log language

They should take longer than normal attacks.

## 11.7 Ultimate abilities

Hero Ultimates are the exception to the minimal-animation rule.

Reusable Ultimate sequence:

1. Input locks.
2. Selected card rises fully.
3. Background dims slightly.
4. Card receives archetype-colored emphasis.
5. Hero sprite performs one special pose.
6. Large reusable effect resolves.
7. Boss reacts.
8. Results appear.
9. Arena returns to normal.

The hero card—not the sprite—is the centerpiece.

Initial target duration: approximately 3–5 seconds, subject to Figma and prototype testing.

---

# 12. Floating combat feedback

## 12.1 Position

Floating feedback appears slightly above the affected target.

It must not cover the target.

## 12.2 Motion

Approved behavior:

- Appears just after impact
- Floats slightly upward
- Fades as the hit presentation passes
- Disappears before the next major beat competes for attention

## 12.3 Feedback categories

Required types:

- Damage
- Healing
- Shield gain
- Blocked or absorbed damage
- Buff applied
- Debuff applied
- Status removed
- Miss or evade when supported
- Critical or special result when supported later

## 12.4 Multi-target rule

Do not display multiple overlapping feedback clusters simultaneously when sequential display is possible.

---

# 13. Status effects

Status effects are shown for both heroes and bosses.

## 13.1 Hero status placement

Hero statuses appear outside the card artwork, aligned within the Hero Lane.

Preferred location:

- Below the visible card
- Or in a dedicated external status row proven in Figma

## 13.2 Boss status placement

Boss statuses appear near the Boss HUD.

## 13.3 Shared visual language

Hero and boss statuses reuse:

- Icon system
- Duration format
- Stack treatment
- Tooltip pattern
- Positive and negative classification

---

# 14. Combat log

## 14.1 Role

The log is a synchronized battle narrator and durable event history, not a rapidly scrolling debug console.

## 14.2 Desktop behavior

Zone 3 contains:

- Current event emphasis
- Older completed events above
- Round separators
- A stable readable scroll history

## 14.3 Mobile behavior

The log moves below:

- Arena
- Hero Lanes
- Controls

## 14.4 Synchronization

Log entries appear when the corresponding visual beat occurs.

They must not dump an entire resolved turn at once.

## 14.5 Recommended event format

```text
ROUND 4

Emberborn Wraith targets Aria.
Ember Cleave deals 38 damage.
Aria’s shield absorbs 12.
Aria takes 26 damage.

YOUR TURN
```

## 14.6 Flavor

Boss personality may enrich log language, but gameplay meaning must remain unambiguous.

Flavor should be pre-authored or generated outside active battle. No AI calls occur during combat.

---

# 15. Timing and presentation queue

## 15.1 Baseline timing targets

These are prototype targets, not locked final values:

- Intent reveal: ~0.8 seconds
- Normal anticipation: ~0.4 seconds
- Heavy anticipation: ~0.9 seconds
- Impact and reaction: ~0.5 seconds
- Floating feedback: ~0.8 seconds
- Pause before control return: ~0.5 seconds
- Rage transition: ~1.5–2 seconds
- Ultimate: ~3–5 seconds

## 15.2 Turn handoff

At the end of boss playback:

1. Final result finishes.
2. Short pause.
3. `YOUR TURN` appears.
4. Hero lanes become selectable.
5. Ability and End Turn controls unlock.

## 15.3 Speed controls

No battle-speed controls in the first version.

Do not add:

- 2×
- 4×
- Hold-to-skip
- Automatic fast battle

The architecture should not prevent them later, but no UI is required now.

## 15.4 Accessibility

Motion-reduction support should eventually allow:

- Reduced shake
- Reduced bobbing
- Shorter nonessential transitions
- Removal of flashing effects
- Preserved informational pauses

---

# 16. Ability interaction

## 16.1 First-version scope

Normal abilities do not require custom character animations.

Approved flow:

1. Select hero card.
2. Selected lane rises.
3. Select ability.
4. Confirm target if required.
5. Card remains the visual anchor.
6. Effect resolves using reusable feedback.
7. Boss reacts.
8. Log updates.
9. Player continues or ends turn.

## 16.2 Avoided complexity

Do not initially require:

- Unique sprite attack animation per ability
- Hero running into the Arena
- Full-body cinematic
- Card disappearing
- Custom projectile for every ability
- Generated animation at play time

## 16.3 Ability tiles

Ability selection should use the approved reusable ability-tile system rather than plain action buttons once integrated.

---

# 17. Background art direction

## 17.1 Purpose

Backgrounds establish:

- Location
- Threat
- Boss domain
- Mood
- Ground and horizon
- Forbidden or protected atmosphere

They are not the primary art focus.

## 17.2 Style

Initial direction:

- Stylized pixel or pixel-inspired environments
- Lower contrast than boss and cards
- Moderately restrained saturation
- Clear boss silhouette separation
- Stable horizon or ground reference
- No highly detailed foreground clutter
- No decorative elements behind critical HUD text

## 17.3 Perspective

The exact perspective must be established through the first visual prototype.

Preferred starting direction:

- Fixed frontal battle stage
- Slight depth in background layers
- Boss facing the viewer
- Hero cards presented as the foreground command interface
- No isometric camera
- No side-scrolling camera

## 17.4 Layer plan

Recommended reusable layers:

1. Far background
2. Midground architecture or landscape
3. Ground plane
4. Boss shadow
5. Boss Combat Sprite
6. Weather or ambient layer
7. Combat effects
8. HUD and floating feedback

## 17.5 First background prototype

Create one representative Arena before building a library.

Recommended first theme:

**Forbidden Mountain Passage**

Reason:

- Matches the approved secret-passage transition
- Supports rock, ruins, portals, mist, and sealed architecture
- Works with fire, undead, beast, and arcane bosses
- Provides a neutral test bed for tiny, medium, and huge sprites

---

# 18. Combat Sprite asset specification — prototype targets

Exact production dimensions must be chosen after Figma scale testing.

## 18.1 Hero prototypes

Test a small set of canvas scales rather than committing immediately.

Candidate test sizes:

- Compact
- Standard
- Large

The chosen standard must:

- Remain legible above a card
- Preserve facial or silhouette identity
- Support controlled recoloring
- Avoid dominating the card art
- Work on desktop and mobile

## 18.2 Boss prototypes

Test all three size classes in the same Arena frame:

- Tiny
- Medium
- Huge

Each must share:

- Ground anchor
- Shadow rules
- Facing direction
- HUD-safe area
- Floating-feedback safe area
- Rage-variant rules

## 18.3 Pixel rendering

Implementation must preserve crisp pixels when pixel art is used:

- Integer scaling where practical
- `image-rendering` appropriate for pixel assets
- No blurry fractional stretching in approved breakpoints
- Asset-safe cropping
- Transparent background
- Consistent canvas padding

---

# 19. Figma battle system

## 19.1 Required pages

Recommended Figma page structure:

```text
Combat Experience
├── 00 — Foundations
├── 01 — Desktop Battle
├── 02 — Mobile Battle
├── 03 — Arena Sandbox
├── 04 — Hero Lanes
├── 05 — Boss HUD
├── 06 — Combat Log
├── 07 — Feedback & Status
├── 08 — Combat Sprites
├── 09 — Background Tests
└── 10 — Motion Notes
```

## 19.2 Required components

- `Combat/BattleShell`
- `Combat/Arena`
- `Combat/BossHUD`
- `Combat/BossIntent`
- `Combat/CombatLog`
- `Combat/HeroCommandArea`
- `Combat/HeroLane`
- `Combat/FloatingFeedback`
- `Combat/StatusRow`
- `Combat/TurnCue`
- `Combat/BattleControls`
- `Combat/ResultOverlay`

## 19.3 Hero Lane variants

- Idle
- Hovered or focused
- Selected
- Acting
- Hit
- Defeated
- Revivable
- Victorious
- Disabled

## 19.4 Boss HUD variants

- Standard
- Damaged
- Rage threshold approaching
- Rage active
- Defeated
- Multiple statuses
- Long name
- Huge HP total

## 19.5 Responsive component behavior

Use:

- Auto Layout
- Variables
- Design tokens
- Component variants
- Constraints
- Responsive widths
- Shared status and icon components

Do not create desktop and mobile as unrelated one-off designs.

---

# 20. Art sourcing handoff

Raheem can begin supplying reference links after the first grayscale Figma composition is approved.

## 20.1 Reference links needed

### A. Boss sprite style

Provide 3–8 links showing:

- Desired pixel density
- Boss-facing perspective
- Preferred level of detail
- Tiny, medium, and huge examples
- Preferred idle personality

### B. Hero sprite style

Provide 3–8 links showing:

- Sprites peeking over or standing behind cards
- Desired body proportions
- Preferred amount of facial detail
- Archetype readability
- Color-variant examples

### C. Background style

Provide 3–8 links showing:

- Frontal battle stages
- Forbidden passages
- Protected sanctums
- Portals
- Ruins
- Desired contrast and saturation

### D. Effects

Provide optional links showing:

- Projectiles
- Impact effects
- Floating damage
- Rage
- Ultimate emphasis

## 20.2 What not to source yet

Do not spend time finding:

- Unique animation for every ability
- Every archetype sprite
- Full boss roster
- Dozens of backgrounds
- Custom weather for every Arena
- Unique ultimate effect for every hero

The first visual prototype needs only:

- One medium boss
- One Tiny/Huge scale comparison
- Three hero sprite placeholders
- Three real hero cards or representative card captures
- One background
- One projectile
- One hit effect
- One status row
- One combat-log state

---

# 21. First visual prototype package

The first prototype should demonstrate:

## Desktop

- Two-column shell
- Zone 2 and Zone 5 at equal height
- Zone 3 log column
- Zone 6 controls
- Boss HUD at Arena upper-left
- Medium boss
- Three invisible Hero Lanes
- Cards partially lowered
- One selected card fully raised
- Sprites peeking behind cards
- Statuses for boss and heroes
- Floating damage above target
- `YOUR TURN` cue

## Mobile

- Arena
- Hero Lanes
- Controls
- Combat log below
- Same component hierarchy
- Cards remain the visual priority

## State frames

Create at least:

1. Player decision state
2. Boss intent state
3. Boss attack impact
4. Hero defeated
5. Boss Rage
6. Ultimate
7. Victory

---

# 22. Claude implementation boundaries

Claude should preserve:

- Deterministic reducer
- Battle snapshots
- Event log as combat truth
- Seeded RNG
- Reward idempotency
- Existing combat formulas
- Ability version snapshots
- Boss version data

Claude should change or add:

- Presentation-event adapter
- Visual playback queue
- Input lock during playback
- Synchronized combat log
- Three-hero-ready layout
- Responsive battle shell
- Arena and Hero Lane components
- Combat Sprite asset hooks
- Boss size and Rage presentation hooks
- Floating feedback layer
- Mobile log relocation
- Fight-or-Run presentation and gold-cost integration after economy review

Claude must not:

- Rewrite the reducer for animation timing
- Add wall-clock logic inside deterministic combat functions
- Make AI calls during combat
- Treat Figma benchmark values as gameplay numbers
- Generate unique sprites for procedural heroes
- Add speed controls now
- Add complex ability animations now
- Show the boss card during combat
- Hide defeated hero cards
- Invent gold cost without economy approval

---

# 23. Acceptance criteria

## Visual identity

- Cards remain the dominant hero visuals.
- Boss Combat Sprite replaces the boss card during battle.
- Boss HUD lives in Zone 2 upper-left.
- Three Hero Lanes are stable and invisible.
- Zone 2 and Zone 5 use equal-height regions.
- Combat log has its own desktop column.
- Mobile combat log appears below battle content.

## Interaction

- Selected card and sprite rise together.
- Cards move only vertically.
- Boss intent shows target and exact projected damage.
- Heavy attacks take longer.
- Area attacks resolve lane by lane.
- Ultimates center the selected card.
- Defeated lanes remain visible.
- Rage occurs at 25% HP without consuming a turn.

## Feedback

- Floating values appear above targets.
- Floating values never cover art.
- Log entries synchronize with presentation.
- `YOUR TURN` appears before input unlocks.
- Boss reacts to hits.
- Boss celebrates after defeating a card.
- Heroes celebrate after victory.

## Technical

- Reducer remains deterministic.
- Presentation queue does not change battle results.
- No AI call occurs during battle.
- Existing battle replay information remains valid.
- Responsive components reuse the same design system.
- Placeholder assets are clearly marked.

---

# 24. Open items requiring later approval

The following are intentionally not yet locked:

- Exact desktop and mobile dimensions
- Exact Arena-to-log width ratio
- Exact card visibility percentage
- Exact card sizes
- Exact Combat Sprite canvas sizes
- Exact gold cost for running
- Final background perspective after visual prototype
- Final pixel density
- Final boss scale percentages
- Final timing after playable testing
- Audio direction
- Revival mechanics
- Summon gameplay behavior
- Unique archetype Ultimate packages

These should be decided through Figma and prototype review, not guessed in code.

---

# 25. Recommended immediate sequence

1. Approve this wiki as the visual direction.
2. Build grayscale desktop and mobile Figma frames.
3. Test real card captures in three Hero Lanes.
4. Test Tiny, Medium, and Huge boss silhouettes.
5. Approve composition and responsive behavior.
6. Ask Raheem for art-reference links using the categories in §20.
7. Build the first visual Arena prototype.
8. Finalize Combat Sprite and background specifications.
9. Write the repository-specific Claude implementation plan.
10. Implement presentation queue and responsive shell with placeholders.
11. Replace placeholders only after visual approval.

---

# 26. Canonical summary

The boss battle begins as a premium collectible-card encounter and transitions into a fixed-camera 2D Arena. The boss card is shown only before combat. During battle, the boss appears as a reusable pixel-style Combat Sprite. The boss and player face each other. Three premium hero cards remain the primary player visuals inside invisible Hero Lanes, with small archetype-based Combat Sprites peeking from behind their top edges. The cards move only vertically when selected.

The Arena occupies the upper half of the Main Battle Column, and the Hero Command Area occupies an equal-height lower half. The boss HUD is pinned to the Arena’s upper-left. The combat log uses its own right-side desktop column and moves below the battle interface on mobile. Combat is paced through a presentation queue so intent, anticipation, impact, reaction, floating feedback, and synchronized log updates occur in understandable order.

The visual system favors restrained motion, card prominence, boss personality, readable feedback, reusable assets, and deterministic combat underneath.
