import { describe, expect, it } from 'vitest';
import {
  buildAbilitySnapshot,
  buildBattleSnapshot,
  buildHeroSnapshot,
  runBatch,
  baselineHeroPolicy,
} from './harness';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';
import type { CardStats } from '../../types/card';

/**
 * C9 party balance baseline. Runs the 3-hero party against the shipped
 * Emberborn Wraith across a scripted seed range and RECORDS the win rate
 * via console.info — it does NOT gate CI on party numbers. Per the plan
 * (Rage decision, Section 7), the solo v2 balance is the source of truth
 * for the C1–C6 slice; a v3 with 50% mechanical + 25% Rage lands only
 * after Raheem approves this data.
 *
 * If this test starts failing you probably broke the reducer, not the
 * balance — the assertion is only that every run terminates.
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

describe('C9 party balance baseline — 3 heroes vs shipped Ember Wraith', () => {
  it('records win rate + avg rounds across 300 seeds (non-gating)', () => {
    const heroes = [
      heroFor('Vanguard', statsFor(70, 55, 60)),
      heroFor('Warden', statsFor(50, 70, 55)),
      heroFor('Reaver', statsFor(65, 45, 65)),
    ];
    const stats = runBatch(
      (seed) => buildBattleSnapshot({ seed, heroes }),
      baselineHeroPolicy,
      300,
    );
    // eslint-disable-next-line no-console
    console.info(
      `[C9 party baseline] 3-hero Forged party vs Ember Wraith v2 — ` +
        `winRate=${stats.winRate.toFixed(3)} avgRounds=${stats.avgRounds.toFixed(1)} ` +
        `wins=${stats.wins} losses=${stats.losses} timeouts=${stats.timeouts}`,
    );
    // Termination check only — party balance is not gated until Raheem
    // approves numbers alongside the Rage decision (plan §7).
    expect(stats.wins + stats.losses + stats.timeouts).toBe(300);
  }, 30_000);
});
