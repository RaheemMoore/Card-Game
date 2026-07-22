# Ability Tile Art Direction Spec

**Status:** Finalized v1 — approved visual specification and Claude implementation handoff  
**Project:** Ability-First Boss Battle  
**Finalized:** 2026-07-18  
**Implementation readiness:** Ready for Claude Stage 0 repository analysis and implementation planning. Not authorization for full implementation.  
**Companion documents:**
- `Card_Game_Ability_First_Boss_Battle_Master_Plan.md`
- `Ability_First_Boss_Battle_Art_Asset_Production_Plan.md`

## 1. Purpose

This document records the approved visual direction, design decisions, Figma structures, asset needs, and implementation-facing rules for the Ability Tile System.

It is intentionally separate from the broader Art & Asset Production Plan because the ability system is expected to produce many components, states, icons, generated images, and supporting assets.

The protected card-frame source remains unchanged.

## 2. Protected Source

### Card Frame Template

Figma source:

`https://www.figma.com/design/J8RTVE4x69tAiVU0DGv5zq/Fantasy-Trading-Card-Template--Community-`

Rules:

- Do not modify the original source file.
- Do not delete, rename, flatten, detach, overwrite, or reorganize its original assets.
- Do not experiment directly inside the protected source.
- Derivative exploration must occur inside the Ability System or Design System working files.
- The source provides visual DNA rather than a requirement to make every interface element a miniature character card.

## 3. Figma Working Files

### Design System

`https://www.figma.com/design/FU0M4jT3NvHcFbv75GJrw3`

Contains:

- Approved visual DNA
- Working color and material foundations
- Typography direction
- Future shared components
- Icons and resource foundations
- Export and handoff guidance

### Ability System

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5`

Contains:

- Source-template research
- Ability-tile exploration
- Approved ability-tile directions
- Future components and variants
- Codex experiments
- Battle-context testing
- Exports and implementation handoff

## 4. Source Template Hierarchy

The project currently uses the following source hierarchy.

### Primary Visual DNA

**Card Frames**

Provides:

- Forged dark metal
- Embedded crystals
- Ornamental asymmetry
- Warm parchment information surfaces
- Crimson and ember accents
- Fantasy display typography
- Premium collectible craftsmanship

### Supporting Sources

**Crystal Currency**

Use for:

- Faceted crystal language
- Premium currency
- Glow
- Rarity
- Energy presentation

Do not carry forward:

- Ethereum or NFT framing
- Marketplace interface identity
- Science-fiction shell

**Coin Currency**

Use for:

- Coin placeholders
- Gem-centered coin concept
- Currency-scale testing

Requires later adaptation:

- Custom engraving
- Revised metal
- Better integration with the card-frame visual world

**Loot Boxes**

Use for:

- Chest proportions
- Reward staging
- Warm fantasy lighting
- Leonardo prompt references

Do not use as canonical art without redesign.

**Function Dice**

Use for:

- Functional D20 interaction concept
- Future randomization or roll mechanics

The current flat purple appearance is not canonical.

**Background and Theme Material**

Use for:

- Fantasy atmosphere
- Scenic depth
- Parchment warmth
- Editorial fantasy typography

Do not copy the landing-page interface as the game UI.

## 5. Approved Visual DNA

Future ability presentations should selectively preserve:

- Forged structure
- Embedded crystal accents
- Dark iron and aged materials
- Warm parchment or leather information surfaces
- Ember-based lighting
- Fantasy typography hierarchy
- Controlled ornamental asymmetry
- Clear silhouettes
- Premium collectible character

Avoid by default:

- Generic science-fiction panels
- Heavy steampunk gears
- Bright cyan-first interfaces
- Flat spreadsheet presentation
- Making every battle action visually ceremonial
- Depending on color alone to communicate type or state

## 6. Working Color and Material Direction

The current working foundation includes:

- Forge Black
- Aged Iron Brown
- Parchment
- Bone Ivory
- Ember Red
- Molten Gold
- Ash Gray

These are not permanently locked yet. They must be tested against:

- Real ability artwork
- Multiple ability families
- Combat backgrounds
- Accessibility and contrast
- Core, Signature, and Ultimate escalation

### Material Roles

**Forged Metal**

Used for:

- Structural frames
- Battle-ready surfaces
- Borders
- Nameplates
- Cost containers

**Crystal**

Used for:

- Cost
- Energy
- Rarity
- Family accents
- Discovery
- Ultimate emphasis

**Parchment and Leather**

Used for:

- Rules text
- Lore
- Expanded details
- Codex information
- Warm visual relief from dark metal

**Carved Stone and Wood**

Reserved for:

- Specific families
- Nature abilities
- Ancient relics
- Boss-specific interfaces

**Ember Lighting**

Used as:

- A warm world-building effect
- A focal accent
- A discovery or activation cue

It should not become visual noise across every surface.

## 7. Exploration Results

### Round 1

Three structural directions were tested:

1. Frame-Faithful Compact Tile
2. Collectible Relic Tile
3. Tactical Hybrid Tile

Findings:

- The frame-faithful approach had strong continuity but risked excessive detail.
- The relic approach had excellent collectible identity but was too ceremonial for repeated combat.
- The tactical hybrid had the strongest combat usability but needed richer fantasy identity.

### Round 2

Three refined directions were tested:

1. Forged Tactical Card
2. Relic-Core Hybrid
3. Command Strip

Findings:

- The Forged Tactical Card is useful for expanded inspection.
- The Relic-Core Hybrid is strongest for discovery, Codex, and Ultimate moments.
- The Command Strip is strongest for repeated combat interaction.

## 8. Approved Split Presentation System

One ability should have a consistent identity expressed through three coordinated presentation modes.

### 8.1 Combat Command Strip

**Primary use:**

- Repeated boss-battle action selection
- Fast scanning
- Resource decisions
- Cooldown decisions
- Targeting

**Required content:**

- Canonical ability icon
- Ability name
- Short mechanical summary
- Ability type
- Cost
- Cooldown or charge state when applicable
- Clear interaction state

**Density target:**

- Approximately four to six abilities visible without covering the boss
- The exact count must be validated in battle-context testing

**Visual direction:**

- Compact horizontal structure
- Forged metal base
- Controlled crystal accent
- Strong icon well
- High contrast
- Minimal ornament
- Fast state recognition

**Do not include by default:**

- Full lore
- Long descriptions
- Large decorative framing
- Large reveal effects
- Full evolution history

### 8.2 Forged Detail Card

**Primary use:**

- Expanded combat inspection
- Deck management
- Reward review
- Codex detail
- Upgrade and evolution review

**Required content:**

- Ability name
- Larger canonical artwork or icon
- Full mechanical description
- Cost
- Type or family
- Core, Signature, or Ultimate classification
- Tags
- Evolution or upgrade state
- Optional lore
- Optional source or discovery information

**Visual direction:**

- Strong relationship to the protected character-card frames
- Forged nameplate
- Larger art window
- Parchment rules area
- Crystal cost badge
- Clear family and classification markers

The detail card should feel collectible without pretending to be a full character card.

### 8.3 Relic Discovery and Codex Presentation

**Primary use:**

- New ability discovery
- Codex reveal
- Ability evolution
- Secret ability reveal
- Ultimate presentation
- Major collectible milestones

**Required content:**

- Canonical ability artwork
- Ability name
- Discovery or milestone message
- Codex status
- Optional lore line
- Rarity or significance cue

**Visual direction:**

- Central relic or emblem
- Ceremonial framing
- Strong energy
- Highest visual intensity
- Premium collectible presentation
- Optional animation or reveal effects

**Usage restriction:**

Maximum ceremony is reserved for meaningful moments. The relic presentation must not become the default every-turn combat control.

## 9. Shared Ability Identity

The three presentations must visibly represent the same ability.

Shared identity should come from:

- The same canonical artwork or icon
- The same ability-family motif
- The same core accent
- The same name
- The same cost/resource language
- Consistent family and type symbols
- Coordinated material treatment

The presentation mode may change, but the player should never wonder whether they are looking at a different ability.

## 10. Approved Figma Direction

Approved comparison board:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=8-2`

The board currently demonstrates:

- Combat Command Strip
- Forged Detail Card
- Relic Discovery Presentation
- Usage rules
- Density guidance
- Approved split-system rationale

These are approved structural directions, not final polished components.

## 11. Current Placeholder Art

The current Figma designs use abstract placeholders.

Placeholder art is acceptable while testing:

- Layout
- Density
- Text hierarchy
- Cost placement
- State visibility
- Responsive behavior

Placeholder art must not be mistaken for canonical ability artwork.

## 12. Leonardo Responsibilities

Leonardo should be used after the structural system is sufficiently stable.

Recommended first Leonardo task:

Create a small canonical ability-art test family that can be inserted into all three presentations.

Suggested test family:

- Fire / Martial
- Example ability: Ember Cleave

Required outputs should test:

- Small combat readability
- Medium detail-card cropping
- Central relic presentation
- Consistent identity across sizes

Leonardo should not be asked to generate complete UI screens or text-heavy tile layouts.

## 13. Next Figma Production Phase

The next phase should convert the approved system into reusable component architecture.

### Combat Component

Create:

- Base Command Strip component
- Core variant
- Signature variant
- Ultimate variant
- Ready state
- Hover state
- Selected state
- Disabled state
- Insufficient resource state
- Cooldown state
- Locked state
- Undiscovered state
- Recommended or weakness-effective state
- Resistant or ineffective warning state

### Detail Component

Create:

- Core detail card
- Signature detail card
- Ultimate detail card
- Standard ability
- Evolved ability
- Newly discovered ability
- Locked or unknown ability
- Duplicate encountered state

### Relic Component

Create:

- Discovery
- Rare discovery
- Secret discovery
- Evolution
- Ultimate
- Codex added
- Duplicate converted
- First discovery, if implemented

## 14. Decisions Still Open

The following require further design and approval:

- Exact combat-strip dimensions
- Exact number of simultaneously visible tiles
- Mobile and desktop behavior
- Icon window shape
- Cost-gem shape
- Mana and Tech differentiation
- Core, Signature, and Ultimate escalation
- Locked versus undiscovered treatment
- Cooldown visualization
- Targeting state
- Ability family symbols
- Canonical icon style
- Text truncation rules
- Long-name handling
- Animation intensity
- Accessibility treatment
- Final exported asset sizes

## 15. Decision Log

### Decision 001 — Split Presentation System

**Decision:**

Use three coordinated presentation modes rather than one tile shape for every context.

**Reason:**

Combat requires speed and density. Discovery and Codex experiences require collectibility and spectacle. A single shape would compromise one or both.

**Approved modes:**

- Combat Command Strip
- Forged Detail Card
- Relic Discovery Presentation

### Decision 002 — Card Frames as Visual DNA, Not Mandatory Geometry

**Decision:**

The protected card-frame template guides materials, hierarchy, and craftsmanship but does not force ability tiles to use full trading-card proportions.

**Reason:**

Miniature full cards are too dense for repeated combat use.

### Decision 003 — Leonardo After Structural Approval

**Decision:**

Use placeholder art during layout exploration. Generate canonical ability artwork only after the presentation system is stable enough to test real crops and scale.

**Reason:**

This avoids spending image-generation effort on rejected structures.

## 16. Finalized V1 Status

- [x] Source templates inventoried
- [x] Protected card-frame source documented
- [x] Visual DNA extracted
- [x] Material, color, typography, spacing, and effect foundations created
- [x] Split presentation system approved
- [x] Command Strip component set created
- [x] Command Strip exceptional-state overlay system created
- [x] Core, Signature, and Ultimate hierarchy created
- [x] Detail Card component set created
- [x] Relic Presentation component set created
- [x] Mana and Tech resource badge system created
- [x] Optional Relic resource accent evaluated and approved
- [x] Battle-density test completed
- [x] Accessibility, touch-target, naming, and non-color-cue audits completed
- [x] Ember Cleave approved as Benchmark 01
- [x] Aegis Ward approved as Benchmark 02
- [x] Canonical art tested at 96 px, 64 px, and 32 px
- [x] Live component integration boards created
- [x] Claude handoff boundaries documented
- [ ] Repository asset paths and implementation asset manifest — Claude/repository task
- [ ] Mobile-specific layout validation — implementation phase
- [ ] Final live cooldown timer/ring behavior — mechanical/runtime-dependent implementation phase

The unchecked items are explicit downstream implementation tasks. They do not block Claude Stage 0 architecture analysis.

## 17. Command Strip Component Production — Completed

### Figma Component Set

Component set:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=11-143`

Battle-density test:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=11-144`

### Completed Foundations

The Ability System file now contains:

- 3 local variable collections
- 57 scoped variables
- 5 Command Strip text styles
- 3 Command Strip effect styles
- A visual foundations reference board

Variable collections:

- `Ability / Primitives`
- `Ability / Semantic`
- `Ability / Geometry`

Typography:

- IM FELL English for fantasy-facing ability names
- Inter for effect text, metadata, cost, and high-speed combat information

### Command Strip Variant Matrix

The reusable component set contains 15 variants.

Tier variants:

- Core
- Signature
- Ultimate

State variants:

- Ready
- Hover
- Selected
- Disabled
- Cooldown

Total:

`3 tiers × 5 states = 15 variants`

### Editable Component Content

Each Command Strip instance supports editable:

- Ability name
- Short effect text
- Metadata
- Cost

Each instance also contains a nested ability-icon placeholder that can later be replaced or upgraded into a formal instance-swap property.

### Current Geometry

Working dimensions:

- Command Strip: 360 × 92 px
- Icon well: 64 × 64 px
- Cost badge: 48 × 48 px
- Default radius: 10 px
- Minimum interaction target: 44 px

The combined Figma component currently measures slightly wider than the target due to internal spacing and stroke behavior. This should be normalized during the next refinement pass before implementation handoff.

### Battle-Density Validation

A battle-context test was created using six live component instances.

Test layout:

- 900 px boss arena
- 420 px ability rail
- Six vertically stacked ability controls

Result:

Six abilities can be shown beside the encounter without covering the boss arena.

This validates the command-strip approach as a practical desktop battle layout.

### Current Production Findings

Strengths:

- Strong combat readability
- Clear tier differentiation
- Clear state differentiation
- Maintains the forged fantasy identity
- Supports repeated interaction without excessive ceremony
- Instances can be populated independently

Open refinements:

- Test canonical art at 64 px
- Normalize exact width to the intended 360 px
- Improve icon-slot family treatment
- Add insufficient-resource state
- Add locked and undiscovered states
- Add weakness-effective and resisted states
- Add target-selection state
- Test keyboard focus and accessibility
- Test mobile presentation
- Decide whether cooldown uses a numeric badge, overlay, or progress ring

### Updated Status

- [x] Reusable Command Strip component created
- [x] Core, Signature, and Ultimate variants created
- [x] Ready, Hover, Selected, Disabled, and Cooldown states created
- [x] Exact 360 × 92 px geometry normalized
- [x] Editable text and resource-badge properties created
- [x] Insufficient, Locked, Undiscovered, Effective, Resisted, Targeting, and Focus overlays created
- [x] Battle-density test completed
- [x] Ember Cleave and Aegis Ward tested at combat scale
- [x] Mana and Tech resource badges integrated


## 18. Extended Gameplay States and Geometry — Completed

### Geometry Normalization

All 15 Ability Command Strip variants now use the approved dimensions:

- Width: 360 px
- Height: 92 px

The content column was reduced to preserve the intended total width while retaining:

- 64 px icon well
- 48 px cost badge
- 10 px internal gaps
- 10 px outer padding

The geometry audit passed across every Core, Signature, and Ultimate variant.

### Extended State Architecture

The additional gameplay states were not added directly to the Tier × State component matrix.

Doing so would have increased the base set from 15 variants to 36 variants and made the component difficult to maintain.

Instead, a separate overlay component set was created.

Figma component set:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=14-45`

### Overlay Variants

The overlay component set contains:

- Insufficient
- Locked
- Undiscovered
- Effective
- Resisted
- Targeting
- Focus

Each overlay is exactly 360 × 92 px and is intended to be placed above a normal Command Strip instance.

### State Meanings

**Insufficient**

Used when the player cannot pay the ability's resource cost.

**Locked**

Used when the ability is known but unavailable due to progression, loadout rules, or encounter restrictions.

**Undiscovered**

Used when the ability's identity and mechanics must remain hidden.

**Effective**

Used when the ability exploits a boss weakness or receives a positive matchup bonus.

**Resisted**

Used when the boss will reduce, resist, or ignore part of the ability.

**Targeting**

Used after the player selects the ability but before a target is confirmed.

**Focus**

Used for keyboard, controller, or accessibility focus.

### Accessibility Rules

Each exceptional state includes a text label in addition to color and material treatment.

This prevents the state system from depending on color alone.

The audit confirmed:

- No duplicate component names
- No duplicate overlay names
- No text smaller than 10 px
- All controls exceed the 44 px minimum touch target
- Every base and overlay variant uses 360 × 92 px geometry
- Every overlay contains a non-color label cue

### Live Validation Board

Figma validation board:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=15-56`

The board demonstrates all seven overlays placed above live Command Strip instances.

### Updated Component Architecture

The system now uses two coordinated component sets:

1. `Ability Command Strip`
   - 3 tiers
   - 5 standard interaction states
   - 15 variants

2. `Ability Command State Overlay`
   - 7 exceptional gameplay states
   - Layered above the base component

This separation keeps the system maintainable while allowing multiple state combinations.

Example:

- Ultimate
- Selected
- Targeting

can be shown using an Ultimate / Selected base instance with a Targeting overlay.

### Updated Status

- [x] Exact 360 × 92 geometry normalized
- [x] Insufficient, Locked, Undiscovered, Effective, Resisted, Targeting, and Focus states created
- [x] Extended states tested over live instances
- [x] Naming, touch-target, text-size, and non-color-cue audits passed
- [x] Two canonical art families tested at 64 px
- [x] Mana and Tech resource badges finalized
- [ ] Mobile layout validation remains an implementation-phase task
- [ ] Live cooldown number/ring behavior remains dependent on the approved runtime contract


## 19. Ember Cleave Art Integration Test — Completed

### Figma Integration Board

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=33-133`

The first complete ability-art family has now been tested across the approved three-presentation system:

- Combat Command Strip
- Forged Detail Card
- Relic Discovery / Codex presentation

### Imported Source Assets

The manually imported assets were organized on `06 — Icons & Resources` as:

- `Source / Ember Cleave / Combat Icon`
- `Source / Ember Cleave / Detail Art`
- `Source / Ember Cleave / Relic Art`
- `Source / Ember Cleave / Reference Sheet`

The full reference sheet is locked to prevent accidental modification.

### Reusable Icon Component

A reusable icon component was created:

`Ability Icon / Ember Cleave`

Figma node:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=31-2`

The component is used inside the live Signature / Ready Command Strip test instance.

### Combat-Scale Findings

The Ember Cleave icon preserves its main identity at the intended 64 px combat size:

- The sweeping flame arc remains recognizable.
- The dark armored figure is still distinct from the background.
- The image reads as a specific melee ability rather than a generic fire symbol.

At 32 px, the flame arc remains recognizable, but character and weapon detail begin to collapse.

Decision:

- 64 px remains the primary battle icon size.
- 32 px may be used only for secondary navigation, compact lists, or system indicators.
- 32 px should not replace the main combat artwork.

### Detail-Card Findings

The larger artwork works well inside the forged detail-card structure.

Successful qualities:

- The character silhouette remains clear.
- The flame arc creates a strong visual path.
- The artwork has sufficient visual weight without displacing the mechanics.
- The parchment rules panel remains readable beneath the artwork.

The current crop is suitable as the benchmark for future ability detail-card artwork.

### Relic and Codex Findings

The relic crop works strongly as a discovery presentation because:

- The circular frame creates a ceremonial object.
- The embedded crystal language matches the approved card-world DNA.
- The artwork feels collectible without requiring a full character-card frame.
- The ability remains visibly connected to the combat and detail presentations.

Future relic generations may push the emblem treatment further so the relic version is even more distinct from the detail artwork, but the current result is suitable for the first system benchmark.

### Contrast Defect Found and Corrected

The first visual validation exposed insufficient text contrast inside the Command Strip.

The name, effect, and metadata were too dark against the forged background.

All 15 Command Strip variants were updated at the component-source level:

- Ability name → warm parchment
- Effect text → light bone
- Metadata → muted tan
- Cost text → dark text on the bright cost badge

Existing and future instances now inherit the corrected contrast.

### Current Approval State

The Ember Cleave family is approved as the first canonical ability-art benchmark.

Approval recorded:

- Approved by Raheem
- Date: 2026-07-18
- Scope: visual benchmark for the three-presentation ability system
- Approval does not independently lock placeholder gameplay values into the implementation

The approved identity includes:

- Combat icon direction
- Forged Detail Card crop
- Relic Discovery / Codex crop
- Warm forged-metal, ember, parchment, and crystal treatment
- 64 px primary combat-art requirement

### Updated Status

- [x] First generated ability-art family created
- [x] Source sheet imported and locked
- [x] Combat icon component created
- [x] Combat-scale readability tested
- [x] Detail-card crop tested
- [x] Relic / Codex crop tested
- [x] Command Strip contrast corrected
- [x] Ember Cleave family receives final visual approval
- [ ] Approved asset paths added to the implementation asset manifest — Claude/repository task
- [x] Formal Detail Card component created
- [x] Formal Relic Discovery component created
- [x] Second ability family generated to test system consistency


## 20. Formal Forged Detail Card Component — Completed

### Figma Component Set

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=44-59`

### Approved Geometry

- Component width: 396 px
- Component height: 580 px
- Artwork window: 364 × 280 px
- Header: 364 × 44 px
- Rules panel: 364 × 120 px
- Footer: 364 × 36 px

### Tier Variants

- Core
- Signature
- Ultimate

The tier changes border, badge, and metadata accents without changing the information architecture.

### Exposed Component Properties

- Ability Name
- Artwork
- Primary Rules
- Secondary Rules
- Meta Left
- Meta Center
- Meta Right
- Caption
- Show Caption

### Artwork Swap Atom

`Ability Artwork / Ember Cleave / Detail`

Figma node:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=41-157`

The artwork is an instance-swap property rather than a detached image fill. Future canonical ability artwork should use compatible artwork components so cards can change identity without breaking layout.

### Semantic Token Correction

The `surface/detail` semantic variable incorrectly resolved to parchment during initial component validation.

It was corrected to the forged dark surface primitive.

All Detail Card variants now use:

- Dark forged outer surface
- Dark forged header
- Tier accent reserved for border, badge, and metadata
- Warm parchment rules panel
- High-contrast rules text

This correction also prevents Signature tier color from consuming the full header and obscuring the badge hierarchy.

## 21. Formal Relic Presentation Component — Completed

### Figma Component Set

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=48-46`

### Approved Geometry

- Component width: 396 px
- Component height: 580 px
- Relic artwork: 364 × 364 px
- Title block: 364 × 58 px
- Lore panel: 364 × 88 px

### Moment Variants

- Discovery
- Evolution
- Ultimate

Moment labels and Codex messages are canonical variant content. They are not exposed as arbitrary text properties.

### Exposed Component Properties

- Ability Name
- Artwork
- Lore

### Artwork Swap Atom

`Ability Artwork / Ember Cleave / Relic`

Figma node:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=46-167`

### Moment Hierarchy

**Discovery**

- Warm ember accent
- `ABILITY DISCOVERED`
- `ADDED TO THE ABILITY CODEX`

**Evolution**

- Purple evolution border
- High-contrast status and footer text
- `ABILITY EVOLVED`
- `NEW FORM RECORDED IN THE CODEX`

**Ultimate**

- Gold ceremonial accent
- `ULTIMATE AWAKENED`
- `ULTIMATE FORM ADDED TO THE CODEX`

The purple accent remains on the Evolution border because the current Figma runtime resolves that local variable inconsistently on cloned small text layers. High-contrast semantic text tokens are used for the small labels instead.

## 22. Approved Live Integration Board

Figma board:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=33-133`

The board now uses live reusable instances for all three presentations:

1. Ability Command Strip
2. Ability Detail Card
3. Ability Relic Presentation

The previous hand-built Detail Card and Relic test frames were removed after their reusable replacements passed visual validation.

Board approval label:

`FIRST ART FAMILY • APPROVED`

This board is now the canonical Figma visual reference for Ember Cleave and the approved three-presentation ability system.

## 23. Current Production Architecture

The Ability System Figma file now contains:

- `Ability Command Strip`
  - 15 tier and interaction variants
- `Ability Command State Overlay`
  - 7 exceptional gameplay-state variants
- `Ability Detail Card`
  - 3 tier variants
- `Ability Relic Presentation`
  - 3 ceremonial moment variants
- `Ability Icon / Ember Cleave`
- `Ability Artwork / Ember Cleave / Detail`
- `Ability Artwork / Ember Cleave / Relic`
- Approved live integration and battle-density boards
- Shared local color, geometry, typography, and effect foundations

### Remaining Boundary

Figma visual approval does not automatically:

- Add assets to the application repository
- Create ability runtime data
- Lock placeholder damage, cost, Burn, or cooldown values
- Create the implementation asset manifest
- Implement Codex, battle, or deck-management screens

Those actions belong to the approved implementation workflow after repository-side planning and data decisions are reviewed.


## 24. Aegis Ward Visual Stress Test — Approved

### Purpose

Aegis Ward was created as the second ability-art family to test whether the approved three-presentation system works beyond Ember Cleave's warm, offensive, character-led identity.

Aegis Ward deliberately tests the opposite visual conditions:

- Cool-toned Tech identity
- Defensive role
- Barrier and interception language
- Mechanical and abstract central symbol
- Shield silhouette rather than a character attack
- Blue-white energy rather than ember and flame

### Figma Stress-Test Board

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=54-160`

Status:

`SECOND ART FAMILY • APPROVED`

The board uses the same live reusable components as Ember Cleave:

- Ability Command Strip
- Ability Detail Card
- Ability Relic Presentation

No new layout system was created for Aegis Ward.

### Reusable Artwork Components

**Combat icon**

`Ability Icon / Aegis Ward`

Figma node:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=53-2`

**Detail artwork**

`Ability Artwork / Aegis Ward / Detail`

Figma node:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=53-3`

**Relic artwork**

`Ability Artwork / Aegis Ward / Relic`

Figma node:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=53-4`

### Asset-Preparation Finding

The first generated detail and relic crops contained generated interface labels inside the artwork.

Those embedded labels would have duplicated:

- Ability name
- Tech label
- Tier label
- Cost information
- Codex copy

The source images were therefore cropped internally inside Figma rather than treated as canonical production assets.

The clean internal crops were exported inside Figma and used to update the reusable artwork components in place. Existing component instances updated automatically.

This confirms an important production rule:

> Generated source boards may guide presentation, but production artwork crops must contain artwork only. UI labels and mechanics must remain editable Figma or implementation layers.

### Combat-Scale Findings

Aegis Ward remains recognizable at the approved 64 px battle-icon size.

Successful qualities:

- Circular shield silhouette survives reduction.
- Bright central core remains the visual anchor.
- Silver-blue construction reads as Tech and Defense.
- The icon remains clearly different from Ember Cleave.

At 32 px:

- The core and outer ring remain recognizable.
- Mechanical details collapse.
- It remains suitable only for compact secondary contexts.

Decision:

- 64 px remains the main combat-art size.
- 32 px remains secondary.

### Combat Copy Finding

The first battle summary exceeded the available one-line width.

The Command Strip copy was reduced to:

`Gain 30 Barrier. Guard ally.`

This reinforces the approved content rule:

- Command Strip copy communicates the immediate action.
- Full interception conditions belong in the Detail Card.

The gameplay numbers and exact mechanic remain provisional and are not implementation-canonical.

### Detail Card Findings

The approved Detail Card component accommodates the cool defensive artwork without structural changes.

Successful qualities:

- Shield silhouette remains centered.
- Bright energy reads clearly against the forged dark frame.
- Parchment mechanics panel remains visually separate.
- Tech identity remains distinct from Ember Cleave.
- Signature tier hierarchy still reads despite the radically different artwork.

### Relic Presentation Findings

The Aegis Ward relic works successfully inside the existing Discovery presentation.

Successful qualities:

- The central mechanical shield reads as a collectible relic.
- The large circular silhouette suits ceremonial display.
- Blue energy remains visually dominant inside the warm forged shell.
- The shared Relic component still feels like the same game.

The orange Discovery accent remains a global moment cue rather than a Tech-family accent. This is acceptable for the current benchmark, but future family-wide testing should determine whether Relic presentations need an optional family-accent layer in addition to the canonical moment accent.

### System Validation

Aegis Ward confirms that the current component architecture can support:

- Warm and cool palettes
- Offensive and defensive roles
- Character-led and object-led art
- Mana-like fantasy presentation and Tech presentation
- High-motion attacks and stable protective symbols

No new card geometry or alternative component family was required.

### Approval State

Aegis Ward is approved as the second canonical visual benchmark.

Approval recorded:

- Approved by Raheem
- Date: 2026-07-18
- Benchmark order: 2
- Scope: cool-toned Tech, defensive, object-led ability identity
- Approval does not independently lock provisional gameplay values into implementation

The approved benchmark demonstrates that the shared component system supports both Ember Cleave and Aegis Ward without requiring alternative card geometry.

### Updated Status

- [x] Second ability family concept generated
- [x] Combat icon imported and componentized
- [x] Detail artwork imported and componentized
- [x] Relic artwork imported and componentized
- [x] Embedded generated UI removed from production crops
- [x] Combat, Detail, and Relic presentations tested
- [x] Combat copy shortened to fit
- [x] Tech defensive identity validated against Ember Cleave
- [x] Aegis Ward receives final visual approval
- [x] Tech resource badge language is formally designed
- [x] Optional family-accent behavior for Relic presentation is evaluated
- [ ] Approved asset paths are added to the implementation asset manifest — Claude/repository task


## 25. Aegis Ward Approval Recorded

Figma board:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=54-160`

Board status:

`SECOND ART FAMILY • APPROVED`

Aegis Ward is the approved counter-benchmark to Ember Cleave.

Together, the two benchmarks define the current minimum visual range the Ability System must support:

### Benchmark 01 — Ember Cleave

- Warm
- Martial
- Offensive
- Character-led
- High motion
- Flame and forged steel

### Benchmark 02 — Aegis Ward

- Cool
- Tech
- Defensive
- Object-led
- Stable central silhouette
- Blue energy, silver, and mechanical construction

The approval confirms that the current Command Strip, Detail Card, and Relic Presentation components are sufficiently flexible to support both families.

### Stable Design Rule

Future ability families should be evaluated against both approved benchmarks.

A new family should not be approved merely because it looks good in isolation. It must:

- Remain recognizable at 64 px
- Preserve its identity across all three presentations
- Stay visually distinct from both approved benchmarks
- Use the shared component system unless a genuine structural requirement is demonstrated
- Avoid embedding gameplay text inside canonical artwork
- Keep provisional mechanics separate from visual approval


## 26. Mana and Tech Resource Badge System — Completed

### Canonical Rule

An archetype or ability context uses either Mana or Tech, never both in the current system. The visual language must remain distinguishable without relying on color alone. This follows the current power-system rule that Mech Pilot and Android use Tech while the remaining original archetypes use Mana.

### Figma Component Set

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=64-92`

Documentation board:

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=64-37`

### Variant Matrix

Resource:

- Mana
- Tech

Size:

- Combat — 48 px
- Compact — 32 px

State:

- Ready
- Insufficient

Total:

`2 resources × 2 sizes × 2 states = 8 variants`

### Mana Visual Language

Mana uses:

- Circular crystal socket
- Faceted gemstone marker
- Small magical spark
- Violet and lavender energy
- Softer, arcane silhouette

The cost number remains centered and visually dominant.

### Tech Visual Language

Tech uses:

- Angular hexagonal power cell
- Small mechanical core
- Electric-blue and steel energy
- Hard geometric silhouette

The cost number remains centered and visually dominant.

### Insufficient Resource State

Both resource types preserve their original silhouette and add:

- Reduced resource intensity
- Universal red diagonal warning

This allows players to identify both the resource type and the unavailable state without relying on color alone.

### New Variables

Primitive resource colors:

- `color/mana/500`
- `color/mana/300`
- `color/tech/500`
- `color/tech/300`
- `color/resource/insufficient`

Semantic resource colors:

- `resource/mana/surface`
- `resource/mana/glow`
- `resource/tech/surface`
- `resource/tech/glow`
- `resource/insufficient`

Geometry:

- `size/resource/combat`
- `size/resource/compact`

### Command Strip Integration

The `Ability Command Strip` component set now exposes:

`Resource Badge`

as an instance-swap property.

The existing tier and interaction matrix remains unchanged at 15 variants. Resource type does not multiply the component matrix.

The existing cost value remains an editable text property owned by the Command Strip.

Approved benchmark assignments:

- Ember Cleave → Mana / Combat / Ready
- Aegis Ward → Tech / Combat / Ready

### Detail Card Integration

The `Ability Detail Card` component set now exposes:

`Resource Badge`

as an instance-swap property inside the footer.

The center footer value is now the numeric cost only.

Approved benchmark assignments:

- Ember Cleave → Mana / Compact / Ready / cost 3
- Aegis Ward → Tech / Compact / Ready / cost 2

The numbers remain provisional gameplay examples and are not implementation-canonical.

## 27. Optional Relic Resource Accent — Completed

### Purpose

Relic presentations already use a canonical moment color:

- Discovery → ember orange
- Evolution → purple
- Ultimate → gold

Resource identity must remain secondary so it does not compete with the ceremonial event hierarchy.

### Figma Integration

The `Ability Relic Presentation` component set now exposes:

`Resource Accent`

as an instance-swap property.

Available assignments:

- None
- Mana
- Tech

The default is `None`.

### Comparison Board

`https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=69-2`

The controlled comparison uses the same artwork, text, and Discovery moment across None, Mana, and Tech examples.

### Approved Accent Geometry

- 24 × 24 px
- Positioned at the upper-right artwork corner
- Slightly reduced opacity
- Uses the compact resource silhouette
- Does not alter the moment border, title, status, or lore panel

### Decision

The optional accent is approved as a secondary cross-context identity cue.

Usage rules:

- Keep the moment border as the primary ceremonial signal.
- Default to None when the artwork already communicates resource identity strongly.
- Use Mana or Tech when consistent resource recognition across combat, detail, and Codex contexts is valuable.
- Never enlarge the accent to compete with the artwork crystal, title, or moment status.
- Do not create Relic variants for resource type; use the nested instance swap.

Approved benchmark assignments:

- Ember Cleave → Mana accent
- Aegis Ward → Tech accent

## 28. Resource Language Architecture

The system now communicates resource identity consistently across all three presentations:

### Combat

48 px resource badge with centered numeric cost.

### Detail

32 px resource badge with centered numeric cost.

### Relic

Optional 24 px resource accent with no numeric value.

This keeps one recognizable resource silhouette while adapting its information density to each context.

### Stable Design Rule

Future resource systems should extend `Ability Resource Badge` rather than introducing unrelated one-off cost shapes.

Any new resource must define:

- Unique silhouette
- Unique internal symbol
- Material language
- Color tokens
- Ready and insufficient states
- Combat and compact sizes
- Relic-accent behavior

Color alone is never sufficient.


## 29. Finalization and Claude Handoff

### V1 Scope Finalized

This document is finalized for the Ability Tile System v1 visual foundation.

Finalized systems:

- Combat Command Strip
- Exceptional gameplay-state overlays
- Forged Detail Card
- Relic Discovery / Evolution / Ultimate presentation
- Mana and Tech resource badges
- Optional Relic resource accent
- Shared tokens, typography, effects, and component-property strategy
- Ember Cleave and Aegis Ward benchmark families

### Canonical Figma References

- Ability System file: `https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5`
- Command Strip: `https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=11-143`
- Gameplay-state overlays: `https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=14-45`
- Detail Card: `https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=44-59`
- Relic Presentation: `https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=48-46`
- Resource Badge system: `https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=64-92`
- Ember Cleave approved board: `https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=33-133`
- Aegis Ward approved board: `https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=54-160`
- Relic resource-accent comparison: `https://www.figma.com/design/j1ASIqfaEcXMXhJtC6KHb5?node-id=69-2`

### Authority Boundary

This visual specification is authoritative for Ability Tile design decisions, but it does not override:

1. The latest implementation snapshot or live repository
2. The Ability-First Boss Battle Master Plan for gameplay and architecture
3. Approved economy, rank, archetype, or power-system documents

### Values That Remain Provisional

The following benchmark copy demonstrates layout only and must not become gameplay truth without approval:

- Ember Cleave damage, Burn, and cost values
- Aegis Ward Barrier, interception, cooldown, and cost values
- Any temporary family, rarity, or tier text used only for visual testing

### Claude Stage 0 Readiness

Claude may now use this specification with the Master Plan and Art & Asset Production Plan to perform Stage 0 repository analysis.

Claude must:

- Inspect the live repository first
- Compare implementation against these documents and Figma
- Preserve existing architecture when safe
- Identify conflicts and stale assumptions
- Propose file-by-file implementation sequencing
- Keep visual components reusable rather than recreating one-off layouts
- Treat Figma as the canonical interface-design source
- Stop for Raheem approval before implementation

### Non-Blocking Open Items

These do not block Stage 0 analysis:

- Mobile-specific layout validation
- Final runtime-driven cooldown display
- Repository asset manifest and final asset paths
- Full Codex page design
- Battle HUD and boss-system visual specifications
- VFX, motion, and implementation exports

Those should be planned and approved in later focused phases rather than invented during the initial repository review.
