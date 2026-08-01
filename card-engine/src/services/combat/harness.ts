import type {
  BattleEvent,
  BattleResult,
  BattleSnapshot,
  BossSnapshot,
  BossPhaseSnapshot,
  BossActionSnapshot,
  HeroCombatant,
  HeroSnapshot,
  PlayerAction,
  BattleState,
  AbilityCombatSnapshot,
} from '../../types/combat';
import type { AbilityDefinition, AbilityVersion, DamageType } from '../../types/abilities';
import type { CardStats, Rank } from '../../types/card';
import type { BossVersion, BossDefinition } from '../../types/bosses';
import {
  advance,
  initializeBattle,
  pickActingHero,
  submitPlayerAction,
} from './reducer';
import { deriveHeroStats, FIRE_ELEMENTAL_RESISTANCE } from './formulas';
import { RandomStream } from './RandomStream';

/**
 * Headless battle harness (Master Plan §B2). Runs a scripted hero against a
 * scripted boss with seeded RNG and returns the resulting event stream + final
 * state. Intended for balance sweeps, replay verification, and invariant tests.
 *
 * No UI, no persistence, no React, no async.
 */

export interface HeroPolicy {
  chooseAction(state: BattleState, hero: HeroCombatant): PlayerAction;
}

export interface RunResult {
  finalState: BattleState;
  events: BattleEvent[];
  result: BattleResult;
}

export function runBattle(snapshot: BattleSnapshot, policy: HeroPolicy): RunResult {
  let state = initializeBattle(snapshot);
  const events: BattleEvent[] = [...state.log];
  let safety = 5000;

  while (state.phase !== 'battle_over' && safety-- > 0) {
    if (state.phase === 'awaiting_player_action') {
      const hero = pickActingHero(state);
      if (!hero) {
        // No living heroes — force victory check.
        const step = advance({ ...state, phase: 'checking_victory' });
        state = step.state;
        events.push(...step.events);
        continue;
      }
      const action = policy.chooseAction(state, hero);
      const step = submitPlayerAction(state, action);
      state = step.state;
      events.push(...step.events);
    } else {
      const step = advance(state);
      state = step.state;
      events.push(...step.events);
    }
  }

  if (safety <= 0) throw new Error('runBattle: safety break — battle did not terminate');
  if (!state.result) throw new Error('runBattle: battle_over without result');

  return { finalState: state, events, result: state.result };
}

/* ------------------------------------------------------------------ */
/*  Simple scripted hero policy                                        */
/* ------------------------------------------------------------------ */

/**
 * Baseline hero policy for balance sims: ultimate when charged, then signature
 * when affordable, then core, else STRIKE to refill the chamber, else guard.
 *
 * ── Affordability reads the PARTY chamber ────────────────────────────────
 * Not `hero.resource`. Since the shared-pool rework the reducer pays ability
 * costs out of `state.partyResource[resourceType]`, so a policy still checking
 * the hero's own pool proposes actions the reducer refuses.
 *
 * That matters more than it used to: a refused action no longer consumes the
 * hero's turn (it used to, which meant a misclick burned a round). The upside
 * for players is that a scripted policy which keeps proposing the same refused
 * action now loops forever instead of losing turns — `runBattle`'s safety break
 * catches it, but the fix is for the policy to be honest about affordability.
 *
 * `strike` replaces `focus` as the fallback because it both generates resource
 * AND deals damage; a sim that spent its empty turns on focus would understate
 * party DPS and make every boss look harder than it is.
 */
export const baselineHeroPolicy: HeroPolicy = {
  chooseAction(state, hero) {
    const abilities = hero.snapshot.abilities;
    const chamber = state.partyResource[hero.snapshot.resourceType];
    const usable = (a: AbilityCombatSnapshot) =>
      !hero.cooldowns.some((c) => c.abilityDefinitionId === a.definitionId) &&
      chamber >= a.resourceCost;

    const ult = abilities.find((a) => a.slot === 'ultimate' && usable(a) && hero.ultimateCharge >= 100);
    if (ult) return { kind: 'ability', abilityDefinitionId: ult.definitionId, targetActorIds: [state.boss.actorId] };

    const sig = abilities.find((a) => a.slot === 'signature' && usable(a));
    if (sig) return { kind: 'ability', abilityDefinitionId: sig.definitionId, targetActorIds: [state.boss.actorId] };

    const core = abilities.find((a) => a.slot === 'core' && usable(a));
    if (core) return { kind: 'ability', abilityDefinitionId: core.definitionId, targetActorIds: [state.boss.actorId] };

    // Nothing affordable — build the pool back up while still contributing.
    if (chamber < state.partyResourceMax[hero.snapshot.resourceType]) return { kind: 'strike' };
    return { kind: 'guard' };
  },
};

/* ------------------------------------------------------------------ */
/*  Snapshot builders                                                  */
/* ------------------------------------------------------------------ */

export interface BuildHeroSnapshotInput {
  cardId: string;
  archetype: HeroSnapshot['archetype'];
  displayName: string;
  stats: CardStats;
  rank: Rank;
  abilities: AbilityCombatSnapshot[];
  /** From `damageTypeForElement(resolveCurrentElement(card))`. Test builders
   *  pass 'kinetic' when the element is irrelevant to what they assert. */
  elementDamageType: DamageType;
}

export function buildHeroSnapshot(input: BuildHeroSnapshotInput): HeroSnapshot {
  const derived = deriveHeroStats(input.stats, input.rank);
  return {
    cardId: input.cardId,
    archetype: input.archetype,
    rank: input.rank,
    displayName: input.displayName,
    stats: input.stats,
    maxHp: derived.maxHp,
    maxResource: derived.maxResource,
    resourceType: input.stats.Mana ? 'mana' : 'tech',
    elementDamageType: input.elementDamageType,
    abilities: input.abilities,
  };
}

export function buildAbilitySnapshot(def: AbilityDefinition, version: AbilityVersion): AbilityCombatSnapshot {
  return {
    slot: version.slotType,
    definitionId: def.id,
    versionId: version.id,
    displayName: def.displayName,
    resourceType: version.resourceType,
    resourceCost: version.resourceCost,
    cooldownRounds: version.cooldownRounds ?? 0,
    def,
    version,
  };
}

/* ------------------------------------------------------------------ */
/*  Fire elemental boss — B2 placeholder used for the harness only.    */
/*  Replaced in B3 by real BossStore-backed content.                   */
/* ------------------------------------------------------------------ */

const FIRE_ELEMENTAL_ACTIONS: BossActionSnapshot[] = [
  {
    id: 'act_fe_ember_slash',
    displayName: 'Ember Slash',
    intentType: 'heavy_attack',
    telegraphText: 'The elemental gathers a searing arc.',
    priority: 20,
    cooldownRounds: 1,
    interruptible: false,
    baseDamage: 40,
    scalingPerRound: 0.2,
    damageType: 'searing',
  },
  {
    id: 'act_fe_flame_burst',
    displayName: 'Flame Burst',
    intentType: 'area_attack',
    telegraphText: 'Waves of heat coil outward.',
    priority: 10,
    cooldownRounds: 2,
    interruptible: false,
    baseDamage: 27,
    scalingPerRound: 0.2,
    damageType: 'searing',
  },
];

const FIRE_ELEMENTAL_ENRAGE: BossActionSnapshot[] = [
  {
    id: 'act_fe_ember_lance',
    displayName: 'Ember Lance',
    intentType: 'heavy_attack',
    telegraphText: 'A javelin of white flame gathers overhead.',
    priority: 30,
    cooldownRounds: 1,
    interruptible: false,
    baseDamage: 54,
    scalingPerRound: 0.2,
    damageType: 'searing',
  },
  {
    id: 'act_fe_execute_pyre',
    displayName: 'Execution Pyre',
    intentType: 'execute',
    telegraphText: 'The elemental fixes its gaze — a lethal strike, if you falter.',
    priority: 25,
    cooldownRounds: 3,
    interruptible: false,
    baseDamage: 72,
    scalingPerRound: 0,
    damageType: 'searing',
  },
];

const FIRE_ELEMENTAL_PHASES: BossPhaseSnapshot[] = [
  {
    id: 'phase_fe_teach',
    healthThresholdStart: 1.0,
    healthThresholdEnd: 0.5,
    actions: FIRE_ELEMENTAL_ACTIONS,
    passiveEffects: [],
  },
  {
    id: 'phase_fe_enrage',
    healthThresholdStart: 0.5,
    healthThresholdEnd: 0.0,
    actions: FIRE_ELEMENTAL_ENRAGE,
    passiveEffects: [],
  },
];

export function buildFireElementalBossSnapshot(maxHp = 340): BossSnapshot {
  return {
    bossId: 'boss_fire_elemental_v0',
    versionId: 'bv_fire_elemental_v0_2',
    name: 'Emberborn Wraith',
    maxHp,
    phases: FIRE_ELEMENTAL_PHASES,
    resistanceProfileId: 'rp_fire_elemental',
    weaknessProfileId: 'wp_fire_elemental',
    resistance: FIRE_ELEMENTAL_RESISTANCE,
  };
}

/**
 * Convert a persisted BossVersion (from BossStore) into the runtime
 * BossSnapshot shape the reducer consumes. This is the seam between the
 * library layer (admin-editable) and the combat layer (snapshot-immutable).
 * Resistance profile IDs are synthesized from the version id so the reducer
 * can key back into the profile at damage time.
 */
export function snapshotFromBossVersion(def: BossDefinition, version: BossVersion): BossSnapshot {
  return {
    bossId: def.id,
    versionId: version.id,
    name: def.name,
    maxHp: version.maxHp,
    phases: version.phases.map((p) => ({
      id: p.id,
      healthThresholdStart: p.healthThresholdStart,
      healthThresholdEnd: p.healthThresholdEnd,
      passiveEffects: p.passiveDescriptions,
      ...(p.passiveStatuses ? { passiveStatuses: p.passiveStatuses } : {}),
      actions: p.actions.map((a) => ({
        id: a.id,
        displayName: a.displayName,
        intentType: a.intentType,
        telegraphText: a.telegraphText,
        priority: a.priority,
        cooldownRounds: a.cooldownRounds,
        interruptible: a.interruptible,
        baseDamage: a.baseDamage ?? 0,
        scalingPerRound: a.scalingPerRound ?? 0,
        damageType: a.damageType ?? 'kinetic',
        ...(a.shieldAmount != null ? { shieldAmount: a.shieldAmount } : {}),
        ...(a.shieldDurationRounds != null
          ? { shieldDurationRounds: a.shieldDurationRounds }
          : {}),
        // Every field below is dropped silently if it is not copied here —
        // the failure mode is an authored action that simply does nothing,
        // with no type error and no log line. That is exactly how the
        // resistance profile went missing above.
        ...(a.targetScope ? { targetScope: a.targetScope } : {}),
        ...(a.selfStatuses ? { selfStatuses: a.selfStatuses } : {}),
        ...(a.statusApplications ? { statusApplications: a.statusApplications } : {}),
        ...(a.executeThresholdPercent != null
          ? { executeThresholdPercent: a.executeThresholdPercent }
          : {}),
        ...(a.executeMultiplier != null ? { executeMultiplier: a.executeMultiplier } : {}),
        ...(a.charge ? { charge: a.charge } : {}),
        ...(a.weight != null ? { weight: a.weight } : {}),
      })),
    })),
    resistanceProfileId: `rp_${def.slug}`,
    weaknessProfileId: `wp_${def.slug}`,
    // Carried through, not discarded. This used to be dropped on the floor
    // and replaced by a synthesized id nothing read, which is why an authored
    // resistance profile had no effect on any boss but the Wraith.
    resistance: {
      resistant: version.resistanceProfile.resistant,
      weak: version.resistanceProfile.weak,
    },
    ...(def.arenaId ? { arenaId: def.arenaId } : {}),
  };
}

/** Build a full snapshot for the harness with a scripted seed. */
export function buildBattleSnapshot(input: {
  seed: number;
  /** Convenience for solo battles. Ignored if `heroes` is provided. */
  hero?: HeroSnapshot;
  heroes?: HeroSnapshot[];
  boss?: BossSnapshot;
  battleId?: string;
  createdAt?: string;
}): BattleSnapshot {
  const heroes = input.heroes ?? (input.hero ? [input.hero] : []);
  if (heroes.length === 0) {
    throw new Error('buildBattleSnapshot requires at least one hero.');
  }
  return {
    battleId: input.battleId ?? `battle_${input.seed}`,
    createdAt: input.createdAt ?? '2026-07-18T00:00:00.000Z',
    seed: input.seed,
    difficulty: 'normal',
    rewardTableVersion: 'rtv_dev',
    heroes,
    boss: input.boss ?? buildFireElementalBossSnapshot(),
  };
}

/** Batch runner — for 5000-run balance sweeps. */
export function runBatch(
  snapshotFactory: (seed: number) => BattleSnapshot,
  policy: HeroPolicy,
  count: number,
  startSeed = 1,
): {
  wins: number;
  losses: number;
  timeouts: number;
  winRate: number;
  avgRounds: number;
  avgRoundsOnWin: number;
} {
  let wins = 0;
  let losses = 0;
  let timeouts = 0;
  let totalRounds = 0;
  let totalWinRounds = 0;

  for (let i = 0; i < count; i++) {
    const snap = snapshotFactory(startSeed + i);
    const { result } = runBattle(snap, policy);
    totalRounds += result.roundsElapsed;
    if (result.outcome === 'victory') {
      wins++;
      totalWinRounds += result.roundsElapsed;
    } else if (result.outcome === 'defeat' && result.cause === 'timeout') {
      timeouts++;
      losses++;
    } else if (result.outcome === 'defeat') {
      losses++;
    }
  }

  return {
    wins,
    losses,
    timeouts,
    winRate: wins / count,
    avgRounds: totalRounds / count,
    avgRoundsOnWin: wins > 0 ? totalWinRounds / wins : 0,
  };
}

/** Verifies replay determinism: running the same snapshot twice yields identical event streams. */
export function verifyDeterminism(snapshot: BattleSnapshot, policy: HeroPolicy): boolean {
  const a = runBattle(snapshot, policy);
  const b = runBattle(snapshot, policy);
  if (a.events.length !== b.events.length) return false;
  return JSON.stringify(a.events) === JSON.stringify(b.events);
}

/** Convenience: pull seed from a snapshot in a way the harness expects. */
export function seedRng(snapshot: BattleSnapshot): RandomStream {
  return new RandomStream(snapshot.seed);
}
