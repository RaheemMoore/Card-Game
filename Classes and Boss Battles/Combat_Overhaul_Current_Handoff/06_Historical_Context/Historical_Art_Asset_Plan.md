# Ability-First Boss Battle — Art & Asset Production Plan

**Status:** Active production roadmap — Ability Tile Foundations finalized; later visual phases remain planned  
**Updated:** 2026-07-18  
**Companion to:** `Card_Game_Ability_First_Boss_Battle_Master_Plan.md`

## 1. Purpose

This document defines the artwork, interface assets, visual systems, placeholders, and production materials needed to support the Ability-First Boss Battle system.

It is a separate companion document. It does not replace, modify, or expand the Ability-First Boss Battle Master Plan.

This plan exists to define:

- Which visual assets are required
- Which assets should be deliberately designed as canonical game art
- Which assets can use placeholders during early implementation
- The recommended production order
- Which responsibilities belong to Figma, Leonardo, Claude, and the game implementation
- How assets should be named, approved, stored, and handed off
- Which art tasks must be completed before later gameplay phases depend on them

The immediate priority is the Ability Tile System.

---

## 2. Relationship to the Master Plan

The Ability-First Boss Battle Master Plan remains the source of truth for:

- Ability architecture
- Ability permanence
- Mechanical runtime
- Ability evolution
- Ability families
- Discovery
- Codex behavior
- Boss combat
- Boss phases
- Break mechanics
- Simulation
- Balance
- Implementation sequencing

This art plan translates those systems into visual production needs.

Changes to this file must not silently change gameplay mechanics, economy values, or implementation architecture.

---

## 3. Core Art Direction Principles

### Visual Direction

The visual system should be:

- Premium
- Fantasy-first
- Whimsical without becoming childish
- Clear at small sizes
- Built around strong silhouettes
- Consistent across abilities, codex entries, and combat
- Compatible with crystal, arcane, and crafted-material aesthetics
- Reusable rather than dependent on one-off artwork

The interface should avoid drifting too far into:

- Steampunk gears
- Industrial machinery
- Generic science-fiction panels
- Flat spreadsheet presentation
- Excessively metallic or mechanical framing unless required by a specific archetype or ability family

### Product Direction

The art must reinforce that abilities are:

- Permanent collectible entities
- Discoverable
- Cataloged
- Upgradable or evolvable
- Recognizable across multiple screens
- Worth returning to in the Codex
- More than disposable combat buttons

Boss art must communicate:

- Identity
- Threat
- Phase
- Intent
- Resistance
- Vulnerability
- Break state
- Escalation

---

## 4. Asset Categories

Every planned asset belongs to one of two categories.

### 4.1 Canonical Designed Assets

These are intentionally designed and approved assets that become part of the permanent game identity.

Examples:

- Ability tile frames
- Canonical ability icons
- Ability-family motifs
- Boss portraits
- Boss intent icons
- Codex layouts
- Status-effect icons
- Arena backgrounds
- Discovery visuals

### 4.2 Placeholder or Reusable Assets

These are temporary or shared assets used to avoid delaying early implementation.

Examples:

- Generic icons
- Text labels
- Colored blocks
- Temporary gradients
- Reused fantasy symbols
- Simple frames
- Basic combat bars
- Generic spell effects
- Temporary boss silhouettes

Placeholder assets must be clearly labeled and must not accidentally become canonical merely because they were integrated first.

---

## 5. Production Priority Order

Recommended art-production sequence:

1. Ability tile visual system
2. Ability icon and type-marker system
3. Resource and cost indicators
4. Status-effect and combat symbol library
5. Ability Codex and discovery presentation
6. Battle interface structure
7. Boss visual asset system
8. Battle environments
9. Effects, motion, and animation polish
10. Reward and progression presentation

This order follows implementation dependency rather than visual spectacle.

---

# 6. Ability Tile System — Highest Priority

The Ability Tile System should be the first major visual system created.

## 6.1 Canonical Assets Required

### Base Tile Framework

Create a reusable visual system for:

- Core Ability
- Signature Ability
- Ultimate Ability

Each version should share a recognizable family resemblance while clearly communicating its level of importance.

Required components:

- Empty base tile
- Border or frame
- Icon or artwork window
- Ability name area
- Cost area
- Type or family marker
- State-overlay area
- Optional tag area
- Optional cooldown indicator
- Optional upgrade or evolution marker

### Required Tile States

Design visual states for:

- Ready
- Hovered
- Selected
- Pressed or activated
- Queued
- Resolving
- Disabled
- Unavailable
- Insufficient resource
- On cooldown
- Exhausted or already used
- Locked
- Undiscovered
- Newly discovered
- Newly upgraded
- Evolved
- Recommended
- Targeting mode
- Boss-resistant or ineffective warning
- Bonus-effective or vulnerability warning

### Core, Signature, and Ultimate Differentiation

Define how the three categories differ through controlled visual escalation.

Potential dimensions:

- Frame complexity
- Gem count
- Edge treatment
- Glow intensity
- Crest size
- Material richness
- Icon-window shape
- Animation intensity
- Typography treatment
- Energy effect

The categories must not depend only on color.

### Icon or Artwork Window

Define:

- Window shape
- Crop behavior
- Icon scale
- Background treatment
- Masking rules
- Safe area
- Whether artwork is flat, sculpted, relief-based, glyph-based, or semi-illustrative

### Cost Indicators

Create visual treatments for:

- Mana
- Tech
- Cooldown
- Charges
- Ultimate meter
- Health sacrifice
- Conditional or alternate costs
- Free or zero-cost abilities

### Evolution and Discovery Signals

Potential signals:

- Standard ability
- Newly discovered ability
- Duplicate ability
- Evolved ability
- Lore-directed evolution
- Lore-defying evolution
- Rare discovery
- Hidden or secret ability
- Ability awaiting moderation or approval

## 6.2 Placeholder Assets Allowed

Early implementation may use:

- Colored rectangles
- Basic borders
- Letter-based labels
- Generic circle icons
- Plain cost numbers
- Shared placeholder art
- Temporary Core, Signature, and Ultimate labels
- Reused crystal shapes
- Generic glow overlays
- One temporary locked-state symbol
- One temporary cooldown overlay
- One temporary type-marker set

## 6.3 First Ability Tile Deliverables

The first Figma production set should include:

- One Core tile
- One Signature tile
- One Ultimate tile
- Ready state
- Hover state
- Selected state
- Disabled state
- Cooldown state
- Locked or undiscovered state
- Newly discovered state
- Placeholder icon version
- Example populated tile
- Basic component variants

---

# 7. Ability Icon and Canonical Artwork System

## 7.1 Icon Style Guide

Define a consistent approach for:

- Weapons
- Martial techniques
- Magic
- Healing
- Defense
- Summons
- Technology
- Nature
- Blood
- Shadow
- Celestial power
- Mechanical effects
- Status application
- Reactive abilities

The style guide should establish:

- Silhouette complexity
- Render depth
- Lighting
- Contrast
- Edge clarity
- Background usage
- Material treatment
- Color limits
- Minimum readable size
- Rules for combining multiple motifs

## 7.2 Ability Family Visual Languages

Potential family systems include:

- Fire
- Frost
- Lightning
- Poison
- Blood
- Holy
- Shadow
- Nature
- Beast
- Martial
- Arcane
- Tech
- Void
- Healing
- Summoning
- Protection
- Control
- Curse
- Support

Each family may require:

- Primary motif
- Supporting texture
- Shape language
- Color range
- Material language
- Sample icon
- Sample tile treatment

## 7.3 Core, Signature, and Ultimate Art Rules

### Core Abilities

Should be:

- Clear
- Efficient
- Reusable
- Visually readable
- Less ornate

### Signature Abilities

Should receive:

- Stronger identity
- More distinctive composition
- Greater energy or material richness
- A recognizable signature marker

### Ultimate Abilities

Should receive:

- Highest visual intensity
- Strong focal point
- More dramatic energy
- Unique border or crest treatment
- Optional activation artwork or animation concept

## 7.4 Placeholder Assets Allowed

- Generic elemental icons
- Weapon silhouettes
- Public-domain or licensed temporary glyphs
- A shared summon symbol
- A shared ultimate symbol
- A shared signature symbol
- Temporary abstract magic effects
- Text initials

---

# 8. Resource, Cost, and Ability-Type Symbols

## 8.1 Canonical Symbols Required

Potential symbols include:

- Mana
- Tech
- Health
- Ultimate energy
- Cooldown
- Charge
- Action
- Passive
- Reaction
- Trigger
- Damage
- Defense
- Healing
- Buff
- Debuff
- Summon
- Control
- Area effect
- Single target
- Random target
- Self target

## 8.2 Requirements

Symbols should:

- Remain readable at small size
- Avoid relying entirely on color
- Use distinct silhouettes
- Work inside ability tiles
- Work inside Codex entries
- Work in tooltips
- Work in battle logs
- Work in accessibility modes

## 8.3 Placeholder Assets Allowed

- Letters
- Basic geometric symbols
- Plain arrows
- Circles with numbers
- Existing generic game icons
- Temporary monochrome glyphs

---

# 9. Ability Codex and Discovery Presentation

## 9.1 Codex Entry Layout

A Codex entry may include:

- Ability name
- Canonical icon or artwork
- Ability family
- Ability type
- Core, Signature, or Ultimate classification
- Mechanical summary
- Lore summary
- Discovery source
- Ownership status
- Evolution status
- Version or balance state
- Related abilities
- Archetype relationships
- Discovery date
- First discoverer recognition, if approved

## 9.2 Codex States

Design visual states for:

- Undiscovered
- Partially known
- Discovered
- Owned
- Not owned
- Evolved
- Duplicate encountered
- Hidden
- Secret
- Retired
- Moderation pending

## 9.3 Discovery Presentation

Potential deliverables:

- New ability reveal
- Codex-added banner
- Rare-discovery presentation
- Duplicate conversion message
- New family discovered
- Evolution unlocked
- Secret ability reveal
- First-discovery recognition

## 9.4 Placeholder Assets Allowed

- Grayscale silhouettes
- Question marks
- Blurred icons
- Generic locked cards
- Simple reveal modal
- Shared “new” badge
- Plain text confirmation

---

# 10. Status Effects and Combat Symbol Library

## 10.1 Common Status Icons

Initial candidates:

- Poison
- Burn
- Bleed
- Freeze
- Shock
- Stun
- Weakness
- Vulnerable
- Shield
- Regeneration
- Stealth
- Taunt
- Silence
- Curse
- Blessing
- Haste
- Slow
- Root
- Fear
- Confusion
- Marked
- Exposed
- Invulnerable
- Reflect
- Lifesteal
- Break
- Resistance increase
- Resistance decrease
- Damage increase
- Damage decrease
- Healing reduction
- Cooldown reduction

## 10.2 Required Variants

- Positive status frame
- Negative status frame
- Neutral status frame
- Stack count
- Duration count
- Permanent status
- Dispellable status
- Non-dispellable status
- Boss-only status
- Player-only status

## 10.3 Placeholder Assets Allowed

- Abbreviations
- Colored circles
- Generic arrows
- Plain numeric stacks
- Shared buff icon
- Shared debuff icon

---

# 11. Battle Interface Asset Set

## 11.1 Battle HUD

Potential components:

- Player health
- Boss health
- Mana
- Tech
- Ultimate meter
- Break meter
- Cooldown tracker
- Turn indicator
- Phase indicator
- Status tray
- Resistance panel
- Boss intent display
- Battle log access
- Settings
- Speed controls, if used later

## 11.2 Ability Action Area

Potential components:

- Ability tile row
- Tile carousel
- Ability detail expansion
- Selection highlight
- Target confirmation
- Cancel action
- Queue indicator
- Resource warning
- Cooldown timer
- Ultimate activation state

## 11.3 Combat Feedback

Visual treatments may be required for:

- Damage
- Healing
- Block
- Dodge
- Resist
- Immune
- Critical
- Weakness hit
- Status applied
- Status removed
- Break triggered
- Phase changed
- Summon created
- Summon defeated
- Ability evolved or discovered during combat, if allowed

## 11.4 Encounter Screens

Potential deliverables:

- Encounter intro
- Boss title card
- Battle loading screen
- Victory screen
- Defeat screen
- Reward screen
- First-clear screen
- Retry or rematch panel
- Return-to-Codex prompt

## 11.5 Placeholder Assets Allowed

- Basic progress bars
- Flat panels
- Existing crystal and coin icons
- Plain combat text
- Generic modals
- Temporary gradients
- Simple boss nameplates

---

# 12. Boss Visual Asset System

## 12.1 Boss Portraits

Each boss may eventually require:

- Primary portrait
- Full encounter artwork
- Thumbnail
- Codex portrait
- Battle portrait
- Reward-screen portrait
- Marketing or discovery artwork, if needed

## 12.2 Boss Phase Variants

Depending on the boss:

- Phase 1
- Phase 2
- Phase 3
- Enraged
- Awakened
- Damaged
- Corrupted
- Exposed
- Broken
- Defeated

## 12.3 Boss Intent Icons

Potential intent symbols:

- Attack
- Heavy attack
- Multi-hit
- Defend
- Charge
- Heal
- Buff
- Debuff
- Summon
- Area attack
- Ultimate
- Phase shift
- Cleanse
- Counter
- Reflect
- Drain
- Break recovery
- Special mechanic

## 12.4 Resistance and Break Visuals

Potential assets:

- Physical resistance
- Magical resistance
- Elemental resistance
- Status resistance
- Immunity
- Vulnerability
- Armor
- Barrier
- Break meter
- Broken state
- Exposed state
- Resistance shattered

## 12.5 Boss Summons and Minor Enemies

Potential assets:

- Summon token
- Summon portrait
- Minor enemy frame
- Simplified health bar
- Summon intent
- Summon status indicators

## 12.6 Placeholder Assets Allowed

- Generic boss silhouette
- Reused boss frame
- Plain text intents
- Temporary arrows
- One prototype boss portrait
- Recolored or modified test portrait
- Basic resistance labels

---

# 13. Battle Environments and Backgrounds

## 13.1 Canonical Background Needs

Potential background categories:

- Battle arena
- Boss introduction
- Phase-shift variation
- Victory
- Defeat
- Ability Codex
- Discovery reveal
- Reward presentation

Potential arena concepts:

- Ruined shrine
- Crystal cavern
- Cursed forest
- Ancient coliseum
- Techno-arcane forge
- Necrotic cathedral
- Celestial platform
- Vampire castle
- Druidic grove
- Mechanical vault
- Abyssal chamber

## 13.2 Placeholder Assets Allowed

- Gradients
- Blurred textures
- Single reusable battleground
- Dark vignette
- Colored fog
- Basic fantasy environment
- Reused generated concept background

---

# 14. Effects, VFX, and Motion Concepts

## 14.1 Ability Effects

Potential concepts:

- Cast flash
- Slash
- Projectile
- Impact
- Shield
- Healing pulse
- Poison cloud
- Fire burst
- Frost spread
- Lightning arc
- Summoning portal
- Tech activation
- Blood drain
- Shadow movement
- Celestial strike
- Ultimate burst

## 14.2 Boss Effects

Potential concepts:

- Phase transformation
- Enrage aura
- Charge-up
- Break shatter
- Arena hazard
- Summon portal
- Resistance shield
- Vulnerability exposure
- Defeat collapse

## 14.3 UI Effects

Potential concepts:

- Hover glow
- Tile selection
- Ability activation
- Codex reveal
- New discovery
- Upgrade pulse
- Reward sparkle
- Currency gain
- Ultimate-ready animation

## 14.4 Placeholder Assets Allowed

- Generic glow
- Burst PNG
- Scale animation
- Opacity pulse
- Shared particles
- Basic screen shake
- Temporary magic flash

---

# 15. Reward, Progression, and Meta Assets

Potential canonical assets:

- Reward chest
- Crystal reward
- Currency burst
- First-clear badge
- Boss-clear badge
- Codex completion badge
- Duplicate conversion
- Discovery milestone
- Family completion badge
- Evolution milestone
- Player contribution reward
- Rare discovery emblem

Placeholder assets may include:

- Generic star
- Generic badge
- Existing currency icons
- Plain reward modal
- Temporary chest
- Text-only reward summary

---

# 16. Tool Responsibilities

## 16.1 Figma

Figma should own:

- UI layouts
- Components
- Ability tile frames
- Codex screens
- Battle HUD
- Modals
- Interaction states
- Spacing
- Typography
- Responsive behavior
- Icon placement
- State variants
- Prototype interactions
- Asset usage rules
- Design-system consistency

## 16.2 Leonardo or Other Image Generation

Image generation should own:

- Canonical ability art
- Canonical ability icons when illustration is appropriate
- Ability-family visual exploration
- Boss portraits
- Boss phases
- Arena backgrounds
- Discovery splash art
- Reward concept art
- VFX concept sheets
- Decorative symbolic assets

Image generation should not be trusted to own:

- Pixel-perfect UI layout
- Component systems
- Dense interface screens
- Exact production sizing
- Final interaction structure

## 16.3 Claude

Claude should own:

- Asset specifications
- Naming
- Prompt templates
- File manifests
- Production checklists
- Dependency tracking
- Placeholder replacement tracking
- Implementation instructions
- Design documentation
- Validation against the master plan

Claude should not silently approve art, change gameplay values, or make paid image-generation calls without authorization.

## 16.4 Raheem

Raheem retains final approval over:

- Visual direction
- Canonical artwork
- Major style decisions
- Asset acceptance
- Prompt iteration
- Whether placeholders may ship
- Whether paid generation calls are authorized
- Whether art plans should later be merged

---

# 17. Recommended Asset Folder Structure

```text
Ability-First Boss Battle/
├── Plans/
│   ├── Card_Game_Ability_First_Boss_Battle_Master_Plan.md
│   ├── Ability_First_Boss_Battle_Art_Asset_Production_Plan.md
│   └── Ability_Tile_Art_Direction_Spec.md
│
├── Ability Tiles/
│   ├── Placeholder/
│   ├── Draft/
│   ├── Approved/
│   └── Integrated/
│
├── Ability Icons/
│   ├── Families/
│   ├── Core/
│   ├── Signature/
│   ├── Ultimate/
│   ├── Placeholder/
│   ├── Approved/
│   └── Integrated/
│
├── Combat Icons/
│   ├── Statuses/
│   ├── Resources/
│   ├── Ability Types/
│   ├── Boss Intents/
│   ├── Resistances/
│   └── Break/
│
├── Codex/
│   ├── Layouts/
│   ├── Discovery States/
│   ├── Reveal Assets/
│   └── Rewards/
│
├── Battle UI/
│   ├── HUD/
│   ├── Ability Area/
│   ├── Feedback/
│   ├── Encounter Intro/
│   └── Results/
│
├── Bosses/
│   ├── Portraits/
│   ├── Phases/
│   ├── Summons/
│   ├── Intents/
│   └── Approved/
│
├── Backgrounds/
│   ├── Battlefields/
│   ├── Codex/
│   ├── Discovery/
│   └── Rewards/
│
├── Effects/
│   ├── Ability/
│   ├── Boss/
│   └── UI/
│
└── Asset Manifests/
    ├── ability-assets.md
    ├── boss-assets.md
    ├── placeholder-assets.md
    └── approved-assets.md
```

Large image files should remain outside the Markdown documents.

The Markdown files should reference asset paths, approval status, intended usage, and revision notes rather than embedding full-resolution images.

---

# 18. Asset State Definitions

Every asset should have one of the following states.

## Placeholder

Temporary asset used to unblock development.

It is not visually approved and must be tracked for replacement.

## Draft

Purpose-built asset still under review.

It may be tested in Figma or development, but it is not final.

## Approved

Visually approved canonical asset.

It may still be awaiting technical integration.

## Integrated

Approved asset currently implemented in the game.

## Retired

Asset intentionally removed from active use but preserved for history or rollback.

---

# 19. Asset Manifest Requirements

Each canonical or draft asset should record:

- Asset ID
- Name
- Category
- Related ability, family, boss, or screen
- File path
- File format
- Dimensions
- Creation tool
- Prompt or source
- Draft status
- Approval status
- Integration status
- Revision number
- Date approved
- Must-keep elements
- Known issues
- Replacement target, if placeholder
- Figma component or frame reference
- Implementation location, once integrated

---

# 20. First Art Production Sprint

## Sprint 1: Ability Tile Foundations

### Required Decisions

- Overall tile style
- Tile proportions
- Core, Signature, and Ultimate hierarchy
- Frame materials
- Crystal usage
- Icon-window shape
- Text hierarchy
- Cost badge placement
- Resource presentation
- Locked-state appearance
- Undiscovered-state appearance
- Cooldown treatment
- Disabled treatment
- Hover treatment
- Selected treatment
- Evolution marker
- Discovery marker

### Required Figma Deliverables

- Base tile component
- Core variant
- Signature variant
- Ultimate variant
- Ready state
- Hover state
- Selected state
- Disabled state
- Cooldown state
- Locked state
- Undiscovered state
- Newly discovered state
- Placeholder icon version
- Populated example
- Component property naming
- Export guidance

### Optional Deliverables

- First-pass resource icons
- First-pass type icons
- First-pass status icons
- Discovery popup concept
- Ultimate activation concept

---


# 20.1 Ability Tile Foundation Milestone — Approved

Canonical Figma references:

- Ability System: `https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5`
- Command Strip: `?node-id=11-143`
- State overlays: `?node-id=14-45`
- Detail Card: `?node-id=44-59`
- Relic Presentation: `?node-id=48-46`
- Resource Badge system: `?node-id=64-92`
- Ember Cleave approved board: `?node-id=33-133`
- Aegis Ward approved board: `?node-id=54-160`

Approved visual benchmarks:

- Ember Cleave — warm, Martial, offensive, character-led
- Aegis Ward — cool, Tech, defensive, object-led

The benchmark gameplay numbers are provisional visual-test content and are not approved mechanical values.

---

# 21. Working Checklist

## Phase A: Ability Tile Foundations — Completed

- [x] Choose tile shape and split presentation system
- [x] Choose tile proportions
- [x] Choose frame material language
- [x] Choose crystal language
- [x] Define Core appearance
- [x] Define Signature appearance
- [x] Define Ultimate appearance
- [x] Define icon-window shape and crop behavior
- [x] Define icon-versus-text balance
- [x] Define cost badge
- [x] Define Mana and Tech resource placement
- [x] Define type and metadata placement
- [x] Define locked state
- [x] Define undiscovered state
- [x] Define cooldown base state
- [x] Define disabled state
- [x] Define selected state
- [x] Define hover state
- [x] Define evolution and discovery presentation
- [x] Build reusable Figma component sets
- [x] Validate two canonical visual benchmark families

## Phase B: Ability Icon System — In Progress

- [x] Establish initial canonical artwork/icon benchmark style
- [x] Validate warm Martial and cool Tech family directions
- [ ] Expand family motif rules beyond the two approved benchmarks
- [ ] Define optional Core-specific artwork treatment
- [x] Define Signature benchmark treatment
- [ ] Define Ultimate-specific artwork and activation treatment
- [x] Create Mana and Tech resource badges
- [ ] Create first ability-type icon library
- [ ] Create first status-effect icon library
- [x] Create and approve first canonical ability icon families: Ember Cleave and Aegis Ward

## Phase C: Codex and Discovery

- [ ] Define Codex entry layout
- [ ] Define undiscovered state
- [ ] Define discovered state
- [ ] Define owned state
- [ ] Define evolved state
- [ ] Define secret state
- [ ] Define discovery reveal
- [ ] Define duplicate result
- [ ] Define reward presentation

## Phase D: Battle UI

- [ ] Define HUD structure
- [ ] Define ability action area
- [ ] Define boss intent area
- [ ] Define resistance area
- [ ] Define break meter
- [ ] Define combat feedback
- [ ] Define encounter intro
- [ ] Define victory screen
- [ ] Define defeat screen
- [ ] Define reward screen

## Phase E: Boss Visuals

- [ ] Define boss portrait format
- [ ] Define boss phase format
- [ ] Define boss thumbnail format
- [ ] Define boss intent icon style
- [ ] Define resistance icon style
- [ ] Define break visual language
- [ ] Define summon presentation
- [ ] Create first prototype boss asset set

## Phase F: Environment and Effects

- [ ] Define first arena
- [ ] Define phase-shift background
- [ ] Define ability effect style
- [ ] Define boss effect style
- [ ] Define discovery animation
- [ ] Define ultimate animation
- [ ] Define victory effect
- [ ] Define break effect

---

# 22. Approval Gates

Visual production should pause for Raheem approval at:

1. Ability tile art direction
2. First Figma tile component set
3. Ability icon style
4. First canonical ability icon family
5. Codex layout
6. Battle HUD layout
7. First boss visual concept
8. First boss phase set
9. Final approved assets
10. Any large-scale style change

No asset should be silently marked final.

---

# 23. Non-Goals

This document does not:

- Change the Ability-First Boss Battle Master Plan
- Change combat mechanics
- Change economy values
- Implement the game
- Approve paid API usage
- Define final boss balance
- Require every possible asset before prototyping
- Require all placeholder assets to be replaced immediately
- Embed large images inside the Markdown file
- Merge all future art specifications into one document

---

# 24. Recommended Companion Documents

This project should use at least three separate documents:

1. `Card_Game_Ability_First_Boss_Battle_Master_Plan.md`
   - Gameplay, architecture, sequencing, and implementation source of truth

2. `Ability_First_Boss_Battle_Art_Asset_Production_Plan.md`
   - Complete visual production inventory, priorities, ownership, and asset workflow

3. `Ability_Tile_Art_Direction_Spec.md`
   - Focused design decisions, visual references, Figma component specifications, prompt experiments, and approved tile assets

Additional focused specifications should be created later when a visual area becomes large enough to deserve its own file.

Potential future files:

- `Ability_Icon_Style_Guide.md`
- `Ability_Codex_Visual_Spec.md`
- `Boss_Visual_Design_Spec.md`
- `Battle_UI_Visual_Spec.md`
- `Combat_Icon_Library.md`
- `VFX_and_Motion_Spec.md`

---

# 25. Current Milestone and Next Step

## Completed Milestone

The Ability Tile Foundations phase is complete and approved in Figma.

Completed deliverables include:

- Combat Command Strip component set
- Exceptional gameplay-state overlays
- Forged Detail Card component set
- Relic Discovery, Evolution, and Ultimate component set
- Mana and Tech resource badge system
- Optional Relic resource accent
- Ember Cleave approved benchmark
- Aegis Ward approved benchmark
- Battle-density and small-size readability tests
- Accessibility and non-color-cue validation
- Focused Ability Tile Art Direction Spec

## Claude Handoff Readiness

The three-document package is ready for Claude Stage 0 repository analysis:

1. `Card_Game_Ability_First_Boss_Battle_Master_Plan.md`
2. `Ability_First_Boss_Battle_Art_Asset_Production_Plan.md`
3. `Ability_Tile_Art_Direction_Spec.md`

Claude should not begin full implementation. Claude should inspect the live repository, reconcile these plans with current implementation, identify conflicts, and return a repository-specific roadmap before modifying the project.

## Next Visual Phases

Later focused work remains for:

- Full ability-family icon rules
- Ability-type icons
- Status-effect icons
- Full Codex layout and states
- Battle HUD
- Boss visual system
- Environments
- VFX and motion

These later phases do not block Stage 0 architecture review or the minimum Ability System implementation plan.
