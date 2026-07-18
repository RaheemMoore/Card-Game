import type { ArchetypeName, Rank } from './card';

export const ABILITY_SLOT_TYPES = ['core', 'signature', 'ultimate'] as const;
export type AbilitySlotType = typeof ABILITY_SLOT_TYPES[number];

export const ABILITY_RARITIES = ['common', 'uncommon', 'rare', 'legendary', 'mythic'] as const;
export type AbilityRarity = typeof ABILITY_RARITIES[number];

export const ABILITY_ROLES = [
  'damage',
  'defense',
  'support',
  'control',
  'summon',
  'utility',
  'hybrid',
] as const;
export type AbilityRole = typeof ABILITY_ROLES[number];

export const ABILITY_STATUSES = [
  'proposed',
  'experimental',
  'approved',
  'deprecated',
  'merged',
] as const;
export type AbilityStatus = typeof ABILITY_STATUSES[number];

/**
 * Runtime resource an ability consumes. Must match the archetype's resource
 * (Mech Pilot / Android = Tech; everyone else = Mana) at CardAbilityReference
 * insert time. Enforcement lives in the service layer, not in SQL.
 */
export const ABILITY_RESOURCE_TYPES = ['mana', 'tech', 'none'] as const;
export type AbilityResourceType = typeof ABILITY_RESOURCE_TYPES[number];

export const ABILITY_VERSION_STATUSES = [
  'draft',
  'experimental',
  'approved',
  'deprecated',
] as const;
export type AbilityVersionStatus = typeof ABILITY_VERSION_STATUSES[number];

export const ABILITY_FAMILY_STATUSES = ['active', 'experimental', 'retired'] as const;
export type AbilityFamilyStatus = typeof ABILITY_FAMILY_STATUSES[number];

export const CANONICAL_ART_STATUSES = [
  'pending',
  'generating',
  'approved',
  'rejected',
  'replaced',
] as const;
export type CanonicalArtStatus = typeof CANONICAL_ART_STATUSES[number];

export const CANONICAL_ART_PROVIDERS = ['leonardo', 'manual', 'placeholder'] as const;
export type CanonicalArtProvider = typeof CANONICAL_ART_PROVIDERS[number];

/* ------------------------------------------------------------------ */
/* Runtime primitives (A2). Discriminated unions on `type`.            */
/* Catalogs with display metadata live in src/data/abilities/.         */
/* ------------------------------------------------------------------ */

export const SCALING_STATS = ['atk', 'def', 'mana', 'tech'] as const;
export type ScalingStat = typeof SCALING_STATS[number];

export interface ScalingRule {
  stat: ScalingStat;
  /** Multiplied by the stat's current value. Result added to base amount. */
  coefficient: number;
}

export const DAMAGE_TYPES = [
  'physical',
  'fire',
  'holy',
  'shadow',
  'nature',
  'tech',
  'true',
] as const;
export type DamageType = typeof DAMAGE_TYPES[number];

/** Reference to a status entry in STATUS_CATALOG. */
export interface StatusApplication {
  statusId: string;
  duration: number;
  stacks?: number;
}

/* ---------- Effects (starter catalog: 15) ---------- */

export const EFFECT_TYPES = [
  'direct_damage',
  'damage_over_time',
  'healing',
  'shielding',
  'apply_status',
  'remove_status',
  'resource_gain',
  'resource_drain',
  'summon',
  'lifesteal',
  'multi_hit',
  'guard',
  'taunt',
  'conditional_bonus',
  'ultimate_charge_gain',
] as const;
export type EffectType = typeof EFFECT_TYPES[number];

export interface DirectDamageEffect {
  type: 'direct_damage';
  amount: number;
  scaling?: ScalingRule;
  damageType?: DamageType;
}

export interface DamageOverTimeEffect {
  type: 'damage_over_time';
  statusId: string;
  amountPerTick: number;
  duration: number;
  scaling?: ScalingRule;
}

export interface HealingEffect {
  type: 'healing';
  amount: number;
  scaling?: ScalingRule;
}

export interface ShieldingEffect {
  type: 'shielding';
  amount: number;
  scaling?: ScalingRule;
  /** Rounds the shield lasts. Omit = until popped. */
  duration?: number;
}

export interface ApplyStatusEffect {
  type: 'apply_status';
  status: StatusApplication;
  /** 0..1 — probability the status lands. Default 1. */
  chance?: number;
}

export interface RemoveStatusEffect {
  type: 'remove_status';
  category: 'positive' | 'negative' | 'any';
  /** How many statuses to remove. Default 1. */
  count?: number;
}

export interface ResourceGainEffect {
  type: 'resource_gain';
  resource: 'mana' | 'tech';
  amount: number;
}

export interface ResourceDrainEffect {
  type: 'resource_drain';
  resource: 'mana' | 'tech';
  amount: number;
}

export interface SummonEffect {
  type: 'summon';
  /** References summon catalog (introduced at Stage B). */
  unitId: string;
  count?: number;
  /** Rounds the summon persists. Omit = until defeated. */
  duration?: number;
}

export interface LifestealEffect {
  type: 'lifesteal';
  /** 0..1 — fraction of damage dealt returned as healing. */
  percentOfDamage: number;
}

export interface MultiHitEffect {
  type: 'multi_hit';
  hitCount: number;
  amountPerHit: number;
  scaling?: ScalingRule;
  damageType?: DamageType;
}

export interface GuardEffect {
  type: 'guard';
  /** 0..1 — fraction of incoming damage reduced. */
  reductionPercent: number;
  duration: number;
}

export interface TauntEffect {
  type: 'taunt';
  duration: number;
}

export interface ConditionalBonusEffect {
  type: 'conditional_bonus';
  condition: AbilityCondition;
  effects: AbilityEffect[];
}

export interface UltimateChargeGainEffect {
  type: 'ultimate_charge_gain';
  amount: number;
}

export type AbilityEffect =
  | DirectDamageEffect
  | DamageOverTimeEffect
  | HealingEffect
  | ShieldingEffect
  | ApplyStatusEffect
  | RemoveStatusEffect
  | ResourceGainEffect
  | ResourceDrainEffect
  | SummonEffect
  | LifestealEffect
  | MultiHitEffect
  | GuardEffect
  | TauntEffect
  | ConditionalBonusEffect
  | UltimateChargeGainEffect;

/* ---------- Targets (starter catalog: 10) ---------- */

export const TARGET_TYPES = [
  'self',
  'single_ally',
  'all_allies',
  'single_enemy',
  'all_enemies',
  'random_enemy',
  'lowest_health_ally',
  'highest_attack_enemy',
  'boss_object',
  'current_attacker',
] as const;
export type TargetType = typeof TARGET_TYPES[number];

export interface SelfTarget { type: 'self'; }
export interface SingleAllyTarget { type: 'single_ally'; }
export interface AllAlliesTarget { type: 'all_allies'; }
export interface SingleEnemyTarget { type: 'single_enemy'; }
export interface AllEnemiesTarget { type: 'all_enemies'; }
export interface RandomEnemyTarget { type: 'random_enemy'; count?: number; }
export interface LowestHealthAllyTarget { type: 'lowest_health_ally'; }
export interface HighestAttackEnemyTarget { type: 'highest_attack_enemy'; }
export interface BossObjectTarget { type: 'boss_object'; }
export interface CurrentAttackerTarget { type: 'current_attacker'; }

export type TargetRule =
  | SelfTarget
  | SingleAllyTarget
  | AllAlliesTarget
  | SingleEnemyTarget
  | AllEnemiesTarget
  | RandomEnemyTarget
  | LowestHealthAllyTarget
  | HighestAttackEnemyTarget
  | BossObjectTarget
  | CurrentAttackerTarget;

/* ---------- Triggers (starter catalog: 10) ---------- */

export const TRIGGER_TYPES = [
  'on_use',
  'start_of_round',
  'end_of_round',
  'on_damage_dealt',
  'on_damage_received',
  'on_block',
  'on_heal',
  'on_status_applied',
  'below_health_threshold',
  'above_resource_threshold',
] as const;
export type TriggerType = typeof TRIGGER_TYPES[number];

export interface OnUseTrigger { type: 'on_use'; }
export interface StartOfRoundTrigger { type: 'start_of_round'; }
export interface EndOfRoundTrigger { type: 'end_of_round'; }
export interface OnDamageDealtTrigger { type: 'on_damage_dealt'; }
export interface OnDamageReceivedTrigger { type: 'on_damage_received'; }
export interface OnBlockTrigger { type: 'on_block'; }
export interface OnHealTrigger { type: 'on_heal'; }
export interface OnStatusAppliedTrigger { type: 'on_status_applied'; statusId?: string; }
export interface BelowHealthThresholdTrigger { type: 'below_health_threshold'; percent: number; }
export interface AboveResourceThresholdTrigger {
  type: 'above_resource_threshold';
  resource: 'mana' | 'tech';
  amount: number;
}

export type AbilityTrigger =
  | OnUseTrigger
  | StartOfRoundTrigger
  | EndOfRoundTrigger
  | OnDamageDealtTrigger
  | OnDamageReceivedTrigger
  | OnBlockTrigger
  | OnHealTrigger
  | OnStatusAppliedTrigger
  | BelowHealthThresholdTrigger
  | AboveResourceThresholdTrigger;

/* ---------- Conditions (starter catalog: 8) ---------- */

export const CONDITION_TYPES = [
  'target_has_status',
  'user_has_status',
  'user_hp_below_threshold',
  'boss_hp_below_threshold',
  'resource_above_threshold',
  'summon_exists',
  'shield_active',
  'family_ability_used_earlier',
] as const;
export type ConditionType = typeof CONDITION_TYPES[number];

export interface TargetHasStatusCondition {
  type: 'target_has_status';
  statusId: string;
}
export interface UserHasStatusCondition {
  type: 'user_has_status';
  statusId: string;
}
export interface UserHpBelowThresholdCondition {
  type: 'user_hp_below_threshold';
  percent: number;
}
export interface BossHpBelowThresholdCondition {
  type: 'boss_hp_below_threshold';
  percent: number;
}
export interface ResourceAboveThresholdCondition {
  type: 'resource_above_threshold';
  resource: 'mana' | 'tech';
  amount: number;
}
export interface SummonExistsCondition {
  type: 'summon_exists';
}
export interface ShieldActiveCondition {
  type: 'shield_active';
  on: 'self' | 'ally' | 'target';
}
export interface FamilyAbilityUsedEarlierCondition {
  type: 'family_ability_used_earlier';
  familyId: string;
  /** Optional lookback window. Omit = anywhere in battle. */
  withinRounds?: number;
}

export type AbilityCondition =
  | TargetHasStatusCondition
  | UserHasStatusCondition
  | UserHpBelowThresholdCondition
  | BossHpBelowThresholdCondition
  | ResourceAboveThresholdCondition
  | SummonExistsCondition
  | ShieldActiveCondition
  | FamilyAbilityUsedEarlierCondition;

/* ---------- Status catalog shape ---------- */

export const STATUS_CATEGORIES = ['positive', 'negative', 'neutral'] as const;
export type StatusCategory = typeof STATUS_CATEGORIES[number];

export const STATUS_STACK_BEHAVIORS = ['refresh', 'stack', 'ignore'] as const;
export type StatusStackBehavior = typeof STATUS_STACK_BEHAVIORS[number];

export const STATUS_DISPEL_CATEGORIES = ['basic', 'strong', 'unremovable'] as const;
export type StatusDispelCategory = typeof STATUS_DISPEL_CATEGORIES[number];

export const STATUS_BOSS_BEHAVIORS = [
  'normal',
  'reduced_duration',
  'resistance',
  'immune',
] as const;
export type StatusBossBehavior = typeof STATUS_BOSS_BEHAVIORS[number];

/** Persistent status effect definition — referenced by id in effects/conditions. */
export interface StatusDefinition {
  id: string;
  displayName: string;
  category: StatusCategory;
  stackBehavior: StatusStackBehavior;
  maxStacks: number;
  /** Default duration in rounds. Effects may override. */
  defaultDuration: number;
  dispelCategory: StatusDispelCategory;
  bossBehavior: StatusBossBehavior;
  description: string;
}

/* ------------------------------------------------------------------ */
/* Permanent identity, families, versions, references                 */
/* ------------------------------------------------------------------ */

/**
 * Permanent collectible identity. One row per unique ability concept.
 * Balance changes create new AbilityVersion rows; the identity here does
 * not change (see spec §7).
 */
export interface AbilityDefinition {
  id: string;
  /** Human-readable, stable, kebab-case (e.g. "ember-cleave"). Used in URLs + logs. */
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
  /** Only set when status = "merged". Points at the surviving identity. */
  mergedIntoAbilityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AbilityVersion {
  id: string;
  abilityId: string;
  versionNumber: number;
  slotType: AbilitySlotType;
  targetRule: TargetRule;
  resourceType: AbilityResourceType;
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
  status: AbilityVersionStatus;
}

export interface AbilityFamily {
  id: string;
  name: string;
  description: string;
  /** Short brief guiding Leonardo prompts (populated at A8, empty at A1). */
  visualTheme: string;
  /** Populated at A8 when the family's canonical prompt template is built. */
  promptRules: string[];
  /** Rough mechanical fingerprint (Master Plan §9) — refined at A2. */
  mechanicPreferences: string[];
  sortOrder: number;
  /** Never mark true — every family is expected to grow indefinitely. */
  openEnded: boolean;
  status: AbilityFamilyStatus;
}

/**
 * Which family each archetype prefers, which they can dabble in, and which are
 * off-limits by lore. Restricted families never generate for that archetype.
 */
export interface ArchetypeFamilyAffinity {
  preferred: string[];
  secondary: string[];
  restricted: string[];
}

export type ArchetypePreferredFamilies = Record<ArchetypeName, ArchetypeFamilyAffinity>;

/**
 * A card's binding to a permanent ability, per slot per local tier. Snapshots
 * the exact version id at the moment the reference was created so mid-battle
 * balance changes don't reshape resolution (see spec §7).
 */
export interface CardAbilityReference {
  cardId: string;
  abilityId: string;
  /** Required at battle-snapshot creation; may be absent at rest. */
  abilityVersionId?: string;
  slotType: AbilitySlotType;
  localTier: Rank;
  upgradedState?: string;
  temporaryModifiers?: AbilityEffect[];
  displayOrder: number;
}

export interface PlayerAbilityDiscovery {
  playerId: string;
  abilityId: string;
  discoveredAt: string;
  firstDiscoveredGlobally: boolean;
  timesSeen: number;
  timesOwnedOnCards: number;
  rewardGranted: boolean;
  /** FK to economy_transactions.transaction_id when reward has fired. */
  rewardTransactionId?: string;
}

/**
 * A single artwork crop for one presentation role. `url` may be a data: URL
 * (placeholder SVG or Leonardo base64) or a static /assets path.
 */
export interface AbilityArtCrop {
  url: string;
  thumbnailUrl?: string;
}

/**
 * The three approved presentation roles from the Ability Tile Art Direction
 * Spec (§8): combat (Command Strip icon well, 64–128px), detail (Forged
 * Detail Card artwork window, ~364×280), relic (ceremonial Relic
 * Presentation, ~364×364). See ATS §20/§21 for framing.
 */
export interface AbilityArtCrops {
  combat: AbilityArtCrop;
  detail: AbilityArtCrop;
  relic: AbilityArtCrop;
}

export interface CanonicalArtAsset {
  id: string;
  abilityId: string;
  provider: CanonicalArtProvider;
  sourcePromptVersion?: string;
  /**
   * Legacy single-crop URL. Kept as a mirror of `assets.combat.url` for
   * backwards compatibility with pre-Gate-7A consumers (CodexFamily,
   * CodexAbility, CardDetail) and the Supabase `asset_url` column. Do not
   * read this in new code — call getArtCrops() instead.
   */
  assetUrl: string;
  thumbnailUrl?: string;
  /**
   * Approved three-crop set. Optional on old rows for backwards compat; new
   * writers always populate it. Readers should prefer getArtCrops() which
   * falls back to `assetUrl` when `assets` is absent.
   */
  assets?: AbilityArtCrops;
  status: CanonicalArtStatus;
  createdAt: string;
}

/**
 * Resolve the three presentation crops for an art asset. If `assets` is set,
 * returns it; otherwise falls back to `assetUrl` for all three roles so
 * legacy placeholder rows still render everywhere.
 */
export function getArtCrops(asset: CanonicalArtAsset): AbilityArtCrops {
  if (asset.assets) return asset.assets;
  const fallback: AbilityArtCrop = {
    url: asset.assetUrl,
    thumbnailUrl: asset.thumbnailUrl,
  };
  return { combat: fallback, detail: fallback, relic: fallback };
}

/**
 * Not shipped in A3. Reserved for A5 if lore-branching evolution shows up in
 * real cards. Documented here so the type name is stable if we add it later.
 */
export interface AbilityEvolutionLink {
  sourceAbilityId: string;
  destinationAbilityId: string;
  evolutionType: 'tier_upgrade' | 'branch' | 'lore_concordant' | 'lore_defiant';
  requirements: Array<{ type: string; [key: string]: unknown }>;
}

/* ------------------------------------------------------------------ */
/* Candidate generation (A4)                                           */
/* ------------------------------------------------------------------ */

/**
 * Raw proposal shape emitted by Claude (or hand-authored during tests).
 * Combines definition + version fields into one payload. The normalizer
 * splits it into an AbilityDefinition + AbilityVersion pair, generating
 * ids/slug when omitted.
 *
 * All effect / trigger / condition primitives are validated against the
 * A2 catalogs — unsupported primitives make the candidate `experimental`.
 */
export interface AbilityCandidate {
  displayName: string;
  /** Optional; the normalizer computes a kebab-case slug from displayName if omitted. */
  slug?: string;
  familyIds: string[];
  rarity: AbilityRarity;
  role: AbilityRole;
  tags: string[];
  descriptionShort: string;
  descriptionLong?: string;
  lore?: string;
  slotType: AbilitySlotType;
  resourceType: AbilityResourceType;
  resourceCost: number;
  targetRule: TargetRule;
  effects: AbilityEffect[];
  triggers?: AbilityTrigger[];
  conditions?: AbilityCondition[];
  scalingRules?: ScalingRule[];
  cooldownRounds?: number;
  maxCharges?: number;
}

/** How close a candidate is to an existing library ability. */
export type DuplicateResult =
  | { kind: 'exact_match'; abilityId: string }
  | { kind: 'high_similarity'; abilityId: string; overlap: number }
  | { kind: 'novel' };

/** Outcome of routing a candidate through the proposal pipeline. */
export type ProposalOutcome =
  | {
      kind: 'attached';
      abilityId: string;
      abilityVersionId: string;
      /** True when the candidate matched an existing identity exactly. */
      wasExactMatch: true;
      /** True when this attachment is the caller's first time seeing the ability. */
      firstDiscoveryForPlayer: boolean;
    }
  | {
      kind: 'queued';
      /** New AbilityDefinition id created with status = 'proposed' or 'experimental'. */
      abilityId: string;
      abilityVersionId: string;
      /** Non-null when duplicate detection found a near-match to guide admin review. */
      similarityNote?: { nearestAbilityId: string; overlap: number };
      /** True when the candidate used an unknown primitive and is quarantined. */
      experimental: boolean;
    }
  | {
      kind: 'rejected';
      /** Validation errors from the A2 validator, one per problem. */
      errors: Array<{ path: string; message: string }>;
    };
