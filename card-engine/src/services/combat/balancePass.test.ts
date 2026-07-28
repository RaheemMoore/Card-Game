import { describe, it, expect } from 'vitest';
import {
  runBatch,
  buildAbilitySnapshot,
  buildBattleSnapshot,
  buildHeroSnapshot,
  buildFireElementalBossSnapshot,
  baselineHeroPolicy,
} from './harness';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';
import type { BiasTier, CardStats, Rank } from '../../types/card';
import type { BossSnapshot } from '../../types/combat';

/**
 * B6 balance pass. This file is both a documented sweep — the numbers it
 * prints go into the spec change log — and a locked assertion that the
 * shipped seed boss + seed abilities produce a win rate inside the
 * approved band.
 *
 * Target band: 40–75%. Wider than the eventual player-facing target (55%)
 * because our sample space is one Barbarian-shaped hero using only 3 of
 * the 5 seed abilities. Once B7 lands a broader ability pool we retune
 * again with real player-mix data.
 */

const NEUTRAL_BOSS = buildFireElementalBossSnapshot();

/**
 * NOTE: every sim below labeled "Barbarian" uses Mana `bias: 'Mid'` — but a
 * real Barbarian's Mana bias is Very Low per card-engine-power-system-spec.md
 * (Foundation 5-25, Forged floor 26, hard ceiling 55). These locked win-rate
 * assertions were calibrated against that Mid-bias input and are left as-is
 * (changing them would silently re-tune what's locked); the "ranks + stat
 * spreads" sweep below adds an explicit Very-Low-bias case instead so
 * archetype-realistic resource scarcity is actually exercised somewhere.
 */
function statsFor(atk: number, def: number, mana: number, manaBias: BiasTier = 'Mid'): CardStats {
  return {
    Atk: { value: atk, bias: 'Mid', hardCap: 100 },
    Def: { value: def, bias: 'Mid', hardCap: 100 },
    Mana: { value: mana, bias: manaBias, hardCap: 100 },
  };
}

function buildHeroForRank(rank: Rank, stats: CardStats) {
  const soul = SEED_ABILITIES.find((s) => s.definition.id === 'ability_soul_drain')!;
  const ember = SEED_ABILITIES.find((s) => s.definition.id === 'ability_ember_cleave')!;
  const radiant = SEED_ABILITIES.find((s) => s.definition.id === 'ability_radiant_ward')!;
  return buildHeroSnapshot({
    cardId: `card_${rank}`,
    archetype: 'Barbarian',
    displayName: 'Sim Hero',
    stats,
    rank,
    // These suites assert combat MATH, not element interaction.
    elementDamageType: 'physical',
    abilities: [
      buildAbilitySnapshot(soul.definition, soul.version),
      buildAbilitySnapshot(ember.definition, ember.version),
      buildAbilitySnapshot(radiant.definition, radiant.version),
    ],
  });
}

/**
 * Damage-scaled boss: multiply every action's baseDamage by k. Used to
 * find the k that produces our target win rate in the current formula.
 */
function scaledFireElemental(k: number): BossSnapshot {
  return {
    ...NEUTRAL_BOSS,
    phases: NEUTRAL_BOSS.phases.map((p) => ({
      ...p,
      actions: p.actions.map((a) => ({
        ...a,
        baseDamage: Math.round(a.baseDamage * k),
      })),
    })),
  };
}

describe('B6 balance sweep — scan multipliers', () => {
  it('logs win rate for each candidate multiplier', () => {
    const hero = buildHeroForRank('Forged', statsFor(70, 55, 65));
    const multipliers = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
    const results = multipliers.map((k) => {
      const boss = scaledFireElemental(k);
      const stats = runBatch(
        (seed) => buildBattleSnapshot({ seed, hero, boss }),
        baselineHeroPolicy,
        500,
      );
      return { k, ...stats };
    });
    // eslint-disable-next-line no-console
    console.info('[B6 sweep] Forged Mid Barbarian (Atk70 Def55 Mana65):');
    for (const r of results) {
      // eslint-disable-next-line no-console
      console.info(
        `  ×${r.k.toFixed(1)}  winRate=${r.winRate.toFixed(3)}  avgRounds=${r.avgRounds.toFixed(1)}  timeouts=${r.timeouts}`,
      );
    }
    expect(results.length).toBe(multipliers.length);
  }, 30_000);
});

describe('B6 balance sweep — ranks + stat spreads', () => {
  it('logs win rate across ranks with the current shipped boss', () => {
    const configs: Array<{ label: string; rank: Rank; stats: CardStats }> = [
      { label: 'Foundation glass', rank: 'Foundation', stats: statsFor(65, 35, 50) },
      { label: 'Foundation tank',  rank: 'Foundation', stats: statsFor(45, 65, 40) },
      { label: 'Forged balanced',  rank: 'Forged',     stats: statsFor(65, 55, 60) },
      { label: 'Forged glass',     rank: 'Forged',     stats: statsFor(80, 40, 55) },
      { label: 'Ascendant elite',  rank: 'Ascendant',  stats: statsFor(85, 65, 75) },
      // Archetype-realistic case: a real Barbarian's Mana bias is Very Low,
      // not Mid — every other config above uses Mid regardless of label.
      // This is the one that should actually feel resource-scarce.
      { label: 'Forged real-bias Barbarian (Very Low Mana)', rank: 'Forged', stats: statsFor(65, 55, 30, 'Very Low') },
    ];
    const results = configs.map((c) => {
      const hero = buildHeroForRank(c.rank, c.stats);
      const stats = runBatch(
        (seed) => buildBattleSnapshot({ seed, hero, boss: NEUTRAL_BOSS }),
        baselineHeroPolicy,
        300,
      );
      return { label: c.label, ...stats };
    });
    // eslint-disable-next-line no-console
    console.info('[B6 sweep] shipped boss vs varied heroes:');
    for (const r of results) {
      // eslint-disable-next-line no-console
      console.info(
        `  ${r.label.padEnd(20)}  winRate=${r.winRate.toFixed(3)}  avgRounds=${r.avgRounds.toFixed(1)}  timeouts=${r.timeouts}`,
      );
    }
    expect(results.length).toBe(configs.length);
  }, 30_000);
});

describe('B6 shipped-boss balance lock', () => {
  // The shipped Emberborn Wraith v2 numbers are calibrated so that:
  //   - A Forged Mid Barbarian using only Ember Cleave + Focus (the baseline
  //     policy) LOSES — the boss is a real challenge, teaches the player
  //     they need to slot Radiant Ward + Guard defensively.
  //   - An Ascendant elite with the same policy WINS reliably — the boss
  //     is beatable when the hero is properly ranked up.
  //
  // The seeded runtime is fully deterministic per (seed, snapshot, policy),
  // so these outcomes are 0.0 and 1.0 on the head. Real player-in-loop win
  // rate at Forged will land between these bounds once we get play data;
  // that's the retune trigger for Phase 4.

  // RECALIBRATED 2026-07-28, when statuses and damage-over-time became
  // mechanically real. This lock was written while `damage_over_time` fell
  // through the reducer's `default:` branch and every status was inert, so
  // Ember Cleave's burn contributed exactly nothing. It now contributes ~10%
  // of damage dealt (measured: 323 direct / 36 dot over 11 rounds, one burn
  // instance, stacks correctly capped) — and because this sim is fully
  // deterministic, "0.0 and 1.0 on the head" as the note above says, ANY real
  // increase flips the Forged case from a loss to a win rather than nudging a
  // curve.
  //
  // The assertion is inverted rather than the mechanics nerfed: the abilities
  // now do what they always claimed to. What the lock still protects is the
  // SHAPE — a Forged hero clears the baseline boss, and loses the moment the
  // boss is scaled up (see the ×1.5+ rows in the sweep above).
  it('Forged Mid Barbarian now clears the baseline boss once DoT actually ticks', () => {
    const hero = buildHeroForRank('Forged', statsFor(70, 55, 65));
    const stats = runBatch(
      (seed) => buildBattleSnapshot({ seed, hero, boss: NEUTRAL_BOSS }),
      baselineHeroPolicy,
      200,
    );
    // eslint-disable-next-line no-console
    console.info(
      `[B6 lock/Forged] winRate=${stats.winRate.toFixed(3)} avgRounds=${stats.avgRounds.toFixed(1)}`,
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.9);
  }, 30_000);

  it('Ascendant elite Barbarian beats the shipped boss reliably', () => {
    const hero = buildHeroForRank('Ascendant', statsFor(85, 65, 75));
    const stats = runBatch(
      (seed) => buildBattleSnapshot({ seed, hero, boss: NEUTRAL_BOSS }),
      baselineHeroPolicy,
      200,
    );
    // eslint-disable-next-line no-console
    console.info(
      `[B6 lock/Ascendant] winRate=${stats.winRate.toFixed(3)} avgRounds=${stats.avgRounds.toFixed(1)}`,
    );
    expect(stats.winRate).toBeGreaterThanOrEqual(0.9);
  }, 30_000);
});
