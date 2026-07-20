import type { ArchetypeName, Rank, CardStats, StatName } from './card';
import type {
  AbilityDefinition,
  AbilityVersion,
  AbilityResourceType,
  AbilitySlotType,
  DamageType,
  StatusApplication,
} from './abilities';

/**
 * Combat contract — pure types only. No runtime code lives here.
 *
 * Companion spec: card-engine-boss-battle-spec.md (root of repo).
 * All formulas, tick order, and invariants are defined there; this file
 * is the machine-checkable projection of that spec.
 *
 * Rule: any code that reads a hero's ability numbers during a battle MUST
 * read from HeroCombatant.abilityLoadout[i].snapshot, NEVER from
 * AbilityStore.getCurrentVersion(). See BattleSnapshot.rule §27.
 */

/* ------------------------------------------------------------------ */
/*  Snapshot — immutable-at-battle-start state                         */
/* ------------------------------------------------------------------ */

/**
 * Frozen copy of an ability at battle start. Includes both the def and
 * the exact version that was live at snapshot time. If the library is
 * rebalanced mid-battle, this record does not change.
 */
export interface AbilityCombatSnapshot {
  slot: AbilitySlotType;
  definitionId: string;
  versionId: string;
  displayName: string;
  resourceType: AbilityResourceType;
  resourceCost: number;
  cooldownRounds: number;
  /** Full frozen copies — never resolved from the live store during combat. */
  def: AbilityDefinition;
  version: AbilityVersion;
}

/** Snapshot of a single hero at battle start. */
export interface HeroSnapshot {
  cardId: string;
  archetype: ArchetypeName;
  rank: Rank;
  displayName: string;
  stats: CardStats;
  maxHp: number;
  maxResource: number;
  resourceType: Exclude<AbilityResourceType, 'none'>;
  abilities: AbilityCombatSnapshot[];
}

/** Snapshot of the boss at battle start. */
export interface BossSnapshot {
  bossId: string;
  versionId: string;
  name: string;
  maxHp: number;
  phases: BossPhaseSnapshot[];
  resistanceProfileId: string;
  weaknessProfileId: string;
}

export interface BossPhaseSnapshot {
  id: string;
  healthThresholdStart: number;
  healthThresholdEnd: number;
  actions: BossActionSnapshot[];
  passiveEffects: readonly string[];
}

export interface BossActionSnapshot {
  id: string;
  displayName: string;
  intentType: BossIntentType;
  telegraphText: string;
  priority: number;
  cooldownRounds: number;
  interruptible: boolean;
  /** Base damage of the action. 0 for actions that don't deal direct damage. */
  baseDamage: number;
  /** Extra damage added per round elapsed (linear enrage). Defaults to 0. */
  scalingPerRound: number;
}

export type BossIntentType =
  | 'heavy_attack'
  | 'area_attack'
  | 'summon'
  | 'shield'
  | 'cleanse'
  | 'curse'
  | 'enrage_prep'
  | 'ultimate'
  | 'vulnerability'
  | 'execute';

/** Full immutable battle setup. Written once, referenced everywhere. */
export interface BattleSnapshot {
  battleId: string;
  createdAt: string;
  seed: number;
  difficulty: BattleDifficulty;
  rewardTableVersion: string;
  heroes: HeroSnapshot[];
  boss: BossSnapshot;
}

export const BATTLE_DIFFICULTIES = ['normal', 'hard'] as const;
export type BattleDifficulty = typeof BATTLE_DIFFICULTIES[number];

/* ------------------------------------------------------------------ */
/*  Runtime state                                                      */
/* ------------------------------------------------------------------ */

/** Instance of a status currently affecting an actor. */
export interface StatusInstance {
  /** Fresh per-application uuid — lets two of the same status coexist if stack allows. */
  instanceId: string;
  statusId: string;
  sourceActorId: string;
  application: StatusApplication;
  /** Rounds remaining. Ticks at end-of-round after triggers resolve. */
  remainingRounds: number;
  /** Current stack count for stacking statuses; 1 for non-stacking. */
  stacks: number;
}

export interface CooldownEntry {
  abilityDefinitionId: string;
  /** Rounds until usable again. Ticks at end-of-round for the actor who used it. */
  remainingRounds: number;
}

export interface ShieldPool {
  /** Total absorb budget currently on this actor. */
  amount: number;
  /** Damage types this shield covers; empty = all types. */
  types: readonly DamageType[];
  /** Rounds until expiry, or Infinity for none. */
  remainingRounds: number;
  sourceActorId: string;
}

/** A hero's live combat state — mutates during battle; snapshot is immutable. */
export interface HeroCombatant {
  actorId: string;
  snapshot: HeroSnapshot;
  hp: number;
  resource: number;
  ultimateCharge: number;
  cooldowns: CooldownEntry[];
  statuses: StatusInstance[];
  shields: ShieldPool[];
  /** True when hp <= 0; set once, never resurrected without a revive effect. */
  defeated: boolean;
}

/** The boss's live combat state. */
export interface BossCombatant {
  actorId: string;
  snapshot: BossSnapshot;
  hp: number;
  currentPhaseId: string;
  actionCooldowns: CooldownEntry[];
  statuses: StatusInstance[];
  shields: ShieldPool[];
  defeated: boolean;
  /** Pre-declared intent for the current round; empty at round start until telegraph phase. */
  currentIntent: BattleIntent | null;
}

/** All the state a battle needs to resolve one step. */
export interface BattleState {
  snapshot: BattleSnapshot;
  round: number;
  /** Monotonic — increments every state transition; useful for replay diffing. */
  step: number;
  /** Deterministic RNG cursor; advances every roll. */
  rngCursor: number;
  heroes: HeroCombatant[];
  boss: BossCombatant;
  phase: TurnPhase;
  /**
   * Hero actorIds that have not yet chosen an action this round. Populated
   * after boss_intent_reveal with all living heroes in lane order. The head
   * is the hero currently being asked for input. Emptied as each hero
   * submits; when empty during resolving_reactions, control passes to the
   * boss.
   */
  pendingActorIds: string[];
  log: BattleEvent[];
  result: BattleResult | null;
}

/**
 * Where in the round we are. Order matches spec §Turn Structure.
 * `awaiting_player_action` and `awaiting_target` are the only pauseable
 * states (everything else resolves synchronously in the reducer).
 */
export const TURN_PHASES = [
  'start_of_round',
  'boss_intent_reveal',
  'awaiting_player_action',
  'awaiting_target',
  'resolving_player',
  'resolving_reactions',
  'resolving_boss',
  'end_of_round',
  'checking_phase_transition',
  'checking_victory',
  'battle_over',
] as const;
export type TurnPhase = typeof TURN_PHASES[number];

/* ------------------------------------------------------------------ */
/*  Intents + actions                                                  */
/* ------------------------------------------------------------------ */

/** Boss's declared intent for the round (what the player sees). */
export interface BattleIntent {
  actionId: string;
  intentType: BossIntentType;
  telegraphText: string;
  /** Which actor(s) the action will target when it resolves. */
  targetActorIds: string[];
}

/** What the player chose to do this round. */
export type PlayerAction =
  | { kind: 'ability'; abilityDefinitionId: string; targetActorIds: string[] }
  | { kind: 'guard' }
  | { kind: 'focus' }
  | { kind: 'inspect' };

/* ------------------------------------------------------------------ */
/*  Events + results                                                   */
/* ------------------------------------------------------------------ */

/**
 * Every state transition emits a BattleEvent. The stream is the source of
 * truth for replay — reducing the same snapshot + seed + player actions
 * against the same event list must reproduce the same BattleState.
 */
export type BattleEvent =
  | { kind: 'battle_started'; at: string; snapshotId: string }
  | { kind: 'round_started'; round: number }
  | { kind: 'boss_intent_declared'; round: number; intent: BattleIntent }
  | { kind: 'player_action_selected'; actorId: string; action: PlayerAction }
  | { kind: 'damage_dealt'; sourceActorId: string; targetActorId: string; amount: number; damageType: DamageType; blockedByShield: number }
  | { kind: 'healing_applied'; sourceActorId: string; targetActorId: string; amount: number; overheal: number }
  | { kind: 'shield_gained'; sourceActorId: string; targetActorId: string; amount: number; types: readonly DamageType[] }
  | { kind: 'status_applied'; sourceActorId: string; targetActorId: string; statusId: string; instanceId: string; duration: number }
  | { kind: 'status_removed'; targetActorId: string; instanceId: string; reason: 'expired' | 'dispelled' | 'cleansed' }
  | { kind: 'resource_changed'; actorId: string; delta: number; source: string }
  | { kind: 'ultimate_charge_changed'; actorId: string; delta: number; source: string }
  | { kind: 'cooldown_started'; actorId: string; abilityDefinitionId: string; rounds: number }
  | { kind: 'cooldown_ticked'; actorId: string; abilityDefinitionId: string; remaining: number }
  | { kind: 'actor_defeated'; actorId: string }
  | { kind: 'phase_transition'; fromPhaseId: string; toPhaseId: string }
  | { kind: 'action_denied'; actorId: string; reason: ActionDenialReason }
  | { kind: 'battle_ended'; result: BattleResult };

export type ActionDenialReason =
  | 'insufficient_resource'
  | 'on_cooldown'
  | 'invalid_target'
  | 'actor_defeated'
  | 'silenced'
  | 'stunned'
  | 'interrupted';

export type BattleResult =
  | { outcome: 'victory'; roundsElapsed: number; heroesSurviving: number }
  | { outcome: 'defeat'; roundsElapsed: number; cause: 'party_wipe' | 'timeout' }
  | { outcome: 'abandoned'; roundsElapsed: number };

/* ------------------------------------------------------------------ */
/*  Damage + defense formulas — the numeric contract                   */
/* ------------------------------------------------------------------ */

/**
 * Result of resolving a single damage instance. All intermediate values
 * are surfaced so the simulator can log them for balance analysis.
 */
export interface DamageResolution {
  rawAmount: number;
  scalingApplied: number;
  postDefenseAmount: number;
  postShieldAmount: number;
  shieldAbsorbed: number;
  damageType: DamageType;
  isCrit: boolean;
  isExecute: boolean;
}

/**
 * Result of resolving a heal — separates overheal so end-of-round rules
 * (e.g. lifesteal caps) can inspect it.
 */
export interface HealResolution {
  requestedAmount: number;
  actualAmount: number;
  overheal: number;
}

/**
 * A snapshot of the derived combat-only stats for a hero. Recomputed once
 * per battle start (§HP derivation). Bosses have their own baseStats path.
 */
export interface HeroDerivedStats {
  maxHp: number;
  maxResource: number;
  /** Flat damage reduction applied to incoming physical/magical damage before shields. */
  defenseMitigation: number;
  /** Per-round regen of the hero's primary resource. */
  resourceRegenPerRound: number;
  /** Attack scalar applied to damage effects with statScaling=Atk. */
  attackScalar: number;
}

/**
 * Result of a stat check used by ability conditions like "user HP below threshold".
 * Exposed as a shape so the runtime can pass it into log events for replay.
 */
export interface StatCheckResult {
  stat: StatName | 'Hp' | 'Resource' | 'UltimateCharge';
  actualValue: number;
  thresholdValue: number;
  comparator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
  passed: boolean;
}
