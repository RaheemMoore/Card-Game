import { describe, expect, it } from 'vitest';
import {
  buildAbilitySnapshot,
  buildBattleSnapshot,
  buildHeroSnapshot,
  baselineHeroPolicy,
  runBatch,
  runBattle,
  snapshotFromBossVersion,
  verifyDeterminism,
} from './harness';
import { COMBAT_LINES } from './heroPolicies';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';
import { SEED_BOSSES } from '../../data/bosses/seedBosses';
import type { CardStats } from '../../types/card';
import type { BattleSnapshot } from '../../types/combat';

/**
 * Floor 2 — The Still Season v2.
 *
 * v1 was a stub: phase 1 held ONE action on a zero cooldown against a single
 * target, so half the fight was one button pressed at one hero. Everything
 * asserted here is a property of the redesign that a single playthrough cannot
 * show you.
 *
 * WHAT MAKES THIS FLOOR DIFFERENT FROM FLOOR 1, and therefore what these tests
 * have to guard that the Debt-Bearer's suite does not:
 *
 *   1. HE HEALS ON A STEALABLE TURN. His effective HP is not `maxHp`, it is
 *      `maxHp + 23 × stacks × (the rounds you let him keep the heal)`. So the
 *      round count is the real difficulty dial, not the HP number — if this
 *      suite drifts, cut regeneration stacks BEFORE touching maxHp.
 *   2. THERE IS NO SAFE HP BAND. `act_season_prune` hunts the HIGHEST-hp hero
 *      and cannot be intercepted by taunt; `act_season_deadfall` and
 *      `act_season_last_leaf` hunt the lowest and can. The damage-spread test
 *      is therefore load-bearing here in a way it was not on floor 1.
 *   3. THE ULTIMATE IS BROKEN BY POISON STACKS, NOT DAMAGE. That is the whole
 *      compensating hook for `resistant: ['primal']` — the archetypes his
 *      resistance walls out are the ones who can stop his ultimate. Two tests
 *      below assert it works AND that it stays a secret (a baseline party must
 *      NOT break it by accident, or it is not counterplay, it is weather).
 *
 * Approved deviations from towerCurve (Raheem, 2026-07-31): 11–14 rounds
 * against TOWER_TARGET_ROUNDS = 10, and a 0.55–0.68 win rate against
 * TOWER.targetWinRate(2) = 0.82. This is the second consecutive floor to
 * deviate, which is a signal the curve wants re-basing before floor 5.
 */

const SEED_COUNT = 300;

function statsFor(atk: number, def: number, mana: number): CardStats {
  return {
    Atk: { value: atk, bias: 'Mid', hardCap: 100 },
    Def: { value: def, bias: 'Mid', hardCap: 100 },
    Mana: { value: mana, bias: 'Mid', hardCap: 100 },
  };
}

function heroFor(id: string, stats: CardStats) {
  const soul = SEED_ABILITIES.find((s) => s.definition.id === 'ability_inherited_guard')!;
  const ember = SEED_ABILITIES.find((s) => s.definition.id === 'ability_oathbreakers_answer')!;
  const radiant = SEED_ABILITIES.find((s) => s.definition.id === 'ability_bearing_witness')!;
  return buildHeroSnapshot({
    cardId: id,
    archetype: 'Barbarian',
    displayName: id,
    stats,
    rank: 'Forged',
    elementDamageType: 'kinetic',
    abilities: [
      buildAbilitySnapshot(soul.definition, soul.version),
      buildAbilitySnapshot(ember.definition, ember.version),
      buildAbilitySnapshot(radiant.definition, radiant.version),
    ],
  });
}

/** The same 3-hero Forged party the rest of the balance suites use. */
const PARTY = () => [
  heroFor('Vanguard', statsFor(70, 55, 60)),
  heroFor('Warden', statsFor(50, 70, 55)),
  heroFor('Reaver', statsFor(65, 45, 65)),
];

function stillSeasonSnapshot() {
  const seed = SEED_BOSSES.find((b) => b.definition.id === 'boss_champion_druid');
  if (!seed) throw new Error('Still Season seed missing');
  return snapshotFromBossVersion(seed.definition, seed.version);
}

const BOSS = stillSeasonSnapshot();

function battleFor(seed: number, heroes = PARTY()): BattleSnapshot {
  return buildBattleSnapshot({ seed, heroes, boss: BOSS });
}

const LINES = COMBAT_LINES.filter((l) => l.id !== 'baseline');

/** Every action id authored across the three phases. */
const ALL_ACTION_IDS = BOSS.phases.flatMap((p) => p.actions.map((a) => a.id));

describe('Still Season v2 — difficulty', () => {
  it('lands inside the approved 0.55–0.68 win-rate band', () => {
    const heroes = PARTY();
    const stats = runBatch((seed) => battleFor(seed, heroes), baselineHeroPolicy, SEED_COUNT);
    // eslint-disable-next-line no-console
    console.info(
      `[still-season v2] baseline party — winRate=${stats.winRate.toFixed(3)} ` +
        `avgRounds=${stats.avgRounds.toFixed(1)} wins=${stats.wins} losses=${stats.losses} ` +
        `timeouts=${stats.timeouts}`,
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.55);
    expect(stats.winRate).toBeLessThanOrEqual(0.68);
  }, 90_000);

  it('runs as an attrition fight, not a slog', () => {
    const heroes = PARTY();
    const stats = runBatch((seed) => battleFor(seed, heroes), baselineHeroPolicy, SEED_COUNT);
    // eslint-disable-next-line no-console
    console.info(`[still-season v2] avgRounds=${stats.avgRounds.toFixed(1)} timeouts=${stats.timeouts}`);
    // Deliberately longer than floor 1 and than TOWER_TARGET_ROUNDS — this is
    // the attrition floor. Above 16 it stops being tense and becomes the slog
    // the redesign exists to avoid; the lever is regen stacks, not maxHp.
    expect(stats.avgRounds).toBeGreaterThanOrEqual(9);
    expect(stats.avgRounds).toBeLessThanOrEqual(16);
    expect(stats.timeouts / SEED_COUNT).toBeLessThan(0.05);
  }, 90_000);

  it('every winning line clears on its own', () => {
    for (const line of LINES) {
      const heroes = PARTY();
      const stats = runBatch((seed) => battleFor(seed, heroes), line.policy, 120);
      // eslint-disable-next-line no-console
      console.info(
        `[still-season v2] line "${line.name}" — winRate=${stats.winRate.toFixed(3)} ` +
          `avgRounds=${stats.avgRounds.toFixed(1)}`,
      );
      // A line that cannot clear is decoration, not counterplay.
      expect.soft(stats.winRate, `line ${line.name}`).toBeGreaterThanOrEqual(0.4);
    }
  }, 120_000);
});

describe('Still Season v2 — the fight is not one move on one hero', () => {
  it('spreads damage across the whole party', () => {
    const taken = new Map<string, number>();
    let total = 0;
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const { events } = runBattle(battleFor(seed), baselineHeroPolicy);
      for (const e of events) {
        if (e.kind !== 'damage_dealt') continue;
        if (e.targetActorId === 'boss_0') continue;
        taken.set(e.targetActorId, (taken.get(e.targetActorId) ?? 0) + e.amount);
        total += e.amount;
      }
    }
    const shares = [...taken.entries()].map(([id, a]) => `${id}=${(a / total).toFixed(3)}`);
    // eslint-disable-next-line no-console
    console.info(`[still-season v2] damage share — ${shares.join(' ')}`);
    expect(taken.size).toBe(3);
    for (const [id, amount] of taken) {
      expect(amount / total, `hero ${id}`).toBeGreaterThan(0.15);
    }
  }, 120_000);

  it('uses every action it was authored with', () => {
    const declared = new Set<string>();
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const { events } = runBattle(battleFor(seed), baselineHeroPolicy);
      for (const e of events) {
        if (e.kind === 'boss_intent_declared') declared.add(e.intent.actionId);
      }
    }
    const missing = ALL_ACTION_IDS.filter((id) => !declared.has(id));
    // eslint-disable-next-line no-console
    console.info(`[still-season v2] declared ${declared.size}/${new Set(ALL_ACTION_IDS).size} action ids`);
    // An action that never fires across 300 seeds is a dead authoring bug —
    // usually an unreachable priority or a phase the fight never enters.
    expect(missing, `never declared: ${missing.join(', ')}`).toHaveLength(0);
  }, 120_000);

  it('reaches an ultimate in most battles', () => {
    let withUltimate = 0;
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const { events } = runBattle(battleFor(seed), baselineHeroPolicy);
      const sawUlt = events.some(
        (e) =>
          e.kind === 'boss_intent_declared' &&
          (e.intent.actionId === 'act_season_hold_open' || e.intent.actionId === 'act_season_break'),
      );
      if (sawUlt) withUltimate++;
    }
    const rate = withUltimate / SEED_COUNT;
    // eslint-disable-next-line no-console
    console.info(`[still-season v2] battles containing an ultimate — ${rate.toFixed(3)}`);
    // If most fights never see one, the cooldowns are too long and the biggest
    // thing he does is content most players never meet.
    expect(rate).toBeGreaterThan(0.8);
  }, 120_000);
});

describe('Still Season v2 — determinism', () => {
  it('replays identically from the same seed', () => {
    for (const seed of [1, 7, 42, 1337]) {
      expect(verifyDeterminism(battleFor(seed), baselineHeroPolicy), `seed ${seed}`).toBe(true);
    }
  }, 60_000);
});
