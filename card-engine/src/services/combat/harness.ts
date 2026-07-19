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
import type { AbilityDefinition, AbilityVersion } from '../../types/abilities';
import type { CardStats, Rank } from '../../types/card';
import type { BossVersion, BossDefinition } from '../../types/bosses';
import {
  advance,
  initializeBattle,
  pickActingHero,
  submitPlayerAction,
} from './reducer';
import { deriveHeroStats } from './formulas';
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
 * Baseline hero policy for balance sims: use ultimate when charged, then
 * signature when affordable, then core, else focus if low resource, else guard.
 */
export const baselineHeroPolicy: HeroPolicy = {
  chooseAction(state, hero) {
    const abilities = hero.snapshot.abilities;
    const usable = (a: AbilityCombatSnapshot) =>
      !hero.cooldowns.some((c) => c.abilityDefinitionId === a.definitionId) &&
      hero.resource >= a.resourceCost;

    const ult = abilities.find((a) => a.slot === 'ultimate' && usable(a) && hero.ultimateCharge >= 100);
    if (ult) return { kind: 'ability', abilityDefinitionId: ult.definitionId, targetActorIds: [state.boss.actorId] };

    const sig = abilities.find((a) => a.slot === 'signature' && usable(a));
    if (sig) return { kind: 'ability', abilityDefinitionId: sig.definitionId, targetActorIds: [state.boss.actorId] };

    const core = abilities.find((a) => a.slot === 'core' && usable(a));
    if (core) return { kind: 'ability', abilityDefinitionId: core.definitionId, targetActorIds: [state.boss.actorId] };

    if (hero.resource < hero.snapshot.maxResource) return { kind: 'focus' };
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
      passiveEffects: [],
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
      })),
    })),
    resistanceProfileId: `rp_${def.slug}`,
    weaknessProfileId: `wp_${def.slug}`,
  };
}

/** Build a full snapshot for the harness with a scripted seed. */
export function buildBattleSnapshot(input: {
  seed: number;
  hero: HeroSnapshot;
  boss?: BossSnapshot;
  battleId?: string;
  createdAt?: string;
}): BattleSnapshot {
  return {
    battleId: input.battleId ?? `battle_${input.seed}`,
    createdAt: input.createdAt ?? '2026-07-18T00:00:00.000Z',
    seed: input.seed,
    difficulty: 'normal',
    rewardTableVersion: 'rtv_dev',
    heroes: [input.hero],
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
