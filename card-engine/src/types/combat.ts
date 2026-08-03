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
  /**
   * The damage type this hero's ELEMENT-TYPED abilities deal, resolved from
   * the card's element once at snapshot time and frozen here.
   *
   * Frozen deliberately. The reducer must be a pure function of
   * (snapshot, seed, actions) for replay to reproduce, and a card's
   * `currentElement` MUTATES between battles — `services/tierUp.ts` rewrites
   * it when a Fallen Seraph's Light transmutes to Infernal. Reading the card
   * store mid-reduce would make an old event log replay to different damage.
   *
   * Note this is the opposite call from the VFX layer, which resolves element
   * in the VIEW from `partyCards`. That is correct there: cosmetics may follow
   * the live card, but combat MATH may not.
   */
  elementDamageType: DamageType;
  abilities: AbilityCombatSnapshot[];
}

/** Snapshot of the boss at battle start. */
/** What a combatant resists or is weak to. Mirrors formulas.ResistanceProfile,
 *  declared here because types must not depend on services. */
export interface ActorResistance {
  resistant: readonly DamageType[];
  weak: readonly DamageType[];
}

export interface BossSnapshot {
  bossId: string;
  versionId: string;
  name: string;
  maxHp: number;
  phases: BossPhaseSnapshot[];
  resistanceProfileId: string;
  weaknessProfileId: string;
  /**
   * The boss's ACTUAL resistances, frozen at snapshot time.
   *
   * `resistanceProfileId` above is a synthesized `rp_<slug>` string that
   * nothing ever looked up — the authored profile was discarded on the way in
   * and the reducer fell back to a hardcoded `bossId.startsWith(...)` check,
   * which meant every boss but the Emberborn Wraith was resistance-neutral no
   * matter what its data said. The ids are kept for logging; this is the field
   * combat actually reads.
   */
  resistance: ActorResistance;
  /** Arena this fight takes place in. Falls back to the default when absent. */
  arenaId?: string;
}

export interface BossPhaseSnapshot {
  id: string;
  healthThresholdStart: number;
  healthThresholdEnd: number;
  actions: BossActionSnapshot[];
  passiveEffects: readonly string[];
  /** Statuses applied to the boss on entering this phase. */
  passiveStatuses?: readonly StatusApplication[];
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
  /** Damage type this action deals. Defaults to 'physical' when unauthored. */
  damageType: DamageType;
  /** For `shield` intents — absorb granted to the boss. */
  shieldAmount?: number;
  shieldDurationRounds?: number;
  /**
   * Who this action hits. Defaults to 'single'.
   *
   * ONE generic field rather than per-intent target rules. It also retires the
   * hardcoded `area_attack` branch in the reducer: sweeping the party was a
   * property of an intent's NAME, so no other intent could ever do it and
   * `area_attack` could never do anything else.
   */
  targetScope?: BossTargetScope;
  /** Statuses the boss applies to ITSELF — the mechanism behind `enrage_prep`. */
  selfStatuses?: readonly StatusApplication[];
  /** Statuses applied to whoever this action targets — `curse`, `vulnerability`. */
  statusApplications?: readonly StatusApplication[];
  /** For `execute` — below this fraction of max HP, damage is multiplied. */
  executeThresholdPercent?: number;
  executeMultiplier?: number;
  /** Present on actions that take multiple rounds to land. See BossChargeSpec. */
  charge?: BossChargeSpec;
  /**
   * Relative likelihood of being picked among the boss's FILLER actions.
   * Defaults to 1. Ignored for actions at or above `DETERMINISTIC_PRIORITY`,
   * which always fire the moment they come off cooldown.
   *
   * The split exists because a boss that is random about everything cannot be
   * planned against, and a boss that is deterministic about everything is
   * solved after one fight. The moves that END fights stay learnable; the
   * moment-to-moment rotation stays unpredictable.
   */
  weight?: number;
}

/**
 * Who a boss action hits. 'lowest_hp' is what makes `execute` a real threat
 * that a taunt has to answer, rather than a coin flip.
 */
export type BossTargetScope = 'single' | 'all_heroes' | 'lowest_hp' | 'highest_hp';

/**
 * A boss action that telegraphs on one round and lands several rounds later.
 *
 * This is the shape hero abilities structurally cannot express — no
 * `AbilityEffect` has a "resolves in N rounds" slot, and `damage_over_time`,
 * the only time-shifted effect, is fixed-per-tick and cannot be cancelled.
 * That is what makes a charged action boss-exclusive in a principled way
 * rather than just numerically.
 *
 * Deliberately LAYERED on top of `interruptible` rather than replacing it.
 * They answer different questions: `interruptible` is a single-round burst
 * check against an action resolving THIS round; a charge is a cumulative
 * multi-round check against one resolving LATER. An action that is both
 * collapses to whichever is weaker, so a charged action should set
 * `interruptible: false`.
 */
export interface BossChargeSpec {
  /** Rounds between the telegraph and the hit. */
  rounds: number;
  /** What stops it. Not the same check as `interruptible` — see above. */
  break: BossChargeBreak;
  /**
   * Fraction of damage removed at 99% progress toward the break condition,
   * scaled LINEARLY.
   *
   * This is the difference between a puzzle and a coin flip: a party that
   * gets most of the way there takes meaningfully less damage instead of
   * exactly as much, so pushing on the bar is always worth something even
   * when it does not break.
   */
  partialMitigationMax: number;
}

export type BossChargeBreak =
  /** Cumulative damage to the boss across the whole charge window. */
  | { kind: 'damage'; percentOfMaxHp: number }
  /** A status the party must land on the boss — needs the right party, not just numbers. */
  | { kind: 'status'; statusId: string; stacks: number }
  /** Coordinated party behaviour, e.g. two heroes guarding on the same round. */
  | { kind: 'party_action'; action: 'guard' | 'focus'; heroCount: number }
  | { kind: 'dispel' };

/** Live progress of a charging boss action. Lives on BossCombatant rather than
 *  being derived from the log, so replay reconstruction stays cheap. */
export interface PendingCharge {
  actionId: string;
  /** Rounds still to wait before it resolves. */
  roundsRemaining: number;
  /**
   * @deprecated DEAD FIELD — written as 0 when the charge starts and never
   * read or updated. Real progress is derived from the event log by
   * `evaluateChargeProgress` in the reducer, which is exported so the UI and
   * resolution share one evaluator. Reading this instead will show 0% on a
   * charge the party has nearly broken. Kept only because the field is
   * serialised into replay records; remove it in a replay-format change.
   */
  progress: number;
  /** Who it was aimed at when it started. */
  targetActorIds: readonly string[];
  /** Round the charge began — used for damage scaling at resolution. */
  startedRound: number;
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
  /**
   * A charged action counting down. Null when nothing is charging.
   *
   * The first piece of boss state that survives a round boundary — every
   * future replay and persistence path has to carry it, which is exactly why
   * it lives in state rather than being recomputed from the event log.
   */
  pendingCharge: PendingCharge | null;
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
  /**
   * The party's SHARED resource, in two chambers.
   *
   * Abilities are paid for from the chamber matching the caster's
   * `resourceType`, not from `HeroCombatant.resource`. That makes casting a
   * party-level decision — spending on one hero is spending everyone's — which
   * is the tension a per-hero pool could not create.
   *
   * Two chambers rather than one because heroes do not share a resource:
   * Mech Pilot and Android spend Tech, everyone else Mana, and every ability
   * declares which. A single pool would have to make `resourceType` meaningless.
   * A party of one type leaves the other chamber at zero max, which is expected
   * and is why the vessel hides an empty chamber rather than drawing it dry.
   *
   * `HeroCombatant.resource` still exists and still tracks per-hero value —
   * `CardSheet`, the mobile readout, and `resource_above_threshold` conditions
   * all read it — it simply no longer gates whether an ability can be cast.
   */
  partyResource: { mana: number; tech: number };
  partyResourceMax: { mana: number; tech: number };
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
  /** Mirrors the action's own `interruptible` flag — surfaced on the intent
   *  itself so the presentation layer can decide charge-up length/drama
   *  without re-looking up the boss's action table. */
  interruptible: boolean;
}

/** What the player chose to do this round. */
export type PlayerAction =
  | { kind: 'ability'; abilityDefinitionId: string; targetActorIds: string[] }
  /**
   * Free basic attack. Light damage, no cost, no cooldown — and it FEEDS the
   * party's resource chamber.
   *
   * Added because "attacking generates resource" was impossible without it:
   * every offensive action in the game was a library ability with a cost, so
   * the only way to gain resource was `focus`, which does no damage. That made
   * the economy a slow drain (+1/round against costs of 1–3) rather than a
   * rhythm of building and spending.
   *
   * Deliberately NOT folded into `focus`: focus means "pull the boss's aggro
   * onto me", and the boss's retarget chain and the taunt mechanic both depend
   * on that meaning. Adding damage to it would silently change targeting.
   */
  | { kind: 'strike' }
  /** Deliberately spend this hero's command slot without producing an effect. */
  | { kind: 'wait' }
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
  /**
   * `sourceActionId` is the boss action id or hero ability definition id that
   * produced this damage, and it is what lets the VIEW tell two attacks apart.
   *
   * Without it the presentation layer could see only "physical damage, heavy"
   * — which is why every attack in the game drew the identical bolt no matter
   * which ability fired it. Optional because not all damage has an action
   * behind it (thorns reflection, environmental ticks); consumers must handle
   * its absence by falling back to the generic effect rather than drawing
   * nothing.
   */
  | { kind: 'damage_dealt'; sourceActorId: string; targetActorId: string; amount: number; damageType: DamageType; blockedByShield: number; sourceActionId?: string }
  | { kind: 'healing_applied'; sourceActorId: string; targetActorId: string; amount: number; overheal: number }
  | { kind: 'shield_gained'; sourceActorId: string; targetActorId: string; amount: number; types: readonly DamageType[] }
  | { kind: 'status_applied'; sourceActorId: string; targetActorId: string; statusId: string; instanceId: string; duration: number }
  | { kind: 'status_removed'; targetActorId: string; instanceId: string; reason: 'expired' | 'dispelled' | 'cleansed' }
  | { kind: 'resource_changed'; actorId: string; delta: number; source: string }
  | { kind: 'ultimate_charge_changed'; actorId: string; delta: number; source: string }
  | { kind: 'cooldown_started'; actorId: string; abilityDefinitionId: string; rounds: number }
  | { kind: 'cooldown_ticked'; actorId: string; abilityDefinitionId: string; remaining: number }
  /** One damage-over-time status burning for one round. Separate from
   *  `damage_dealt` so the view can render a quiet recurring tick rather than
   *  a struck blow, and so the journal can group ticks per status. */
  | {
      kind: 'dot_ticked';
      sourceActorId: string;
      targetActorId: string;
      statusId: string;
      instanceId: string;
      amount: number;
      damageType: DamageType;
    }
  | { kind: 'actor_defeated'; actorId: string }
  | { kind: 'phase_transition'; fromPhaseId: string; toPhaseId: string }
  | { kind: 'action_denied'; actorId: string; reason: ActionDenialReason }
  | { kind: 'battle_ended'; result: BattleResult };

export type ActionDenialReason =
  | 'insufficient_resource'
  | 'on_cooldown'
  | 'no_usable_ability'
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
