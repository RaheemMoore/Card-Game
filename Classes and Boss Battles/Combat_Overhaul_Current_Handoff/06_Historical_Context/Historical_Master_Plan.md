# Card Game Master Plan — Ability System First, Boss Battles Second

**Status:** Planning and implementation-guidance document  
**Audience:** Raheem and Claude Code  
**Primary rule:** Do not fully implement the entire plan in one pass. Work through it in ordered phases, stop at approval gates, and preserve the separation between the Ability System and the Boss Battle System.

---

# 1. Executive Summary

The card game should evolve in two major stages:

1. **Build the Ability System first**
2. **Build Boss Battles on top of the approved Ability System**

The Ability System is the foundation. It defines what abilities are, how they are generated, how they are stored, how they evolve with cards, how duplicate or near-duplicate abilities are handled, how players discover abilities, how canonical artwork is assigned, and how abilities become permanent collectible game content.

The Boss Battle System should not invent a second ability model. It should consume the permanent ability definitions, structured mechanics, versions, card references, and runtime behavior created during the Ability System work.

The intended result is:

- Cards become playable heroes rather than static collectibles.
- Every hero has abilities connected to its archetype, lore, stats, and progression.
- Abilities can be generated creatively while remaining mechanically valid.
- Abilities become permanent entries in an expanding Ability Codex.
- Players can discover abilities, collect them, earn rewards, and chase unknown entries.
- Leonardo creates canonical artwork only when a genuinely new permanent ability is approved.
- Figma and the game UI handle tile layouts, rank presentation, states, glow, selection, cooldowns, and responsiveness.
- Boss Battles use deterministic combat rules and require no Claude or Leonardo calls during normal play.
- The architecture supports one hero first and two-hero teams later.
- The game gains a sustainable path from infinite card generation to actual gameplay.

This document is one master roadmap, but it contains **two distinct systems**:

- **Part I — Ability System**
- **Part II — Boss Battle System**

They must remain separate in code ownership, data models, implementation planning, and approval.

---

# 2. Recommended Order

## 2.1 High-level order

Work in this order:

1. Repository and architecture review
2. Ability System architecture proposal
3. Approval of the core ability contract
4. Ability mechanical runtime proposal
5. Implementation of the minimum ability foundation
6. Ability generation, validation, identity, and versioning
7. Basic Ability Codex and discovery foundation
8. Headless combat design and simulation plan
9. One-hero Boss Battle vertical slice
10. Boss Battle balancing and analytics
11. Two-hero expansion
12. Completion of the deeper Codex, rewards, art pipeline, and visual polish
13. Leonardo prompt architecture for canonical ability artwork
14. Final UI and Figma refinement

## 2.2 Why Ability System comes first

Boss Battles depend on clear answers to the following:

- What is an ability?
- How is it stored?
- Is it permanent?
- How does a card reference it?
- Can the same ability appear on multiple cards?
- What makes two abilities mechanically different?
- How are abilities versioned?
- How do abilities evolve from Foundation to Forged to Ascendant?
- What resource does an ability consume?
- How does the game interpret generated mechanics?
- What effects, triggers, statuses, and targets are supported?
- What happens when Claude proposes a mechanic the game does not yet support?
- How are balance changes applied without destroying player discovery history?
- What exact version of an ability is used inside a battle?

If Boss Battles are built before these questions are settled, the combat system will create temporary answers that the Ability System later has to replace.

## 2.3 Important clarification

Ability System first does **not** mean fully building every Codex page, reward animation, Leonardo workflow, and polished ability tile before testing combat.

The correct order is:

> Approve and implement the mechanical foundation of the Ability System first, then use Boss Battles to validate it, then finish the larger collection and art systems around the proven mechanics.

---

# 3. Product Vision

The card engine already has the potential to create a nearly infinite number of heroes.

The next evolution is to ensure every hero can express its identity through gameplay.

A hero should not simply be:

- Artwork
- Name
- Lore
- ATK
- DEF
- Mana or Tech

A hero should also have:

- A combat role
- A Core Ability
- A Signature Ability
- An Ultimate Ability
- An ability progression path
- Synergies
- Counters
- Strengths and weaknesses
- A relationship between lore and mechanics
- A reason to be selected for a boss fight

Abilities should feel authored for the character even when they are generated from a reusable, controlled system.

Boss Battles should become the first major mode that proves the value of:

- Card stats
- Archetypes
- Lore
- Rank progression
- Ability discovery
- Team composition
- Card collection

---

# 4. Non-Negotiable Architecture Principles

## 4.1 Abilities are permanent entities

Abilities must exist independently from individual cards.

A card references an ability. The ability is not merely disposable text embedded in a card record.

## 4.2 Generated creativity must compile into structured mechanics

Claude may generate:

- Names
- Lore
- Flavor
- Descriptions
- Visual concepts
- Mechanical combinations
- Conditions
- Evolution ideas
- Archetype expression

The runtime must receive validated structured data.

Generated prose is not executable combat logic.

## 4.3 One permanent identity can have multiple balance versions

An ability keeps its identity, discovery history, art, and Codex presence.

Its numerical or mechanical balance can be revised through versioning.

## 4.4 Ability artwork is canonical and reusable

Leonardo should create artwork once for a genuinely new approved ability.

That art should be reused by every card that references the ability.

## 4.5 UI frames are deterministic

Leonardo should not generate:

- Final ability tiles
- Borders
- Text
- Cost bubbles
- Cooldown indicators
- Lock states
- Selected states
- Rank labels
- Responsive layouts

Figma defines those systems. The game UI renders them.

## 4.6 Normal battles do not call Claude or Leonardo

Combat must be deterministic, fast, testable, and inexpensive.

## 4.7 The client is not trusted with production rewards

Prototype battles may run locally.

Production reward-bearing battles must eventually use server-authoritative validation.

## 4.8 No silent economy changes

Claude must not silently change:

- Forge prices
- Currency values
- Reward quantities
- Premium currency access
- Boss reward rates
- Discovery rewards

All economy changes require explicit approval.

---

# Part I — Ability System

# 5. Ability System Goals

The Ability System should make abilities:

- Collectible
- Discoverable
- Reusable
- Recognizable
- Mechanically structured
- Expandable
- Versioned
- Balanceable
- Connected to lore
- Connected to archetypes
- Useful in combat
- Valuable beyond one card

The system should create a second major collection loop alongside cards.

Players should collect heroes and also gradually uncover the expanding library of abilities that can exist in the world.

---

# 6. Core Ability Lifecycle

The target lifecycle is:

1. A player forges a card.
2. Claude proposes abilities appropriate to the card.
3. Existing ability candidates are checked first.
4. Proposed mechanics are normalized into structured data.
5. The system compares the candidate against the permanent library.
6. A matching ability reuses the existing permanent identity.
7. A meaningfully new ability enters a review or validation flow.
8. Once accepted, the ability receives a permanent ID.
9. The player receives discovery credit when appropriate.
10. The ability enters the Codex.
11. Placeholder art may be assigned temporarily.
12. Leonardo creates canonical ability artwork.
13. The canonical artwork is stored and linked.
14. Future cards may reuse the ability.
15. Balance changes create new versions without deleting discovery history.

---

# 7. Ability Progression by Card Rank

## 7.1 Recommended structure

### Foundation

- One Core Ability
- Low complexity
- Dependable
- Low or zero resource cost
- Clearly connected to the card’s archetype and lore

### Forged

- Core Ability evolves
- One Signature Ability unlocks
- The card gains a stronger tactical identity
- New mechanics may appear if supported by the runtime

### Ascendant

- Core Ability evolves again
- Signature Ability evolves
- One Ultimate Ability unlocks
- The selected Ascendant lore path may influence final mechanics, presentation, or both

## 7.2 Lore-directed evolution

An evolution may follow the character’s story.

Example:

- Foundation: a Druid creates minor thorns
- Forged: the thorns retaliate against attackers
- Ascendant: the thorns erupt across the battlefield

## 7.3 Lore-defying evolution

An evolution may represent overcoming the character’s past.

Example:

- A fire-scarred Druid may evolve into a restorative ash-based healer rather than a stronger fire user.

## 7.4 Evolution identity

Claude should determine whether an evolved ability is:

- The same permanent ability with a higher local tier
- A versioned evolution of the same ability
- A separate permanent ability linked through an evolution chain

The recommendation is:

- Use one permanent identity when the recognizable mechanical concept remains the same.
- Use a separate permanent identity when the evolved form changes the core role or mechanic enough to be meaningfully distinct.

This decision must be consistent and documented.

---

# 8. Ability Families

Abilities should belong to expandable families or schools.

Initial examples:

- Weapons
- Fire
- Frost
- Nature
- Holy
- Necromancy
- Tech
- Defense
- Support
- Summoning
- Blood
- Arcane
- Control
- Mobility
- Beast
- Shadow

Claude should inspect the current archetypes, lore system, card data, and planned combat mechanics before finalizing the initial taxonomy.

The family model must support:

- New families
- Subfamilies
- Multi-family abilities
- Family-specific art rules
- Family-specific discovery progress
- Family-specific rewards
- Family-specific mechanics
- Open-ended future growth

The Codex must never imply that the ability library is permanently complete.

---

# 9. Archetype Relationship

Each archetype should have:

- Preferred ability families
- Restricted or rare families
- Characteristic mechanical patterns
- Signature triggers
- Resource preferences
- Typical combat roles
- Evolution themes
- Lore constraints
- Visual constraints

Examples:

## Barbarian

- Rage
- Bleed
- Retaliation
- Armor break
- Low-health bonuses

## Monk

- Focus
- Combo chains
- Counters
- Stance changes
- Resource efficiency

## Beastmaster

- Companions
- Marking prey
- Pack bonuses
- Summons
- Target exposure

## Druid

- Growth
- Healing
- Thorns
- Terrain
- Transformation
- Regeneration

## Necromancer

- Summons
- Sacrifice
- Decay
- Soul collection
- Delayed effects

## Vampire

- Lifesteal
- Blood costs
- Execution
- Self-damage tradeoffs
- Charm or enthrallment

## Mech Pilot

- Tech resource
- Heat
- Overclock
- Barriers
- Weapon systems

## Android

- Analysis
- Precision
- Adaptation
- Copying
- Prediction

## Seraph

- Wards
- Radiance
- Cleansing
- Revival
- Protection

## Human

- Tactics
- Preparation
- Morale
- Improvisation
- Flexible synergy

These are identity directions, not rigid rules.

Generated abilities should still feel surprising.

---

# 10. What Counts as a New Ability

Cosmetic naming changes do not create new permanent abilities.

These should normally be treated as the same underlying identity:

- Flame Slash
- Fiery Slash
- Burning Slash
- Blazing Slash

A truly new ability should differ meaningfully in one or more of the following:

- Core mechanic
- Effect category
- Targeting
- Scaling
- Resource behavior
- Trigger
- Timing
- Status interaction
- Conditional behavior
- Secondary effect
- Action-economy role
- Team synergy
- Boss interaction
- Summon behavior
- Risk-reward structure

## 10.1 Structured identity

A normalized ability identity should include fields such as:

- Family
- Effect types
- Target types
- Resource type
- Resource cost band
- Base effect
- Secondary effect
- Status effects
- Trigger
- Duration
- Scaling stat
- Cooldown or charge behavior
- Mechanical tags
- Compatibility restrictions
- Role
- Rarity or complexity band

## 10.2 Duplicate detection

Claude should propose a duplicate-detection system using a layered approach:

1. Exact normalized identity match
2. Structured mechanic comparison
3. Tag and role comparison
4. Numerical tolerance comparison
5. Semantic similarity of description
6. Human review for uncertain cases

A new display name should never be enough to create a new rewardable discovery.

---

# 11. Ability Data Model

Claude should inspect the repository before deciding exact implementation details.

The conceptual model should include the following entities.

## 11.1 AbilityDefinition

Represents the permanent collectible identity.

Suggested fields:

```ts
interface AbilityDefinition {
  id: string;
  slug: string;
  displayName: string;
  familyIds: string[];
  rarity: AbilityRarity;
  role: AbilityRole;
  tags: string[];
  descriptionShort: string;
  descriptionLong?: string;
  lore?: string;
  canonicalArtAssetId?: string;
  firstDiscoveredByUserId?: string;
  firstDiscoveredAt?: string;
  currentVersionId: string;
  status: AbilityStatus;
  createdAt: string;
  updatedAt: string;
}
```

## 11.2 AbilityVersion

Represents an approved mechanical version.

```ts
interface AbilityVersion {
  id: string;
  abilityId: string;
  versionNumber: number;
  slotType: "core" | "signature" | "ultimate";
  targetRule: TargetRule;
  resourceType: "mana" | "tech" | "none";
  resourceCost: number;
  cooldownRounds?: number;
  maxCharges?: number;
  effects: AbilityEffect[];
  triggers?: AbilityTrigger[];
  conditions?: AbilityCondition[];
  scalingRules?: ScalingRule[];
  powerBudgetScore?: number;
  balanceNotes?: string;
  publishedAt?: string;
  deprecatedAt?: string;
  status: "draft" | "experimental" | "approved" | "deprecated";
}
```

## 11.3 AbilityFamily

```ts
interface AbilityFamily {
  id: string;
  name: string;
  description: string;
  visualTheme: string;
  promptRules: string[];
  mechanicPreferences: string[];
  sortOrder: number;
  openEnded: boolean;
  status: "active" | "experimental" | "retired";
}
```

## 11.4 PlayerAbilityDiscovery

```ts
interface PlayerAbilityDiscovery {
  playerId: string;
  abilityId: string;
  discoveredAt: string;
  firstDiscoveredGlobally: boolean;
  timesSeen: number;
  timesOwnedOnCards: number;
  rewardGranted: boolean;
  rewardTransactionId?: string;
}
```

## 11.5 CardAbilityReference

```ts
interface CardAbilityReference {
  cardId: string;
  abilityId: string;
  abilityVersionId?: string;
  slotType: "core" | "signature" | "ultimate";
  localTier: "foundation" | "forged" | "ascendant";
  upgradedState?: string;
  evolutionPathId?: string;
  temporaryModifiers?: AbilityModifier[];
  displayOrder: number;
}
```

## 11.6 AbilityEvolutionLink

```ts
interface AbilityEvolutionLink {
  sourceAbilityId: string;
  destinationAbilityId: string;
  evolutionType: "tier_upgrade" | "branch" | "lore_concordant" | "lore_defiant";
  requirements: EvolutionRequirement[];
}
```

## 11.7 CanonicalArtAsset

```ts
interface CanonicalArtAsset {
  id: string;
  abilityId: string;
  provider: "leonardo" | "manual" | "placeholder";
  sourcePromptVersion?: string;
  assetUrl: string;
  thumbnailUrl?: string;
  status: "pending" | "approved" | "rejected" | "replaced";
  createdAt: string;
}
```

---

# 12. Mechanical Runtime Contract

The Ability System must define combat-readable mechanics before Boss Battles begin.

## 12.1 Initial effect primitives

Claude should propose and validate a controlled catalog.

Recommended starting categories:

- Direct damage
- Damage over time
- Healing
- Shielding
- Buff
- Debuff
- Apply status
- Remove status
- Resource gain
- Resource drain
- Ultimate charge gain
- Ultimate charge drain
- Summon
- Sacrifice
- Counterattack
- Reflect
- Lifesteal
- Execute
- Revive
- Cleanse
- Dispel
- Cooldown reduction
- Cooldown increase
- Delayed effect
- Multi-hit
- Conditional bonus
- Target redirection
- Taunt
- Guard
- Break or stagger damage

## 12.2 Initial target rules

- Self
- Single ally
- All allies
- Single enemy
- All enemies
- Random enemy
- Lowest-health ally
- Highest-attack enemy
- Summoned unit
- Boss object
- Current attacker
- Marked target
- Status-bearing target

## 12.3 Initial trigger rules

- On use
- Start of round
- End of round
- On damage dealt
- On damage received
- On block
- On heal
- On status applied
- On status removed
- On summon
- On defeat
- Below health threshold
- Above resource threshold
- During boss phase
- After another ability
- When target is marked
- When shield breaks

## 12.4 Conditions

Examples:

- Target has status
- User has status
- User HP below threshold
- Boss HP below threshold
- Resource above threshold
- Summon exists
- Shield active
- Specific archetype present
- Specific family ability used earlier
- Phase condition met
- Ability used consecutively
- No damage taken this round

## 12.5 Unsupported mechanics

If Claude generates a mechanic not supported by the runtime:

1. Mark it as experimental.
2. Do not publish it automatically.
3. Explain the missing primitive.
4. Propose whether the primitive should be added.
5. Estimate implementation and balance risk.
6. Request approval.
7. Only then expand the runtime.

---

# 13. Generated Ability Validation

Every generated ability must pass validation.

Validation should check:

- Required fields
- Supported primitives
- Valid targets
- Valid triggers
- Valid status references
- Resource bounds
- Cooldown bounds
- Charge bounds
- Scaling bounds
- Rank compatibility
- Archetype compatibility
- Family compatibility
- Duplicate similarity
- Power budget
- Infinite-loop risks
- Unsupported effect combinations
- Contradictory conditions
- Unclear wording
- Missing UI explanation

The final player-facing description should be generated from the structured mechanics whenever possible, rather than becoming a separate source of truth.

---

# 14. Ability Power Budget

Claude should propose a calculable balance budget.

The budget should consider:

- Damage
- Healing
- Shielding
- Target count
- Reliability
- Status strength
- Duration
- Trigger frequency
- Resource cost
- Cooldown
- Charges
- Conditional difficulty
- Scaling
- Action-economy gain
- Team synergy
- Boss-specific value
- Self-damage
- Sacrifice cost
- Delayed payoff
- Setup requirements

Examples:

- Area damage costs more budget than single-target damage.
- Reliable control costs more than conditional control.
- Damage plus healing costs more than damage alone.
- Long cooldown permits stronger coefficients.
- Difficult setup allows stronger payoff.
- A passive that triggers repeatedly requires strict limits.
- A free Core Ability must be weaker than a costly Signature Ability.

Rarity should reflect:

- Complexity
- Unusual interactions
- Build-around potential
- Discovery prestige
- Narrow power
- Mechanical uniqueness

Rarity should not simply mean unrestricted numerical superiority.

---

# 15. Status Effect System

Statuses must use shared global rules.

Claude should define:

- Status ID
- Category
- Stack behavior
- Maximum stacks
- Duration
- Refresh behavior
- Extension behavior
- Removal rules
- Cleanse category
- Dispel category
- Resistance behavior
- Boss behavior
- Diminishing returns
- Trigger order
- Visual icon
- Player-facing description
- Interaction tags

Initial examples:

- Burn
- Bleed
- Poison
- Mark
- Suppressed
- Rooted
- Stunned
- Weakened
- Exposed
- Regeneration
- Barrier
- Thorns
- Focus
- Rage
- Overclock
- Soulbound
- Radiant
- Cursed

Bosses should not simply be immune to every control effect.

Possible boss adjustments:

- Reduced duration
- Increased resistance
- Break-meter contribution
- Phase-specific immunity
- Diminishing returns
- Conversion into a weaker boss-specific status

---

# 16. Ability Versioning

Permanent identity must remain stable.

Balance data may change.

Claude should define:

- Version creation
- Draft state
- Experimental state
- Approval state
- Publishing
- Deprecation
- Rollback
- Migration
- Historical card handling
- Battle snapshots
- Player-facing patch notes

Recommended rules:

- Discovery credit is never lost.
- Canonical art remains unless the identity changes materially.
- Existing cards usually reference the current approved version outside active battles.
- Active battles use a snapshot.
- Balance changes should not create new discoveries.
- A major mechanical replacement may require a new permanent ability identity.

---

# 17. Ability Codex

## 17.1 Purpose

The Ability Codex is:

- A collection system
- A discovery system
- A progression system
- A reference library
- A reason to keep forging
- A place to display player contribution
- A showcase for canonical ability artwork

## 17.2 Main Codex page

Show:

- Total player discoveries
- Total globally registered abilities
- Player first-discovery count
- Family progress
- Recent discoveries
- Featured ability
- Family tiles
- Discovery achievements
- Open-ended expansion messaging

## 17.3 Ability family page

Show:

- Discovered abilities in full
- Existing but undiscovered abilities as obscured entries
- Family progress
- Filters
- Sorting
- Family lore
- Family visual identity
- Future-growth messaging

## 17.4 Ability detail page or modal

For discovered abilities, show:

- Canonical artwork
- Name
- Family
- Rarity
- Mechanics
- Lore
- First discovery
- Owned cards using it
- Evolution relationships
- Tier behavior
- Version notes where appropriate
- Usage statistics where appropriate

---

# 18. Codex Visibility States

## 18.1 Discovered

Show:

- Full art
- Full name
- Family
- Rarity
- Effect summary
- Discovery information
- Owned cards using the ability
- Evolution information

## 18.2 Exists but undiscovered

Show:

- Grayed-out or obscured tile
- Silhouette or blurred art
- Hidden name
- Hidden mechanics
- Optional generic rarity teaser
- Discovery guidance
- No full spoiler

## 18.3 Newly discovered but art pending

Show:

- Family placeholder art
- Newly Discovered badge
- Full name and mechanics for the discoverer
- Pending-art status
- Automatic replacement later

## 18.4 Open-ended growth

Each family should communicate:

- More abilities may emerge
- Unknown potential remains
- The family can expand
- The current list is not permanently complete

---

# 19. Discovery Rewards

A player should receive recognition when a forge creates a truly new permanent ability.

Possible rewards:

- Soft currency
- Forge discount
- Free reroll
- Crafting material
- Discovery badge progress
- Cosmetic unlock
- Profile statistic
- Family-specific recognition
- Founder or Scholar titles
- Collection prestige

Reward strength may scale by:

- Rarity
- Mechanical novelty
- First discovery in a family
- Total discoveries
- Legendary discovery
- Contribution milestone

Claude must propose reward IDs and transaction handling without silently selecting final economy values.

Duplicate rewards must be prevented.

---

# 20. Ability Art Pipeline

## 20.1 Leonardo responsibilities

Leonardo handles:

- Canonical ability art
- Clear silhouette
- Weapon, creature, spell, or effect identity
- Visual mood
- Family identity
- Texture
- Lighting
- Atmosphere
- Elemental treatment
- Small-size readability

## 20.2 Figma responsibilities

Figma handles:

- Tile shape
- Frames
- Crystal treatment
- Text regions
- Cost markers
- Cooldown markers
- Rank markers
- Locked state
- Selected state
- Hover state
- Component variants
- Spacing
- Layout consistency

## 20.3 Game UI responsibilities

The game handles:

- Live values
- Dynamic text
- Resource values
- Cooldowns
- Charges
- Rank state
- Discovery state
- Disabled state
- Selection
- Hover and press
- Animation triggers
- Responsive behavior
- Accessibility
- Reduced motion
- Upgrade glow
- Particle overlays

## 20.4 Claude responsibilities

Claude handles:

- Ability candidates
- Structured mechanics
- Newness validation
- Family rules
- Prompt templates
- Naming
- Lore
- Art prompt inputs
- Coherence
- Expansion recommendations
- Approval requests

## 20.5 Cost rule

Do not generate new artwork for every card.

Only generate art when:

- A genuinely new ability enters the permanent library
- Existing art is rejected
- A major identity change requires replacement
- A human explicitly approves regeneration

---

# 21. Ability Administration and Moderation

Early development should include human approval for new permanent abilities.

Potential actions:

- Approve
- Reject
- Merge
- Rename
- Rebalance
- Reassign family
- Edit wording
- Mark experimental
- Regenerate art
- Deprecate
- Replace
- Publish new version

Claude should recommend the lightest safe review system for the current scale.

---

# 22. Ability System Implementation Phases

## Phase A0 — Repository review

Claude inspects:

- Current card model
- Current generation pipeline
- Existing ability fields
- Rank system
- Archetypes
- Lore generation
- Economy
- User storage
- Authentication
- Figma integration
- Leonardo integration
- Existing agents and skills
- Current canonical documents

**Deliverable:** repository-specific architecture report.

**Stop for approval.**

## Phase A1 — Ability contract

Define:

- AbilityDefinition
- AbilityVersion
- AbilityFamily
- CardAbilityReference
- PlayerAbilityDiscovery
- AbilityEvolutionLink
- CanonicalArtAsset
- Runtime effect schema

**Deliverable:** data model and migration proposal.

**Stop for approval.**

## Phase A2 — Mechanical runtime

Define:

- Effects
- Targets
- Triggers
- Conditions
- Statuses
- Scaling
- Costs
- Cooldowns
- Charges
- Validation
- Power budget

**Deliverable:** executable contract and examples.

**Stop for approval.**

## Phase A3 — Persistent ability foundation

Implement:

- Permanent ability storage
- Version storage
- Card references
- Family storage
- Validation
- Seed data
- Migration from current card abilities

## Phase A4 — Generation and duplicate detection

Implement:

- Candidate normalization
- Existing-match search
- Newness scoring
- Human-review queue
- Merge handling
- Discovery-safe registration

## Phase A5 — Card rank progression

Implement:

- Core slot
- Signature slot
- Ultimate slot
- Evolution links
- Foundation, Forged, and Ascendant behavior
- Lore path integration

## Phase A6 — Discovery foundation

Implement:

- Player discovery tracking
- First-discovery flag
- Reward idempotency
- Basic discovery events
- Basic Codex data API

## Phase A7 — Minimal Codex

Implement:

- Main Codex
- Family list
- Discovered state
- Undiscovered state
- Ability details
- Placeholder artwork

Do not over-polish yet.

## Phase A8 — Canonical art pipeline

Implement:

- Art queue
- Placeholder state
- Leonardo call boundary
- Prompt storage
- Approval state
- Asset storage
- Automatic replacement
- Failure handling

## Phase A9 — Ability analytics and administration

Implement:

- Discovery analytics
- Usage analytics
- Duplicate review
- Ability editing
- Version publishing
- Rollback
- Art moderation

---

# 23. Ability System Testing

Required tests:

- Ability validates against schema.
- Unsupported primitive is rejected.
- Duplicate cosmetic variants are detected.
- New mechanics enter review.
- Reward is granted once.
- Discovery remains after rebalance.
- Version publishing preserves identity.
- Card references remain valid.
- Evolution relationships remain valid.
- Invalid cycles are rejected.
- Player-facing description matches structured mechanics.
- Art failure does not block card forging.
- Undiscovered entries do not leak protected details.
- Deprecated abilities remain historically traceable.
- Migration does not destroy existing cards.

---

# 24. Ability System Approval Decisions

Claude must ask Raheem to approve:

- Initial family taxonomy
- Effect primitive catalog
- Status catalog
- Ability slot progression
- Duplicate threshold
- Human review requirements
- Power-budget direction
- Version migration behavior
- Discovery reward categories
- Codex spoiler rules
- Art generation timing
- Experimental ability policy

---

# Part II — Boss Battle System

# 25. Boss Battle Purpose

Boss Battles should become the first major playable mode that uses the Ability System.

The system should:

- Make card stats matter
- Make ability choices matter
- Create tactical decisions
- Reward collection diversity
- Support one hero first
- Support two heroes later
- Use boss telegraphs
- Use deterministic resolution
- Support replay and analytics
- Avoid AI calls during play
- Connect rewards to the economy safely

---

# 26. Core Battle Loop

1. Player selects a hero.
2. Battle snapshot is created.
3. Boss intent is shown.
4. Player selects an action.
5. Player confirms.
6. Hero action resolves.
7. Reactions resolve.
8. Boss action resolves.
9. Statuses tick.
10. Cooldowns update.
11. Resources regenerate.
12. Phase, victory, and defeat checks run.
13. Next round begins.
14. Battle result is validated.
15. Rewards are granted.

---

# 27. Battle Ability Snapshot

At battle start, store:

- Hero card ID
- Hero stats
- Card rank
- Ability IDs
- Ability version IDs
- Local ability tiers
- Temporary modifiers
- Boss ID
- Boss version
- Difficulty
- Random seed
- Reward table version
- Starting resources

This ensures active battles do not change because of a live balance update.

---

# 28. Initial Party Size

## First playable version

- One hero
- One action per round
- One boss
- Two boss phases
- Core Ability
- Guard
- Focus

## Later version

- Two heroes
- One action per hero
- Separate HP
- Separate resources
- Separate cooldowns
- Separate statuses
- Separate ultimate charge
- Ally targeting
- Team synergies
- Revives and protection
- Summons

The architecture should support two party slots from the beginning, but the first user-facing build should use one.

---

# 29. Universal Actions

Every hero should have fallback actions.

## Guard

- Reduces incoming damage
- May generate ultimate charge
- May interact with counters or barriers

## Focus

- Generates Mana or Tech
- May generate ultimate charge
- May improve the next ability

## Inspect

Optional.

- Reveals detailed boss intent
- Shows statuses and resistances
- Does not need to be a combat action in the first version

Fallback actions prevent dead turns.

---

# 30. Turn Structure

Recommended: turn-based rounds with telegraphed boss intent.

## Resolution order

1. Start-of-round effects
2. Boss intent reveal
3. Player action selection
4. Target selection
5. Confirmation
6. Player action
7. Immediate triggers
8. Reactions
9. Boss action
10. Boss triggers
11. End-of-round effects
12. Cooldown reduction
13. Resource regeneration
14. Phase transition
15. Victory or defeat
16. Next round

---

# 31. Resources

Mana and Tech should use the same underlying architecture while preserving different identities.

Claude should inspect current stat ranges before finalizing formulas.

Possible influences:

- Maximum resource
- Starting resource
- Regeneration
- Ability scaling
- Resistance
- Overcharge behavior

Recommended cost direction:

- Core: zero or one
- Signature: two or three
- Ultimate: separate charge or high cost plus condition

---

# 32. Ultimate Charge

Keep Ultimate Charge separate from Mana or Tech.

Charge can be earned through role-appropriate actions:

- Damage dealt
- Damage received
- Blocking
- Healing
- Applying statuses
- Summoning
- Breaking the boss
- Completing archetype conditions

This prevents damage dealers from being the only heroes who can charge Ultimates effectively.

---

# 33. Boss Data Model

## BossDefinition

Suggested fields:

```ts
interface BossDefinition {
  id: string;
  name: string;
  lore: string;
  familyIds: string[];
  baseStats: BossStats;
  phaseIds: string[];
  resistanceProfileId: string;
  weaknessProfileId: string;
  rewardTableId: string;
  artAssetIds: string[];
  difficultyVariants: string[];
  currentVersionId: string;
  status: "draft" | "active" | "retired";
}
```

## BossVersion

```ts
interface BossVersion {
  id: string;
  bossId: string;
  versionNumber: number;
  stats: BossStats;
  phases: BossPhase[];
  publishedAt?: string;
  deprecatedAt?: string;
}
```

## BossPhase

```ts
interface BossPhase {
  id: string;
  healthThresholdStart: number;
  healthThresholdEnd: number;
  actionIds: string[];
  passiveEffects: AbilityEffect[];
  transitionEffects?: AbilityEffect[];
  environmentEffects?: AbilityEffect[];
  enrageRule?: EnrageRule;
}
```

## BossAction

```ts
interface BossAction {
  id: string;
  displayName: string;
  intentType: string;
  telegraphText: string;
  targetRule: TargetRule;
  effects: AbilityEffect[];
  cooldownRounds?: number;
  priority: number;
  conditions?: AbilityCondition[];
  interruptible: boolean;
  phaseRestrictions?: string[];
}
```

---

# 34. Boss Intent

Bosses should show planned actions before resolution.

Examples:

- Heavy attack
- Area attack
- Summon
- Shield
- Cleanse
- Curse
- Enrage preparation
- Interruptible ultimate
- Vulnerability phase
- Targeted execution

Boss intent creates strategy without requiring a Speed stat immediately.

---

# 35. Boss Phases

## Phase One — Teach

- Simple actions
- Introduce the boss mechanic
- One obvious telegraph

## Phase Two — Test

- Add status, summon, shield, hazard, or resource pressure
- Require defensive or utility choices
- Introduce an interrupt

## Phase Three — Climax

Later bosses may include:

- Strong signature action
- Faster pressure
- Enrage countdown
- Multiple mechanics
- Final vulnerability window

A phase should change player decisions, not merely increase health and damage.

---

# 36. Break or Stagger

Recommended after the earliest prototype.

Bosses may have:

- HP
- Break meter

Break damage may come from:

- Exploiting weakness
- Blocking a heavy attack
- Interrupting a charge
- Control effects
- Specific ability families
- Team combos

When broken, the boss may:

- Lose an action
- Delay an action
- Take increased damage
- Become status-vulnerable
- Grant ultimate charge

---

# 37. Boss Resistance and Control

Bosses should not be immune to all interesting statuses.

Use:

- Reduced duration
- Resistance chance
- Diminishing returns
- Break conversion
- Phase-specific immunity
- Weaker boss-specific versions

This keeps control-focused heroes useful.

---

# 38. Ability Synergy in Battle

Synergy should use structured tags.

Examples:

- Mark
- Bleed
- Burn
- Summon
- Barrier
- Holy
- Blood
- Nature
- Tech
- Counter
- Execute
- Control
- Combo
- Prey
- Soul

Examples of team interactions:

- One hero applies Mark; another gains bonus damage.
- One hero creates Barrier; another converts Barrier into offense.
- One hero summons; another sacrifices summons.
- One hero exposes Prey; another gains combo bonuses.
- One hero applies Bleed; another executes bleeding targets.

The UI should explain known synergies.

---

# 39. Discovery and Battle Boundary

Initial rule:

- Forging discovers permanent abilities.
- Battles develop mastery and earn rewards.
- Bosses do not randomly mint permanent abilities in the first version.

Potential future expansion:

- Boss-specific ability unlocks
- Ability fragments
- Family catalysts
- Boss-taught abilities
- Discovery chance modifiers

These must be added deliberately later.

---

# 40. Battle Rewards

Possible reward types:

- Soft currency
- Upgrade materials
- Boss tokens
- Forge tickets
- Family catalysts
- First-clear rewards
- Challenge rewards
- Cosmetic rewards
- Mastery progress

Claude should use reward IDs and centralized transaction handling.

No final reward values without approval.

---

# 41. Runtime Cost

Normal battle:

- No Claude call
- No Leonardo call
- Deterministic runtime
- Database and hosting usage only

Boss creation:

- Claude may assist during development
- Leonardo may create canonical boss art
- Phase changes should prefer overlays, lighting, effects, animation, and environmental changes over multiple full image generations

---

# 42. Deterministic Battle Log

Record every event.

Example:

```ts
{
  battleId: "battle_123",
  round: 4,
  sequence: 7,
  actorId: "hero_001",
  actionId: "ability_bone_shield",
  targetIds: ["hero_001"],
  effects: [
    {
      type: "shield",
      amount: 340
    }
  ]
}
```

Benefits:

- Replays
- Debugging
- Balance analysis
- Anti-cheat
- Support
- Testing
- Detection of impossible results

---

# 43. Production Security

Prototype:

- Local battle state acceptable
- Placeholder rewards acceptable

Production:

- Authenticated player
- Server-known card ownership
- Server-known stats
- Server-known ability versions
- Server-known boss version
- Server-created seed
- Validated actions
- Idempotent rewards
- Rate limiting
- Anti-replay
- Audit logs

The client displays and animates the battle.

The server authorizes final rewards.

---

# 44. First Boss Vertical Slice

Build:

- One boss
- Two phases
- One hero
- Three test heroes from different archetypes
- Core Ability
- Guard
- Focus
- Mana and Tech support
- One weakness
- One resistance
- One interruptible action
- One shared status system
- Victory
- Defeat
- Placeholder reward
- Deterministic log

Target encounter length:

- Approximately five to eight minutes after learning the rules

Required design outcome:

- At least one meaningful decision beyond repeatedly choosing maximum damage

---

# 45. Second Boss Vertical Slice

After the first works:

- Two heroes
- Signature abilities
- Ally targeting
- Team synergy
- Summon
- Break meter
- Three-phase boss
- Challenge objectives
- Stored battle history
- Richer rewards

Do not add Ultimates until pacing and resources are stable.

---

# 46. Boss Battle Implementation Phases

## Phase B0 — Combat audit

Claude reviews:

- Approved Ability System schema
- Stats
- Rank progression
- Resource system
- Economy
- Player storage
- Authentication
- UI architecture

## Phase B1 — Combat contract

Define:

- Turn order
- Action economy
- Damage formula
- Defense formula
- Resource behavior
- Cooldowns
- Statuses
- Boss intent
- Victory and defeat

**Stop for approval.**

## Phase B2 — Headless simulator

Build:

- Scripted heroes
- Scripted boss
- Seeded randomness
- Logs
- Automated battles
- Win-rate metrics
- Turn-count metrics
- Resource metrics

## Phase B3 — One-hero vertical slice

Build the playable encounter with placeholder UI.

## Phase B4 — Balance and comprehension

Measure:

- Win rate
- Battle length
- Dead turns
- Ability use
- Resource starvation
- Dominant actions
- Status uptime
- Quit points
- Retry behavior

## Phase B5 — Two-hero expansion

Add:

- Second hero
- Ally targeting
- Team synergies
- Summons
- Multi-target actions

## Phase B6 — Rewards and server authority

Add:

- Reward IDs
- First-clear state
- Challenge rewards
- Server validation
- Idempotent grants

## Phase B7 — Presentation

Add:

- Final ability tile components
- Boss art
- Animations
- Sound
- Particles
- Accessibility
- Reduced motion
- Screen transitions

---

# 47. Boss Battle Testing

Required tests:

- Damage does not become negative unintentionally.
- Shields expire correctly.
- Cooldowns decrement correctly.
- Charges are consumed correctly.
- Status caps work.
- Phase transitions occur once.
- Defeated actors cannot act.
- Boss intent matches resolved action.
- Seeded battles replay identically.
- Active snapshots do not change after rebalance.
- Rewards cannot be granted twice.
- Battle cannot enter infinite loop.
- Boss cannot be permanently stun-locked.
- Every hero has a valid action.
- Resources do not create excessive dead turns.
- Thousands of headless simulations can run.

---

# 48. Analytics

Track stable IDs for:

- Battle started
- Battle completed
- Victory
- Defeat
- Boss
- Boss version
- Hero
- Ability version
- Ability use
- Resource spent
- Damage dealt
- Damage received
- Healing
- Shielding
- Status use
- Phase reached
- Round count
- Quit point
- Retry
- Reward granted
- Validation failure

---

# 49. Master Development Roadmap

## Stage 0 — Claude prepares

Claude should:

1. Read this document.
2. Read the current repository.
3. Read canonical project documents.
4. Identify current agents and skills.
5. Identify conflicts.
6. Return a repository-specific implementation roadmap.
7. Ask for approval.

No major implementation yet.

## Stage 1 — Ability architecture

Complete:

- Data model
- Runtime schema
- Versioning
- Families
- Slots
- Evolution
- Duplicate detection
- Validation
- Power budget
- Status rules

Approval required.

## Stage 2 — Minimum ability foundation

Implement:

- Permanent library
- Versions
- Card references
- Runtime mechanics
- Validation
- Migration
- Seed abilities

## Stage 3 — Ability generation and discovery foundation

Implement:

- Generation
- Matching
- Review
- Registration
- Discovery records
- Reward idempotency
- Basic Codex data

## Stage 4 — Minimal Codex

Implement functional, unpolished views.

## Stage 5 — Combat planning

Create repository-specific Boss Battle plan using approved Ability System.

Approval required.

## Stage 6 — Headless combat

Implement simulator and tests.

## Stage 7 — One-hero vertical slice

Build first playable boss.

## Stage 8 — Validate abilities through combat

Use battle data to revise:

- Power budget
- Statuses
- Costs
- Cooldowns
- Evolution rules
- Ability generation constraints

## Stage 9 — Complete discovery and art systems

Finish:

- Codex polish
- Discovery rewards
- Leonardo canonical art
- Moderation
- Analytics

## Stage 10 — Two-hero battles

Add party synergy.

## Stage 11 — Final UI and content expansion

Add:

- Figma ability tiles
- Boss visuals
- Animations
- More bosses
- More ability families
- More archetypes
- More discovery content

---

# 50. Approval Gates

Claude must stop at these gates.

## Gate 1 — Repository findings

Approve:

- Current-state interpretation
- Migration risks
- File ownership
- Agent responsibilities

## Gate 2 — Ability architecture

Approve:

- Data model
- Versioning
- Families
- Discovery model
- Card references

## Gate 3 — Ability runtime

Approve:

- Effects
- Targets
- Triggers
- Conditions
- Statuses
- Resource behavior
- Power budget

## Gate 4 — Ability implementation sequence

Approve file-by-file plan.

## Gate 5 — Combat contract

Approve:

- Turn system
- Damage
- Defense
- Resources
- Boss intent
- Win/loss
- Vertical slice content

## Gate 6 — Reward integration

Approve:

- Reward types
- Reward IDs
- Economy effects
- Server boundary

## Gate 7 — Visual implementation

Approve:

- Figma components
- Canonical ability art direction
- Boss presentation
- Animation scope

---

# 51. Claude Code Operating Instructions

Claude Code should:

- Treat this as a planning and staged implementation program.
- Inspect the live repository before recommending file changes.
- Prefer existing architecture when safe.
- Identify migration needs.
- Identify conflicts with canonical documents.
- Ask before changing product decisions.
- Ask before changing economy values.
- Ask before adding currencies.
- Ask before adding player stats.
- Ask before expanding effect primitives.
- Ask before publishing experimental mechanics.
- Create or recommend reusable skills when it notices repeatable work.
- Explain why a new skill would help.
- Provide the files and instructions Raheem needs to create the skill.
- Verify the skill after creation.
- Keep the Ability System and Boss Battle System separate.
- Use the approved ability contract as the only combat ability source.
- Stop at approval gates.

Claude Code should not:

- Implement the whole roadmap at once.
- Collapse abilities back into disposable card text.
- Create a second boss-only ability schema.
- Use generated prose as runtime logic.
- Call Leonardo during normal combat.
- Generate fresh art for every card ability.
- Reveal undiscovered Codex details.
- Reward cosmetic duplicates as new discoveries.
- Delete discovery history during balance changes.
- Trust the client with production rewards.
- Overbuild visual polish before combat works.
- Build dozens of bosses before the simulator works.
- Silently make major product decisions.

---

# 52. Skill Opportunities

Claude should evaluate whether to create or expand the following skills.

## create-archetype

Should eventually include:

- Ability family preferences
- Mechanical identity
- Status relationships
- Core, Signature, and Ultimate directions
- Evolution logic
- Visual ability rules
- Balance tests

## create-ability

Potential reusable workflow:

- Generate candidate
- Normalize mechanics
- Validate schema
- Compare duplicates
- Calculate power budget
- Propose lore
- Propose art prompt inputs
- Request approval
- Register permanent identity

## create-boss

Potential workflow:

- Define mechanic
- Define phases
- Define actions
- Define intent
- Define resistances
- Define rewards
- Simulate matchups
- Validate battle length
- Request approval

## balance-ability

Potential workflow:

- Review analytics
- Simulate versions
- Compare outcomes
- Create version
- Generate patch notes
- Preserve discovery identity

## canonical-ability-art

Stage 2 skill:

- Build Leonardo prompt
- Apply family visual rules
- Check small-size readability
- Validate silhouette
- Store prompt version
- Queue art
- Review result

Claude should recommend skill creation only when the workflow is repeatable enough to justify it.

---

# 53. Product Decisions and Recommended Defaults

| Decision | Recommended Default |
|---|---|
| Abilities permanent | Yes |
| Ability discovery source | Card forging initially |
| Ability artwork | Canonical and reusable |
| UI frames | Figma and game UI |
| Foundation abilities | One Core |
| Forged abilities | Evolved Core plus Signature |
| Ascendant abilities | Evolved Core, evolved Signature, Ultimate |
| Generated mechanics | Allowed through structured primitives |
| Unsupported mechanics | Experimental and approval-gated |
| Duplicate validation | Structured plus semantic plus human review |
| Ability versions | Yes |
| Combat format | Turn-based |
| Initial party | One hero |
| Target party | Two heroes |
| Actions per round | One per hero |
| Boss actions | Telegraph before resolving |
| Universal actions | Guard and Focus |
| Cooldowns | Round-based |
| Ultimate resource | Separate charge |
| Normal battle AI calls | None |
| First boss phases | Two |
| First battle length | Five to eight minutes |
| Production rewards | Server-authoritative |
| Visual polish | After mechanical validation |

---

# 54. First Prompt to Give Claude Code

Copy the following after placing this document in the repository:

```text
Read the full Card Game Master Plan — Ability System First, Boss Battles Second.

This document is planning guidance and must not be fully implemented in one pass.

Your first task is Stage 0 only:

1. Inspect the current repository and all relevant canonical documents.
2. Explain how abilities currently work.
3. Identify every current ability-related model, type, service, prompt, UI component, storage location, and generation step.
4. Identify how card rank, archetype, lore, Mana, Tech, ATK, and DEF currently work.
5. Identify what can be preserved and what must change.
6. Identify migration risks.
7. Identify conflicts between this plan and the existing implementation.
8. Identify which agents and skills should participate.
9. Identify repeatable workflows that may deserve a new or expanded skill.
10. Produce a repository-specific implementation roadmap for Ability System Stage A0 through A9.
11. Do not implement the Boss Battle System.
12. Do not fully implement the Ability System.
13. Do not change economy values.
14. Do not make unapproved product decisions.
15. Stop after presenting your architecture review, recommendations, open questions, and file-by-file proposed sequence.

Explicitly call out any part of this master plan you disagree with and explain why.

Wait for Raheem’s approval before implementation.
```

---

# 55. Definition of Success

The Ability System succeeds when:

- Abilities feel connected to character identity.
- Abilities are reusable and recognizable.
- New abilities can expand the world.
- Cosmetic duplicates do not pollute the Codex.
- Players have a meaningful discovery chase.
- Ability artwork becomes a growing reusable library.
- Balance changes do not erase ownership or discovery.
- Combat can execute abilities deterministically.
- Claude remains creative without becoming the runtime.
- The system supports future archetypes and mechanics.

The Boss Battle System succeeds when:

- The player makes meaningful choices.
- Different heroes play differently.
- Defensive and support abilities matter.
- Boss intent is understandable.
- One hero is fun before two heroes are added.
- Battles are inexpensive to run.
- Results are reproducible.
- Rewards are secure.
- Combat validates and improves the Ability System.
- Cards finally feel like heroes rather than framed statistics.

---

# 56. Final Direction

The project should now proceed with an **Ability-First strategy**.

The immediate goal is not to make a beautiful ability tile or a cinematic boss.

The immediate goal is to create a permanent, expandable, structured, versioned Ability System that can safely power those experiences.

Once that contract is approved and the minimum foundation exists, the Boss Battle System can be built without inventing temporary mechanics or forcing large reworks.

The sequence is:

> **Ability architecture → ability runtime → permanent library → generation and discovery foundation → minimal Codex → combat plan → headless simulator → one-hero boss battle → balance validation → deeper Codex and art pipeline → two-hero expansion → visual polish.**

This gives the game a path from infinite card creation to infinite-feeling gameplay while keeping cost, balance, implementation, and content growth under control.
