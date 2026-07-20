import { describe, expect, it } from 'vitest';
import {
  buildAbilitySnapshot,
  buildBattleSnapshot,
  buildHeroSnapshot,
  runBatch,
  baselineHeroPolicy,
  snapshotFromBossVersion,
} from './harness';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';
import { SEED_BOSSES } from '../../data/bosses/seedBosses';
import type { CardStats } from '../../types/card';

/**
 * Party balance baseline. Records win rate + rounds via console.info; gating
 * is deliberately loose — the assertion is that every run terminates. Two
 * suites:
 *
 *   1. vs Ember Wraith v2 (the harness's hardcoded FIRE_ELEMENTAL_PHASES,
 *      solo-tuned). Historical baseline recorded 100% / avg 5 rounds — proof
 *      the plan's Section-7 warning was real.
 *
 *   2. vs Ember Wraith v3 (the seed BossVersion published 2026-07-19 with
 *      50% mechanical + 25% Rage). Party-tuned; target win rate ~45–65%.
 */

function statsFor(atk: number, def: number, mana: number): CardStats {
  return {
    Atk: { value: atk, bias: 'Mid', hardCap: 100 },
    Def: { value: def, bias: 'Mid', hardCap: 100 },
    Mana: { value: mana, bias: 'Mid', hardCap: 100 },
  };
}

function heroFor(id: string, stats: CardStats) {
  const soul = SEED_ABILITIES.find((s) => s.definition.id === 'ability_soul_drain')!;
  const ember = SEED_ABILITIES.find((s) => s.definition.id === 'ability_ember_cleave')!;
  const radiant = SEED_ABILITIES.find((s) => s.definition.id === 'ability_radiant_ward')!;
  return buildHeroSnapshot({
    cardId: id,
    archetype: 'Barbarian',
    displayName: id,
    stats,
    rank: 'Forged',
    abilities: [
      buildAbilitySnapshot(soul.definition, soul.version),
      buildAbilitySnapshot(ember.definition, ember.version),
      buildAbilitySnapshot(radiant.definition, radiant.version),
    ],
  });
}

const PARTY = () => [
  heroFor('Vanguard', statsFor(70, 55, 60)),
  heroFor('Warden', statsFor(50, 70, 55)),
  heroFor('Reaver', statsFor(65, 45, 65)),
];

describe('C9 party balance baseline — vs Ember Wraith v2 (harness hardcoded)', () => {
  it('records win rate + avg rounds across 300 seeds (non-gating)', () => {
    const heroes = PARTY();
    const stats = runBatch(
      (seed) => buildBattleSnapshot({ seed, heroes }),
      baselineHeroPolicy,
      300,
    );
    // eslint-disable-next-line no-console
    console.info(
      `[party vs v2] 3-hero Forged party vs Ember Wraith v2 — ` +
        `winRate=${stats.winRate.toFixed(3)} avgRounds=${stats.avgRounds.toFixed(1)} ` +
        `wins=${stats.wins} losses=${stats.losses} timeouts=${stats.timeouts}`,
    );
    expect(stats.wins + stats.losses + stats.timeouts).toBe(300);
  }, 30_000);
});

describe('party balance — vs Ember Wraith v3 (seed BossVersion)', () => {
  it('records win rate + avg rounds across 300 seeds (non-gating)', () => {
    const heroes = PARTY();
    const emberSeed = SEED_BOSSES.find(
      (b) => b.definition.id === 'boss_fire_elemental_v0',
    );
    if (!emberSeed) throw new Error('Emberborn Wraith seed missing');
    const bossSnap = snapshotFromBossVersion(emberSeed.definition, emberSeed.version);
    const stats = runBatch(
      (seed) => buildBattleSnapshot({ seed, heroes, boss: bossSnap }),
      baselineHeroPolicy,
      300,
    );
    // eslint-disable-next-line no-console
    console.info(
      `[party vs v3] 3-hero Forged party vs Ember Wraith v3 — ` +
        `winRate=${stats.winRate.toFixed(3)} avgRounds=${stats.avgRounds.toFixed(1)} ` +
        `wins=${stats.wins} losses=${stats.losses} timeouts=${stats.timeouts}`,
    );
    expect(stats.wins + stats.losses + stats.timeouts).toBe(300);
  }, 30_000);
});
